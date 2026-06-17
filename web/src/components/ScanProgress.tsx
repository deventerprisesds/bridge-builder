import { useEffect, useState } from 'react'

const STEPS = [
  'Fetching page HTML…',
  'Reading manifest.json…',
  'Checking for bridge.config.json…',
  'Fetching GitHub source files…',
  'Analysing with GPT-4o…',
  'Generating configuration…',
]

export function ScanProgress({ scanning }: { scanning: boolean }) {
  const [step, setStep] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (!scanning) { setStep(0); setPct(0); return }

    const tick = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1))
      setPct(p => Math.min(p + 100 / STEPS.length, 95))
    }, 4000)

    return () => clearInterval(tick)
  }, [scanning])

  return (
    <div className="space-y-4 w-full">
      {/* Progress bar */}
      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out"
          style={{ width: `${scanning ? pct : 100}%` }}
        />
      </div>

      {/* Current step */}
      <div className="flex items-center gap-2.5 text-body-sm text-neutral-500">
        {/* Compass-style spinner */}
        <svg
          className="w-4 h-4 text-brand-500 flex-shrink-0"
          style={{ animation: 'spin 1s linear infinite' }}
          fill="none" viewBox="0 0 24 24"
        >
          <circle className="opacity-20" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{STEPS[step]}</span>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i < step ? 'bg-brand-500 w-4' :
              i === step ? 'bg-brand-300 w-6' :
              'bg-neutral-200 w-4'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
