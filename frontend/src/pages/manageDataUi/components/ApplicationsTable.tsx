import { AlertCircle } from 'lucide-react'
import type { JobApplication } from '../../../types/index.ts'
import ApplicationRow from './ApplicationRow'

interface Props {
  applications: JobApplication[]
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

const ApplicationsTable = ({ applications, onEdit, onDelete }: Props) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-white/5 text-gray-400 uppercase text-[11px] tracking-wide">
        <tr>
          <th className="text-left px-4 py-3">Company</th>
          <th className="text-left px-4 py-3">Role</th>
          <th className="text-left px-4 py-3">Status</th>
          <th className="text-left px-4 py-3">Source</th>
          <th className="text-left px-4 py-3">Applied</th>
          <th className="text-left px-4 py-3">Confidence</th>
          <th className="text-left px-4 py-3">Emails</th>
          <th className="text-left px-4 py-3">Updated</th>
          <th className="text-right px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((app) => (
          <ApplicationRow key={app.id} app={app} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {applications.length === 0 && (
          <tr>
            <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle size={20} className="text-gray-600" />
                <p className="text-sm">No records match the current filters.</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)

export default ApplicationsTable
