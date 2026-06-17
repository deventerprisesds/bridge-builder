import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { scanWebapp, triggerBuild, storeApiKeys, ScanResult } from '../lib/apiClient'
import { useSaveApp } from '../hooks/useApps'
import { ScanProgress } from '../components/ScanProgress'
import { ConfigEditor, scanResultToConfig } from '../components/ConfigEditor'
import { BridgeConfig } from '../lib/apiClient'

type Step = 1 | 2 | 3 | 4

export default function AddApp() {
  const navigate = useNavigate()
  const { mutateAsync: saveApp } = useSaveApp()

  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')

  // Step 1 fields
  const [url, setUrl]               = useState('')
  const [githubUrl, setGithubUrl]   = useState('')
  const [openAiKey, setOpenAiKey]   = useState('')
  const [githubToken, setGithubToken] = useState('')

  // Step 2 / 3
  const [scanning, setScanning]       = useState(false)
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null)
  const [config, setConfig]           = useState<BridgeConfig | null>(null)

  // Step 4
  const [building, setBuilding]     = useState(false)
  const [savedAppId, setSavedAppId] = useState('')

  // ── Step 1 → 2: store keys + scan ────────────────────────────────────────
  async function handleScan() {
    setError('')
    if (!url) { setError('Enter a URL first'); return }

    try {
      // Store API keys if provided
      if (openAiKey || githubToken) {
        await storeApiKeys({ openAiKey: openAiKey || undefined, githubToken: githubToken || undefined })
      }

      setStep(2)
      setScanning(true)

      const result = await scanWebapp(url, githubUrl || undefined)
      setScanResult(result)
      setConfig(scanResultToConfig(result, url))
      setScanning(false)
      setStep(3)
    } catch (err: any) {
      setScanning(false)
      setError(err.message)
      setStep(1)
    }
  }

  // ── Step 3 → 4: save app + trigger build ─────────────────────────────────
  async function handleBuild() {
    if (!config) return
    setBuilding(true)
    setError('')

    try {
      // Persist the app record
      const appId = savedAppId || (await saveApp({
        appName:       config.appName,
        baseUrl:       config.baseUrl,
        githubRepoUrl: githubUrl || undefined,
        iconUrl:       config.iconUrl,
        themeColor:    config.themeColor,
        configJson:    JSON.stringify(config)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">Add webapp</h1>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex gap-6">
          {(['Details', 'Scanning', 'Configure', 'Build'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium
                ${step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: URL + Keys ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webapp URL <span className="text-red-500">*</span>
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://myapp.com"
                type="url"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repo URL <span className="text-gray-400 text-xs">(optional — enables GPT-4o scan)</span>
              </label>
              <input
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://github.com/owner/repo"
              />
            </div>

            <hr className="border-gray-100" />

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">API Keys</p>
              <p className="text-xs text-gray-500 mb-3">
                Stored encrypted in Azure. Required only once.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">OpenAI API Key</label>
                  <input
                    value={openAiKey}
                    onChange={e => setOpenAiKey(e.target.value)}
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">GitHub Token</label>
                  <input
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="ghp_..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleScan}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg
                         text-sm font-medium transition-colors"
            >
              Scan webapp →
            </button>
          </div>
        )}

        {/* ── Step 2: Scanning ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h2 className="text-lg font-medium mb-2">Scanning {url}</h2>
            <p className="text-gray-500 text-sm mb-6">
              Analysing your webapp to generate the bridge configuration…
            </p>
            <ScanProgress scanning={scanning} />
          </div>
        )}

        {/* ── Step 3: ConfigEditor ──────────────────────────────────────── */}
        {step === 3 && config && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="font-medium text-gray-900">Review configuration</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Dots indicate confidence:&nbsp;
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Found&nbsp;&nbsp;
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Inferred&nbsp;&nbsp;
                <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />Default
              </p>
            </div>

            <ConfigEditor
              config={config}
              confidence={scanResult?.confidence}
              onChange={setConfig}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Preview + Build ───────────────────────────────────── */}
        {step === 4 && config && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <h2 className="font-medium text-gray-900">Ready to build</h2>

            {/* Config summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                {config.iconUrl ? (
                  <img src={config.iconUrl} alt="" className="w-10 h-10 rounded-lg object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: config.themeColor }}>
                    {config.appName[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{config.appName}</p>
                  <p className="text-gray-500 text-xs">{config.baseUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: config.themeColor }} />
                <span className="text-gray-600">{config.themeColor}</span>
              </div>
              <p className="text-gray-600">
                {Object.keys(config.deepLinks).length} deep links ·{' '}
                {config.channels.length} notification channel{config.channels.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Config JSON preview */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                View bridge.config.json
              </summary>
              <pre className="mt-2 bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-auto max-h-64">
                {JSON.stringify(config, null, 2)}
              </pre>
            </details>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Edit
              </button>
              <button
                onClick={handleBuild}
                disabled={building}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                           text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {building ? 'Triggering build…' : 'Build APK'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
