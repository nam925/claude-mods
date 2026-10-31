import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'usage-bar', key: 'limits' } as const, [] as Limit[])

const LABELS: Record<string, string> = { five_hour: '5h ', seven_day: 'week' }

const bar = (pct: number) => {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

const resetIn = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  if (mins >= 1440) return ` resets ${Math.floor(mins / 1440)}d${Math.floor((mins % 1440) / 60)}h`
  return ` resets ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m`
}

export const register: Register = on => {
  const warned = new Map<string, number>()

  on('session.measure', async ($, e, next) => {
    const rows = e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
    await update($, limits, () => rows)

    for (const l of rows) {
      const name = LABELS[l.kind]?.trim() ?? l.kind
      const level = l.percentUsed >= 100 ? 100 : l.percentUsed >= 90 ? 90 : l.percentUsed >= 80 ? 80 : 0
      const prev = warned.get(l.kind) ?? 0
      if (level > prev) {
        $.ui.toast(level === 100 ? `LIMIT REACHED: ${name} window is full` : `${name} limit ${level}% used`)
      }
      warned.set(l.kind, level)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rows = await read($, limits)
    if (e.props.hasSurvey || rows.length === 0) return next(e)

    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        {rows.map(l => (
          <Text key={l.kind} color={l.percentUsed >= 90 ? 'red' : l.percentUsed >= 70 ? 'yellow' : 'green'}>
            {LABELS[l.kind] ?? l.kind} {bar(l.percentUsed)} {Math.round(l.percentUsed)}%{resetIn(l.resetsAt, now)}{'   '}
          </Text>
        ))}
      </Box>
    )
  })
}
