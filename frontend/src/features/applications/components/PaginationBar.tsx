import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

const PaginationBar = ({ page, totalPages, total, pageSize, onPageChange }: Props) => {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="text-gray-500 text-xs">
        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-gray-400 text-xs px-2">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

export default PaginationBar
