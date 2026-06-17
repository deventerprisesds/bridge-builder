import { BridgeConfig, ScanResult, Channel } from '../lib/apiClient'
import { ChannelEditor } from './ChannelEditor'

interface Props {
  config: BridgeConfig
  confidence?: Record<string, string>
  onChange: (config: BridgeConfig) => void
}

function ConfidenceDot({ level }: { level?: string }) {
  if (!level) return null
  const colour =
    level === 'found'    ? 'bg-green-500' :
    level === 'inferred' ? 'bg-yellow-400' :
    'bg-gray-300'
  const label =
    level === 'found'    ? 'Found in source' :
    level === 'inferred' ? 'Inferred by AI' :
    'Default value'
  return (
    <span title={label} className={`inline-block w-2 h-2 rounded-full ${colour} ml-1 flex-shrink-0`} />
  )
}

export function ConfigEditor({ config, confidence = {}, onChange }: Props) {
  function set<K extends keyof BridgeConfig>(key: K, value: BridgeConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* App Name */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
          App Name <ConfidenceDot level={confidence.appName} />
        </label>
        <input
          value={config.appName}
          onChange={e => set('appName', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="My App"
        />
      </div>

      {/* Base URL */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
          Base URL
        </label>
        <input
          value={config.baseUrl}
          onChange={e => set('baseUrl', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="https://myapp.com"
        />
      </div>

      {/* Theme Color */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
          Theme Color <ConfidenceDot level={confidence.themeColor} />
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.themeColor}
            onChange={e => set('themeColor', e.target.value)}
            className="w-10 h-9 border border-gray-300 rounded cursor-pointer p-0.5"
          />
          <input
            value={config.themeColor}
            onChange={e => set('themeColor', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="#1e40af"
          />
        </div>
      </div>

      {/* Icon URL */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
          Icon URL <ConfidenceDot level={confidence.iconUrl} />
        </label>
        <input
          value={config.iconUrl ?? ''}
          onChange={e => set('iconUrl', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="https://myapp.com/icon-512.png"
        />
        {config.iconUrl && (
          <img src={config.iconUrl} alt="icon preview"
            className="mt-2 w-12 h-12 rounded-lg object-contain border border-gray-200"
          />
        )}
      </div>

      {/* Widget Data URL */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
          Widget Data URL <ConfidenceDot level={confidence.widgetDataUrl} />
        </label>
        <input
          value={config.widgetDataUrl ?? ''}
          onChange={e => set('widgetDataUrl', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="https://myapp.com/api/widget-data"
        />
      </div>

      {/* Deep Links */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
          Deep Links <ConfidenceDot level={confidence.deepLinks} />
        </label>
        <div className="space-y-2">
          {Object.entries(config.deepLinks).map(([name, path]) => (
            <div key={name} className="flex items-center gap-2">
              <input
                value={name}
                onChange={e => {
                  const newLinks = { ...config.deepLinks }
                  delete newLinks[name]
                  newLinks[e.target.value] = path
                  set('deepLinks', newLinks)
                }}
                className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
                placeholder="Label"
              />
              <span className="text-gray-400">→</span>
              <input
                value={path}
                onChange={e => set('deepLinks', { ...config.deepLinks, [name]: e.target.value })}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                placeholder="/route"
              />
              <button
                onClick={() => {
                  const newLinks = { ...config.deepLinks }
                  delete newLinks[name]
                  set('deepLinks', newLinks)
                }}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => set('deepLinks', { ...config.deepLinks, 'New': '/' })}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Add deep link
          </button>
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
          Notification Channels <ConfidenceDot level={confidence.suggestedChannels} />
        </label>
        <ChannelEditor
          channels={config.channels}
          deepLinks={config.deepLinks}
          onChange={channels => set('channels', channels)}
        />
      </div>
    </div>
  )
}

/** Convert a ScanResult into an initial BridgeConfig */
export function scanResultToConfig(scan: ScanResult, baseUrl: string): BridgeConfig {
  return {
    appName:       scan.appName    ?? new URL(baseUrl).hostname,
    baseUrl,
    themeColor:    scan.themeColor ?? '#1e40af',
    iconUrl:       scan.iconUrl,
    deepLinks:     scan.deepLinks  ?? { Home: '/' },
    channels:      scan.suggestedChannels ?? [
      { id: 'general', name: 'General', deepLink: '/', importance: 'default', sound: 'default', repeatEnabled: false }
    ],
    widgetDataUrl: scan.widgetDataUrlHint
  }
}
