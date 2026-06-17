import { useEffect, useState } from 'react'

const STEPS = [
  'Fetching page HTML…',
  'Reading manifest.json…',
  'Checking for bridge.config.json…',
  'Fetching GitHub source files…',
  'Analysing with GPT-4o…',
  'Generating configuration…'
]

export function ScanProgress({ scanning }: { scanning: boolean }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!scanning) {
      setStep(0)
      setProgress(0)
      return
    }
    const interval = setInterval(() => {
      setStep(s => {
        const next = Math.min(s + 1, STEPS.length - 1)
        return next
      })
      setProgress(p => Math.min(p + 100 / STEPS.length, 95))
    }, 4000)
    return () => clearInterval(interval)
  }, [scanning])

  return (
    <div className="space-y-4">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-700"
          style={{ width: `${scanning ? progress : 100}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {STEPS[step]}
      </div>
    </div>
  )
}
