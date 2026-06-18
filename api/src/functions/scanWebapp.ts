import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyToken } from '../lib/auth'
import { getUserKeys } from '../lib/tableStorage'
import { getOctokit, parseRepo, fetchFile, getRepoTree } from '../lib/githubClient'

// ── Capability checklist — every GPT-4o response must address ALL of these ──
const ANDROID_CAPABILITY_CHECKLIST = [
  { id: 'push_notifications',    label: 'Push notifications (replacing browser/email alerts)' },
  { id: 'notification_channels', label: 'Notification channels with custom sound/repeat' },
  { id: 'voice_input',           label: 'Voice input / talk button' },
  { id: 'home_widget',           label: 'Home screen widget' },
  { id: 'app_shortcuts',         label: 'Long-press app shortcuts' },
  { id: 'quick_tile',            label: 'Quick settings tile' },
  { id: 'deep_links',            label: 'Deep linking to specific pages' },
  { id: 'background_sync',       label: 'Background data sync' },
  { id: 'lock_screen_actions',   label: 'Lock screen notification actions' },
]

// ── Content patterns that signal Android-relevant code ───────────────────────
const CONTENT_PATTERNS = [
  /useEffect/,            /Notification/i,        /addEventListener/,     /fetch\(/,
  /supabase/i,            /channel/i,             /permission/i,          /schedule/i,
  /push/i,                /email/i,               /reminder/i,            /alert/i,
  /calendar/i,            /outlook/i,             /google/i,              /microsoft/i,
  /slack/i,               /webhook/i,             /digest/i,              /toast/i,
  /socket/i,              /realtime/i,            /voice/i,               /speech/i,
  /microphone/i,          /cron/i,                /interval/i,            /worker/i,
  /background/i,          /sync/i,                /widget/i,              /shortcut/i,
  /useNotification/i,     /notificationSettings/i, /sendNotification/i,   /NotificationPreferences/i,
  /\bnotify\b/i,
]

// ── Priority files always included regardless of content score ───────────────
const PRIORITY_FILES = new Set([
  'package.json',
  'src/App.tsx', 'src/app.tsx', 'src/App.jsx', 'src/App.js',
  'src/main.tsx', 'src/main.jsx',
  'src/router.tsx', 'src/Router.tsx', 'src/routes.tsx', 'src/Routes.tsx',
  'tailwind.config.ts', 'tailwind.config.js',
  'src/integrations/supabase/client.ts', 'src/integrations/supabase/client.js',
  'src/lib/supabase.ts', 'src/lib/supabase.js',
])

function scoreContent(preview: string): number {
  let score = 0
  for (const pat of CONTENT_PATTERNS) {
    if (pat.test(preview)) score += 5
  }
  return score
}

async function fetchFigmaTheme(figmaFileId: string, figmaToken: string): Promise<{
  themeColor?: string; figmaStyles?: Record<string, string>
} | null> {
  try {
    const stylesRes = await fetch(`https://api.figma.com/v1/files/${figmaFileId}/styles`, {
      headers: { 'X-Figma-Token': figmaToken }
    })
    if (!stylesRes.ok) return null
    const stylesData = await stylesRes.json() as any
    const colorStyles: any[] = (stylesData.meta?.styles ?? []).filter((s: any) => s.style_type === 'FILL')
    if (!colorStyles.length) return null

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
        const nameLower = style.name.toLowerCase()
        if (!themeColor && (nameLower.includes('primary') || nameLower.includes('brand') || nameLower.includes('theme') || nameLower.includes('accent'))) {
          themeColor = hex
        }
      }
    }
    if (!themeColor && Object.values(figmaStyles).length) themeColor = Object.values(figmaStyles)[0]
    return { themeColor, figmaStyles }
  } catch { return null }
}

app.http('scanWebapp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const subjectId = await verifyToken(req)
      const { url, githubRepoUrl } = await req.json() as { url: string; githubRepoUrl?: string }
      const keys = await getUserKeys(subjectId)

      const figmaFileId = process.env.FIGMA_FILE_ID
      const figmaKey    = process.env.FIGMA_TOKEN

      const result: Record<string, any> = { confidence: {} }

      // ── Rule-based: manifest.json ─────────────────────────────────────────
      try {
        const manifest = await fetch(`${url}/manifest.json`).then(r => r.json()) as any
        if (manifest.name && manifest.name !== 'Vite App') {
          result.appName = manifest.name; result.confidence.appName = 'found'
        }
        if (manifest.theme_color) { result.themeColor = manifest.theme_color; result.confidence.themeColor = 'found' }
        if (manifest.icons?.length) {
          const icon = [...manifest.icons].sort((a: any, b: any) => parseInt(b.sizes) - parseInt(a.sizes))[0]
          result.iconUrl = icon.src.startsWith('http') ? icon.src : `${url}${icon.src}`
          result.confidence.iconUrl = 'found'
        }
      } catch { /* no manifest */ }

      // ── Rule-based: HTML ──────────────────────────────────────────────────
      try {
        const html = await fetch(url).then(r => r.text())
        const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim()
        if (title && !result.appName && title !== 'Vite App' && !title.toLowerCase().includes('vite')) {
          result.appName = title; result.confidence.appName = 'found'
        }
        if (!result.themeColor) {
          const m = html.match(/<meta[^>]+name="theme-color"[^>]+content="(#[0-9a-fA-F]{3,8})"/i)
            ?? html.match(/<meta[^>]+content="(#[0-9a-fA-F]{3,8})"[^>]+name="theme-color"/i)
          if (m) { result.themeColor = m[1]; result.confidence.themeColor = 'found' }
        }
        if (!result.iconUrl) {
          const iconHref =
            (html.match(/<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/i) ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="apple-touch-icon"/i))?.[1] ??
            (html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i) ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="icon"/i))?.[1] ??
            (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i))?.[1]
          if (iconHref) {
            result.iconUrl = iconHref.startsWith('http') ? iconHref : `${url}${iconHref.startsWith('/') ? '' : '/'}${iconHref}`
            result.confidence.iconUrl = 'found'
          } else {
            const fav = await fetch(`${url}/favicon.ico`).catch(() => null)
            if (fav?.ok) { result.iconUrl = `${url}/favicon.ico`; result.confidence.iconUrl = 'found' }
          }
        }
      } catch { /* URL unreachable */ }

      // ── Figma theme ───────────────────────────────────────────────────────
      if (figmaFileId && figmaKey) {
        const figma = await fetchFigmaTheme(figmaFileId, figmaKey)
        if (figma) { result.compassThemeColor = figma.themeColor; result.figmaStyles = figma.figmaStyles }
      }

      // ── GitHub + GPT-4o deep scan ─────────────────────────────────────────
      if (githubRepoUrl && keys.githubToken && keys.openAiKey) {
        const octokit  = getOctokit(keys.githubToken)
        const { owner, repo } = parseRepo(githubRepoUrl)

        // Step 1: Get full repo tree
        const allFiles = await getRepoTree(octokit, owner, repo)
        const srcFiles = allFiles.filter(p =>
          (p.startsWith('src/') || PRIORITY_FILES.has(p)) &&
          !p.includes('node_modules') && !p.includes('/dist/') &&
          !p.includes('.test.') && !p.includes('.spec.') &&
          !p.includes('.d.ts') && !p.endsWith('.json') &&
          (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.css'))
        )

        // Add package.json separately
        const extraFiles = allFiles.filter(p => PRIORITY_FILES.has(p) && !srcFiles.includes(p))
        const candidateFiles = [...new Set([...extraFiles, ...srcFiles])]

        // Step 2: Fetch 500-char previews for content-aware scoring
        const previews: Record<string, string> = {}
        await Promise.all(
          candidateFiles.map(async (path) => {
            const content = await fetchFile(octokit, owner, repo, path, 500)
            if (content) previews[path] = content
          })
        )

        // Step 3: Score by content and group by directory for balanced selection
        interface ScoredFile { path: string; score: number; dir: string; size: number }
        const scored: ScoredFile[] = Object.entries(previews).map(([path, preview]) => {
          const isPriority = PRIORITY_FILES.has(path)
          const contentScore = scoreContent(preview)
          const dir = path.split('/').slice(0, 2).join('/') // e.g. "src/pages"
          return { path, score: isPriority ? 200 : contentScore, dir, size: preview.length }
        }).filter(f => f.score > 0)

        // Step 4: Directory-aware selection — top 3 from each dir + global top scorers
        const byDir: Record<string, ScoredFile[]> = {}
        for (const f of scored) {
          if (!byDir[f.dir]) byDir[f.dir] = []
          byDir[f.dir].push(f)
        }

        const selected = new Set<string>()

        // Take top 3 from each directory
        for (const files of Object.values(byDir)) {
          files.sort((a, b) => b.score - a.score)
          files.slice(0, 3).forEach(f => selected.add(f.path))
        }

        // Also include top 20 globally by score
        scored.sort((a, b) => b.score - a.score)
        scored.slice(0, 20).forEach(f => selected.add(f.path))

        // Step 5: Fetch full content, respecting 80K total char cap
        // High-scoring files (score >= 30) get 15K chars; others get 6K
        const TOTAL_CAP = 80_000
        let sourceContext = ''
        let totalChars = 0

        const orderedPaths = [...selected].sort((a, b) => {
          const sa = scored.find(f => f.path === a)?.score ?? 0
          const sb = scored.find(f => f.path === b)?.score ?? 0
          return sb - sa
        })

        for (const path of orderedPaths) {
          if (totalChars >= TOTAL_CAP) break
          const fileScore = scored.find(f => f.path === path)?.score ?? 0
          const charLimit = Math.min(fileScore >= 30 ? 15_000 : 6_000, TOTAL_CAP - totalChars)
          const content = await fetchFile(octokit, owner, repo, path, charLimit)
          if (content) {
            sourceContext += `\n\n=== ${path} (score:${fileScore}) ===\n${content}`
            totalChars += content.length
          }
        }

        if (sourceContext) {
          const checklistJson = JSON.stringify(ANDROID_CAPABILITY_CHECKLIST, null, 2)
          const userContent = `Webapp URL: ${url}\n\nFiles analysed: ${orderedPaths.length}\nTotal chars: ${totalChars}\n\nSource files:${sourceContext}`

          // ── CALL 1: Capability checklist + base config (no channel enumeration) ─
          const capabilitySystemPrompt = `You are a senior Android engineer performing a capability audit for a WebView bridge app. Analyse the React/TypeScript source code and produce:

1. A "capabilityReport" — a structured audit against the Android capability checklist below
2. A "config" — base config fields (appName, themeColor, voiceContextFound, routes, deepLinks, widgetDataUrlHint). DO NOT include suggestedChannels here — channels are handled separately.

## ANDROID CAPABILITY CHECKLIST
${checklistJson}

For EVERY item in the checklist, your capabilityReport MUST contain exactly one entry. No item may be omitted. Each entry:
- "checklistId": the id from the checklist
- "verdict": "satisfied" | "applicable_not_implemented" | "not_applicable"
- "finding": plain English of what you found (or didn't)
- "file": source file containing evidence (or "")
- "line": approximate line number (0 if unknown)
- "currentBehaviour": what the webapp currently does for this
- "androidMapping": what Android native feature this should use
- "confidence": "found" | "inferred" | "default"

## CONFIG RULES
appName: Real product name. NEVER "Vite App", "Vite + React", "React App".
themeColor: Primary/brand hex from tailwind config or CSS variables. NOT #000 or #fff.
routes + deepLinks: Map EVERY route path to a human-readable name.
voiceContextFound: true if ANY SpeechRecognition, SpeechSynthesis, Web Speech API, or microphone code exists.
widgetDataUrlHint: Best API endpoint for a home screen summary widget.

## RESPONSE FORMAT
Return ONLY valid JSON:
{
  "capabilityReport": [ { "checklistId": string, "verdict": string, "finding": string, "file": string, "line": number, "currentBehaviour": string, "androidMapping": string, "confidence": string } ],
  "config": {
    "appName": string,
    "themeColor": string,
    "voiceContextFound": boolean,
    "routes": string[],
    "deepLinks": { [humanName: string]: string },
    "widgetDataUrlHint": string,
    "confidence": { [field: string]: "found"|"inferred"|"default" }
  }
}`

          // ── CALL 2: Dedicated channel enumeration with full token budget ───────
          const channelSystemPrompt = `You are a notification-systems specialist analysing a React/TypeScript webapp to enumerate every distinct notification channel for an Android app.

Your ONLY job: find every distinct notification type this app sends or receives, and return them as a JSON array.

## WHERE TO LOOK (search all of these exhaustively):

1. **Settings UI toggles** — any checkbox, toggle, or preference labelled with notification types (e.g. "Enable task reminders", "Daily digest", "Overdue alerts")
2. **Supabase function names** in fetch() / supabase.functions.invoke() calls — function names like "notify-user", "send-reminder", "task-overdue-alert" reveal channel types
3. **Notification type enums/constants** — any TypeScript enum, const object, or union type containing notification category names
4. **Email/webhook service imports and calls** — sendgrid, resend, mailgun, twilio, slack webhook calls reveal notification domains
5. **Notification-category-like strings** — string literals containing words like "reminder", "overdue", "digest", "alert", "update", "summary", "mention", "assignment"
6. **useNotification hooks, notificationSettings components, sendNotification functions, NotificationPreferences pages** — these contain the definitive channel list
7. **Supabase table names or RLS policies** — tables like "notifications", "notification_preferences" with category columns

## OUTPUT RULES
- Return ONE channel per distinct notification type. If you see "task reminders" and "overdue tasks" they are separate channels.
- id: lowercase-kebab-case
- name: Human-readable, title case (e.g. "Task Reminders", "Overdue Alerts")
- deepLink: The route in the app most relevant to this notification (e.g. "/tasks", "/calendar")
- importance: "high" for time-sensitive (reminders, overdue, urgent); "default" for standard; "low" for informational
- sound: "none" for silent digest/summary channels; "default" for all others
- repeatEnabled: true for recurring/scheduled notifications (digests, daily summaries, recurring reminders)
- description: one sentence describing when this notification fires

If you find NO notification infrastructure at all, return an empty array [].
Do NOT invent channels not evidenced in the code.

## RESPONSE FORMAT
Return ONLY valid JSON — an object with one key:
{
  "suggestedChannels": [
    {
      "id": string,
      "name": string,
      "deepLink": string,
      "importance": "high"|"default"|"low",
      "sound": "default"|"none",
      "repeatEnabled": boolean,
      "description": string
    }
  ]
}`

          // Fire both calls in parallel
          const [capabilityRaw, channelRaw] = await Promise.all([
            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${keys.openAiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                max_tokens: 8000,
                messages: [
                  { role: 'system', content: capabilitySystemPrompt },
                  { role: 'user', content: userContent }
                ]
              })
            }).then(r => r.json()) as Promise<any>,

            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${keys.openAiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                max_tokens: 4000,
                messages: [
                  { role: 'system', content: channelSystemPrompt },
                  { role: 'user', content: userContent }
                ]
              })
            }).then(r => r.json()) as Promise<any>,
          ])

          const genericNames = ['vite app', 'vite + react', 'react app', 'my app']

          // Process call 1: capability report + base config
          try {
            const cap = JSON.parse(capabilityRaw.choices[0].message.content)
            if (Array.isArray(cap.capabilityReport)) {
              result.capabilityReport = cap.capabilityReport
            }
            const aiConfig = cap.config ?? cap
            const aiConfidence = aiConfig.confidence ?? {}
            for (const [k, v] of Object.entries(aiConfig)) {
              if (k === 'confidence') continue
              if (k === 'appName' && result.confidence.appName === 'found') continue
              if (k === 'themeColor' && result.confidence.themeColor === 'found') continue
              if (k === 'appName' && typeof v === 'string' && genericNames.includes((v as string).toLowerCase())) continue
              result[k] = v
              result.confidence[k] = aiConfidence[k] ?? 'inferred'
            }
          } catch {
            result.scanError = `Capability parse failed: ${capabilityRaw.choices?.[0]?.finish_reason ?? 'unknown'}`
          }

          // Process call 2: channels
          try {
            const ch = JSON.parse(channelRaw.choices[0].message.content)
            if (Array.isArray(ch.suggestedChannels) && ch.suggestedChannels.length > 0) {
              result.suggestedChannels = ch.suggestedChannels
              result.confidence.suggestedChannels = 'found'
            }
          } catch {
            // channel parse failure is non-fatal — fall through to seeding logic below
          }

          // ── Suggested-channel seeding ─────────────────────────────────────
          // When notification infrastructure is detected but scanner found < 3 channels,
          // pre-populate a curated set of common channel types as a starting point.
          const hasNotifInfra = (result.capabilityReport ?? []).some(
            (r: any) => r.checklistId === 'push_notifications' && r.verdict === 'satisfied'
          ) || (result.capabilityReport ?? []).some(
            (r: any) => r.checklistId === 'notification_channels' && r.verdict !== 'not_applicable'
          )

          if (hasNotifInfra && (!result.suggestedChannels || result.suggestedChannels.length < 3)) {
            const seeded = result.suggestedChannels ?? []
            const seededIds = new Set(seeded.map((c: any) => c.id))

            const SEED_CHANNELS = [
              { id: 'push',      name: 'Push Notifications', deepLink: '/',          importance: 'high',    sound: 'default', repeatEnabled: false, description: 'Real-time push alerts from the app' },
              { id: 'reminders', name: 'Reminders',          deepLink: '/',          importance: 'high',    sound: 'default', repeatEnabled: true,  description: 'Scheduled reminders and due-date alerts' },
              { id: 'overdue',   name: 'Overdue Alerts',     deepLink: '/',          importance: 'high',    sound: 'default', repeatEnabled: false, description: 'Alerts for overdue tasks or items' },
              { id: 'calendar',  name: 'Calendar Events',    deepLink: '/calendar',  importance: 'high',    sound: 'default', repeatEnabled: false, description: 'Upcoming calendar event notifications' },
              { id: 'digest',    name: 'Daily Digest',       deepLink: '/',          importance: 'default', sound: 'none',    repeatEnabled: true,  description: 'Daily summary of activity and progress' },
              { id: 'in-app',    name: 'In-App Alerts',      deepLink: '/',          importance: 'default', sound: 'default', repeatEnabled: false, description: 'General in-app notifications and updates' },
              { id: 'email',     name: 'Email Notifications',deepLink: '/',          importance: 'low',     sound: 'none',    repeatEnabled: false, description: 'Mirrors of email notifications sent by the app' },
              { id: 'slack',     name: 'Slack Updates',      deepLink: '/',          importance: 'default', sound: 'none',    repeatEnabled: false, description: 'Notifications mirrored from Slack integration' },
            ]

            for (const seed of SEED_CHANNELS) {
              if (!seededIds.has(seed.id) && seeded.length < 8) {
                seeded.push(seed)
              }
            }

            result.suggestedChannels = seeded
            if (result.confidence.suggestedChannels !== 'found') {
              result.confidence.suggestedChannels = 'inferred'
            }
          }
        }
      }

      // ── Defaults for missing required fields ──────────────────────────────
      if (!result.appName) { result.appName = new URL(url).hostname.split('.')[0]; result.confidence.appName = 'default' }
      if (!result.themeColor) { result.themeColor = '#1e40af'; result.confidence.themeColor = 'default' }
      if (!result.deepLinks || Object.keys(result.deepLinks).length === 0) { result.deepLinks = { Home: '/' }; result.confidence.deepLinks = 'default' }
      if (!result.suggestedChannels || result.suggestedChannels.length === 0) {
        result.suggestedChannels = [{ id: 'general', name: 'General', deepLink: '/', importance: 'default', sound: 'default', repeatEnabled: false }]
        result.confidence.suggestedChannels = 'default'
      }
      // Ensure capabilityReport always present (even if scan skipped)
      if (!result.capabilityReport) result.capabilityReport = []

      return { status: 200, jsonBody: result }
    } catch (err: any) {
      return { status: err.message?.includes('token') || err.message?.includes('Unauthorised') ? 401 : 500, jsonBody: { error: err.message } }
    }
  }
})
