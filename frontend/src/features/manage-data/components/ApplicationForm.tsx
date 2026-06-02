import type { Dispatch, SetStateAction } from 'react'
import { Button, FormField, Input, SelectField } from '@/shared/components/ui'
import type { ApplicationStatus } from '../../../shared/types/job-tracker.ts'
import type { FormState } from '../types.ts'
import { APPLICATION_STATUS_OPTIONS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  editing: boolean
}

const ApplicationForm = ({ form, setForm, onSubmit, onCancel, loading, editing }: Props) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Company" required>
        <Input
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          autoFocus
        />
      </FormField>
      <FormField label="Role">
        <Input
          value={form.role_title}
          onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
        />
      </FormField>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Status">
        <SelectField
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}
        >
          {APPLICATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </FormField>
      <FormField label="Source">
        <Input
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          placeholder="LinkedIn, referral, etc"
        />
      </FormField>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Applied date">
        <Input
          type="date"
          value={form.applied_at}
          onChange={(e) => setForm((f) => ({ ...f, applied_at: e.target.value }))}
        />
      </FormField>
      <FormField label="Confidence (%)">
        <Input
          type="number"
          min={0}
          max={100}
          value={form.confidence_score}
          onChange={(e) => setForm((f) => ({ ...f, confidence_score: e.target.value }))}
          placeholder="0 - 100"
        />
      </FormField>
    </div>

    <div className="flex items-center justify-end gap-3 pt-2">
      <Button
        onClick={onCancel}
        variant="secondary"
      >
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        disabled={!form.company_name.trim() || loading}
        loading={loading}
      >
        {loading ? 'Saving…' : editing ? 'Save changes' : 'Create record'}
      </Button>
    </div>
  </div>
)

export default ApplicationForm
