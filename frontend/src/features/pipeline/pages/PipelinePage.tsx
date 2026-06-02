import { useState, useCallback } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { fetchPipelineColumn } from '../../../api/client.ts'
import type { ApplicationStatus, PipelineCard, PipelineColumnPage } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUSES } from '../../../shared/constants/applicationStatus.ts'
import KanbanBoard from '../components/KanbanBoard.tsx'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import PipelineHeader from '../components/PipelineHeader.tsx'

const PAGE_SIZE = 20

/** Per-column state: accumulated items + current page loaded */
interface ColumnState {
  items: PipelineCard[]
  total: number
  loadedPage: number
  has_next: boolean
}

const PipelinePage = () => {
  const queryClient = useQueryClient()

  // Tracks the highest page loaded for each column (starts at 1)
  const [loadedPages, setLoadedPages] = useState<Record<ApplicationStatus, number>>(
    () => Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 1])) as Record<ApplicationStatus, number>,
  )

  const columnQueries = useQueries({
    queries: APPLICATION_STATUSES.map((status) => ({
      queryKey: ['pipeline-column', status, 1],
      queryFn: () => fetchPipelineColumn(status, 1, PAGE_SIZE),
      staleTime: 30_000,
    })),
  })

  const isLoading = columnQueries.some((q) => q.isLoading)
  const isError = columnQueries.some((q) => q.isError)

  // Build accumulated column states by merging page 1 data with any additional pages from cache
  const buildColumnState = useCallback(
    (status: ApplicationStatus, index: number): ColumnState => {
      const page1 = columnQueries[index]?.data
      if (!page1) return { items: [], total: 0, loadedPage: 1, has_next: false }

      const maxPage = loadedPages[status]
      let items: PipelineCard[] = [...page1.items]

      for (let p = 2; p <= maxPage; p++) {
        const cached = queryClient.getQueryData<PipelineColumnPage>(['pipeline-column', status, p])
        if (cached) {
          const existingIds = new Set(items.map((c) => c.id))
          items = [...items, ...cached.items.filter((c) => !existingIds.has(c.id))]
        }
      }

      const lastPageData =
        maxPage === 1
          ? page1
          : queryClient.getQueryData<PipelineColumnPage>(['pipeline-column', status, maxPage])

      return {
        items,
        total: page1.total,
        loadedPage: maxPage,
        has_next: lastPageData?.has_next ?? false,
      }
    },
    [columnQueries, loadedPages, queryClient],
  )

  const columnStates: Record<ApplicationStatus, ColumnState> = Object.fromEntries(
    APPLICATION_STATUSES.map((status, i) => [status, buildColumnState(status, i)]),
  ) as Record<ApplicationStatus, ColumnState>

  const total = Object.values(columnStates).reduce((sum, col) => sum + col.total, 0)

  const loadMore = useCallback(
    async (status: ApplicationStatus) => {
      const nextPage = loadedPages[status] + 1
      await queryClient.fetchQuery({
        queryKey: ['pipeline-column', status, nextPage],
        queryFn: () => fetchPipelineColumn(status, nextPage, PAGE_SIZE),
        staleTime: 30_000,
      })
      setLoadedPages((prev) => ({ ...prev, [status]: nextPage }))
    },
    [loadedPages, queryClient],
  )

  /**
   * Called by KanbanBoard after a successful drag move.
   * Re-fetches all currently-loaded pages for the two affected columns so the user
   * does not lose already-loaded content, but each page syncs with server truth.
   */
  const resyncColumns = useCallback(
    async (fromStatus: ApplicationStatus, toStatus: ApplicationStatus) => {
      const statuses = Array.from(new Set([fromStatus, toStatus]))
      await Promise.all(
        statuses.flatMap((status) => {
          const maxPage = loadedPages[status]
          return Array.from({ length: maxPage }, (_, i) => i + 1).map((page) =>
            queryClient.invalidateQueries({ queryKey: ['pipeline-column', status, page] }),
          )
        }),
      )
    },
    [loadedPages, queryClient],
  )

  return (
    <div className="space-y-6">
      <PipelineHeader total={total} />

      {isLoading && <LoadingSpinner size="lg" message="Loading pipeline..." />}

      {isError && (
        <div className="bg-surface rounded-xl p-8 border border-DEFAULT text-center">
          <p className="text-red-400 text-sm">Failed to load pipeline. Try refreshing.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="kanban-board-wrap">
          <KanbanBoard
            columnStates={columnStates}
            onLoadMore={loadMore}
            onResyncColumns={resyncColumns}
          />
        </div>
      )}
    </div>
  )
}

export default PipelinePage
