import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getUserKeys } from '../lib/tableStorage'
import { getOctokit, parseRepo, fetchFile } from '../lib/githubClient'

app.http('scanWebapp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { url, githubRepoUrl } = await req.json() as { url: string; githubRepoUrl?: string }
      const keys = await getUserKeys(subjectId)

      const result: Record<string, any> = { confidence: {} }

      // ── Rule-based scan: fetch HTML ───────────────────────────────────────
      try {
        const html = await fetch(url).then(r => r.text())
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        if (titleMatch) {
          result.appName = titleMatch[1].trim()
          result.confidence.appName = 'found'
        }
        const themeMatch = html.match(/<meta name="theme-color" content="(#[0-9a-fA-F]{3,6})"/i)
        if (themeMatch) {
          result.themeColor = themeMatch[1]
          result.confidence.themeColor = 'found'
        }
      } catch { /* URL unreachable */ }

      // ── Rule-based scan: manifest.json ────────────────────────────────────
      try {
        const manifest = await fetch(`${url}/manifest.json`).then(r => r.json()) as any
        if (manifest.name) {
          result.appName = manifest.name
          result.confidence.appName = 'found'
        }
        if (manifest.theme_color) {
          result.themeColor = manifest.theme_color
          result.confidence.themeColor = 'found'
        }
        if (manifest.icons?.length) {
          const icon = [...manifest.icons].sort((a: any, b: any) =>
            parseInt(b.sizes) - parseInt(a.sizes)
          )[0]
          result.iconUrl = icon.src.startsWith('http') ? icon.src : `${url}${icon.src}`
          result.confidence.iconUrl = 'found'
        }
      } catch { /* no manifest */ }

      // ── Rule-based scan: existing bridge.config.json ──────────────────────
      try {
        const existing = await fetch(`${url}/bridge.config.json`).then(r => r.json()) as Record<string, unknown>
        Object.assign(result, existing)
        Object.keys(existing).forEach(k => { result.confidence[k] = 'found' })
      } catch { /* no existing config */ }

      // ── GitHub + GPT-4o scan ──────────────────────────────────────────────
      if (githubRepoUrl && keys.githubToken && keys.openAiKey) {
        const octokit = getOctokit(keys.githubToken)
        const { owner, repo } = parseRepo(githubRepoUrl)

        const filesToFetch = [
          'src/App.tsx',
          'src/contexts/VoiceAssistantContext.tsx',
          'src/contexts/CommsConsoleContext.tsx',
          'tailwind.config.ts',
          'package.json'
        ]

        let sourceContext = ''
        for (const path of filesToFetch) {
          const content = await fetchFile(octokit, owner, repo, path, 3000)
          if (content) sourceContext += `\n\n=== ${path} ===\n${content}`
        }

        if (sourceContext) {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${keys.openAiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              response_format: { type: 'json_object' },
              max_tokens: 2000,
              messages: [
                {
                  role: 'system',
                  content: `You are a code analyst for an Android bridge tool.
Analyse the provided React TypeScript source code and return ONLY a JSON object with:
{
  "appName": string,
  "themeColor": string,
  "voiceContextFound": boolean,
  "routes": string[],
  "suggestedChannels": [{ "id": string, "name": string, "deepLink": string, "importance": string, "sound": string, "repeatEnabled": boolean }],
  "widgetDataUrlHint": string,
  "deepLinks": { [routeName: string]: string },
  "confidence": { [field]: "found" | "inferred" | "default" }
}
Return nothing except valid JSON.`
                },
                { role: 'user', content: sourceContext }
              ]
            })
          }).then(r => r.json()) as any

          try {
            const aiResult = JSON.parse(aiResponse.choices[0].message.content)
            const aiConfidence = aiResult.confidence ?? {}
            delete aiResult.confidence
            Object.entries(aiResult).forEach(([k, v]) => {
              result[k] = v
              result.confidence[k] = aiConfidence[k] ?? 'inferred'
            })
          } catch { /* AI response parse error */ }
        }
      }

      // ── Apply defaults for missing fields ─────────────────────────────────
      if (!result.routes) {
        result.routes = ['/', '/tasks', '/calendar', '/agenda', '/priorities', '/assignments']
        result.confidence.routes = 'default'
      }
      if (!result.deepLinks) {
        result.deepLinks = {
          Home: '/',
          Tasks: '/tasks',
          Calendar: '/calendar',
          Agenda: '/agenda',
          Priorities: '/priorities',
          Assignments: '/assignments'
        }
        result.confidence.deepLinks = 'default'
      }
      if (!result.themeColor) {
        result.themeColor = '#1e40af'
        result.confidence.themeColor = 'default'
      }
      if (!result.suggestedChannels) {
        result.suggestedChannels = [
          { id: 'general', name: 'General', deepLink: '/', importance: 'default', sound: 'default', repeatEnabled: false }
        ]
        result.confidence.suggestedChannels = 'default'
      }

      return { status: 200, jsonBody: result }
    } catch (err: any) {
      return { status: 401, jsonBody: { error: err.message } }
    }
  }
})
