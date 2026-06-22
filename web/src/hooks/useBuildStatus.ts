import { useQuery } from '@tanstack/react-query'
import { getBuildStatus, BuildJob } from '../lib/apiClient'

export function useBuildStatus(appId: string | undefined, jobId?: string) {
  return useQuery<BuildJob>({
    queryKey: ['buildStatus', appId, jobId],
    queryFn: () => getBuildStatus(appId!, jobId),
    enabled: !!appId,
    staleTime: 0,
    refetchInterval: 5_000
  })
}
