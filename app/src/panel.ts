// Draws the "dash panel" bitmap: current speed on top, a circular speed-limit
// sign in the middle (mimicking a UK repeater sign — thick ring, bold number),
// and heading/camera warning on the bottom row. Encoded as a real PNG via
// canvas.toBlob() — updateImageRawData expects encoded image bytes (PNG/JPEG),
// not raw per-pixel luminance (confirmed against even-realities/
// evenhub-templates' official image scaffold; see even.ts's pushPanel doc
// comment for the imageException this was producing before the fix).
import { PANEL_W, PANEL_H } from './even'
import type { DrivingState } from './speed'

const canvas = document.createElement('canvas')
canvas.width = PANEL_W
canvas.height = PANEL_H
const ctx = canvas.getContext('2d')!

// Top/bottom bands got taller (was 20/16) to pull the speed text and heading
// away from the circle instead of crowding it — the circle shrinks a little
// (64px -> 54px) to pay for that gap, since PANEL_H is a fixed 100px (real
// hardware's actual height cap, not a layout choice — see even.ts).
const TOP_H = 26
const BOTTOM_H = 20
const RING_W = 5
const CIRCLE_D = PANEL_H - TOP_H - BOTTOM_H
const CIRCLE_R = CIRCLE_D / 2
const CIRCLE_CX = PANEL_W / 2
const CIRCLE_CY = TOP_H + CIRCLE_R

export async function renderDashPanelPng(d: DrivingState): Promise<Uint8Array> {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, PANEL_W, PANEL_H)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Pinned near the top edge (not centered in its band) so it reads as
  // clearly separate from the circle below, not stacked on top of it.
  ctx.font = 'bold 18px ui-monospace, monospace'
  const speedText = d.speedMph != null ? `${Math.round(d.speedMph)} mph` : '… mph'
  ctx.fillText(speedText, PANEL_W / 2, 10)

  ctx.beginPath()
  ctx.arc(CIRCLE_CX, CIRCLE_CY, CIRCLE_R - RING_W / 2, 0, Math.PI * 2)
  ctx.lineWidth = RING_W
  ctx.strokeStyle = '#fff'
  ctx.stroke()

  const limitText = d.limitMph != null ? String(d.limitMph) : (d.limitSource === 'pending' ? '…' : '?')
  ctx.font = 'bold 24px ui-monospace, monospace'
  ctx.fillText(limitText, CIRCLE_CX, CIRCLE_CY + 1)

  // Camera warning takes priority over heading on the bottom row — it's the
  // safety-critical one, and the two never both matter at the same instant.
  // Pinned near the bottom edge for the same separation-from-circle reason
  // as the speed text above.
  ctx.font = 'bold 12px ui-monospace, monospace'
  const bottomText = d.cameraDistanceM != null ? `⚠ ${d.cameraDistanceM}m` : (d.heading || '')
  if (bottomText) ctx.fillText(bottomText, PANEL_W / 2, PANEL_H - 8)

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}
