import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApps, saveApp, deleteApp, App, SaveAppRequest } from '../lib/apiClient'

export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: getApps
  })
}

export function useSaveApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveAppRequest) => saveApp(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] })
  })
}

export function useDeleteApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => deleteApp(appId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] })
  })
}

export function useApp(appId: string | undefined) {
  const { data: apps } = useApps()
  return apps?.find((a: App) => a.rowKey === appId)
}
