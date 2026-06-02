import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button, FormField, IconButton, Input, SelectField, Textarea } from '@/shared/components/ui'
import type { ApplicationWritePayload, JobApplication } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUS_OPTIONS } from '../../../shared/constants/applicationStatus.ts'
import {
  EMPTY_APPLICATION_FORM,
  applicationToFormState,
  formStateToApplicationPayload,
  type ApplicationFormState,
} from '../../../shared/utils/jobApplicationForm.ts'

interface Props {
  open: boolean
  initial?: JobApplication | null
  onClose: () => void
  onSubmit: (data: ApplicationWritePayload) => void
  loading?: boolean
}

const ApplicationModal = ({ open, initial, onClose, onSubmit, loading }: Props) => {
  const [form, setForm] = useState<ApplicationFormState>(EMPTY_APPLICATION_FORM)

  useEffect(() => {
    if (open) {
      // Reset the draft each time the modal opens; safe to ignore lint rule here because we want a fresh form per open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(
        initial
          ? applicationToFormState(initial)
          : EMPTY_APPLICATION_FORM,
      )
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formStateToApplicationPayload(form))
  }

  const set =
    (key: keyof ApplicationFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const isEdit = !!initial

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Application' : 'Add Application'}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-DEFAULT rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-t1 font-semibold text-lg">
            {isEdit ? 'Edit Application' : 'Add Application'}
          </h2>
          <IconButton type="button" onClick={onClose} label="Close" size="sm">
            <X size={20} />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Company" required>
            <Input type="text" required value={form.company_name} onChange={set('company_name')} placeholder="e.g. Acme Corp" autoFocus />
          </FormField>

          <FormField label="Role">
            <Input type="text" value={form.role_title} onChange={set('role_title')} placeholder="e.g. Senior Engineer" />
          </FormField>

          <FormField label="Status">
            <SelectField value={form.status} onChange={set('status')}>
              {APPLICATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
          </FormField>

          <FormField label="Source">
            <Input type="text" value={form.source} onChange={set('source')} placeholder="e.g. LinkedIn, Referral" />
          </FormField>

          <FormField label="Applied Date">
            <Input type="date" value={form.applied_at} onChange={set('applied_at')} />
          </FormField>

          <FormField label="Job URL">
            <Input type="url" value={form.job_url} onChange={set('job_url')} placeholder="https://…" />
          </FormField>

          <FormField label="Follow-up Date">
            <Input type="date" value={form.next_action_at} onChange={set('next_action_at')} />
          </FormField>

          <FormField label="Notes">
            <Textarea value={form.notes} onChange={set('notes')} placeholder="Interview prep, impressions, contacts…" rows={3} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1 h-auto py-2.5">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} loading={loading} className="flex-1 h-auto py-2.5">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationModal
