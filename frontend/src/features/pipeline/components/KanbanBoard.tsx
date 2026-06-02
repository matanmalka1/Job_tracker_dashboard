import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, CollisionDetection } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateApplication } from '../../../api/client.ts'
import type { ApplicationStatus, PipelineCard, PipelineResponse } from '../../../shared/types/job-tracker.ts'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from '../../../shared/constants/applicationStatus.ts'
import KanbanColumn from './KanbanColumn.tsx'
import KanbanCard from './KanbanCard.tsx'

interface Props {
  pipeline: PipelineResponse
}

// Hybrid collision: prefer pointerWithin (precise), fall back to rectIntersection
// This prevents cross-column mis-fires that closestCorners causes.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

const measuring = {
  droppable: { strategy: MeasuringStrategy.Always },
}

const dropAnimation = {
  duration: 240,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
}

const KanbanBoard = ({ pipeline }: Props) => {
  const queryClient = useQueryClient()
  const [activeApp, setActiveApp] = useState<PipelineCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { mutate: moveApplication } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      updateApplication(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application moved')
    },
    onError: (err: Error) => {
      toast.error(`Failed to move: ${err.message}`)
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })

  const columnMap = new Map(pipeline.columns.map((col) => [col.status, col]))
  const allCards = pipeline.columns.flatMap((col) => col.items)

  const onDragStart = ({ active }: DragStartEvent) => {
    const card = allCards.find((c) => c.id === active.id)
    setActiveApp(card ?? null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveApp(null)
    if (!over) return

    const draggedCard = allCards.find((c) => c.id === active.id)
    if (!draggedCard) return

    const overStatus = APPLICATION_STATUSES.find((s) => s === over.id)
    const overCardStatus = allCards.find((c) => c.id === over.id)?.status
    const targetStatus: ApplicationStatus | undefined = overStatus ?? overCardStatus

    if (!targetStatus || targetStatus === draggedCard.status) return
    moveApplication({ id: draggedCard.id, status: targetStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-board">
        {APPLICATION_STATUSES.map((status) => {
          const col = columnMap.get(status)
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={APPLICATION_STATUS_LABELS[status]}
              applications={col?.items ?? []}
              total={col?.total ?? 0}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeApp && <KanbanCard application={activeApp} isOverlay />}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
