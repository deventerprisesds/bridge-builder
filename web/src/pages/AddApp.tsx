import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { scanWebapp, triggerBuild, storeApiKeys, ScanResult, BridgeConfig } from '../lib/apiClient'
import { useSaveApp } from '../hooks/useApps'
import { ScanProgress } from '../components/ScanProgress'
import { ConfigEditor, scanResultToConfig } from '../components/ConfigEditor'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['Details', 'Scanning', 'Configure', 'Build']

export default function AddApp() {
  const navigate = useNavigate()
  const { mutateAsync: saveApp } = useSaveApp()

  const [step, setStep]     = useState<Step>(1)
  const [error, setError]   = useState('')

  // Step 1
  const [url, setUrl]                   = useState('')
  const [githubUrl, setGithubUrl]       = useState('')
  const [openAiKey, setOpenAiKey]       = useState('')
  const [githubToken, setGithubToken]   = useState('')

  function fillTestData() {
    setUrl('https://journey-voice.lovable.app')
    setGithubUrl('https://github.com/deventerprisesds/journey-voice')
  }

  // Step 2/3
  const [scanning, setScanning]     = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [config, setConfig]         = useState<BridgeConfig | null>(null)

  // Step 4
  const [building, setBuilding]     = useState(false)
  const [savedAppId, setSavedAppId] = useState('')

  async function handleScan() {
    setError('')
    if (!url) { setError('Please enter a webapp URL to continue.'); return }
    try {
      if (openAiKey || githubToken)
        await storeApiKeys({
          openAiKey: openAiKey || undefined,
          githubToken: githubToken || undefined,
        })

      setStep(2); setScanning(true)
      const result = await scanWebapp(url, githubUrl || undefined)
      setScanResult(result)
      setConfig(scanResultToConfig(result, url))
      setScanning(false)
      setStep(3)
    } catch (err: any) {
      setScanning(false); setError(err.message); setStep(1)
    }
  }

  async function handleBuild() {
    if (!config) return
    setBuilding(true); setError('')
    try {
      const appId = savedAppId || (await saveApp({
        appName:       config.appName,
        baseUrl:       config.baseUrl,
        githubRepoUrl: githubUrl || undefined,
        iconUrl:       config.iconUrl,
        themeColor:    config.themeColor,
        configJson:    JSON.stringify(config),
      })).appId
      setSavedAppId(appId)
      await triggerBuild(appId, config)
      navigate(`/app/${appId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-neutral-0 border-b border-neutral-200 sticky top-0 z-20 shadow-elevation-0">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/" className="w-8 h-8 rounded-md flex items-center justify-center
                                  text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700
                                  transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-label-lg font-semibold text-neutral-900">Add webapp</h1>
        </div>
      </header>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      <div className="bg-neutral-0 border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const s = i + 1
              const done    = step > s
              const current = step === s
              return (
                <div key={label} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className={`h-px w-6 ${done || current ? 'bg-brand-300' : 'bg-neutral-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center
                                     text-label-xs font-semibold transition-colors duration-200
                                     ${done    ? 'bg-brand-600 text-white' :
                                       current ? 'bg-brand-700 text-white ring-4 ring-brand-100' :
                                       'bg-neutral-100 text-neutral-400'}`}>
                      {done ? '✓' : s}
                    </div>
                    <span className={`text-label-sm hidden sm:block ${
                      current ? 'text-neutral-900 font-medium' :
                      done    ? 'text-neutral-500' : 'text-neutral-300'
                    }`}>
                      {label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Error alert */}
        {error && (
          <div className="alert-error mb-4">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-body-sm font-medium">{error}</span>
          </div>
        )}

        {/* ── Step 1: URL + API Keys ──────────────────────────────────── */}
        {step === 1 && (
          <div className="card rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-label-sm text-neutral-400">Enter details or use test data to get started quickly.</p>
              <button
                type="button"
                onClick={fillTestData}
                className="btn-ghost py-1 px-3 text-body-sm text-brand-600 hover:bg-brand-50"
              >
                ⚡ Fill test data
              </button>
            </div>

            <div>
              <label className="form-label">
                Webapp URL <span className="text-error">*</span>
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="input"
                type="url"
                placeholder="https://myapp.com"
              />
              <p className="form-hint">The URL Bridge Builder will wrap in a native shell.</p>
            </div>

            <div>
              <label className="form-label">
                GitHub Repo URL
                <span className="ml-1.5 badge-neutral text-label-xs">optional</span>
              </label>
              <input
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                className="input font-mono"
                placeholder="https://github.com/owner/repo"
              />
              <p className="form-hint">Enables GPT-4o source-code scan for better config inference.</p>
            </div>

            <hr className="border-neutral-200" />

            <div>
              <p className="text-label-md font-medium text-neutral-700 mb-1">API Keys</p>
              <p className="form-hint mb-3">
                Stored AES-256 encrypted in Azure. Only required once.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="form-label">OpenAI API Key</label>
                  <input
                    value={openAiKey}
                    onChange={e => setOpenAiKey(e.target.value)}
                    type="password"
                    className="input font-mono"
                    placeholder="sk-…"
                  />
                </div>
                <div>
                  <label className="form-label">GitHub Token</label>
                  <input
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    type="password"
                    className="input font-mono"
                    placeholder="ghp_…"
                  />
                </div>
              </div>
            </div>

            <button onClick={handleScan} className="btn-primary w-full justify-center py-2.5">
              Scan webapp
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 2: Scanning ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="card rounded-lg p-8 text-center space-y-6">
            <div>
              <h2 className="text-h3 font-bold text-neutral-900 mb-1">
                Scanning your webapp
              </h2>
              <p className="text-body-sm text-neutral-500">
                {url}
              </p>
            </div>
            <ScanProgress scanning={scanning} />
            <p className="text-caption-md text-neutral-400">
              This may take up to 30 seconds if using GPT-4o analysis.
            </p>
          </div>
        )}

        {/* ── Step 3: Config review ──────────────────────────────────── */}
        {step === 3 && config && (
          <div className="card rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-h4 font-bold text-neutral-900 mb-1">
                Review configuration
              </h2>
              <div className="flex items-center gap-4 text-caption-md text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                  Found in source
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
                  Inferred by AI
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300" />
                  Default value
                </span>
              </div>
            </div>

            <ConfigEditor
              config={config}
              confidence={scanResult?.confidence}
              onChange={setConfig}
            />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-2.5">
                ← Back
              </button>
              <button onClick={() => setStep(4)} className="btn-primary flex-1 justify-center py-2.5">
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Preview + Build ────────────────────────────────── */}
        {step === 4 && config && (
          <div className="card rounded-lg p-6 space-y-6">
            <h2 className="text-h4 font-bold text-neutral-900">Ready to build</h2>

            {/* Summary card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                {config.iconUrl ? (
                  <img src={config.iconUrl} alt="" className="w-12 h-12 rounded-lg object-contain
                                                               border border-neutral-100" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center
                                  text-white text-h5 font-bold"
                    style={{ backgroundColor: config.themeColor }}>
                    {config.appName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-label-lg font-semibold text-neutral-900">{config.appName}</p>
                  <p className="text-caption-md text-neutral-400">{config.baseUrl}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-body-sm text-neutral-600">
                <span className="w-4 h-4 rounded border border-neutral-200"
                  style={{ backgroundColor: config.themeColor }} />
                {config.themeColor}
                <span className="text-neutral-300 mx-1">·</span>
                {Object.keys(config.deepLinks).length} deep links
                <span className="text-neutral-300 mx-1">·</span>
                {config.channels.length} notification channel{config.channels.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* JSON preview */}
            <details className="group">
              <summary className="cursor-pointer text-body-sm text-neutral-500
                                  hover:text-neutral-700 select-none list-none
                                  flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                View bridge.config.json
              </summary>
              <pre className="mt-3 bg-neutral-900 text-brand-200 text-caption-md rounded-lg
                              p-4 overflow-auto max-h-64 leading-relaxed">
                {JSON.stringify(config, null, 2)}
              </pre>
            </details>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="btn-secondary flex-1 justify-center py-2.5">
                ← Edit
              </button>
              <button
                onClick={handleBuild}
                disabled={building}
                className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-40"
              >
                {building ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Triggering build…
                  </>
                ) : (
                  <>
                    Build APK
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
