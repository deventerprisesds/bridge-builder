import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getUserKeys } from '../lib/tableStorage'
import { getOctokit, parseRepo, fetchFile, getRepoTree } from '../lib/githubClient'

// Files to always attempt, in priority order
const PRIORITY_FILES = [
  'package.json',
  'src/App.tsx', 'src/app.tsx', 'src/App.jsx',
  'src/main.tsx', 'src/main.jsx',
  'src/router.tsx', 'src/Router.tsx', 'src/routes.tsx', 'src/Routes.tsx',
  'tailwind.config.ts', 'tailwind.config.js',
  'src/index.css', 'src/styles/globals.css', 'src/styles/index.css',
]

// Patterns that indicate high-value files for notification / integration detection
const HIGH_VALUE_PATTERNS = [
  /notification/i, /push/i, /supabase/i, /realtime/i,
  /email/i, /chat/i, /inbox/i, /message/i, /comms/i,
  /context/i, /provider/i, /channel/i,
]

function scoreFile(path: string): number {
  const lower = path.toLowerCase()
  if (PRIORITY_FILES.some(p => path === p || path.endsWith('/' + p.replace('src/', '')))) return 100
  let score = 0
  for (const pat of HIGH_VALUE_PATTERNS) {
    if (pat.test(lower)) score += 10
  }
  // Prefer src/ files, penalise node_modules / dist / test
  if (lower.startsWith('src/')) score += 5
  if (lower.includes('node_modules') || lower.includes('/dist/') || lower.includes('.test.') || lower.includes('.spec.')) score = -1
  return score
}

async function fetchFigmaTheme(figmaFileId: string, figmaToken: string): Promise<{
  themeColor?: string
  figmaStyles?: Record<string, any>
} | null> {
  try {
    // Get styles list
    const stylesRes = await fetch(`https://api.figma.com/v1/files/${figmaFileId}/styles`, {
      headers: { 'X-Figma-Token': figmaToken }
    })
    if (!stylesRes.ok) return null
    const stylesData = await stylesRes.json() as any
    const colorStyles: any[] = (stylesData.meta?.styles ?? []).filter((s: any) => s.style_type === 'FILL')
    if (!colorStyles.length) return null

    // Fetch node details for the first 20 color styles
    const nodeIds = colorStyles.slice(0, 20).map((s: any) => s.node_id).join(',')
    const nodesRes = await fetch(`https://api.figma.com/v1/files/${figmaFileId}/nodes?ids=${encodeURIComponent(nodeIds)}`, {
      headers: { 'X-Figma-Token': figmaToken }
    })
    if (!nodesRes.ok) return null
    const nodesData = await nodesRes.json() as any

    const figmaStyles: Record<string, string> = {}
    let themeColor: string | undefined

    for (const style of colorStyles) {
      const node = nodesData.nodes?.[style.node_id]?.document
      const fill = node?.fills?.[0]
      if (fill?.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color
        const hex = '#' + [r, g, b].map((c: number) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
        figmaStyles[style.name] = hex

        // Pick the primary/brand colour as themeColor
        const nameLower = style.name.toLowerCase()
        if (!themeColor && (nameLower.includes('primary') || nameLower.includes('brand') || nameLower.includes('theme') || nameLower.includes('accent'))) {
          themeColor = hex
        }
      }
    }

    // Fallback: first colour found
    if (!themeColor && Object.values(figmaStyles).length) {
      themeColor = Object.values(figmaStyles)[0]
    }

    return { themeColor, figmaStyles }
  } catch {
    return null
  }
}

app.http('scanWebapp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { url, githubRepoUrl, figmaFileId } = await req.json() as {
        url: string
        githubRepoUrl?: string
        figmaFileId?: string
      }
      const keys = await getUserKeys(subjectId)

      const result: Record<string, any> = { confidence: {} }

      // ── Rule-based: manifest.json (most reliable for SPA name/color) ──────
      try {
        const manifest = await fetch(`${url}/manifest.json`).then(r => r.json()) as any
        if (manifest.name && manifest.name !== 'Vite App') {
          result.appName = manifest.name
          result.confidence.appName = 'found'
        }
        if (manifest.theme_color) {
          result.themeColor = manifest.theme_color
          result.confidence.themeColor = 'found'
        }
        if (manifest.icons?.length) {
          const icon = [...manifest.icons].sort((a: any, b: any) => parseInt(b.sizes) - parseInt(a.sizes))[0]
          result.iconUrl = icon.src.startsWith('http') ? icon.src : `${url}${icon.src}`
          result.confidence.iconUrl = 'found'
        }
      } catch { /* no manifest */ }

      // ── Rule-based: HTML (only use title if it's meaningful) ─────────────
      try {
        const html = await fetch(url).then(r => r.text())
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        const title = titleMatch?.[1]?.trim()
        if (title && !result.appName && title !== 'Vite App' && !title.toLowerCase().includes('vite')) {
          result.appName = title
          result.confidence.appName = 'found'
        }
        if (!result.themeColor) {
          const themeMatch = html.match(/<meta[^>]+name="theme-color"[^>]+content="(#[0-9a-fA-F]{3,8})"/i)
            ?? html.match(/<meta[^>]+content="(#[0-9a-fA-F]{3,8})"[^>]+name="theme-color"/i)
          if (themeMatch) {
            result.themeColor = themeMatch[1]
            result.confidence.themeColor = 'found'
          }
        }
      } catch { /* URL unreachable */ }

      // ── Figma theme extraction ────────────────────────────────────────────
      const figmaKey = keys.figmaToken
      if (figmaFileId && figmaKey) {
        const figma = await fetchFigmaTheme(figmaFileId, figmaKey)
        if (figma) {
          result.figmaStyles = figma.figmaStyles
          if (figma.themeColor) {
            result.themeColor = figma.themeColor
            result.confidence.themeColor = 'figma'
          }
        }
      }

      // ── GitHub + GPT-4o scan ─────────────────────────────────────────────
      if (githubRepoUrl && keys.githubToken && keys.openAiKey) {
        const octokit = getOctokit(keys.githubToken)
        const { owner, repo } = parseRepo(githubRepoUrl)

        // Smart file selection: score all files in repo, pick top 15
        const allFiles = await getRepoTree(octokit, owner, repo)
        const scored = allFiles
          .map(path => ({ path, score: scoreFile(path) }))
          .filter(f => f.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 15)
          .map(f => f.path)

        let sourceContext = ''
        for (const path of scored) {
          const content = await fetchFile(octokit, owner, repo, path, 4000)
          if (content) sourceContext += `\n\n=== ${path} ===\n${content}`
        }

        if (sourceContext) {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${keys.openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o',
              response_format: { type: 'json_object' },
              max_tokens: 3000,
              messages: [
                {
                  role: 'system',
                  content: `You are a code analyst for an Android WebView bridge tool. Analyse the React/TypeScript source code and return ONLY a JSON object.

IMPORTANT RULES:
- appName: use the real product name from code/config, NEVER "Vite App", "Vite + React", or generic placeholders
- themeColor: extract from tailwind config primary/brand color or CSS variables, NOT black (#000000) unless truly intentional
- Exhaustively find ALL routes defined in the router (React Router, TanStack Router, etc.)
- For deepLinks: map every route to a human-readable name
- Notification channels: look for EVERY notification type — Supabase realtime, FCM/Firebase push, email (Resend, SendGrid, nodemailer), in-app chat/inbox, toast systems. Create a channel entry for each distinct type found.
- voiceContextFound: true if any speech recognition, TTS, voice assistant, or microphone usage exists
- widgetDataUrlHint: if there is an endpoint that returns summary/dashboard data suitable for a home screen widget

Return this exact JSON shape:
{
  "appName": string,
  "themeColor": string (hex, e.g. "#1e6b52"),
  "voiceContextFound": boolean,
  "routes": string[],
  "deepLinks": { [humanName: string]: string },
  "suggestedChannels": [{
    "id": string,
    "name": string,
    "deepLink": string,
    "importance": "high"|"default"|"low",
    "sound": "default"|"none",
    "repeatEnabled": boolean,
    "description": string
  }],
  "widgetDataUrlHint": string,
  "notificationSystems": string[],
  "confidence": { [field]: "found" | "inferred" | "default" }
}`
                },
                { role: 'user', content: `Webapp URL: ${url}\n\nSource files:${sourceContext}` }
              ]
            })
          }).then(r => r.json()) as any

          try {
            const aiResult = JSON.parse(aiResponse.choices[0].message.content)
            const aiConfidence = aiResult.confidence ?? {}
            delete aiResult.confidence

            // Only override appName/themeColor from AI if not already found by rules
            // and the AI didn't return a generic placeholder
            const genericNames = ['vite app', 'vite + react', 'react app', 'my app']
            for (const [k, v] of Object.entries(aiResult)) {
              if (k === 'appName' && result.confidence.appName === 'found') continue
              if (k === 'themeColor' && result.confidence.themeColor === 'figma') continue
              if (k === 'appName' && typeof v === 'string' && genericNames.includes((v as string).toLowerCase())) continue
              result[k] = v
              result.confidence[k] = aiConfidence[k] ?? 'inferred'
            }
          } catch { /* AI response parse error */ }
        }
      }

      // ── Defaults for missing required fields ──────────────────────────────
      if (!result.appName) {
        result.appName = new URL(url).hostname.split('.')[0]
        result.confidence.appName = 'default'
      }
      if (!result.themeColor) {
        result.themeColor = '#1e40af'
        result.confidence.themeColor = 'default'
      }
      if (!result.deepLinks || Object.keys(result.deepLinks).length === 0) {
        result.deepLinks = { Home: '/' }
        result.confidence.deepLinks = 'default'
      }
      if (!result.suggestedChannels || result.suggestedChannels.length === 0) {
        result.suggestedChannels = [
          { id: 'general', name: 'General', deepLink: '/', importance: 'default', sound: 'default', repeatEnabled: false }
        ]
        result.confidence.suggestedChannels = 'default'
      }

      return { status: 200, jsonBody: result }
    } catch (err: any) {
      return { status: err.message?.includes('token') || err.message?.includes('Unauthorised') ? 401 : 500, jsonBody: { error: err.message } }
    }
  }
})
