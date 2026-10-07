import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Wordmark from '../components/Wordmark'
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight } from '../components/icons'

const STATS = [
  { v: '4',  l: 'Collections' },
  { v: '∞',  l: 'Bespoke options' },
  { v: '1',  l: 'Studio, in Bengaluru' },
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('admin@theluxeversion.com')
  const [password, setPassword] = useState('Luxe@2026')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message || 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      {/* ---- Brand panel ---- */}
      <div className="login-brand">
        <div className="lb-content">
          <div className="lb-logo">
            <Wordmark height={48} />
          </div>

          <div className="lb-pitch">
            <h1 className="lb-title">
              The Luxe Version,<br />Studio Admin.
            </h1>
            <p className="lb-sub">
              Showpieces & light, redefined. Curate the collection, journal and enquiries — all from one quiet dashboard.
            </p>
            <div className="lb-stats">
              {STATS.map((s) => (
                <div className="lb-stat" key={s.l}>
                  <div className="lb-stat-v">{s.v}</div>
                  <div className="lb-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lb-foot">© {new Date().getFullYear()} The Luxe Version. All rights reserved.</div>
        </div>
      </div>

      {/* ---- Form panel ---- */}
      <div className="login-form-side">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="lc-sub">Sign in to your admin dashboard</p>

          {err && <div className="err-banner">{err}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <div className="input-wrap">
                <span className="input-ico"><IconMail size={18} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@theluxeversion.com"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-ico"><IconLock size={18} /></span>
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="input-eye" onClick={() => setShow((s) => !s)} tabIndex={-1}>
                  {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-row">
              <label className="check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a className="link-maroon" href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign In <IconArrowRight size={18} /></>}
            </button>
          </form>

          <p className="login-foot">
            Don't have an account? <a className="link-maroon" href="#" onClick={(e) => e.preventDefault()}>Request access</a>
          </p>
        </div>
      </div>
    </div>
  )
}
