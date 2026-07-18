import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeader, ErrorNote, Spinner, Badge } from '../components/ui'
import DeliverySettings from './DeliverySettings'

const ACTIONS = ['create', 'read', 'update', 'delete']

export default function Settings() {
  const { can, user } = useAuth()
  const editable = can('Settings', 'update')

  const [data, setData] = useState(null)
  const [roles, setRoles] = useState([])
  const [roleId, setRoleId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [tab, setTab] = useState('roles')

  function loadRoles() {
    return api.listRoles().then(setRoles).catch(() => setRoles([]))
  }

  function reload() {
    return Promise.all([
      api.getPermissionMatrix().then((res) => {
        setData(res)
        setRoleId((prev) => prev ?? res.matrix[0]?.role_id ?? null)
      }),
      loadRoles(),
    ]).catch((err) => setError(err.message))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addRole(event) {
    event.preventDefault()
    if (!newRole.trim()) return
    setError('')
    setBusy(true)
    try {
      const created = await api.createRole(newRole.trim())
      setNewRole('')
      await reload()
      setRoleId(created.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function renameRole(event) {
    event.preventDefault()
    if (!renaming?.title.trim()) return
    setError('')
    setBusy(true)
    try {
      await api.updateRole(renaming.id, renaming.title.trim())
      setRenaming(null)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function retireRole(id) {
    setError('')
    setBusy(true)
    try {
      await api.deleteRole(id)
      setRoleId(null)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Re-sync the draft whenever the matrix or the selected role changes.
  //
  // This must not clear `saved`: a successful save re-fetches the matrix, so
  // doing it here would wipe the confirmation in the same tick it was set.
  // `saved` is cleared on edit and on role switch instead.
  useEffect(() => {
    if (!data || roleId === null) return
    const row = data.matrix.find((m) => m.role_id === roleId)
    setDraft(structuredClone(row.modules))
  }, [data, roleId])

  function selectRole(id) {
    setRoleId(id)
    setSaved(false)
    setError('')
  }

  function toggle(moduleId, action) {
    setSaved(false)
    setDraft((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [action]: !prev[moduleId][action] },
    }))
  }

  async function save() {
    setError('')
    setBusy(true)
    try {
      await api.updatePermissions(roleId, draft)
      const fresh = await api.getPermissionMatrix()
      setData(fresh)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) return <ErrorNote error={error} />
  if (!data || !draft) return <Spinner />

  const settingsModule = data.modules.find((m) => m.title === 'Settings')
  const isOwnRole = roleId === data.current_role_id

  return (
    <>
      <PageHeader title="Settings" subtitle="Roles, permissions and delivery" />

      <div className="tabs">
        <button type="button" className={`tab${tab === 'roles' ? ' is-active' : ''}`} onClick={() => setTab('roles')}>
          Roles &amp; permissions
        </button>
        <button type="button" className={`tab${tab === 'delivery' ? ' is-active' : ''}`} onClick={() => setTab('delivery')}>
          Delivery charges
        </button>
      </div>

      {tab === 'delivery' && <DeliverySettings />}

      {tab === 'roles' && (
      <>
      <ErrorNote error={error} />
      {saved && <div className="note note-success">Permissions saved.</div>}

      {editable && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Roles</h2>
            <form className="row-gap" onSubmit={addRole}>
              <input
                className="input input-inline"
                placeholder="New role name…"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || !newRole.trim()}>
                Add role
              </button>
            </form>
          </div>

          <table className="table table-compact">
            <thead>
              <tr>
                <th>Role</th>
                <th className="right">Users</th>
                <th className="right">Modules granted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    {renaming?.id === r.id ? (
                      <form className="row-gap" onSubmit={renameRole}>
                        <input
                          className="input input-inline"
                          value={renaming.title}
                          onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
                          autoFocus
                        />
                        <button type="submit" className="link link-btn" disabled={busy}>
                          Save
                        </button>
                        <button type="button" className="link link-btn" onClick={() => setRenaming(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="cell-title">{r.title}</span>
                        {r.is_current && <Badge tone="violet">you</Badge>}
                      </>
                    )}
                  </td>
                  <td className="right">{r.users}</td>
                  <td className="right">{r.permission_rows}</td>
                  <td className="right">
                    {renaming?.id !== r.id && (
                      <button type="button" className="link link-btn" onClick={() => setRenaming({ id: r.id, title: r.title })}>
                        Rename
                      </button>
                    )}
                    {can('Settings', 'delete') && !r.is_current && (
                      <button
                        type="button"
                        className="link link-btn link-danger"
                        onClick={() => retireRole(r.id)}
                        disabled={busy}
                        // Roles are referenced by users.role_id with no cascade,
                        // so the server refuses while the role still has users.
                        title={r.users > 0 ? `${r.users} user(s) must be moved first` : 'Retire this role'}
                      >
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted-xs">
            A new role starts with no access at all — grant it below. A role cannot be retired while
            users still hold it.
          </p>
        </section>
      )}

      <h2 className="section-title">Permissions</h2>

      <div className="tabs">
        {data.matrix.map((row) => (
          <button
            key={row.role_id}
            type="button"
            className={`tab${roleId === row.role_id ? ' is-active' : ''}`}
            onClick={() => selectRole(row.role_id)}
          >
            {row.role}
            {row.role_id === data.current_role_id && <span className="tab-tag">you</span>}
          </button>
        ))}
      </div>

      {isOwnRole && editable && (
        <div className="note note-muted">
          This is your own role ({user?.role}). You cannot remove your own{' '}
          <strong>Settings → update</strong> permission — it would lock every admin out of this screen.
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Module</th>
              {ACTIONS.map((a) => (
                <th key={a} className="center">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.modules.map((m) => {
              const flags = draft[m.id]
              const noAccess = ACTIONS.every((a) => !flags[a])
              return (
                <tr key={m.id}>
                  <td>
                    <span className="cell-title">{m.title}</span>
                    {noAccess && <Badge tone="grey">no access</Badge>}
                  </td>
                  {ACTIONS.map((a) => {
                    // Server-enforced too; this only avoids offering an action that will 409.
                    const locked =
                      isOwnRole && m.id === settingsModule?.id && a === 'update' && flags[a]
                    return (
                      <td key={a} className="center">
                        <input
                          type="checkbox"
                          checked={flags[a]}
                          disabled={!editable || locked}
                          title={locked ? 'Cannot remove your own Settings → update' : undefined}
                          onChange={() => toggle(m.id, a)}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {editable && (
          <div className="row-gap card-foot">
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save permissions'}
            </button>
            <span className="muted-xs">
              A module with nothing ticked is denied entirely — the sidebar hides it.
            </span>
          </div>
        )}
      </div>
      </>
      )}
    </>
  )
}
