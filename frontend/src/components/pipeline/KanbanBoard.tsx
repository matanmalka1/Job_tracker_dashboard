import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateApplication } from '../../api/client.ts'
import type { ApplicationStatus, JobApplication } from '../../types/index.ts'
import KanbanColumn from './KanbanColumn.tsx'
import KanbanCard from './KanbanCard.tsx'

interface Props {
  applications: JobApplication[]
}

const COLUMNS: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-gray-400' },
  { status: 'applied', label: 'Applied', color: 'bg-blue-400' },
  { status: 'interviewing', label: 'Interviewing', color: 'bg-purple-400' },
  { status: 'offer', label: 'Offer', color: 'bg-green-400' },
  { status: 'rejected', label: 'Rejected', color: 'bg-red-400' },
  { status: 'hired', label: 'Hired', color: 'bg-teal-400' },
]

const KanbanBoard = ({ applications }: Props) => {
  const queryClient = useQueryClient()
  const [activeApp, setActiveApp] = useState<JobApplication | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const { mutate: moveApplication } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      updateApplication(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application moved')
    },
    onError: (err: Error) => {
      toast.error(`Failed to move: ${err.message}`)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })

  const onDragStart = ({ active }: DragStartEvent) => {
    const app = applications.find((a) => a.id === active.id)
    setActiveApp(app ?? null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveApp(null)
    if (!over) return

    const draggedApp = applications.find((a) => a.id === active.id)
    if (!draggedApp) return

    // `over.id` may be a column status or another card's id
    const overStatus = COLUMNS.find((c) => c.status === over.id)?.status
    const overCardApp = applications.find((a) => a.id === over.id)
    const targetStatus: ApplicationStatus | undefined =
      overStatus ?? overCardApp?.status

    if (!targetStatus || targetStatus === draggedApp.status) return

    moveApplication({ id: draggedApp.id, status: targetStatus })
  }

  const appsByStatus = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            applications={appsByStatus(col.status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApp && <KanbanCard application={activeApp} />}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
