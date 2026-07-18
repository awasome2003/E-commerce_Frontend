const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function money(value) {
  if (value === null || value === undefined) return '—'
  return inr.format(value)
}

/**
 * Money is stored in MySQL `float` (single precision) throughout this schema, so
 * widening to a JS double surfaces the stored error: 194.46 reads back as
 * 194.4600067138672. Round to paise before showing a raw number in an input.
 */
export function money2(value) {
  if (value === null || value === undefined || value === '') return ''
  return Math.round(Number(value) * 100) / 100
}

export function date(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function dateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Prisma exposes the DB value "Out-for-delivery" as `Out_for_delivery`. */
export function statusLabel(status) {
  return status ? status.replace(/_/g, ' ') : '—'
}

export function fullName(user) {
  if (!user) return '—'
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.email || `User #${user.id}`
}

/**
 * Names are not unique and often absent: six customers are called "Abhishek
 * Choudhary", three "Sharan Puthran", and thirty have no name at all. Anywhere a
 * customer is *chosen* (rather than shown in context), the label must carry
 * something that tells them apart, or the wrong person gets picked silently.
 */
export function customerLabel(user) {
  if (!user) return '—'
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  const qualifier = user.email || `#${user.id}`
  return name ? `${name} · ${qualifier}` : `#${user.id}${user.email ? ` · ${user.email}` : ''}`
}
