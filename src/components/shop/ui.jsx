import { Loader2, Inbox } from 'lucide-react'
import { statusLabel } from '../../lib/format'

/**
 * Shared storefront primitives — the reference "B2B food portal" look (Poppins +
 * amber), used by every /shop page so the redesign stays consistent. These are
 * deliberately separate from the admin `components/ui`, which keeps its own
 * hand-written CSS. Everything here is plain Tailwind and lives under `.sf`.
 */

const TONES = {
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${TONES[tone] ?? TONES.slate} ${className}`}>
      {children}
    </span>
  )
}

/** Map any order / request / payment status to a tone by keyword. */
export function statusTone(status) {
  const s = String(status || '').toLowerCase().replace(/_/g, ' ')
  if (/(deliver|approv|receiv|complet|convert|paid|success)/.test(s)) return 'green'
  if (/(pack|dispatch|out for|process|ship|quot|transit)/.test(s)) return 'blue'
  if (/(cancel|reject|declin|fail|withdraw)/.test(s)) return 'rose'
  if (/(pending|placed|new|open|await)/.test(s)) return 'amber'
  return 'slate'
}

export function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function Spinner() {
  return (
    <div className="grid place-items-center py-24 text-amber-500">
      <Loader2 size={30} className="animate-spin" />
    </div>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>
}

export function EmptyState({ icon: Icon = Inbox, title, message, children }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
      <Icon size={40} className="mx-auto text-slate-300" />
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {message && <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>}
      {children && <div className="pt-1">{children}</div>}
    </div>
  )
}

/** The catalogue's amber/blue "where this price comes from" tag. */
const SOURCE_LABEL = {
  user_flat: 'Your price',
  user_tier: 'Your bulk price',
  category_flat: 'Your price',
  category_tier: 'Your bulk price',
  global_tier: 'Bulk price',
}

export function PriceTag({ source }) {
  if (!SOURCE_LABEL[source]) return null
  const mine = source.startsWith('user')
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${mine ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
      {SOURCE_LABEL[source]}
    </span>
  )
}

/** Shared button classes so every page's primary/ghost buttons match. */
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50'
export const inputClass =
  'w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-400'
export const fieldLabel = 'block text-sm font-medium text-slate-600 mb-1.5'
