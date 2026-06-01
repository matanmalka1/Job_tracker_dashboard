import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteApplication, updateApplication } from '../../../api/client.ts'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../../../shared/types/job-tracker.ts'
import {
  applicationToFormState,
  formStateToApplicationPayload,
  type ApplicationFormState,
} from '../../../shared/utils/jobApplicationForm.ts'

export const useApplicationDetailActions = (appId: number, app?: JobApplication) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editForm, setEditForm] = useState<ApplicationFormState | null>(null)

  const invalidateApplicationData = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const editMutation = useMutation({
    mutationFn: (body: Partial<ApplicationWritePayload>) => updateApplication(appId, body),
    onSuccess: () => {
      invalidateApplicationData()
      toast.success('Application updated')
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteApplication(appId),
    onSuccess: () => {
      invalidateApplicationData()
      toast.success('Application deleted')
      navigate('/applications')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) => updateApplication(appId, { status }),
    onSuccess: () => {
      invalidateApplicationData()
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = () => {
    if (!app) return
    setEditForm(applicationToFormState(app))
    setEditOpen(true)
  }

  const submitEdit = (event: FormEvent) => {
    event.preventDefault()
    if (!editForm) return
    editMutation.mutate(formStateToApplicationPayload(editForm))
  }

  const setEditField =
    (key: keyof ApplicationFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm((prev) => (prev ? { ...prev, [key]: event.target.value } : prev))

  return {
    changeStatus: statusMutation.mutate,
    deleteOpen,
    deletePending: deleteMutation.isPending,
    editForm,
    editOpen,
    editPending: editMutation.isPending,
    openEdit,
    setDeleteOpen,
    setEditField,
    setEditOpen,
    submitDelete: deleteMutation.mutate,
    submitEdit,
  }
}
