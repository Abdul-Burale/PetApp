const pageSizes = [12, 24, 48]

export function readCatalogNumber(value: string | null, fallback: number, allowed?: number[]) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1 || (allowed && !allowed.includes(number))) return fallback
  return number
}

export function CatalogPagination({ total, page, pageSize, onPageChange, onPageSizeChange }: {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount)
  const first = total ? (current - 1) * pageSize + 1 : 0
  const last = Math.min(current * pageSize, total)
  const pages = pageCount <= 7
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [...new Set([1, current - 1, current, current + 1, pageCount].filter(number => number >= 1 && number <= pageCount))].sort((a, b) => a - b)

  return <div className="mt-8 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
    <p role="status" aria-live="polite" className="text-sm text-gray-600">Showing {first}–{last} of {total} {total === 1 ? 'product' : 'products'}</p>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <label className="flex items-center gap-2 text-sm">Products per page<select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))} className="rounded-lg border border-line bg-white px-3 py-2"><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></label>
      <nav aria-label="Product pages" className="flex flex-wrap items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)} className="rounded border border-line px-3 py-2 text-sm disabled:opacity-40">Previous</button>
        {pages.map((number, index) => <span key={number} className="inline-flex items-center gap-1">{index > 0 && pages[index - 1] < number - 1 && <span aria-hidden="true" className="px-1 text-gray-500">…</span>}<button type="button" aria-label={`Page ${number}`} aria-current={number === current ? 'page' : undefined} onClick={() => onPageChange(number)} className={`min-w-9 rounded border px-3 py-2 text-sm ${number === current ? 'border-brand bg-brand font-bold text-white' : 'border-line hover:bg-sand'}`}>{number}</button></span>)}
        <button type="button" aria-label="Next page" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)} className="rounded border border-line px-3 py-2 text-sm disabled:opacity-40">Next</button>
      </nav>
    </div>
  </div>
}
