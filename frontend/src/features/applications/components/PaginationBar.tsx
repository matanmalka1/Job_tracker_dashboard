import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { IconButton } from '@/shared/components/ui'

interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

const getPageNumbers = (page: number, totalPages: number): (number | '...')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)

  const pages: (number | '...')[] = [0]

  if (page <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages - 1)
  } else if (page >= totalPages - 4) {
    pages.push('...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1)
  } else {
    pages.push('...', page - 1, page, page + 1, '...', totalPages - 1)
  }

  return pages
}

const PaginationBar = ({ page, totalPages, total, pageSize, onPageChange }: Props) => {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between">
      <p className="text-t2 text-xs">
        {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-1">
        <IconButton
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          label="First page"
          variant="secondary"
          size="md"
        >
          <ChevronsLeft size={15} />
        </IconButton>
        <IconButton
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          label="Previous page"
          variant="secondary"
          size="md"
        >
          <ChevronLeft size={15} />
        </IconButton>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-8 text-center text-t3 text-sm select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                aria-label={`Page ${(p as number) + 1}`}
                aria-current={p === page ? 'page' : undefined}
                className={[
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors select-none',
                  p === page
                    ? 'bg-accent text-white border border-accent'
                    : 'text-t2 hover:text-t1 hover:bg-hover border border-transparent',
                ].join(' ')}
              >
                {(p as number) + 1}
              </button>
            )
          )}
        </div>

        <IconButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          label="Next page"
          variant="secondary"
          size="md"
        >
          <ChevronRight size={15} />
        </IconButton>
        <IconButton
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          label="Last page"
          variant="secondary"
          size="md"
        >
          <ChevronsRight size={15} />
        </IconButton>
      </div>
    </div>
  )
}

export default PaginationBar
