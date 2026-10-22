import { createContext, useContext, useEffect, useState } from 'react'
import { auth, getToken, clearToken } from '../api/client'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // On mount, if we have a token in localStorage, resolve it against the
  // backend via GET /me. If the backend rejects it (expired, bad secret,
  // DB down) we drop back to signed-out state so the Login page shows.
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (!getToken()) { setReady(true); return }
      try {
        const me = await auth.me()
        if (!cancelled) setUser(me)
      } catch {
        clearToken()
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  async function login(email, password) {
    const { user: next } = await auth.login(email, password)
    setUser(next)
    return next
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  // Settings.jsx calls auth.updateMe itself and then setUser(updatedUser)
  // to replace context state. So setUser here is a plain state setter;
  // callers decide whether to persist first.
  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  )
}
