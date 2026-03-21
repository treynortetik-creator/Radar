# AGENTS.md

## Sub-Agents
Spawn liberally. Delegate research, file ops, API calls. Keep main session lean.

| Agent | Purpose | Runs |
|-------|---------|------|
| Curley | Web intel, trend scanning | Nightly |
| Shelby | Code audits, PR hygiene, Railway monitoring | Weekly (Fri) |
| Homer | Memory hygiene, doc sync | Weekly (Sun) |
| Hemingway | Content drafting, social calendar | Daily |
| Rack | Pre-deploy QA gate (defaults BLOCKED) | On-demand |
| Edison | Experiment loop manager, prompt optimization | On-demand |
| Agora | Multi-agent adversarial decision council (5 seats, 2 rounds) | On-demand |

Intel: `intel/DAILY-INTEL.md`, `intel/SHELBY-REPORT.md`, `intel/HOMER-REPORT.md`, `intel/CONTENT-QUEUE.md`. **NO agent sends Telegram or calls cron.**

## Checkpointing
- Every 5+ tool calls → `memory/NOTE_TO_NEXT_VIRGIL.md`
- Every 3rd interaction → `session_status`. 80%+ → full checkpoint. 90%+ → lean.
- Post-compaction: read CLOSED.md → NOTE_TO_NEXT_VIRGIL → today's memory log

## Coding (MANDATORY)
**Use WSL2 Codex.** NEVER sessions_spawn for coding. ONE agent per codebase.
Pre-flight: `test -d .git && echo GIT_OK` + `git pull`. Only proceed on GIT_OK.

## Rules (MANDATORY)
- **Git:** Always `git pull` first. NEVER `git add -A` from workspace root. Always PR after push.
- **Cron:** No cron from embedded sessions (deadlock). `--at` = UTC only (MST=UTC-7).
- **Messaging:** ALWAYS `to: "8537198892"` for Telegram. Groups = receive-only.
- **Dates:** Run `date` before ANY date reference. Verify via VirgilBridge before briefs.
- **Overnight:** PROPOSE only → SITREP Approvals. No deploys without approval.
- **Telegram:** 3-5 lines. Long-form to files. Quiet: 7:15 PM–4:00 AM MST.
- **SITREP:** Find/create task → in-progress → done. Every doc → POST `/api/memory/documents`.
- **Cost:** Ollama first. OpenRouter emergency. >$1 → --dry-run.
- **Memory search 0 results:** grep memory/ → check app-registry.md → then "not found".
- **Security:** No secrets in shared channels. Web searches → subagents.
- **1 Finish, 1 Start.** Ship before starting new work.
- **Resolved items:** Confirmed done → IMMEDIATELY remove from NOTE_TO_NEXT_VIRGIL PENDING.

## Self-Improvement
Errors → `.learnings/ERRORS.md`, corrections → `LEARNINGS.md`. 3-strike → auto-promote.

## Daily Memory
Log at `memory/YYYY-MM-DD.md`. Read today + yesterday on session start.
