import { BuildJob } from '../lib/apiClient'

export function ApkDownloadButton({ job }: { job?: BuildJob }) {
  if (!job || job.Status !== 'ready' || !job.downloadUrl) return null

  return (
    <a
      href={job.downloadUrl}
      download
      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700
                 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download APK {job.ApkVersion ? `(v${job.ApkVersion})` : ''}
    </a>
  )
}
