import type { Register } from 'claude-code'

// Current mode as last read from caveman's flag file: 'off', 'caveman', 'ultracave', ...
let mode = 'off'
// One-shot note added to the next prompt so the model follows the toggle at once
let pending: 'on' | 'off' | null = null

type Limit = { kind: string; percentUsed: number; resetsAt?: string }
let limits: Limit[] = []
const warned = new Map<string, number>()
const LABELS: Record<string, string> = { five_hour: '5h  ', seven_day: 'week' }
const MODES = ['caveman', 'ultracave', 'megacave']

function bar(pct: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function resetIn(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  if (mins >= 1440) return ' resets ' + Math.floor(mins / 1440) + 'd' + Math.floor((mins % 1440) / 60) + 'h'
  return ' resets ' + Math.floor(mins / 60) + 'h' + String(mins % 60).padStart(2, '0') + 'm'
}

function isOnMode(value: string): boolean {
  return value !== '' && value !== 'off'
}

// Caveman keeps its mode in ~/.claude/.caveman-sessions/<session id>.mode,
// falling back to ~/.claude/.caveman-active
async function configDir($: any): Promise<string> {
  const dir = await $.env.get('CLAUDE_CONFIG_DIR')
  if (dir) return dir
  const home = await $.env.get('HOME')
  return home + '/.claude'
}

function clean(raw: string): string {
  return raw.slice(0, 64).replace(/[\r\n]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '')
}

async function readMode($: any): Promise<string> {
  const dir = await configDir($)
  const sid = await $.session.id()
  try {
    return clean(await $.fs.read(dir + '/.caveman-sessions/' + sid + '.mode'))
  } catch {
    // no per-session file: use the machine-wide flag
  }
  try {
    return clean(await $.fs.read(dir + '/.caveman-active'))
  } catch {
    return 'off'
  }
}

async function refresh($: any): Promise<void> {
  const next = await readMode($)
  if (next !== mode) {
    mode = next
    $.ui.invalidate('ui.render')
  }
}

async function toggle($: any): Promise<string> {
  await refresh($)
  const wasOn = isOnMode(mode)
  const dir = await configDir($)
  const sid = await $.session.id()
  // Only this session's flag is written, so other windows keep their mode
  await $.fs.write(dir + '/.caveman-sessions/' + sid + '.mode', wasOn ? 'off' : 'caveman')
  pending = wasOn ? 'off' : 'on'
  mode = wasOn ? 'off' : 'caveman'
  $.ui.invalidate('ui.render')
  return wasOn ? 'Caveman off' : 'Caveman on'
}

async function setMode($: any, target: string): Promise<string> {
  const dir = await configDir($)
  const sid = await $.session.id()
  await $.fs.write(dir + '/.caveman-sessions/' + sid + '.mode', target)
  pending = target === 'off' ? 'off' : 'on'
  mode = target
  $.ui.invalidate('ui.render')
  return target === 'off' ? 'Caveman off' : 'Mode: ' + target
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    limits = e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
    for (const l of limits) {
      const name = (LABELS[l.kind] ?? l.kind).trim()
      const level = l.percentUsed >= 100 ? 100 : l.percentUsed >= 90 ? 90 : l.percentUsed >= 80 ? 80 : 0
      if (level > (warned.get(l.kind) ?? 0)) {
        $.ui.toast(level === 100 ? 'LIMIT REACHED: ' + name + ' window is full' : name + ' limit ' + level + '% used')
      }
      warned.set(l.kind, level)
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cavetoggle',
      description: 'Turn caveman mode on or off',
      immediate: true,
    })
    try {
      const u = await $.session.usage()
      limits = u.rateLimits.map((l: any) => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
    } catch {
      // no reading yet; session.measure fills it after the first turn
    }
    await refresh($)
    // Pick up changes made outside the mod, such as /caveman or "normal mode"
    $.clock.every(2000, () => refresh($))
    return next(e)
  })

  on('command.run', { command: 'cavetoggle' }, async ($) => {
    return { text: await toggle($) }
  })

  // Tell the model about a toggle on the next prompt, so it applies right away
  on('prompt.submit', async ($, e, next) => {
    if (pending === null) return next(e)
    const note = pending === 'on' ? 'talk like caveman.' : 'normal mode.'
    pending = null
    return next({ ...e, text: note + '\n\n' + e.text })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const isOn = isOnMode(mode)
    const now = await $.clock.now()
    return (
      <Box flexDirection="column">
        <Box columnGap={2}>
          <Text bold={isOn} dimColor={!isOn}>
            {isOn ? 'Caveman: ON (' + mode + ')' : 'Caveman: off'}
          </Text>
          <Button key="off" label="Off" onPress={async () => { $.ui.toast(await setMode($, 'off')) }} />
          <Button key="caveman" label="Caveman" hotkey="c" onPress={async () => { $.ui.toast(await setMode($, 'caveman')) }} />
          <Button key="ultracave" label="Ultra" onPress={async () => { $.ui.toast(await setMode($, 'ultracave')) }} />
          <Button key="megacave" label="Mega" onPress={async () => { $.ui.toast(await setMode($, 'megacave')) }} />
        </Box>
        {limits.map(l => (
          <Text key={l.kind} color={l.percentUsed >= 90 ? 'red' : l.percentUsed >= 70 ? 'yellow' : 'green'}>
            {(LABELS[l.kind] ?? l.kind) + ' ' + bar(l.percentUsed) + ' ' + Math.round(l.percentUsed) + '%' + resetIn(l.resetsAt, now)}
          </Text>
        ))}
      </Box>
    )
  })
}
