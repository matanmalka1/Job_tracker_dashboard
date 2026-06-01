import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createApplication,
  deleteApplication,
  fetchApplications,
  updateApplication,
} from '../../../api/client.ts'
import type { ApplicationSortField } from '../../../api/client.ts'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../../../shared/types/job-tracker.ts'

export const PAGE_SIZE = 25

const SEARCH_DEBOUNCE_MS = 300

export const useApplicationsPage = () => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editApp, setEditApp] = useState<JobApplication | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [search])

  const queryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch || undefined,
      sort: 'last_email_at' as ApplicationSortField,
    }),
    [debouncedSearch, page, statusFilter],
  )

  const applicationsQuery = useQuery({
    queryKey: ['applications', 'list', queryParams],
    queryFn: () => fetchApplications(queryParams),
    placeholderData: (prev) => prev,
  })

  const invalidateApplicationData = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const addMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      invalidateApplicationData()
      toast.success('Application added')
      setAddOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const editMutation = useMutation({
    mutationFn: (body: Partial<ApplicationWritePayload>) => {
      if (!editApp) return Promise.reject(new Error('No application selected'))
      return updateApplication(editApp.id, body)
    },
    onSuccess: () => {
      invalidateApplicationData()
      toast.success('Application updated')
      setEditApp(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      if (page > 0 && applications.length === 1) setPage((p) => p - 1)
      invalidateApplicationData()
      toast.success('Application deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => Promise.all(ids.map((id) => deleteApplication(id))),
    onSuccess: (_, ids) => {
      if (page > 0 && ids.length >= applications.length) setPage((p) => p - 1)
      invalidateApplicationData()
      toast.success(`${ids.length} applications deleted`)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applications = applicationsQuery.data?.items ?? []
  const total = applicationsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allOnPageSelected = applications.length > 0 && applications.every((app) => selectedIds.has(app.id))

  const setSearchAndResetPage = (value: string) => {
    setSearch(value)
    setPage(0)
    setSelectedIds(new Set())
  }

  const changeFilter = (filter: ApplicationStatus | 'all') => {
    setStatusFilter(filter)
    setPage(0)
    setSelectedIds(new Set())
  }

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    setSelectedIds(new Set())
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      applications.forEach((app) => {
        if (allOnPageSelected) next.delete(app.id)
        else next.add(app.id)
      })
      return next
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return {
    addMutation,
    addOpen,
    allOnPageSelected,
    applications,
    applicationsQuery,
    bulkDeleteMutation,
    bulkDeleteOpen,
    changeFilter,
    deleteMutation,
    deleteTarget,
    editApp,
    editMutation,
    page,
    search,
    selectedIds,
    changePage,
    setAddOpen,
    setBulkDeleteOpen,
    setDeleteTarget,
    setEditApp,
    setSearchAndResetPage,
    statusFilter,
    toggleSelect,
    toggleSelectAll,
    total,
    totalPages,
  }
}
