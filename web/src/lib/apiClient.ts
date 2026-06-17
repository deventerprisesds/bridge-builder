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
export const storeApiKeys = (keys: { openAiKey?: string; githubToken?: string }) =>
  request<{ stored: boolean }>('POST', '/storeApiKeys', keys)

// ── Scan ──────────────────────────────────────────────────────────────────────
export const scanWebapp = (url: string, githubRepoUrl?: string) =>
  request<ScanResult>('POST', '/scanWebapp', { url, githubRepoUrl })

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

export interface ScanResult {
  appName?: string
  themeColor?: string
  iconUrl?: string
  voiceContextFound?: boolean
  routes?: string[]
  deepLinks?: Record<string, string>
  suggestedChannels?: Channel[]
  widgetDataUrlHint?: string
  confidence: Record<string, 'found' | 'inferred' | 'default'>
}

export interface Channel {
  id: string
  name: string
  deepLink: string
  importance: string
  sound: string
  repeatEnabled: boolean
}

export interface BridgeConfig {
  appName: string
  baseUrl: string
  themeColor: string
  iconUrl?: string
  deepLinks: Record<string, string>
  channels: Channel[]
  widgetDataUrl?: string
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
