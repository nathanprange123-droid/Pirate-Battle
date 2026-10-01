interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  label: string
}

export function Pagination({ page, totalPages, onChange, label }: PaginationProps) {
  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="round-icon round-icon--turn-left"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      />
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="round-icon round-icon--turn-right"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      />
    </nav>
  )
}
