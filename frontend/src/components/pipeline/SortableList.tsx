import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { JobApplication } from '../../types/index.ts'
import StatusBadge from '../ui/StatusBadge.tsx'

interface RowProps {
  application: JobApplication
  isOverlay?: boolean
}

const SortableRow = ({ application, isOverlay = false }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—'

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={[
        'border-b border-white/5 transition-colors',
        isOverlay ? 'bg-[#1a1a24] rounded-lg shadow-xl' : 'hover:bg-white/[0.02]',
      ].join(' ')}
    >
      <td className="px-4 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-600 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="text-white font-medium text-sm">{application.company_name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-300 text-sm">{application.role_title}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={application.status} />
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-400 text-xs">
          {formatDate(application.applied_at ?? application.created_at)}
        </span>
      </td>
      {application.confidence_score !== undefined && application.confidence_score !== null && (
        <td className="px-4 py-3">
          <span className="text-gray-300 text-xs">
            {Math.round(application.confidence_score * 100)}%
          </span>
        </td>
      )}
      {(application.confidence_score === undefined || application.confidence_score === null) && (
        <td className="px-4 py-3">
          <span className="text-gray-600 text-xs">—</span>
        </td>
      )}
    </tr>
  )
}

interface Props {
  applications: JobApplication[]
}

const SortableList = ({ applications: initialApplications }: Props) => {
  const [items, setItems] = useState<JobApplication[]>(initialApplications)
  const [activeApp, setActiveApp] = useState<JobApplication | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveApp(items.find((a) => a.id === active.id) ?? null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveApp(null)
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((a) => a.id === active.id)
      const newIndex = prev.findIndex((a) => a.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="bg-[#1a1a24] rounded-xl border border-white/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="w-8 px-4 py-3" />
              {['Company', 'Role', 'Status', 'Date', 'Confidence'].map((col) => (
                <th
                  key={col}
                  className="text-left text-gray-400 font-medium text-xs uppercase tracking-wider px-4 py-3"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {items.map((app) => (
                <SortableRow key={app.id} application={app} />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>

      <DragOverlay>
        {activeApp && (
          <table className="w-full">
            <tbody>
              <SortableRow application={activeApp} isOverlay />
            </tbody>
          </table>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default SortableList
