import { Channel } from '../lib/apiClient'

interface Props {
  channels: Channel[]
  deepLinks: Record<string, string>
  onChange: (channels: Channel[]) => void
}

const IMPORTANCE_OPTIONS = ['urgent', 'high', 'default', 'low', 'min']
const SOUND_OPTIONS = ['default', 'none', 'alarm', 'notification']
const DEFAULT_DEEP_LINKS = ['/', '/tasks', '/calendar', '/agenda', '/priorities', '/assignments']

export function ChannelEditor({ channels, deepLinks, onChange }: Props) {
  const deepLinkOptions = [
    ...DEFAULT_DEEP_LINKS,
    ...Object.values(deepLinks).filter(v => !DEFAULT_DEEP_LINKS.includes(v))
  ]

  function update(index: number, patch: Partial<Channel>) {
    const next = channels.map((c, i) => i === index ? { ...c, ...patch } : c)
    onChange(next)
  }

  function addChannel() {
    onChange([...channels, {
      id: `channel_${Date.now()}`,
      name: 'New Channel',
      deepLink: '/',
      importance: 'default',
      sound: 'default',
      repeatEnabled: false
    }])
  }

  function removeChannel(index: number) {
    onChange(channels.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {channels.map((ch, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Channel {i + 1}</span>
            <button
              onClick={() => removeChannel(i)}
              className="text-red-500 hover:text-red-700 text-xs"
            >Remove</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                value={ch.name}
                onChange={e => update(i, { name: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID</label>
              <input
                value={ch.id}
                onChange={e => update(i, { id: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Deep Link</label>
              <select
                value={ch.deepLink}
                onChange={e => update(i, { deepLink: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {deepLinkOptions.map(dl => (
                  <option key={dl} value={dl}>{dl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Importance</label>
              <select
                value={ch.importance}
                onChange={e => update(i, { importance: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {IMPORTANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sound</label>
              <select
                value={ch.sound}
                onChange={e => update(i, { sound: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {SOUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={ch.repeatEnabled}
              onChange={e => update(i, { repeatEnabled: e.target.checked })}
              className="rounded"
            />
            Repeat enabled
          </label>
        </div>
      ))}

      <button
        onClick={addChannel}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2
                   text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600
                   transition-colors"
      >
        + Add channel
      </button>
    </div>
  )
}
