import { createContext, useContext, useEffect, useState } from 'react'
import {
  login as doLogin, logout as doLogout, hasSession, getUser, updateUser,
} from '../lib/store'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (hasSession()) setUser(getUser())
    setReady(true)
  }, [])

  async function login(email, password) {
    const { user } = doLogin(email, password)
    setUser(user)
    return user
  }

  function logout() {
    doLogout()
    setUser(null)
  }

  function patchUser(patch) {
    const next = updateUser(patch)
    setUser(next)
    return next
  }

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, setUser: patchUser }}>
      {children}
    </AuthCtx.Provider>
  )
}
