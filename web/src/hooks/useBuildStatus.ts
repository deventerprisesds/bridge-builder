import { useQuery } from '@tanstack/react-query'
import { getBuildStatus, BuildJob } from '../lib/apiClient'

export function useBuildStatus(appId: string | undefined, jobId?: string) {
  return useQuery<BuildJob>({
    queryKey: ['buildStatus', appId, jobId],
    queryFn: () => getBuildStatus(appId!, jobId),
    enabled: !!appId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 5_000
      if (data.Status === 'ready' || data.Status === 'failed') return false
      return 5_000
    }
  })
}
