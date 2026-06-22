import { useQuery } from '@tanstack/react-query'
import { getBuildStatus, BuildJob } from '../lib/apiClient'

export function useBuildStatus(appId: string | undefined, jobId?: string) {
  return useQuery<BuildJob>({
    queryKey: ['buildStatus', appId, jobId],
    queryFn: () => getBuildStatus(appId!, jobId),
    enabled: !!appId,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 5_000
      // Keep polling slowly in terminal states so new builds are picked up
      // without requiring the user to click Rebuild first.
      if (data.Status === 'ready' || data.Status === 'failed') return 30_000
      return 5_000
    }
  })
}
