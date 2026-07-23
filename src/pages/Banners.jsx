import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { date } from '../lib/format'
import { useSession } from '../context/SessionContext'
import { PageHeader, Badge, ErrorNote, Spinner } from '../components/ui'

// `unknown` means the row stores an unusable date (0000-00-00) — the banner
// cannot be scheduled until it is fixed.
const TONE = { live: 'green', scheduled: 'blue', expired: 'grey', unknown: 'amber' }

/** `date_from`/`date_to` are DATETIME; <input type="datetime-local"> wants no zone. */
function toLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY = { title: '', link: '', image_url: '', date_from: '', date_to: '' }

export default function Banners() {
  const { can } = useSession()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  function load() {
    setError('')
    api.listBanners().then(setRows).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function save(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = {
        title: editing.title,
        link: editing.link,
        image_url: editing.image_url,
        date_from: new Date(editing.date_from).toISOString(),
        date_to: new Date(editing.date_to).toISOString(),
      }
      if (editing.id) await api.updateBanner(editing.id, body)
      else await api.createBanner(body)
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setError('')
    try {
      await api.deleteBanner(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <PageHeader title="Banner ads" subtitle="Promotional banners and their run dates">
        {can('Banner Ads', 'create') && !editing && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>
            New banner
          </button>
        )}
      </PageHeader>

      {/* No upload pipeline or bucket credentials here — images are referenced by URL. */}
      <div className="note note-muted">
        Images are referenced by URL (existing ones live in the project S3 bucket). Uploading from
        this panel needs bucket access and is not built.
      </div>

      <ErrorNote error={error} />

      {editing && (
        <form className="card" onSubmit={save}>
          <h2 className="card-title">{editing.id ? `Edit banner #${editing.id}` : 'New banner'}</h2>

          <div className="field-row">
            <label className="field">
              <span>Title</span>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
            </label>
            <label className="field">
              <span>Link</span>
              <input className="input" value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} required />
            </label>
          </div>

          <label className="field">
            <span>Image URL</span>
            <input className="input" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} required />
          </label>

          {editing.image_url && (
            <img src={editing.image_url} alt="" className="banner-preview" />
          )}

          <div className="field-row">
            <label className="field">
              <span>Runs from</span>
              <input className="input" type="datetime-local" value={editing.date_from} onChange={(e) => setEditing({ ...editing, date_from: e.target.value })} required />
            </label>
            <label className="field">
              <span>Runs to</span>
              <input className="input" type="datetime-local" value={editing.date_to} onChange={(e) => setEditing({ ...editing, date_to: e.target.value })} required />
            </label>
          </div>

          <div className="row-gap">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save banner'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!rows ? (
        <Spinner />
      ) : (
        <div className="banner-grid">
          {rows.map((b) => (
            <article key={b.id} className="card banner-card">
              <img src={b.image_url} alt="" className="banner-preview" loading="lazy" />
              <div className="banner-body">
                <div className="card-head">
                  <strong>{b.title}</strong>
                  <Badge tone={TONE[b.state]}>{b.state}</Badge>
                </div>
                <div className="muted-xs">
                  {date(b.date_from)} → {date(b.date_to)}
                </div>
                <a href={b.link} target="_blank" rel="noreferrer" className="muted-xs link">
                  {b.link.slice(0, 48)}
                  {b.link.length > 48 ? '…' : ''}
                </a>
                <div className="row-gap banner-actions">
                  {can('Banner Ads', 'update') && (
                    <button
                      type="button"
                      className="link link-btn"
                      onClick={() =>
                        setEditing({
                          id: b.id,
                          title: b.title,
                          link: b.link,
                          image_url: b.image_url,
                          date_from: toLocalInput(b.date_from),
                          date_to: toLocalInput(b.date_to),
                        })
                      }
                    >
                      Edit
                    </button>
                  )}
                  {can('Banner Ads', 'delete') && (
                    <button type="button" className="link link-btn link-danger" onClick={() => remove(b.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {rows.length === 0 && <p className="muted">No banners yet.</p>}
        </div>
      )}
    </>
  )
}
