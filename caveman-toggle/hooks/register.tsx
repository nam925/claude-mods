import type { Register } from 'claude-code'

// Current mode as last read from caveman's flag file: 'off', 'caveman', 'ultracave', ...
let mode = 'off'
// One-shot note added to the next prompt so the model follows the toggle at once
let pending: 'on' | 'off' | null = null

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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cavetoggle',
      description: 'Turn caveman mode on or off',
      immediate: true,
    })
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
    return (
      <Box columnGap={2}>
        <Text bold={isOn} dimColor={!isOn}>
          {isOn ? 'Caveman: ON (' + mode + ')' : 'Caveman: off'}
        </Text>
        <Button
          key="toggle"
          label={isOn ? 'Turn off' : 'Turn on'}
          hotkey="c"
          onPress={async () => {
            $.ui.toast(await toggle($))
          }}
        />
      </Box>
    )
  })
}
