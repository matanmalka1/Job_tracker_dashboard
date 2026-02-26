import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, Calendar, Clock, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchApplication, updateApplication, deleteApplication } from '../api/client.ts'
import type { ApplicationStatus } from '../types/index.ts'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import SlideOver from '../components/ui/SlideOver.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'

const ALL_STATUSES: ApplicationStatus[] = [
  'new',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'hired',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface EditFormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
}

const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  const appId = Number(id)

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['applications', appId],
    queryFn: () => fetchApplication(appId),
    enabled: !isNaN(appId),
  })

  const { mutate: editMutate, isPending: editPending } = useMutation({
    mutationFn: (body: Partial<EditFormState>) => updateApplication(appId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application updated')
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deletePending } = useMutation({
    mutationFn: () => deleteApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application deleted')
      navigate('/applications')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: ApplicationStatus) => updateApplication(appId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = () => {
    if (!app) return
    setEditForm({
      company_name: app.company_name,
      role_title: app.role_title,
      status: app.status,
      source: app.source ?? '',
      applied_at: app.applied_at ? app.applied_at.slice(0, 10) : '',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return
    editMutate({
      company_name: editForm.company_name,
      role_title: editForm.role_title,
      status: editForm.status,
      source: editForm.source || undefined,
      applied_at: editForm.applied_at ? `${editForm.applied_at}T00:00:00Z` : undefined,
    })
  }

  const setEditField =
    (key: keyof EditFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" message="Loading application…" />
      </div>
    )
  }

  if (isError || !app) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/applications')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Applications
        </button>
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Application not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Applications
      </button>

      {/* Header card */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
              <span className="text-purple-400 font-bold text-lg">
                {app.company_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">{app.company_name}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{app.role_title}</p>
              <div className="flex items-center gap-3 mt-2">
                <select
                  value={app.status}
                  onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}
                  className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors cursor-pointer [color-scheme:dark]"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {app.source && (
                  <span className="text-gray-500 text-xs">via {app.source}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-600/20 text-red-400 hover:bg-red-600/10 text-xs font-medium transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div>
            <p className="text-gray-500 text-xs mb-1">Applied</p>
            <p className="text-white text-sm">{formatDate(app.applied_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Created</p>
            <p className="text-white text-sm">{formatDate(app.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Last Updated</p>
            <p className="text-white text-sm">{relativeTime(app.updated_at)}</p>
          </div>
          {app.confidence_score !== null && app.confidence_score !== undefined && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.round(app.confidence_score * 100)}%` }}
                  />
                </div>
                <span className="text-white text-sm shrink-0">
                  {Math.round(app.confidence_score * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email thread */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail size={16} className="text-gray-400" />
          <h2 className="text-white font-semibold text-sm">
            Email Thread
            {app.emails.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">({app.emails.length})</span>
            )}
          </h2>
        </div>

        {app.emails.length === 0 ? (
          <div className="text-center py-8">
            <Mail size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No emails linked yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Run a Gmail scan to automatically link emails to this application.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {app.emails
              .slice()
              .sort((a, b) => b.received_at.localeCompare(a.received_at))
              .map((email) => (
                <div
                  key={email.id}
                  className="border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {email.subject ?? '(No subject)'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {email.sender && (
                          <span className="text-purple-400 text-xs truncate">{email.sender}</span>
                        )}
                        <span className="flex items-center gap-1 text-gray-500 text-xs shrink-0">
                          <Calendar size={11} />
                          {formatDateTime(email.received_at)}
                        </span>
                        <span className="text-gray-600 text-xs shrink-0">
                          {relativeTime(email.received_at)}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(email.gmail_message_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-600 hover:text-purple-400 transition-colors shrink-0 mt-0.5"
                      title="Open in Gmail"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                  {email.snippet && (
                    <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">
                      {email.snippet}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-gray-400" />
          <h2 className="text-white font-semibold text-sm">Activity</h2>
        </div>
        <div className="space-y-4">
          {app.applied_at && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Applied</p>
                <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.applied_at)}</p>
              </div>
            </div>
          )}
          {app.last_email_at && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Last email received</p>
                <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.last_email_at)}</p>
              </div>
            </div>
          )}
          {app.source === 'Gmail' && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Detected via Gmail scan</p>
                <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.created_at)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit SlideOver */}
      <SlideOver open={editOpen} title="Edit Application" onClose={() => setEditOpen(false)}>
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Company *</label>
              <input
                type="text"
                required
                value={editForm.company_name}
                onChange={setEditField('company_name')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Role *</label>
              <input
                type="text"
                required
                value={editForm.role_title}
                onChange={setEditField('role_title')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Status</label>
              <select
                value={editForm.status}
                onChange={setEditField('status')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Source</label>
              <input
                type="text"
                value={editForm.source}
                onChange={setEditField('source')}
                placeholder="e.g. LinkedIn, Referral"
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Applied Date</label>
              <input
                type="date"
                value={editForm.applied_at}
                onChange={setEditField('applied_at')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {editPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Application"
        description={`Are you sure you want to delete ${app.company_name} — ${app.role_title}? This cannot be undone.`}
        onConfirm={() => deleteMutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deletePending}
      />
    </div>
  )
}

export default ApplicationDetailPage
