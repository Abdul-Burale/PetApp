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

  return <main className="container-page py-12 sm:py-20"><div className="mx-auto max-w-md border border-line bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Sign in</h1><p className="mt-2 text-sm leading-6 text-gray-600">Use the email address and password for your My Pet Food account.</p>{(configurationError || error)&&<div role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{configurationError ?? error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="login-email" className="mb-1.5 block text-sm font-bold">Email address</label><input id="login-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><div><label htmlFor="login-password" className="mb-1.5 block text-sm font-bold">Password</label><input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><button type="submit" disabled={submitting||authLoading||Boolean(configurationError)} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Signing in…':'Sign in'}</button></form><p className="mt-6 text-center text-sm text-gray-600">New to My Pet Food? <Link to="/signup" state={{ from: destination }} className="font-bold text-brand underline">Create an account</Link></p><p className="mt-2 text-center text-sm text-gray-600"><Link to="/" className="font-bold text-brand underline">Return to the shop</Link></p></div></main>
}

export function SignupPage() {
  const { session, loading: authLoading, configurationError, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const destination = (location.state as LoginLocationState | null)?.from ?? '/account'

  if (!authLoading && session) return <Navigate to={destination} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const createdSession = await signUp(email.trim(), password)
      if (createdSession) navigate(destination, { replace: true })
      else setConfirmationSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign up failed. Please check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="container-page py-12 sm:py-20"><div className="mx-auto max-w-md border border-line bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Create an account</h1>{confirmationSent?<div className="mt-5 border-l-4 border-brand bg-sand p-4 text-sm leading-6 text-gray-700"><p className="font-bold text-brand">Check your email</p><p className="mt-1">We’ve sent a confirmation link to {email}. Confirm your email, then sign in.</p></div>:<><p className="mt-2 text-sm leading-6 text-gray-600">Create an account to keep your details ready for future orders.</p>{(configurationError || error)&&<div role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{configurationError ?? error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="signup-email" className="mb-1.5 block text-sm font-bold">Email address</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><div><label htmlFor="signup-password" className="mb-1.5 block text-sm font-bold">Password</label><input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event=>setPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/><p className="mt-1 text-xs text-gray-500">Use at least 8 characters.</p></div><div><label htmlFor="signup-confirm-password" className="mb-1.5 block text-sm font-bold">Confirm password</label><input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><button type="submit" disabled={submitting||authLoading||Boolean(configurationError)} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Creating account…':'Create account'}</button></form></>}<p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link to="/login" state={{ from: destination }} className="font-bold text-brand underline">Sign in</Link></p></div></main>
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
