# claude-mods

Small Claude Code mods.

| Mod | What it does |
| --- | --- |
| `usage-bar` | Thin bar above the prompt showing 5-hour session and weekly usage, with reset time. Green under 70%, yellow 70-89%, red 90%+. Toasts at 80%, 90% and 100%. Needs a subscription account; hidden until the first reading arrives. |
| `caveman-toggle` | Shows whether caveman mode is on above the prompt. Toggle with a button or `/cavetoggle`. |

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install usage-bar --marketplace nam925/claude-mods
/plugin install caveman-toggle --marketplace nam925/claude-mods
```

Answer `y` to `Add marketplace?`, then pick the user scope. The mod is active at once and in every later session.

From a shell:

```bash
claude plugin install usage-bar --marketplace nam925/claude-mods
claude plugin install caveman-toggle --marketplace nam925/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `nam925/claude-mods`, then Add plugin.

## Update

```bash
claude plugin update usage-bar
claude plugin update caveman-toggle
```
