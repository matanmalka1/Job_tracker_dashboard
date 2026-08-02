import { useQueryClient } from '@tanstack/react-query'

/** Invalidate every cache a job-application write (create/update/delete/status change) can affect. */
export const useInvalidateApplicationData = () => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['pipeline-column'] })
    queryClient.invalidateQueries({ queryKey: ['companies'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
}
