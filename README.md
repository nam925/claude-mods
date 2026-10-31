# claude-mods

Small Claude Code mods.

| Mod | What it does |
| --- | --- |
| `caveman-toggle` | One band above the prompt. Row 1: caveman status with buttons Off, Caveman, Ultra, Mega (hotkey `c` = Caveman). Rows below: 5-hour session and weekly usage bars with reset time (green under 70%, yellow 70-89%, red 90%+), plus toasts at 80%, 90%, 100%. Usage needs a subscription account. `/cavetoggle` flips caveman on or off. Needs the `caveman@caveman` plugin. |

Usage lives in the same mod on purpose: only one plugin can draw the band above the prompt, so two separate mods hide each other.

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install caveman-toggle --marketplace nam925/claude-mods
```

Answer `y` to `Add marketplace?`, then pick the user scope. The mod is active at once and in every later session.

From a shell:

```bash
claude plugin install caveman-toggle --marketplace nam925/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `nam925/claude-mods`, then Add plugin.

## Update

```bash
claude plugin update caveman-toggle
```
