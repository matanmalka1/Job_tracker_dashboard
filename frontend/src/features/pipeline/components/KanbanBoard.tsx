import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, CollisionDetection } from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateApplication } from '../../../api/client.ts'
import type { ApplicationStatus, PipelineCard, PipelineColumnPage } from '../../../shared/types/job-tracker.ts'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../../shared/constants/applicationStatus.ts'
import KanbanColumn from './KanbanColumn.tsx'
import KanbanCard from './KanbanCard.tsx'

interface ColumnState {
  items: PipelineCard[]
  total: number
  loadedPage: number
  has_next: boolean
}

interface Props {
  columnStates: Record<ApplicationStatus, ColumnState>
  onLoadMore: (status: ApplicationStatus) => Promise<void>
  /** Called after a successful move so PipelinePage can re-sync exactly the pages already loaded. */
  onResyncColumns: (fromStatus: ApplicationStatus, toStatus: ApplicationStatus) => Promise<void>
}

// Prefer pointer position over rect center — prevents mis-detection at column edges
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

const measuring = {
  // Always re-measure both draggable and droppable rects so positions are never stale
  draggable: { measure: (el: HTMLElement) => el.getBoundingClientRect() },
  droppable: { strategy: MeasuringStrategy.Always },
}

const dropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.2, 0, 0, 1)', // fast-out-slow-in, no overshoot
}

/** Optimistically move a card in page-1 of source/target column caches. */
function patchColumnCache(
  queryClient: ReturnType<typeof useQueryClient>,
  cardId: number,
  card: PipelineCard,
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
): { fromSnapshot: PipelineColumnPage | undefined; toSnapshot: PipelineColumnPage | undefined } {
  const fromKey = ['pipeline-column', fromStatus, 1]
  const toKey = ['pipeline-column', toStatus, 1]

  const fromSnapshot = queryClient.getQueryData<PipelineColumnPage>(fromKey)
  const toSnapshot = queryClient.getQueryData<PipelineColumnPage>(toKey)

  if (fromSnapshot) {
    queryClient.setQueryData<PipelineColumnPage>(fromKey, {
      ...fromSnapshot,
      total: fromSnapshot.total - 1,
      items: fromSnapshot.items.filter((c) => c.id !== cardId),
    })
  }

  if (toSnapshot) {
    const alreadyThere = toSnapshot.items.some((c) => c.id === cardId)
    if (!alreadyThere) {
      queryClient.setQueryData<PipelineColumnPage>(toKey, {
        ...toSnapshot,
        total: toSnapshot.total + 1,
        items: [{ ...card, status: toStatus }, ...toSnapshot.items],
      })
    }
  }

  return { fromSnapshot, toSnapshot }
}

const KanbanBoard = ({ columnStates, onLoadMore, onResyncColumns }: Props) => {
  const queryClient = useQueryClient()
  const [activeApp, setActiveApp] = useState<PipelineCard | null>(null)
  const [loadingMore, setLoadingMore] = useState<ApplicationStatus | null>(null)

  const sensors = useSensors(
    // MouseSensor with no activationConstraint = fires immediately on mousedown+move
    useSensor(MouseSensor),
    // TouchSensor needs a small delay so scroll vs drag can be distinguished on mobile
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    // PointerSensor as fallback for stylus / other pointer types
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  )

  const { mutate: moveApplication } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      updateApplication(id, { status }),

    onMutate: async ({ id, status }: { id: number; status: ApplicationStatus }) => {
      const card = Object.values(columnStates)
        .flatMap((col) => col.items)
        .find((c) => c.id === id)
      if (!card) return {}

      const fromStatus = card.status
      // Cancel any in-flight refetches for both columns so they don't overwrite optimistic state
      await queryClient.cancelQueries({ queryKey: ['pipeline-column', fromStatus] })
      await queryClient.cancelQueries({ queryKey: ['pipeline-column', status] })

      const snapshots = patchColumnCache(queryClient, id, card, fromStatus, status)
      return { fromStatus, snapshots }
    },

    onError: (_err: Error, vars, context) => {
      // Restore exact page-1 snapshots for both columns
      const { fromStatus, snapshots } = context ?? {}
      if (fromStatus && snapshots?.fromSnapshot) {
        queryClient.setQueryData(['pipeline-column', fromStatus, 1], snapshots.fromSnapshot)
      }
      if (snapshots?.toSnapshot) {
        queryClient.setQueryData(['pipeline-column', vars.status, 1], snapshots.toSnapshot)
      }
      toast.error('Move failed — card restored to previous column')
    },

    onSuccess: (_data, vars, context) => {
      // Invalidate unrelated caches that reflect status counts
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['applications', 'dashboard-recent'] })
      // Re-sync all loaded pages for both affected columns without collapsing to page 1
      const fromStatus = context?.fromStatus as ApplicationStatus | undefined
      if (fromStatus) {
        void onResyncColumns(fromStatus, vars.status)
      }
    },
  })

  const allCards = Object.values(columnStates).flatMap((col) => col.items)

  const onDragStart = ({ active }: DragStartEvent) => {
    const card = allCards.find((c) => c.id === active.id)
    setActiveApp(card ?? null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveApp(null)
    if (!over) return

    const draggedCard = allCards.find((c) => c.id === active.id)
    if (!draggedCard) return

    // over.id is always a column status (useDroppable ids are statuses)
    const targetStatus = APPLICATION_STATUSES.find((s) => s === over.id)
    if (!targetStatus || targetStatus === draggedCard.status) return

    moveApplication({ id: draggedCard.id, status: targetStatus })
  }

  const onDragCancel = () => {
    setActiveApp(null)
  }

  const handleLoadMore = async (status: ApplicationStatus) => {
    setLoadingMore(status)
    try {
      await onLoadMore(status)
    } finally {
      setLoadingMore(null)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="kanban-board">
        {APPLICATION_STATUSES.map((status) => {
          const col = columnStates[status]
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={APPLICATION_STATUS_LABELS[status]}
              applications={col.items}
              total={col.total}
              hasNext={col.has_next}
              isLoadingMore={loadingMore === status}
              onLoadMore={() => handleLoadMore(status)}
            />
          )
        })}
      </div>

      {/* Always mounted — required for drop animation to work correctly */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeApp ? <KanbanCard application={activeApp} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
