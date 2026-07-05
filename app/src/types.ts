export interface MediaAction {
  id: string
  label: string
}

export interface MediaStatus {
  connected: boolean
  serial: string | null
  reason: string | null
  actions: MediaAction[]
}

export interface ActionResult {
  action: string
  label: string
  sentAt: number
}
