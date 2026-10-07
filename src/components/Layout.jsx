import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { initials, inr, titleCase } from '../lib/format'
import {
  products as productsApi,
  journal as journalApi,
  enquiries as enquiriesApi,
} from '../api/client'
import {
  IconSearch, IconPlus, IconBell, IconLogout,
  IconBox, IconBook, IconPhone,
} from './icons'

const RESOURCE_META = {
  piece:    { label: 'Piece',   path: '/products', Icon: IconBox },
  journal:  { label: 'Journal', path: '/journal',  Icon: IconBook },
  enquiry:  { label: 'Enquiry', path: '/enquiry',  Icon: IconPhone },
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // ---- Search ---------------------------------------------------------
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [index, setIndex] = useState({ pieces: [], journal: [], enquiries: [] })
  const searchRef = useRef(null)

  // ---- Notifications --------------------------------------------------
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    Promise.all([productsApi.list(), journalApi.list(), enquiriesApi.list()])
      .then(([pieces, journal, enquiries]) => setIndex({ pieces, journal, enquiries }))
      .catch(() => {})
  }, [])

  // Close popovers on outside click
  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const matches = []
    for (const p of index.pieces) {
      const hay = `${p.name} ${p.reference || ''} ${p.id} ${p.materials || ''}`.toLowerCase()
      if (hay.includes(q)) {
        matches.push({ type: 'piece', id: p.id, title: p.name, sub: `${p.reference || p.id} · ${inr(p.price || 0)}` })
      }
    }
    for (const j of index.journal) {
      const hay = `${j.name} ${j.category || ''} ${j.region || ''}`.toLowerCase()
      if (hay.includes(q)) {
        matches.push({ type: 'journal', id: j.id, title: j.name, sub: `${j.category || 'Journal'}${j.region ? ` · ${j.region}` : ''}` })
      }
    }
    for (const e of index.enquiries) {
      const hay = `${e.name || ''} ${e.email || ''} ${e.subject || ''} ${e.message || ''}`.toLowerCase()
      if (hay.includes(q)) {
        matches.push({ type: 'enquiry', id: e.id, title: e.name || 'Enquiry', sub: e.subject || e.email || e.id })
      }
    }
    return matches.slice(0, 10)
  }, [query, index])

  const newEnquiries = useMemo(
    () => index.enquiries.filter((e) => (e.status || 'new') === 'new'),
    [index.enquiries],
  )

  function openResult(r) {
    const path = RESOURCE_META[r.type]?.path || '/'
    setSearchOpen(false)
    setQuery('')
    nav(path)
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">☰</button>

          <div className="topbar-search" ref={searchRef}>
            <IconSearch size={18} />
            <input
              placeholder="Search pieces, journal, enquiries…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => query && setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchOpen(false); e.target.blur() }
                if (e.key === 'Enter' && results[0]) openResult(results[0])
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => { setQuery(''); setSearchOpen(false) }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            {searchOpen && query && (
              <div className="search-pop card">
                {results.length === 0 ? (
                  <div className="search-empty">No matches for "{query}"</div>
                ) : (
                  <ul className="search-list">
                    {results.map((r) => {
                      const meta = RESOURCE_META[r.type]
                      const Icon = meta.Icon
                      return (
                        <li key={`${r.type}-${r.id}`}>
                          <button type="button" className="search-item" onClick={() => openResult(r)}>
                            <span className="search-item-ico"><Icon size={15} /></span>
                            <span className="search-item-body">
                              <span className="search-item-title">{r.title}</span>
                              <span className="search-item-sub">{r.sub}</span>
                            </span>
                            <span className="search-item-tag">{meta.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="spacer" />

          <button className="btn btn-primary btn-pill topbar-add" onClick={() => nav('/products?new=1')}>
            <IconPlus size={18} /> <span className="topbar-add-label">Add Piece</span>
          </button>

          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-bell"
              title={newEnquiries.length ? `${newEnquiries.length} new enquiries` : 'Notifications'}
              onClick={() => setNotifOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={notifOpen}
            >
              <IconBell size={20} />
              {newEnquiries.length > 0 && <span className="bell-dot" />}
            </button>

            {notifOpen && (
              <div className="notif-pop card">
                <div className="notif-head">
                  <div>
                    <div className="notif-title">Notifications</div>
                    <div className="notif-sub">
                      {newEnquiries.length
                        ? `${newEnquiries.length} new enquir${newEnquiries.length === 1 ? 'y' : 'ies'}`
                        : 'You\'re all caught up'}
                    </div>
                  </div>
                </div>
                {newEnquiries.length === 0 ? (
                  <div className="notif-empty">
                    <IconBell size={22} />
                    <span>No new activity.</span>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {newEnquiries.slice(0, 6).map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="notif-item"
                          onClick={() => { setNotifOpen(false); nav('/enquiry') }}
                        >
                          <span className="notif-item-ico"><IconPhone size={14} /></span>
                          <span className="notif-item-body">
                            <span className="notif-item-title">{e.name || 'New enquiry'}</span>
                            <span className="notif-item-sub">{e.subject || e.email || e.id}</span>
                          </span>
                          <span className="badge amber">{titleCase(e.status || 'new')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="notif-foot" onClick={() => { setNotifOpen(false); nav('/enquiry') }}>
                  View all enquiries →
                </button>
              </div>
            )}
          </div>

          <div className="topbar-account">
            <button className="account-btn" onClick={() => setMenuOpen((m) => !m)}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="account-av"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="account-av">{initials(user?.name) || 'A'}</span>
              )}
              <span className="account-meta">
                <span className="account-nm">{user?.name || 'Admin'}</span>
                <span className="account-rl">{user?.role || 'Studio Admin'}</span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                <div className="account-menu card">
                  <div className="am-head">
                    <div className="am-nm">{user?.name}</div>
                    <div className="am-em">{user?.email}</div>
                  </div>
                  <button className="am-item danger" onClick={logout}>
                    <IconLogout size={17} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="topbar-logout" title="Sign out" onClick={logout}>
            <IconLogout size={20} />
          </button>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
