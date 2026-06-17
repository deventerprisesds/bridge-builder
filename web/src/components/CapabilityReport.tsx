import { CapabilityReportItem, ANDROID_CAPABILITY_CHECKLIST } from '../lib/apiClient'

interface Props {
  report: CapabilityReportItem[]
}

const VERDICT_STYLE = {
  satisfied:                  { dot: 'bg-success',     label: 'Satisfied',    text: 'text-success' },
  applicable_not_implemented: { dot: 'bg-warning',     label: 'Gap',          text: 'text-warning' },
  not_applicable:             { dot: 'bg-neutral-300', label: 'N/A',          text: 'text-neutral-400' },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  push_notifications:    'Notifications',
  notification_channels: 'Notifications',
  voice_input:           'Voice',
  home_widget:           'Widget',
  app_shortcuts:         'Shortcuts',
  quick_tile:            'System UI',
  deep_links:            'Navigation',
  background_sync:       'Background',
  lock_screen_actions:   'Lock Screen',
}

export function CapabilityReport({ report }: Props) {
  // Build a lookup from the report
  const byId = Object.fromEntries(report.map(r => [r.checklistId, r]))

  const items = ANDROID_CAPABILITY_CHECKLIST.map(c => ({
    ...c,
    result: byId[c.id] ?? null,
  }))

  const satisfied = items.filter(i => i.result?.verdict === 'satisfied').length
  const gaps      = items.filter(i => i.result?.verdict === 'applicable_not_implemented').length

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-caption-md">
        <span className="flex items-center gap-1.5 text-success font-medium">
          <span className="w-2 h-2 rounded-full bg-success inline-block" />
          {satisfied} satisfied
        </span>
        {gaps > 0 && (
          <span className="flex items-center gap-1.5 text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
            {gaps} gap{gaps !== 1 ? 's' : ''} identified
          </span>
        )}
      </div>

      {/* Checklist */}
      <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
        {items.map(item => {
          const r = item.result
          const verdict = r?.verdict ?? 'not_applicable'
          const style = VERDICT_STYLE[verdict]

          return (
            <details key={item.id} className="group">
              <summary className="flex items-center gap-3 px-4 py-2.5 cursor-pointer
                                  hover:bg-neutral-50 transition-colors select-none list-none">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <span className="flex-1 text-body-sm text-neutral-800">{item.label}</span>
                <span className={`text-caption-md font-medium flex-shrink-0 ${style.text}`}>
                  {style.label}
                </span>
                <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 transition-transform group-open:rotate-90"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>

              {r && (
                <div className="px-4 pb-3 pt-1 bg-neutral-50 space-y-2 text-caption-md">
                  <p className="text-neutral-700">{r.finding}</p>

                  {r.currentBehaviour && verdict !== 'not_applicable' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded p-2 border border-neutral-200">
                        <p className="text-neutral-400 mb-0.5 text-label-xs uppercase tracking-wide">Current</p>
                        <p className="text-neutral-700">{r.currentBehaviour}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-brand-200">
                        <p className="text-brand-400 mb-0.5 text-label-xs uppercase tracking-wide">Android</p>
                        <p className="text-neutral-700">{r.androidMapping}</p>
                      </div>
                    </div>
                  )}

                  {r.file && (
                    <p className="text-neutral-400 font-mono">
                      {r.file}{r.line ? `:${r.line}` : ''}
                    </p>
                  )}
                </div>
              )}

              {!r && (
                <div className="px-4 pb-3 pt-1 bg-neutral-50 text-caption-md text-neutral-400">
                  Not assessed — no GitHub repo provided or file not analysed.
                </div>
              )}
            </details>
          )
        })}
      </div>
    </div>
  )
}
