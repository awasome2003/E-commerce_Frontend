import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { money, date, fullName } from '../lib/format'
import { PageHeader, Pagination, ErrorNote, Spinner } from '../components/ui'

export default function Customers() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced])

  useEffect(() => {
    let cancelled = false
    setError('')
    api
      .listCustomers({ search: debounced, page, limit: 25 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [debounced, page])

  return (
    <>
      <PageHeader title="Customers" subtitle="Business accounts, credit terms and outlets" />

      <div className="filters">
        <input
          className="input"
          placeholder="Search name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ErrorNote error={error} />

      {!data ? (
        <Spinner />
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Category</th>
                <th className="right">Credit limit</th>
                <th className="right">Terms</th>
                <th className="right">Spent</th>
                <th className="right">Orders</th>
                <th className="right">Outlets</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-title">{fullName(c)}</div>
                    <div className="muted-xs">
                      {c.email || '—'}
                      {c.phone_number ? ` · ${c.phone_number}` : ''}
                    </div>
                    <div className="muted-xs">Joined {date(c.created_at)}</div>
                  </td>
                  <td>{c.master_customer_category?.title || '—'}</td>
                  <td className="right">{money(c.credit_limit)}</td>
                  <td className="right">{c.no_of_days != null ? `${c.no_of_days} days` : '—'}</td>
                  <td className="right">{money(c.total_spent)}</td>
                  <td className="right">{c._count.orders}</td>
                  <td className="right">{c._count.user_outlets}</td>
                  <td className="right">
                    <Link to={`/customers/${c.id}`} className="link">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No customers match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  )
}
