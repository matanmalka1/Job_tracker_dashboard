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

const KanbanBoard = ({ pipeline }: Props) => {
  const queryClient = useQueryClient()
  const [activeApp, setActiveApp] = useState<PipelineCard | null>(null)

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

  const allCards = pipeline.columns.flatMap((col) => col.items)
  const columnMap = new Map(pipeline.columns.map((col) => [col.status, col]))

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

      {/* Always mounted — required for drop animation to work correctly */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeApp ? <KanbanCard application={activeApp} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
