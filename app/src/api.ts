import type { MediaStatus, ActionResult } from './types'

const BASE = import.meta.env.VITE_API_BASE || ''
const KEY = import.meta.env.VITE_API_KEY || ''

async function call<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as Record<string, string>) }
  if (KEY) headers['x-remote-key'] = KEY
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  let r: Response
  try {
    r = await fetch(`${BASE}/api/${path}`, { ...init, headers, signal: ac.signal })
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('timed out')
    throw e
  } finally {
    clearTimeout(timer)
  }
  const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }))
  if (!j.ok) throw new Error(j.error || `HTTP ${r.status}`)
  return j.data as T
}

export const api = {
  status: () => call<MediaStatus>('media/status', {}, 6_000),
  send: (id: string) =>
    call<ActionResult>('media/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }, 8_000),
}
