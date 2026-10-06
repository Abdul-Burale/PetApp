import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BackendApiError, createAddress, deleteAddress, listAddresses, updateAddress, updateMyAccount, type BackendAddress } from '../lib/api'

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
    event.preventDefault(); setSubmitting(true); setError(null)
    try { await signIn(email.trim(), password); navigate(destination, { replace: true }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Login failed. Check your details and try again.') }
    finally { setSubmitting(false) }
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
    event.preventDefault(); setError(null)
    if (password !== confirmPassword) { setError('Your passwords do not match.'); return }
    setSubmitting(true)
    try { const createdSession = await signUp(email.trim(), password); if (createdSession) navigate(destination, { replace: true }); else setConfirmationSent(true) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Sign up failed. Please check your details and try again.') }
    finally { setSubmitting(false) }
  }

  return <main className="container-page py-12 sm:py-20"><div className="mx-auto max-w-md border border-line bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Create an account</h1>{confirmationSent?<div className="mt-5 border-l-4 border-brand bg-sand p-4 text-sm leading-6 text-gray-700"><p className="font-bold text-brand">Check your email</p><p className="mt-1">We’ve sent a confirmation link to {email}. Confirm your email, then sign in.</p></div>:<><p className="mt-2 text-sm leading-6 text-gray-600">Create an account to keep your details ready for future orders.</p>{(configurationError || error)&&<div role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{configurationError ?? error}</div>}<form onSubmit={submit} className="mt-6 space-y-4"><div><label htmlFor="signup-email" className="mb-1.5 block text-sm font-bold">Email address</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><div><label htmlFor="signup-password" className="mb-1.5 block text-sm font-bold">Password</label><input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event=>setPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/><p className="mt-1 text-xs text-gray-500">Use at least 8 characters.</p></div><div><label htmlFor="signup-confirm-password" className="mb-1.5 block text-sm font-bold">Confirm password</label><input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} className="w-full border border-line px-3 py-3 outline-none focus:border-brand"/></div><button type="submit" disabled={submitting||authLoading||Boolean(configurationError)} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Creating account…':'Create account'}</button></form></>}<p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link to="/login" state={{ from: destination }} className="font-bold text-brand underline">Sign in</Link></p></div></main>
}

const emptyAddress = { label: 'Home', recipientName: '', line1: '', line2: '', city: '', county: '', postcode: '', phone: '', isDefault: false }

export function AccountPage() {
  const { user, backendAccount: account, backendLoading: loading, backendError: accountError, refreshBackendAccount, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<BackendAddress[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressSaving, setAddressSaving] = useState(false)
  const [address, setAddress] = useState(emptyAddress)
  const navigate = useNavigate()
  const isStaff = account?.role?.toLowerCase() === 'staff'

  useEffect(() => { setDisplayName(account?.displayName ?? ''); setPhone(account?.phone ?? '') }, [account])
  useEffect(() => {
    if (!account) return
    let active = true
    setAddressLoading(true)
    void listAddresses().then(result => { if (active) setAddresses(result) }).catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Your addresses could not be loaded.') }).finally(() => { if (active) setAddressLoading(false) })
    return () => { active = false }
  }, [account])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null); setSavedMessage(null)
    try { await updateMyAccount({ displayName: displayName.trim(), phone: phone.trim() }); await refreshBackendAccount(); setSavedMessage('Your account details have been saved.') }
    catch (caught) { setError(caught instanceof BackendApiError ? caught.message : 'Your account details could not be saved.') }
    finally { setSaving(false) }
  }

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault(); setAddressSaving(true); setError(null)
    try {
      const input = { ...address, line2: address.line2 || null, county: address.county || null, phone: address.phone || null }
      const saved = editingAddressId ? await updateAddress(editingAddressId, input) : await createAddress(input)
      setAddresses(current => editingAddressId ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved])
      setAddressFormOpen(false); setEditingAddressId(null); setAddress(emptyAddress)
    } catch (caught) { setError(caught instanceof BackendApiError ? caught.message : 'Your address could not be saved.') }
    finally { setAddressSaving(false) }
  }

  const editAddress = (item: BackendAddress) => {
    setEditingAddressId(item.id)
    setAddress({ label: item.label ?? 'Home', recipientName: item.recipientName, line1: item.line1, line2: item.line2 ?? '', city: item.city, county: item.county ?? '', postcode: item.postcode, phone: item.phone ?? '', isDefault: item.isDefault })
    setAddressFormOpen(true)
  }

  const removeAddress = async (id: string) => {
    setError(null)
    try { await deleteAddress(id); setAddresses(current => current.filter(item => item.id !== id)); if (editingAddressId === id) { setEditingAddressId(null); setAddressFormOpen(false) } }
    catch (caught) { setError(caught instanceof BackendApiError ? caught.message : 'Your address could not be deleted.') }
  }

  const logout = async () => {
    setError(null)
    try { await signOut(); navigate('/', { replace: true }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'You could not be signed out. Please try again.') }
  }

  const displayError = error ?? accountError
  const addressFields = [['label','Label'],['recipientName','Recipient name'],['line1','Address line 1'],['line2','Address line 2'],['city','Town/city'],['county','County'],['postcode','Postcode'],['phone','Phone']] as const

  return <main className="container-page py-12">
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-gray-500"><Link to="/">Home</Link> / Account</p>
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Your account</p><h1 className="mt-2 text-3xl font-bold">Welcome back</h1><p className="mt-2 text-gray-600">{account?.email ?? user?.email}</p></div><button type="button" onClick={logout} className="btn-secondary shrink-0">Sign out</button></div>
          {loading && <p className="mt-7 text-sm text-gray-600">Loading your account…</p>}
          {displayError && <div role="alert" className="mt-7 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><b className="block">{accountError ? 'We couldn’t load your account.' : 'We couldn’t complete that request.'}</b>{displayError}</div>}
          {!loading && account && <>
            <form onSubmit={saveProfile} className="mt-7 space-y-4 border-t border-line pt-6"><h2 className="text-lg font-bold">Your details</h2><div><label htmlFor="account-name" className="mb-1 block text-sm font-bold">Name</label><input id="account-name" value={displayName} onChange={event => setDisplayName(event.target.value)} className="w-full border border-line px-3 py-2.5" /></div><div><label htmlFor="account-email" className="mb-1 block text-sm font-bold">Email</label><input id="account-email" value={account.email ?? user?.email ?? ''} readOnly className="w-full border border-line bg-gray-50 px-3 py-2.5 text-gray-600" /></div><div><label htmlFor="account-phone" className="mb-1 block text-sm font-bold">Phone</label><input id="account-phone" type="tel" value={phone} onChange={event => setPhone(event.target.value)} className="w-full border border-line px-3 py-2.5" /></div><div className="flex items-center gap-3"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>{savedMessage && <span className="text-sm text-green-700">{savedMessage}</span>}</div></form>
            <section className="mt-8 border-t border-line pt-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Delivery addresses</h2><button type="button" className="text-sm font-bold text-brand underline" onClick={() => { setAddressFormOpen(value => !value); setEditingAddressId(null); setAddress(emptyAddress) }}>{addressFormOpen ? 'Cancel' : 'Add address'}</button></div>{addressLoading && <p className="mt-4 text-sm text-gray-600">Loading addresses…</p>}{!addressLoading && !addresses.length && <p className="mt-4 text-sm text-gray-600">No saved addresses yet.</p>}<div className="mt-4 grid gap-3">{addresses.map(item => <div key={item.id} className="border border-line p-4 text-sm"><div className="flex justify-between gap-3"><p className="font-bold">{item.label ?? 'Address'}{item.isDefault && <span className="ml-2 text-xs font-normal text-gray-500">Default</span>}</p><div className="flex gap-3"><button type="button" onClick={() => editAddress(item)} className="text-xs text-brand underline">Edit</button><button type="button" onClick={() => void removeAddress(item.id)} className="text-xs text-gray-600 underline">Delete</button></div></div><p className="mt-2 leading-6 text-gray-700">{item.recipientName}<br />{item.line1}{item.line2 && <><br />{item.line2}</>}<br />{item.city}{item.county && `, ${item.county}`}<br />{item.postcode}</p></div>)}</div>{addressFormOpen && <form onSubmit={saveAddress} className="mt-5 grid gap-3 border border-line bg-sand p-4 sm:grid-cols-2"><h3 className="sm:col-span-2 font-bold">{editingAddressId ? 'Edit delivery address' : 'Add delivery address'}</h3>{addressFields.map(([field, label]) => <label key={field} className="text-sm"><span className="mb-1 block font-bold">{label}</span><input required={!['line2', 'county', 'phone'].includes(field)} value={address[field]} onChange={event => setAddress(current => ({ ...current, [field]: event.target.value }))} className="w-full border border-line bg-white px-3 py-2" /></label>)}<label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={address.isDefault} onChange={event => setAddress(current => ({ ...current, isDefault: event.target.checked }))} /> Make this my default address</label><button className="btn-primary sm:col-span-2" disabled={addressSaving}>{addressSaving ? 'Saving…' : editingAddressId ? 'Save address' : 'Add address'}</button></form>}</section>
          </>}
        </section>
        {!loading && account && isStaff && <aside className="border border-line bg-white p-6 shadow-card sm:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Staff workspace</p><h2 className="mt-2 text-2xl font-bold">Admin tools</h2><p className="mt-2 text-sm leading-6 text-gray-600">Manage the products and information customers see in the shop.</p><div className="mt-6 space-y-3"><Link to="/admin/products" className="block border border-line p-4 transition hover:border-brand hover:bg-sand"><span className="font-bold">Manage products</span><span className="mt-1 block text-sm text-gray-600">Edit catalogue details and storefront visibility.</span></Link><Link to="/admin/content" className="block border border-line p-4 transition hover:border-brand hover:bg-sand"><span className="font-bold">Store content</span><span className="mt-1 block text-sm text-gray-600">Edit pages, contact details and footer links.</span></Link></div></aside>}
      </div>
    </div>
  </main>
}
