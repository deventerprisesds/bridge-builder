type Status = 'pending' | 'building' | 'ready' | 'failed' | undefined

const config: Record<NonNullable<Status>, { label: string; classes: string; dot?: string }> = {
  pending:  {
    label: 'Pending',
    classes: 'bg-warning-subtle text-warning border border-yellow-200',
  },
  building: {
    label: 'Building',
    classes: 'bg-info-subtle text-info border border-blue-200',
    dot: 'bg-info animate-ping',
  },
  ready: {
    label: 'Ready',
    classes: 'bg-success-subtle text-success border border-green-200',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-error-subtle text-error border border-red-200',
  },
}

export function BuildStatusBadge({ status }: { status?: Status }) {
  if (!status) return null
  const { label, classes, dot } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-xs font-medium ${classes}`}>
      {dot ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dot}`} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-info" />
        </span>
      ) : null}
      {label}
    </span>
  )
}
