import { BuildJob } from '../lib/apiClient'

export function ApkDownloadButton({ job }: { job?: BuildJob }) {
  if (!job || job.Status !== 'ready' || !job.downloadUrl) return null

  return (
    <a
      href={job.downloadUrl}
      download
      className="inline-flex items-center gap-2
                 rounded-md bg-success px-4 py-2
                 text-label-md font-medium text-white
                 shadow-elevation-1
                 hover:bg-green-700 active:bg-green-800
                 transition-colors duration-150"
    >
      {/* Download icon */}
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download APK{job.ApkVersion ? ` — v${job.ApkVersion}` : ''}
    </a>
  )
}
