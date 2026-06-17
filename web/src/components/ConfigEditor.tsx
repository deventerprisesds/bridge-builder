import { BridgeConfig, ScanResult, Channel } from '../lib/apiClient'
import { ChannelEditor } from './ChannelEditor'

interface Props {
  config: BridgeConfig
  confidence?: Record<string, string>
  onChange: (config: BridgeConfig) => void
}

/** Compass confidence dot — green = found, amber = inferred, grey = default */
function ConfidenceDot({ level }: { level?: string }) {
  if (!level) return null
  const title =
    level === 'found'    ? 'Found in source' :
    level === 'inferred' ? 'Inferred by AI'  : 'Default value'
  const colour =
    level === 'found'    ? 'bg-success'       :
    level === 'inferred' ? 'bg-warning'       : 'bg-neutral-300'

  return (
    <span
      title={title}
      className={`inline-block w-1.5 h-1.5 rounded-full ${colour} ml-1 flex-shrink-0`}
    />
  )
}

function FieldLabel({
  children,
  confidence,
}: {
  children: React.ReactNode
  confidence?: string
}) {
  return (
    <label className="flex items-center gap-1 form-label">
      {children}
      <ConfidenceDot level={confidence} />
    </label>
  )
}

export function ConfigEditor({ config, confidence = {}, onChange }: Props) {
  function set<K extends keyof BridgeConfig>(key: K, value: BridgeConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-5">

      {/* App Name */}
      <div>
        <FieldLabel confidence={confidence.appName}>App Name</FieldLabel>
        <input
          value={config.appName}
          onChange={e => set('appName', e.target.value)}
          className="input"
          placeholder="My App"
        />
      </div>

      {/* Base URL */}
      <div>
        <FieldLabel>Base URL</FieldLabel>
        <input
          value={config.baseUrl}
          onChange={e => set('baseUrl', e.target.value)}
          className="input font-mono"
          placeholder="https://myapp.com"
        />
      </div>

      {/* Theme Colour */}
      <div>
        <FieldLabel confidence={confidence.themeColor}>Theme Colour</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.themeColor}
            onChange={e => set('themeColor', e.target.value)}
            className="w-10 h-9 border border-neutral-200 rounded-md cursor-pointer p-0.5
                       bg-white shadow-elevation-0 flex-shrink-0"
          />
          <input
            value={config.themeColor}
            onChange={e => set('themeColor', e.target.value)}
            className="input font-mono"
            placeholder="#1b4f5c"
          />
        </div>
      </div>

      {/* Icon URL */}
      <div>
        <FieldLabel confidence={confidence.iconUrl}>Icon URL</FieldLabel>
        <input
          value={config.iconUrl ?? ''}
          onChange={e => set('iconUrl', e.target.value)}
          className="input font-mono"
          placeholder="https://myapp.com/icon-512.png"
        />
        {config.iconUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={config.iconUrl}
              alt="Icon preview"
              className="w-10 h-10 rounded-lg object-contain border border-neutral-200
                         shadow-elevation-0"
            />
            <span className="text-caption-md text-neutral-400">Preview</span>
          </div>
        )}
      </div>

      {/* Widget Data URL */}
      <div>
        <FieldLabel confidence={confidence.widgetDataUrl}>Widget Data URL</FieldLabel>
        <input
          value={config.widgetDataUrl ?? ''}
          onChange={e => set('widgetDataUrl', e.target.value)}
          className="input font-mono"
          placeholder="https://myapp.com/api/widget-data"
        />
        <p className="form-hint">Used for Android home-screen widget</p>
      </div>

      {/* Divider */}
      <hr className="border-neutral-200" />

      {/* Deep Links */}
      <div>
        <FieldLabel confidence={confidence.deepLinks}>Deep Links</FieldLabel>
        <div className="space-y-2">
          {Object.entries(config.deepLinks).map(([name, path]) => (
            <div key={name} className="flex items-center gap-2">
              <input
                value={name}
                onChange={e => {
                  const updated = { ...config.deepLinks }
                  delete updated[name]
                  updated[e.target.value] = path
                  set('deepLinks', updated)
                }}
                className="input w-28 flex-shrink-0"
                placeholder="Label"
              />
              <span className="text-neutral-300 font-mono">→</span>
              <input
                value={path}
                onChange={e => set('deepLinks', { ...config.deepLinks, [name]: e.target.value })}
                className="input flex-1 font-mono"
                placeholder="/route"
              />
              <button
                onClick={() => {
                  const updated = { ...config.deepLinks }
                  delete updated[name]
                  set('deepLinks', updated)
                }}
                className="w-7 h-7 flex items-center justify-center rounded text-neutral-400
                           hover:bg-error-subtle hover:text-error transition-colors duration-150
                           flex-shrink-0 text-body-sm"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => set('deepLinks', { ...config.deepLinks, 'New': '/' })}
            className="text-body-sm text-brand-600 hover:text-brand-700 font-medium
                       transition-colors duration-150"
          >
            + Add deep link
          </button>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-neutral-200" />

      {/* Channels */}
      <div>
        <FieldLabel confidence={confidence.suggestedChannels}>
          Notification Channels
        </FieldLabel>
        <ChannelEditor
          channels={config.channels}
          deepLinks={config.deepLinks}
          onChange={ch => set('channels', ch)}
        />
      </div>
    </div>
  )
}

/** Convert a ScanResult into an initial BridgeConfig */
export function scanResultToConfig(scan: ScanResult, baseUrl: string): BridgeConfig {
  return {
    appName:      scan.appName    ?? new URL(baseUrl).hostname,
    baseUrl,
    themeColor:   scan.themeColor ?? '#1b4f5c',
    iconUrl:      scan.iconUrl,
    deepLinks:    scan.deepLinks  ?? { Home: '/' },
    channels:     scan.suggestedChannels ?? [
      { id: 'general', name: 'General', deepLink: '/', importance: 'default', sound: 'default', repeatEnabled: false },
    ],
    widgetDataUrl: scan.widgetDataUrlHint,
  }
}
