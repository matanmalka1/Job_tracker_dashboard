import { useMemo, useState } from 'react'
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Clock3,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import SlideOver from '../../components/ui/SlideOver.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'

// Lightweight, client-side record model just for this UI
interface DataRecord {
  id: number
  table: string
  key: string
  value: string
  status: 'active' | 'pending' | 'archived'
  owner: string
  tags: string[]
  updatedAt: string
}

const seedRecords: DataRecord[] = [
  {
    id: 1,
    table: 'applications',
    key: 'acme_frontend_2024',
    value: '{"stage":"interview","notes":"Waiting for loop"}',
    status: 'active',
    owner: 'system',
    tags: ['jobs', 'pipeline'],
    updatedAt: '2026-02-20T15:30:00Z',
  },
  {
    id: 2,
    table: 'companies',
    key: 'globex-labs',
    value: '{"industry":"AI","size":240}',
    status: 'pending',
    owner: 'you',
    tags: ['enrichment'],
    updatedAt: '2026-02-18T09:10:00Z',
  },
  {
    id: 3,
    table: 'emails',
    key: 'msg_18d9fa',
    value: '{"subject":"Offer details","application_id":42}',
    status: 'active',
    owner: 'scanner',
    tags: ['gmail', 'linked'],
    updatedAt: '2026-02-16T12:00:00Z',
  },
  {
    id: 4,
    table: 'applications',
    key: 'soylent_pm',
    value: '{"stage":"offer","confidence":0.92}',
    status: 'archived',
    owner: 'system',
    tags: ['archived'],
    updatedAt: '2026-02-10T18:45:00Z',
  },
  {
    id: 5,
    table: 'emails',
    key: 'msg_20ab77',
    value: '{"subject":"Follow-up","application_id":12}',
    status: 'pending',
    owner: 'scanner',
    tags: ['gmail'],
    updatedAt: '2026-02-22T07:40:00Z',
  },
]

const statusStyles: Record<DataRecord['status'], { bg: string; text: string; dot: string; label: string }> = {
  active: {
    bg: 'bg-green-500/10 border-green-500/20',
    text: 'text-green-300',
    dot: 'bg-green-400',
    label: 'Active',
  },
  pending: {
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    text: 'text-yellow-200',
    dot: 'bg-yellow-300',
    label: 'Pending',
  },
  archived: {
    bg: 'bg-gray-500/10 border-gray-500/20',
    text: 'text-gray-300',
    dot: 'bg-gray-400',
    label: 'Archived',
  },
}

const emptyDraft = (nextId: number, table: string): DataRecord => ({
  id: nextId,
  table,
  key: '',
  value: '',
  status: 'active',
  owner: 'you',
  tags: [],
  updatedAt: new Date().toISOString(),
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const ManageDataUiPage = () => {
  const [records, setRecords] = useState<DataRecord[]>(seedRecords)
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | DataRecord['status']>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState<DataRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataRecord | null>(null)

  const tables = useMemo(() => Array.from(new Set(records.map((r) => r.table))).sort(), [records])

  const latestUpdated = useMemo(
    () =>
      records.length
        ? records.reduce((latest, r) =>
            r.updatedAt > latest.updatedAt ? r : latest,
          records[0])
        : null,
    [records],
  )

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return records
      .filter((r) => {
        const matchesTable = tableFilter === 'all' || r.table === tableFilter
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter
        const matchesQuery =
          !query ||
          r.key.toLowerCase().includes(query) ||
          r.table.toLowerCase().includes(query) ||
          r.value.toLowerCase().includes(query)
        return matchesTable && matchesStatus && matchesQuery
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [records, search, tableFilter, statusFilter])

  const startCreate = () => {
    const nextId = records.reduce((max, r) => Math.max(max, r.id), 0) + 1
    setDraft(emptyDraft(nextId, tables[0] ?? 'applications'))
    setDrawerOpen(true)
  }

  const startEdit = (record: DataRecord) => {
    setDraft({ ...record })
    setDrawerOpen(true)
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.key.trim()) return

    const normalized: DataRecord = {
      ...draft,
      key: draft.key.trim(),
      table: draft.table.trim() || 'default',
      value: draft.value.trim(),
      tags: draft.tags.map((t) => t.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    }

    setRecords((prev) => {
      const exists = prev.some((r) => r.id === normalized.id)
      return exists
        ? prev.map((r) => (r.id === normalized.id ? normalized : r))
        : [normalized, ...prev]
    })
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const updateDraftField = <K extends keyof DataRecord>(key: K, value: DataRecord[K]) => {
    if (!draft) return
    setDraft({ ...draft, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-[0.08em]">
          <Database size={16} className="text-purple-400" />
          Manage Data
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold">Data Manager</h1>
            <p className="text-gray-400 text-sm">
              A lightweight CRUD surface for direct table edits. Everything here stays in the browser until you wire it to the API.
            </p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New record
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1a24] border border-white/5 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-purple-300" />
          </div>
          <div>
            <p className="text-gray-500 text-xs">Total records</p>
            <p className="text-white font-semibold text-lg">{records.length}</p>
          </div>
        </div>
        <div className="bg-[#1a1a24] border border-white/5 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <Filter size={18} className="text-blue-200" />
          </div>
          <div>
            <p className="text-gray-500 text-xs">Tables</p>
            <p className="text-white font-semibold text-lg">{tables.length}</p>
          </div>
        </div>
        <div className="bg-[#1a1a24] border border-white/5 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <Clock3 size={18} className="text-green-200" />
          </div>
          <div>
            <p className="text-gray-500 text-xs">Most recent</p>
            <p className="text-white font-semibold text-lg">
              {latestUpdated ? formatDate(latestUpdated.updatedAt) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key, table, or value"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All tables</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {filtered.length} record{filtered.length === 1 ? '' : 's'} shown
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 uppercase text-[11px] tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Table</th>
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Value preview</th>
                <th className="text-left px-4 py-3">Tags</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{record.table}</td>
                  <td className="px-4 py-3 text-gray-200 font-mono text-xs">{record.key}</td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="bg-black/20 border border-white/5 rounded-md px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words max-w-xl">
                      {record.value || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="flex flex-wrap gap-2">
                      {record.tags.length === 0 && <span className="text-gray-600 text-xs">None</span>}
                      {record.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{record.owner}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(record.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${statusStyles[record.status].bg} ${statusStyles[record.status].text}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusStyles[record.status].dot}`} />
                      {statusStyles[record.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(record)}
                        className="p-2 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(record)}
                        className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 hover:text-white hover:border-red-400/60 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
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
      </div>

      {/* Drawer */}
      <SlideOver
        open={drawerOpen}
        title={draft?.id && records.some((r) => r.id === draft.id) ? 'Edit record' : 'Create record'}
        onClose={() => setDrawerOpen(false)}
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Table</label>
                <input
                  value={draft.table}
                  onChange={(e) => updateDraftField('table', e.target.value)}
                  className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Key</label>
                <input
                  value={draft.key}
                  onChange={(e) => updateDraftField('key', e.target.value)}
                  className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  placeholder="primary key or identifier"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Value (JSON or text)</label>
              <textarea
                value={draft.value}
                onChange={(e) => updateDraftField('value', e.target.value)}
                rows={6}
                className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Tags (comma separated)</label>
                <input
                  value={draft.tags.join(', ')}
                  onChange={(e) => updateDraftField(
                    'tags',
                    e.target.value.split(',').map((t) => t.trim()) as DataRecord['tags'],
                  )}
                  className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  placeholder="metadata, label"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Owner</label>
                <input
                  value={draft.owner}
                  onChange={(e) => updateDraftField('owner', e.target.value)}
                  className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  placeholder="who last touched this"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {(['active', 'pending', 'archived'] as DataRecord['status'][]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateDraftField('status', s)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    draft.status === s
                      ? `${statusStyles[s].bg} ${statusStyles[s].text} border-transparent`
                      : 'border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {statusStyles[s].label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={!draft.key.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm text-white font-medium"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete record"
        description={`Remove ${deleteTarget?.key ?? 'this entry'} from ${deleteTarget?.table ?? 'table'}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ManageDataUiPage
