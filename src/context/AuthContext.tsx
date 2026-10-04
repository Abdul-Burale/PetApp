import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMyAccount, type BackendAccount } from '../lib/api'
import { supabase, supabaseConfigurationError } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  backendAccount: BackendAccount | null
  backendLoading: boolean
  backendError: string | null
  loading: boolean
  configurationError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<Session | null>
  signOut: () => Promise<void>
  refreshBackendAccount: () => Promise<BackendAccount | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendAccount, setBackendAccount] = useState<BackendAccount | null>(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setSession(null)
      else setSession(data.session)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setBackendAccount(null)
      setBackendError(null)
      setBackendLoading(false)
      return
    }

    let active = true
    setBackendAccount(null)
    setBackendLoading(true)
    setBackendError(null)
    void getMyAccount()
      .then(account => {
        if (active) {
          setBackendAccount(account)
          setBackendError(null)
        }
      })
      .catch(error => {
        if (active) setBackendError(error instanceof Error ? error.message : 'Your account could not be loaded.')
      })
      .finally(() => {
        if (active) setBackendLoading(false)
      })

    return () => { active = false }
  }, [session?.access_token])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    backendAccount,
    backendLoading,
    backendError,
    loading,
    configurationError: supabaseConfigurationError,
    signIn: async (email, password) => {
      if (!supabase) throw new Error(supabaseConfigurationError ?? 'Login is not configured.')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setSession(data.session)
    },
    signUp: async (email, password) => {
      if (!supabase) throw new Error(supabaseConfigurationError ?? 'Sign up is not configured.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/account` },
      })
      if (error) throw error
      setSession(data.session)
      return data.session
    },
    signOut: async () => {
      if (!supabase) return
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    refreshBackendAccount: async () => {
      if (!session) return null
      const account = await getMyAccount()
      setBackendAccount(account)
      setBackendError(null)
      return account
    },
  }), [backendAccount, backendError, backendLoading, loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
