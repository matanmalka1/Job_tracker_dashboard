export const STAGE_LABELS: Record<string, string> = {
  fetching: 'Fetching emails',
  filtering: 'Filtering results',
  saving: 'Saving to database',
  matching: 'Matching to applications',
  creating: 'Creating applications',
  done: 'Complete',
}

export const STAGE_ORDER = ['fetching', 'filtering', 'saving', 'matching', 'creating', 'done']
