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
    ...Object.values(deepLinks).filter(v => !DEFAULT_DEEP_LINKS.includes(v)),
  ]

  function update(i: number, patch: Partial<Channel>) {
    onChange(channels.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function addChannel() {
    onChange([...channels, {
      id: `channel_${Date.now()}`,
      name: 'New Channel',
      deepLink: '/',
      importance: 'default',
      sound: 'default',
      repeatEnabled: false,
    }])
  }

  function remove(i: number) {
    onChange(channels.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {channels.map((ch, i) => (
        <div key={i}
          className="border border-neutral-200 rounded-lg p-4 space-y-3 bg-neutral-50
                     hover:border-neutral-300 transition-colors duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-label-md font-medium text-neutral-700">
              Channel {i + 1}
            </span>
            <button
              onClick={() => remove(i)}
              className="text-caption-md text-neutral-400 hover:text-error
                         transition-colors duration-150 px-1.5 py-0.5 rounded"
            >
              Remove
            </button>
          </div>

          {/* Name + ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-caption-md">Name</label>
              <input
                value={ch.name}
                onChange={e => update(i, { name: e.target.value })}
                className="input text-body-sm py-1.5"
                placeholder="e.g. Alerts"
              />
            </div>
            <div>
              <label className="form-label text-caption-md">ID</label>
              <input
                value={ch.id}
                onChange={e => update(i, { id: e.target.value })}
                className="input text-body-sm py-1.5 font-mono"
                placeholder="alerts"
              />
            </div>
          </div>

          {/* Deep link + Importance + Sound */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label text-caption-md">Deep Link</label>
              <select
                value={ch.deepLink}
                onChange={e => update(i, { deepLink: e.target.value })}
                className="input text-body-sm py-1.5 cursor-pointer"
              >
                {deepLinkOptions.map(dl => <option key={dl} value={dl}>{dl}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-caption-md">Importance</label>
              <select
                value={ch.importance}
                onChange={e => update(i, { importance: e.target.value })}
                className="input text-body-sm py-1.5 cursor-pointer"
              >
                {IMPORTANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-caption-md">Sound</label>
              <select
                value={ch.sound}
                onChange={e => update(i, { sound: e.target.value })}
                className="input text-body-sm py-1.5 cursor-pointer"
              >
                {SOUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Repeat toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              onClick={() => update(i, { repeatEnabled: !ch.repeatEnabled })}
              className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 cursor-pointer
                          ${ch.repeatEnabled ? 'bg-brand-600' : 'bg-neutral-200'}`}
              style={{ height: '18px', width: '32px' }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full
                             shadow-elevation-1 transition-transform duration-200
                             ${ch.repeatEnabled ? 'translate-x-3.5' : 'translate-x-0'}`}
                style={{ width: '14px', height: '14px' }}
              />
            </div>
            <span className="text-body-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
              Repeat enabled
            </span>
          </label>
        </div>
      ))}

      {/* Add channel button */}
      <button
        onClick={addChannel}
        className="w-full border-2 border-dashed border-neutral-200 rounded-lg py-2.5
                   text-body-sm text-neutral-400 font-medium
                   hover:border-brand-300 hover:text-brand-600
                   hover:bg-brand-50
                   transition-all duration-150"
      >
        + Add notification channel
      </button>
    </div>
  )
}
