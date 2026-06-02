import type { ChangeEvent, FormEvent } from 'react'
import { Button, FormField, Input, SelectField, Textarea } from '@/shared/components/ui'
import type { ApplicationFormState } from '../../../shared/utils/jobApplicationForm.ts'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  form: ApplicationFormState
  onChange: (key: keyof ApplicationFormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  loading: boolean
}

const EditApplicationForm = ({ form, onChange, onSubmit, onCancel, loading }: Props) => (
  <form onSubmit={onSubmit} className="space-y-5">
    <FormField label="Company" required>
      <Input type="text" required value={form.company_name} onChange={onChange('company_name')} />
    </FormField>
    <FormField label="Role">
      <Input type="text" value={form.role_title} onChange={onChange('role_title')} placeholder="e.g. Software Engineer" />
    </FormField>
    <FormField label="Status">
      <SelectField value={form.status} onChange={onChange('status')}>
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {APPLICATION_STATUS_LABELS[s]}
          </option>
        ))}
      </SelectField>
    </FormField>
    <FormField label="Source">
      <Input
        type="text"
        value={form.source}
        onChange={onChange('source')}
        placeholder="e.g. LinkedIn, Referral"
      />
    </FormField>
    <FormField label="Applied Date">
      <Input type="date" value={form.applied_at} onChange={onChange('applied_at')} />
    </FormField>
    <FormField label="Job URL">
      <Input type="url" value={form.job_url} onChange={onChange('job_url')} placeholder="https://…" />
    </FormField>
    <FormField label="Follow-up Date">
      <Input
        type="date"
        value={form.next_action_at}
        onChange={onChange('next_action_at')}
      />
    </FormField>
    <FormField label="Notes">
      <Textarea
        value={form.notes}
        onChange={onChange('notes')}
        placeholder="Interview prep, impressions, contacts…"
        rows={4}
      />
    </FormField>
    <div className="flex gap-3 pt-2">
      <Button
        type="button"
        onClick={onCancel}
        variant="secondary"
        className="flex-1 h-auto py-2.5"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        className="flex-1 h-auto py-2.5"
      >
        {loading ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  </form>
)

export default EditApplicationForm
