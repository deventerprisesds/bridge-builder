import { getToken } from './b2cAuth'

const BASE = import.meta.env.VITE_API_BASE_URL as string

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Apps ──────────────────────────────────────────────────────────────────────
export const getApps = () => request<App[]>('GET', '/getApps')

export interface SaveAppRequest {
  appId?: string
  appName: string
  baseUrl: string
  githubRepoUrl?: string
  iconUrl?: string
  themeColor?: string
  configJson?: string
}

export const saveApp = (data: SaveAppRequest) =>
  request<{ appId: string }>('POST', '/saveApp', data)

export const deleteApp = (appId: string) =>
  request<{ deleted: boolean }>('DELETE', `/deleteApp?appId=${appId}`)

// ── Keys ──────────────────────────────────────────────────────────────────────
export const storeApiKeys = (keys: { openAiKey?: string; githubToken?: string; figmaToken?: string }) =>
  request<{ stored: boolean }>('POST', '/storeApiKeys', keys)

export const getApiKeyStatus = () =>
  request<{ hasOpenAiKey: boolean; hasGithubToken: boolean; hasFigmaToken: boolean }>('GET', '/getApiKeyStatus')

// ── Scan ──────────────────────────────────────────────────────────────────────
export const scanWebapp = (url: string, githubRepoUrl?: string, figmaFileId?: string) =>
  request<ScanResult>('POST', '/scanWebapp', { url, githubRepoUrl, figmaFileId })

// ── Build ─────────────────────────────────────────────────────────────────────
export const triggerBuild = (appId: string, config: BridgeConfig) =>
  request<{ jobId: string; version: string }>('POST', '/triggerBuild', { appId, config })

export const getBuildStatus = (appId: string, jobId?: string) => {
  const qs = jobId ? `appId=${appId}&jobId=${jobId}` : `appId=${appId}`
  return request<BuildJob>('GET', `/getBuildStatus?${qs}`)
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface App {
  rowKey: string
  AppName: string
  BaseUrl: string
  GithubRepoUrl: string
  IconUrl: string
  ThemeColor: string
  ConfigJson: string
  ConfigCommittedAt: string
  CreatedAt: string
  UpdatedAt: string
}

export interface CapabilityReportItem {
  checklistId: string
  verdict: 'satisfied' | 'applicable_not_implemented' | 'not_applicable'
  finding: string
  file: string
  line: number
  currentBehaviour: string
  androidMapping: string
  confidence: 'found' | 'inferred' | 'default'
}

export const ANDROID_CAPABILITY_CHECKLIST = [
  { id: 'push_notifications',    label: 'Push notifications' },
  { id: 'notification_channels', label: 'Notification channels' },
  { id: 'voice_input',           label: 'Voice input / talk button' },
  { id: 'home_widget',           label: 'Home screen widget' },
  { id: 'app_shortcuts',         label: 'Long-press app shortcuts' },
  { id: 'quick_tile',            label: 'Quick settings tile' },
  { id: 'deep_links',            label: 'Deep linking' },
  { id: 'background_sync',       label: 'Background data sync' },
  { id: 'lock_screen_actions',   label: 'Lock screen actions' },
] as const

export interface ScanResult {
  appName?: string
  themeColor?: string
  iconUrl?: string
  voiceContextFound?: boolean
  routes?: string[]
  deepLinks?: Record<string, string>
  suggestedChannels?: Channel[]
  widgetDataUrlHint?: string
  compassThemeColor?: string
  figmaStyles?: Record<string, string>
  capabilityReport?: CapabilityReportItem[]
  scanError?: string
  confidence: Record<string, 'found' | 'inferred' | 'default'>
}

export interface Channel {
  id: string
  name: string
  description?: string
  deepLink: string
  importance: string
  sound: string
  repeatEnabled: boolean
}

/** Mirrors Kotlin NotificationsConfig */
export interface NotificationsConfig {
  channels: Channel[]
}

/** Mirrors Kotlin WidgetConfig */
export interface WidgetConfig {
  enabled: boolean
  name: string
  dataUrl: string
  refreshMinutes: number
  tapDeepLink: string
}

/**
 * The canonical bridge.config.json shape — must match BridgeConfig.kt exactly
 * so Gson deserialises every field without silent fallbacks.
 */
export interface BridgeConfig {
  appName: string
  baseUrl: string
  themeColor: string
  iconUrl?: string
  deepLinks: Record<string, string>
  notifications: NotificationsConfig
  widget: WidgetConfig
  version?: string
}

export interface BuildJob {
  rowKey: string
  AppId: string
  Status: 'pending' | 'building' | 'ready' | 'failed'
  GithubRunId?: string
  ApkBlobPath?: string
  ApkVersion?: string
  ErrorMessage?: string
  StartedAt: string
  CompletedAt?: string
  downloadUrl?: string
}
