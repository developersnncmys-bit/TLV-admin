import { useEffect, useMemo, useState } from 'react'
import {
  orders as ordersApi, customers as customersApi, products as productsApi,
} from '../api/client'
import { useToast } from '../context/ToastContext'
import { inr, inrK } from '../lib/format'
import {
  IconRupee, IconBag, IconRefresh, IconUsers, IconTrendUp, IconTrendDown,
} from '../components/icons'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const isBilled = (o) => (o?.status || '').toLowerCase() !== 'cancelled'
const amountOf = (o) => Number(o?.amount) || 0
const dateOf = (o) => (o?.createdAt ? new Date(o.createdAt) : null)

function sameMonth(d, year, monthIdx) {
  return d && d.getFullYear() === year && d.getMonth() === monthIdx
}
function sameDay(d, y, m, day) {
  return d && d.getFullYear() === y && d.getMonth() === m && d.getDate() === day
}

function periodDelta(orders, days) {
  const now = Date.now()
  const curStart = now - days * 24 * 60 * 60 * 1000
  const prevStart = now - 2 * days * 24 * 60 * 60 * 1000
  let cur = 0
  let prev = 0
  orders.forEach((o) => {
    if (!isBilled(o)) return
    const d = dateOf(o)?.getTime()
    if (!d) return
    if (d >= curStart) cur += amountOf(o)
    else if (d >= prevStart) prev += amountOf(o)
  })
  if (!prev) return cur > 0 ? 100 : 0
  return ((cur - prev) / prev) * 100
}

export default function Analytics() {
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [customers, setCustomers] = useState(null)
  const [products, setProducts] = useState(null)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch((e) => toast.bad(e.message))
    customersApi.list().then(setCustomers).catch(() => {})
    productsApi.list().then(setProducts).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = orders && customers && products

  const stats = useMemo(() => {
    if (!ready) return null
    const billed = orders.filter(isBilled)
    const revenue = billed.reduce((s, o) => s + amountOf(o), 0)
    const count = billed.length
    const aov = count ? Math.round(revenue / count) : 0
    const perCustomer = new Map()
    billed.forEach((o) => {
      const key = o.customer?.email || o.customer?.phone || o.customer?.name
      if (!key) return
      perCustomer.set(key, (perCustomer.get(key) || 0) + 1)
    })
    const repeat = [...perCustomer.values()].filter((n) => n >= 2).length
    const customersPool = customers.length || perCustomer.size || 1
    const repeatPct = (repeat / customersPool) * 100
    return {
      revenue, aov, count, repeatPct,
      deltaRevenue: periodDelta(orders, 30),
      deltaOrders:  periodDelta(orders.filter(isBilled).map((o) => ({ ...o, amount: 1 })), 30),
    }
  }, [ready, orders, customers])

  const monthly = useMemo(() => {
    if (!ready) return []
    const now = new Date()
    const buckets = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS_SHORT[d.getMonth()], count: 0, revenue: 0 })
    }
    orders.forEach((o) => {
      if (!isBilled(o)) return
      const d = dateOf(o)
      if (!d) return
      const b = buckets.find((x) => sameMonth(d, x.year, x.month))
      if (!b) return
      b.count += 1
      b.revenue += amountOf(o)
    })
    return buckets
  }, [ready, orders])

  const daily = useMemo(() => {
    if (!ready) return []
    const now = new Date()
    const buckets = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      buckets.push({
        year: d.getFullYear(), month: d.getMonth(), day: d.getDate(),
        label: DAYS_SHORT[d.getDay()],
        count: 0, revenue: 0,
      })
    }
    orders.forEach((o) => {
      if (!isBilled(o)) return
      const d = dateOf(o)
      if (!d) return
      const b = buckets.find((x) => sameDay(d, x.year, x.month, x.day))
      if (!b) return
      b.count += 1
      b.revenue += amountOf(o)
    })
    return buckets
  }, [ready, orders])

  const topProducts = useMemo(() => {
    if (!ready) return []
    const totals = new Map()
    orders.forEach((o) => {
      if (!isBilled(o)) return
      const items = Array.isArray(o.items) ? o.items : []
      items.forEach((it) => {
        const key = it.productId || it.reference || it.name
        if (!key) return
        const price = Number(it.price) || 0
        const qty = Number(it.qty) || 0
        const entry = totals.get(key) || { key, name: it.name, revenue: 0, units: 0 }
        entry.revenue += price * qty
        entry.units += qty
        totals.set(key, entry)
      })
    })
    const rows = [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    const max = rows.length ? rows[0].revenue : 0
    return rows.map((r) => ({ ...r, pct: max ? (r.revenue / max) * 100 : 0 }))
  }, [ready, orders])

  if (!ready) return <div className="spinner" />

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Deep insights into store performance</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          Icon={IconRupee}
          color="#22d3ee"
          label="Total revenue"
          value={inr(stats.revenue)}
          delta={stats.deltaRevenue}
        />
        <StatCard
          Icon={IconBag}
          color="#ffffff"
          label="Avg. order value"
          value={inr(stats.aov)}
        />
        <StatCard
          Icon={IconRefresh}
          color="#22d3ee"
          label="Total orders"
          value={stats.count.toLocaleString('en-IN')}
          delta={stats.deltaOrders}
        />
        <StatCard
          Icon={IconUsers}
          color="#ffffff"
          label="Repeat customers"
          value={`${stats.repeatPct.toFixed(1)}%`}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card card-pad">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <div>
              <h3>Orders per Month</h3>
              <div className="hint">Order count across the last six months</div>
            </div>
          </div>
          <BarChart data={monthly} />
        </div>
        <div className="card card-pad">
          <div className="card-head" style={{ marginBottom: 10 }}>
            <div>
              <h3>Daily Revenue &amp; Orders</h3>
              <div className="hint">Last seven days</div>
            </div>
          </div>
          <DualLineChart data={daily} />
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 10, fontSize: 12, color: 'var(--glass-text-muted)' }}>
            <LegendDot color="#22d3ee" label={`Revenue (${'₹'})`} />
            <LegendDot color="#ffffff" label="Orders" />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Top Revenue Generators</h3>
            <div className="hint">Pieces ranked by revenue (price × units sold)</div>
          </div>
        </div>
        {topProducts.length === 0 ? (
          <div className="empty"><div className="em-ico">📊</div><p>No sales yet</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topProducts.map((p) => (
              <div key={p.key} className="top-rev-row">
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6, gap: 14,
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--glass-text)',
                    textTransform: 'uppercase', letterSpacing: 0.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                    <span style={{
                      fontSize: 11, fontWeight: 500, letterSpacing: 0,
                      textTransform: 'none', color: 'var(--glass-text-muted)', marginLeft: 10,
                    }}>
                      {p.units} unit{p.units === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--glass-text)', fontVariantNumeric: 'tabular-nums' }}>
                    {inr(p.revenue)}
                  </div>
                </div>
                <div className="top-rev-bar" style={{
                  width: '100%', height: 6, borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                  <span style={{
                    display: 'block',
                    width: `${p.pct}%`, height: '100%',
                    background: 'linear-gradient(90deg,#22d3ee,#ffffff)',
                    transition: 'width 0.4s ease, filter 0.15s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function StatCard({ Icon, color, label, value, delta }) {
  const showDelta = typeof delta === 'number' && Number.isFinite(delta)
  const up = showDelta ? delta >= 0 : true
  return (
    <div className="stat stat-dark inv-stat">
      <div className="stat-top">
        <div className="st-ico" style={{ color }}><Icon size={20} /></div>
        {showDelta && (
          <span className={`delta-pill ${up ? 'up' : 'down'}`}>
            {up ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="st-value">{value}</div>
      <div className="st-label">{label}</div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

/* ---------- Charts (inline SVG, no deps) ---------- */

function BarChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 560
  const H = 280
  const pad = { l: 44, r: 12, t: 16, b: 34 }
  const inner = { w: W - pad.l - pad.r, h: H - pad.t - pad.b }
  const max = Math.max(1, ...data.map((d) => d.count))
  const niceMax = niceCeil(max)
  const barW = inner.w / (data.length * 1.7)
  const step = inner.w / data.length
  const ticks = 4
  const activeIdx = hover
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={{ display: 'block' }}
      onMouseLeave={() => setHover(null)}
    >
      {/* grid lines */}
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = pad.t + (inner.h * i) / ticks
        const v = Math.round((niceMax * (ticks - i)) / ticks)
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 10} y={y + 4} fontSize="11" fill="rgba(245,239,228,0.55)" textAnchor="end">
              {v}
            </text>
          </g>
        )
      })}

      {/* full-height hit zones so cursor doesn't have to land on a thin bar */}
      {data.map((d, i) => (
        <rect
          key={`hit-${i}`}
          x={pad.l + step * i} y={pad.t}
          width={step} height={inner.h}
          fill="transparent"
          style={{ cursor: d.count > 0 ? 'pointer' : 'default' }}
          onMouseEnter={() => d.count > 0 && setHover(i)}
        />
      ))}

      {/* bars — skip 0-count months so empty bars don't leave a stub */}
      {data.map((d, i) => {
        const h = (d.count / niceMax) * inner.h
        const x = pad.l + step * i + (step - barW) / 2
        const y = pad.t + inner.h - h
        const isLast = i === data.length - 1
        const isActive = activeIdx === i
        const base = isLast ? '#22d3ee' : 'rgba(34,211,238,0.5)'
        const fill = isActive ? '#67e8f9' : base
        if (d.count <= 0) return null
        return (
          <rect
            key={`bar-${i}`}
            x={x} y={y} width={barW} height={Math.max(h, 2)}
            rx={4}
            fill={fill}
            style={{
              transition: 'fill 0.15s ease, filter 0.15s ease',
              filter: isActive ? 'drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))' : 'none',
              pointerEvents: 'none',
            }}
          />
        )
      })}

      {/* month labels */}
      {data.map((d, i) => (
        <text
          key={`lbl-${i}`}
          x={pad.l + step * i + step / 2}
          y={H - 12}
          fontSize="12"
          fill={activeIdx === i ? '#ffffff' : 'rgba(245,239,228,0.75)'}
          textAnchor="middle"
          style={{ transition: 'fill 0.15s ease', pointerEvents: 'none' }}
        >
          {d.label}
        </text>
      ))}

      {/* tooltip */}
      {activeIdx != null && data[activeIdx] && (
        <ChartTooltip
          x={pad.l + step * activeIdx + step / 2}
          y={pad.t + inner.h - (data[activeIdx].count / niceMax) * inner.h}
          chartW={W}
          lines={[
            data[activeIdx].label,
            `${data[activeIdx].count} order${data[activeIdx].count === 1 ? '' : 's'}`,
            inrK(data[activeIdx].revenue),
          ]}
        />
      )}
    </svg>
  )
}

function DualLineChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 560
  const H = 280
  const pad = { l: 50, r: 50, t: 16, b: 34 }
  const inner = { w: W - pad.l - pad.r, h: H - pad.t - pad.b }
  const maxRev = niceCeil(Math.max(1, ...data.map((d) => d.revenue)))
  const maxCnt = niceCeil(Math.max(1, ...data.map((d) => d.count)))
  const step = data.length > 1 ? inner.w / (data.length - 1) : 0
  const xAt = (i) => pad.l + step * i
  const yRev = (v) => pad.t + inner.h - (v / maxRev) * inner.h
  const yCnt = (v) => pad.t + inner.h - (v / maxCnt) * inner.h
  const ticks = 4

  const revPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yRev(d.revenue)}`).join(' ')
  const cntPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yCnt(d.count)}`).join(' ')
  const revArea = `${revPath} L${xAt(data.length - 1)},${pad.t + inner.h} L${xAt(0)},${pad.t + inner.h} Z`
  const hitW = step || inner.w

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={{ display: 'block' }}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines + dual-axis tick labels */}
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = pad.t + (inner.h * i) / ticks
        const vRev = Math.round((maxRev * (ticks - i)) / ticks)
        const vCnt = Math.round((maxCnt * (ticks - i)) / ticks)
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 10} y={y + 4} fontSize="11" fill="rgba(34,211,238,0.9)" textAnchor="end">
              {inrKShort(vRev)}
            </text>
            <text x={W - pad.r + 10} y={y + 4} fontSize="11" fill="rgba(255,255,255,0.85)" textAnchor="start">
              {vCnt}
            </text>
          </g>
        )
      })}
      <path d={revArea} fill="url(#revFill)" />
      <path d={revPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={cntPath} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* crosshair + highlighted dots on hover */}
      {hover != null && data[hover] && (
        <g pointerEvents="none">
          <line
            x1={xAt(hover)} x2={xAt(hover)}
            y1={pad.t} y2={pad.t + inner.h}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 3"
          />
          <circle cx={xAt(hover)} cy={yRev(data[hover].revenue)} r="6" fill="#22d3ee"
            style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.6))' }} />
          <circle cx={xAt(hover)} cy={yCnt(data[hover].count)} r="6" fill="#ffffff"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }} />
        </g>
      )}

      {/* static dots (dimmed when another one is hovered) */}
      {data.map((d, i) => {
        const dim = hover != null && hover !== i
        return (
          <g key={i} style={{ transition: 'opacity 0.15s ease', opacity: dim ? 0.35 : 1 }}>
            <circle cx={xAt(i)} cy={yRev(d.revenue)} r="3.5" fill="#22d3ee" />
            <circle cx={xAt(i)} cy={yCnt(d.count)} r="3.5" fill="#ffffff" />
          </g>
        )
      })}

      {/* day labels */}
      {data.map((d, i) => (
        <text
          key={`lbl-${i}`}
          x={xAt(i)}
          y={H - 12}
          fontSize="12"
          fill={hover === i ? '#ffffff' : 'rgba(245,239,228,0.75)'}
          textAnchor="middle"
          style={{ transition: 'fill 0.15s ease' }}
        >
          {d.label}
        </text>
      ))}

      {/* hit zones — wide enough to make hover forgiving on sparse points */}
      {data.map((d, i) => (
        <rect
          key={`hit-${i}`}
          x={xAt(i) - hitW / 2}
          y={pad.t}
          width={hitW}
          height={inner.h}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHover(i)}
        />
      ))}

      {/* tooltip anchored above the higher of the two y-values */}
      {hover != null && data[hover] && (
        <ChartTooltip
          x={xAt(hover)}
          y={Math.min(yRev(data[hover].revenue), yCnt(data[hover].count))}
          chartW={W}
          lines={[
            data[hover].label,
            `Revenue · ${inrK(data[hover].revenue)}`,
            `Orders  · ${data[hover].count}`,
          ]}
        />
      )}
    </svg>
  )
}

/* Shared SVG tooltip. Clamps its x-position so it never flows outside the
   chart viewBox when hovering the first or last point. */
function ChartTooltip({ x, y, chartW, lines }) {
  const padX = 11
  const padY = 8
  const lineH = 14
  const w = 128
  const h = padY * 2 + lines.length * lineH - 2
  const gap = 12
  let tx = x - w / 2
  if (tx < 4) tx = 4
  else if (tx + w > chartW - 4) tx = chartW - 4 - w
  let ty = y - h - gap
  const flipped = ty < 4
  if (flipped) ty = y + gap

  return (
    <g pointerEvents="none" style={{ animation: 'tipIn 0.12s ease-out' }}>
      <rect
        x={tx} y={ty}
        width={w} height={h}
        rx={8}
        fill="rgba(10, 10, 10, 0.92)"
        stroke="rgba(255, 255, 255, 0.14)"
      />
      {lines.map((line, i) => {
        const isTitle = i === 0
        return (
          <text
            key={i}
            x={tx + padX}
            y={ty + padY + lineH * (i + 0.75)}
            fontSize={isTitle ? 11.5 : 11}
            fontWeight={isTitle ? 700 : 500}
            letterSpacing={isTitle ? 0.4 : 0}
            fill={isTitle ? '#ffffff' : 'rgba(245, 239, 228, 0.85)'}
          >
            {isTitle ? String(line).toUpperCase() : line}
          </text>
        )
      })}
    </g>
  )
}

function niceCeil(v) {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  let m
  if (n <= 1) m = 1
  else if (n <= 2) m = 2
  else if (n <= 5) m = 5
  else m = 10
  return m * pow
}

function inrKShort(v) {
  if (v >= 10000000) return (v / 10000000).toFixed(1) + 'Cr'
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
  return String(v)
}
