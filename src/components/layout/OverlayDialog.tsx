import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Native dialogs make the background inert; explicit wrapping also keeps Tab out of browser chrome. */
export function OverlayDialog({ open, onClose, labelledBy, children, side = 'right' }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; side?: 'left' | 'right' }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])
  return createPortal(<dialog ref={ref} tabIndex={-1} aria-labelledby={labelledBy} aria-modal="true" onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0)
    const first = controls[0], last = controls[controls.length - 1]
    if (!first) { event.preventDefault(); event.currentTarget.focus() }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus() }
  }} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-ink/40">
    {open && <div onClick={event => { if (event.target === event.currentTarget) onClose() }} className={`flex h-full w-full ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex h-full flex-col bg-white shadow-2xl ${side === 'right' ? 'w-full max-w-md' : 'w-80 max-w-[85%]'}`}>{children}</div>
    </div>}
  </dialog>, document.body)
}
