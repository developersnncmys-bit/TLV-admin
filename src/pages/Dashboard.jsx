import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  products as productsApi, categories as catsApi,
  journal as journalApi, enquiries as enquiriesApi,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { inr, inrK, titleCase } from '../lib/format'
import {
  IconRupee, IconBox, IconBook, IconPhone, IconTrendUp, IconTrendDown,
  IconArrowUpRight, IconStar, IconUsers,
} from '../components/icons'

// Cream + warm metallic ramp — all shades sit above the glass bg so
// nothing disappears into the dark backdrop like a pure-black would.
const DONUT_COLORS = ['#f5efe4', '#d6b482', '#8a8b96', '#5a4670', '#c89f6a', '#9fa1ac']

function Donut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  const circles = segments.map((s, i) => {
    const frac = s.value / total
    const len = frac * C
    const circle = (
      <circle
        key={i}
        className="donut-seg"
        r={R}
        fill="none"
        stroke={s.color}
        strokeWidth="14"
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-acc}
        strokeLinecap="butt"
        style={{ animationDelay: `${i * 90}ms` }}
      >
        <title>{s.name}: {s.value} ({Math.round(frac * 100)}%)</title>
      </circle>
    )
    acc += len
    return circle
  })
  return (
    <svg viewBox="0 0 140 140" className="donut">
      <g transform="translate(70 70) rotate(-90)">{circles}</g>
      <text x="70" y="70" textAnchor="middle" className="donut-c1">{total}</text>
      <text x="70" y="90" textAnchor="middle" className="donut-c2">pieces</text>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([productsApi.list(), catsApi.list(), journalApi.list(), enquiriesApi.list()])
      .then(([products, cats, journal, enquiries]) => setData({ products, cats, journal, enquiries }))
      .catch((e) => setErr(e.message))
  }, [])

  const s = useMemo(() => {
    if (!data) return null
    const { products, cats, journal, enquiries } = data

    const catalogueValue = products.reduce((a, p) => a + (p.price || 0) * (p.stock || 0), 0)
    const totalStock = products.reduce((a, p) => a + (p.stock || 0), 0)
    const bespokeCount = products.filter((p) => p.bespoke).length
    const newEnquiries = enquiries.filter((e) => e.status === 'new').length

    // Customers = unique people who have reached out (by email, falling
    // back to normalised name when an email is absent). Derived rather than
    // stored because there's no separate customers resource in this admin.
    const customerKeys = new Set()
    enquiries.forEach((e) => {
      const key = (e.email || e.name || '').trim().toLowerCase()
      if (key) customerKeys.add(key)
    })
    const customerCount = customerKeys.size

    const byCat = {}
    products.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + 1 })
    const catSegments = cats
      .map((c) => ({ name: c.name, value: byCat[c.id] || 0 }))
      .filter((c) => c.value > 0)

    const topPieces = [...products]
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 5)

    const recentJournal = [...journal]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 5)

    return {
      products, cats, journal, enquiries,
      catalogueValue, totalStock, bespokeCount, newEnquiries, customerCount,
      catSegments, catTotal: catSegments.reduce((a, c) => a + c.value, 0) || 1,
      topPieces, recentJournal,
    }
  }, [data])

  if (err) return <div className="empty"><div className="em-ico">⚠️</div><p>{err}</p></div>
  if (!s) return <div className="spinner" />

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = (user?.name || 'Admin').split(' ')[0]
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const cards = [
    { label: 'Catalogue Value', value: inrK(s.catalogueValue), Icon: IconRupee, delta: 4.2 },
    { label: 'Pieces in Stock', value: s.totalStock,           Icon: IconBox,   delta: 1.1 },
    { label: 'Customers',       value: s.customerCount,        Icon: IconUsers, delta: s.customerCount > 0 ? 3.5 : -1.0 },
    { label: 'New Enquiries',   value: s.newEnquiries,         Icon: IconPhone, delta: s.newEnquiries > 0 ? 8.0 : -1.0 },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greet}, {first}</h1>
          <p>{today} · {s.products.length} pieces across {s.cats.length} categories</p>
        </div>
        <div className="page-actions">
          <Link to="/enquiry" className="btn btn-outline"><IconPhone size={16} /> Enquiries</Link>
          <Link to="/products" className="btn btn-primary"><IconArrowUpRight size={16} /> View Catalogue</Link>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => {
          const up = c.delta >= 0
          return (
            <div className="stat stat-dark" key={c.label}>
              <div className="stat-top">
                <div className="st-ico"><c.Icon size={18} /></div>
                <span className={`delta-pill ${up ? 'up' : 'down'}`}>
                  {up ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}{Math.abs(c.delta)}%
                </span>
              </div>
              <div className="st-value">{c.value}</div>
              <div className="st-label">{c.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Catalogue by Category</h3>
              <div className="hint">Share of total pieces</div>
            </div>
          </div>
          <div className="card-pad donut-wrap">
            <Donut segments={s.catSegments.map((seg, i) => ({ value: seg.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
            <div className="legend">
              {s.catSegments.map((seg, i) => (
                <div className="legend-row" key={seg.name}>
                  <span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span>{titleCase(seg.name)}</span>
                  <span className="lv">{Math.round((seg.value / s.catTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3><IconStar size={14} style={{ verticalAlign: '-2px' }} /> Highest Priced</h3>
              <div className="hint">Top 5 by selling price</div>
            </div>
            <Link to="/products" className="link-maroon sm">Catalogue</Link>
          </div>
          <div className="card-pad">
            {s.topPieces.map((p, i) => (
              <div className="list-row" key={p.id}>
                <div className="rank">{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bs-name">{p.name}</div>
                  <div className="bs-sub">{p.reference || p.id}</div>
                </div>
                <div className="bs-rev">{inr(p.price || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Recent Enquiries</h3>
              <div className="hint">{s.newEnquiries} new</div>
            </div>
            <Link to="/enquiry" className="link-maroon sm">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>From</th><th>Subject</th><th>Status</th></tr>
              </thead>
              <tbody>
                {s.enquiries.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.subject}</td>
                    <td><span className={`badge ${e.status === 'new' ? 'amber' : 'grey'}`}>{titleCase(e.status)}</span></td>
                  </tr>
                ))}
                {s.enquiries.length === 0 && (
                  <tr><td colSpan={3} style={{ color: '#8a8b96', padding: '14px 10px' }}>No enquiries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3><IconBook size={14} style={{ verticalAlign: '-2px' }} /> Latest Journal</h3>
              <div className="hint">The Studio</div>
            </div>
            <Link to="/journal" className="link-maroon sm">Open studio</Link>
          </div>
          <div className="card-pad">
            {s.recentJournal.map((j, i) => (
              <div className="list-row" key={j.id}>
                <div className="rank">{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bs-name">{j.name}</div>
                  <div className="bs-sub">{j.category}{j.region ? ` · ${j.region}` : ''}</div>
                </div>
              </div>
            ))}
            {s.recentJournal.length === 0 && (
              <div style={{ color: '#8a8b96', padding: 14 }}>No journal entries yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
