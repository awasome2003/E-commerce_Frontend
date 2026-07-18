import { statusLabel } from '../lib/format'

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  )
}

const STATUS_TONE = {
  Placed: 'tone-blue',
  Packed: 'tone-amber',
  Dispatched: 'tone-violet',
  Out_for_delivery: 'tone-orange',
  Delivered: 'tone-green',
}

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_TONE[status] || 'tone-grey'}`}>{statusLabel(status)}</span>
}

export function Badge({ tone = 'grey', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null
  return (
    <div className="pagination">
      <span className="pagination-info">
        Page {page} of {pages} · {total.toLocaleString('en-IN')} records
      </span>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <div className="note note-error">{error}</div>
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="page-loading">{label}</div>
}
