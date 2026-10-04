import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BackendApiError, getMyAccount, type BackendAccount } from '../lib/api'

interface LoginLocationState { from?: string }

export function LoginPage() {
  const { session, loading: authLoading, configurationError, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const destination = (location.state as LoginLocationState | null)?.from ?? '/account'

  if (!authLoading && session) return <Navigate to={destination} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed. Check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="container-page py-12 sm:py-20"><div className="mx-auto max-w-md border border-line bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Sign in</h1><p className="mt-2 text-sm leading-6 text-gray-600">Use the email address and password for your My Pet Food account.</p>{(configurationError || error)&&<div role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{configurationError ?? error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="login-email" className="mb-1.5 block text-sm font-bold">Email address</label><input id="login-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><div><label htmlFor="login-password" className="mb-1.5 block text-sm font-bold">Password</label><input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><button type="submit" disabled={submitting||authLoading||Boolean(configurationError)} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Signing in…':'Sign in'}</button></form><p className="mt-6 text-center text-sm text-gray-600"><Link to="/" className="font-bold text-brand underline">Return to the shop</Link></p></div></main>
}

export function AccountPage() {
  const { session, user, signOut } = useAuth()
  const [account, setAccount] = useState<BackendAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!session?.access_token) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void getMyAccount(session.access_token, controller.signal)
      .then(setAccount)
      .catch(caught => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof BackendApiError ? caught.message : 'Your account could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [session?.access_token])

  const logout = async () => {
    setError(null)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'You could not be signed out. Please try again.')
    }
  }

  return <main className="container-page py-12"><div className="mx-auto max-w-2xl"><p className="text-sm text-gray-500"><Link to="/">Home</Link> / Account</p><div className="mt-5 border border-line bg-white p-6 shadow-card sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Welcome back</h1><p className="mt-2 text-gray-600">{account?.displayName ?? account?.email ?? user?.email}</p></div><button type="button" onClick={logout} className="btn-secondary shrink-0">Sign out</button></div>{loading&&<p className="mt-7 text-sm text-gray-600">Loading your account…</p>}{error&&<div role="alert" className="mt-7 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><b className="block">We couldn’t load your account.</b>{error}</div>}{!loading&&!error&&<div className="mt-7 border-l-4 border-brand bg-sand p-4"><p className="font-bold text-brand">Account verified</p><p className="mt-1 text-sm text-gray-700">Your Supabase session was accepted by the My Pet Food API.</p></div>}</div></div></main>
}
