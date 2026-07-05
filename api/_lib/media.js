// Glass Car Dash backend: media control via ADB keyevents, routed through
// Termux's own adb client connected to this same phone over wireless
// debugging (paired once via Settings -> Developer options -> Wireless
// debugging -> Pair with pairing code, then `adb connect <ip>:<port>` for
// the actual debug session — the connect port rotates across
// reboots/reconnects, pairing itself does not need repeating).
//
// Every action is a fixed Android KeyEvent code from a hardcoded allowlist —
// the client only ever sends an action id, never a code or arbitrary adb
// argv, so there is no injection surface here either.
import { spawn } from 'node:child_process';

const ADB_TIMEOUT_MS = 8000;

// developer.android.com/reference/android/view/KeyEvent
const ACTIONS = {
  play_pause: { code: '85', label: 'Play/Pause' },
  next: { code: '87', label: 'Next track' },
  previous: { code: '88', label: 'Previous track' },
};

function err(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function runAdb(args) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn('adb', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      reject(e);
      return;
    }
    let out = '', errOut = '';
    const timer = setTimeout(() => {
      try { proc.kill(); } catch { /* already gone */ }
      reject(err(504, 'adb timed out'));
    }, ADB_TIMEOUT_MS);
    proc.stdout.on('data', (c) => { out += c; });
    proc.stderr.on('data', (c) => { errOut += c; });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(err(502, errOut.trim() || `adb exited ${code}`));
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// Exactly one authorized ("...\tdevice", not "unauthorized"/"offline")
// connected device is required — plain `adb shell` with no -s target is
// only unambiguous when there's just one.
export async function checkConnected() {
  const out = await runAdb(['devices']);
  const lines = out.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
  const ready = lines.filter((l) => l.endsWith('\tdevice'));
  if (ready.length === 1) return { ok: true, serial: ready[0].split('\t')[0] };
  if (lines.length === 0) {
    return { ok: false, reason: 'no device connected — run `adb connect <ip>:<port>` (check Settings > Developer options > Wireless debugging for the current port; it rotates)' };
  }
  return { ok: false, reason: `expected exactly 1 ready device, found: ${lines.join('; ')}` };
}

export function listActions() {
  return Object.entries(ACTIONS).map(([id, a]) => ({ id, label: a.label }));
}

export async function getStatus() {
  const status = await checkConnected();
  return { connected: status.ok, serial: status.serial || null, reason: status.reason || null, actions: listActions() };
}

export async function sendAction(input) {
  const id = String(input?.id || '');
  const action = ACTIONS[id];
  if (!action) throw err(404, 'unknown action: ' + id);

  const status = await checkConnected();
  if (!status.ok) throw err(409, status.reason);

  await runAdb(['shell', 'input', 'keyevent', action.code]);
  return { action: id, label: action.label, sentAt: Date.now() };
}
