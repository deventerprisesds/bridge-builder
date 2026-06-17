type Status = 'pending' | 'building' | 'ready' | 'failed' | undefined

const config: Record<NonNullable<Status>, { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-yellow-100 text-yellow-800' },
  building: { label: 'Building', classes: 'bg-blue-100 text-blue-800 animate-pulse' },
  ready:    { label: 'Ready',    classes: 'bg-green-100 text-green-800' },
  failed:   { label: 'Failed',   classes: 'bg-red-100 text-red-800' }
}

export function BuildStatusBadge({ status }: { status?: Status }) {
  if (!status) return null
  const { label, classes } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {status === 'building' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
      )}
      {label}
    </span>
  )
}
