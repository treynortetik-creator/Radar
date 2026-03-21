---
name: agora
description: >
  On-demand multi-agent adversarial decision council. Virgil convenes 5 AI
  council seats (Bull, Bear, Customer, Operator, Contrarian) in a 2-round
  structured debate, then synthesizes a tight memo for Treynor. ~6-8 min.
  Always on-demand. Never on cron. No out-of-pocket cost (OAuth tokens).
model_routing: >
  Agora does NOT use OpenRouter. All council seats run via Anthropic OAuth
  (anthropic/claude-sonnet-4-6 or anthropic/claude-opus-4-6) or OpenAI OAuth
  (openai/gpt-5.4). No per-run billing. The AGENTS.md >$1 dry-run rule does
  not apply. Never route Agora to OpenRouter.
triggers:
  - "run agora"
  - "agora "
  - "council this"
  - "council this decision"
  - "what would the council say"
  - "get the council on this"
  - "run the council on"
---

# Agora — Decision Council Skill 🔥

**Purpose:** Convene 5 adversarial AI council seats on any high-stakes decision. Produce a tight memo with consensus, dissent, and one crisp decision for Treynor.

**PRD:** `tmp/prd-agora-draft.md`
**Prompts:** `skills/agora/prompts/`
**Archives:** `memory/agora/`

---

## Trigger Handling

When Virgil detects a trigger phrase:

1. Extract topic from user message (everything after "agora", "council this:", etc.)
2. Generate `topicSlug`: lowercase, hyphens, max 30 chars (e.g., `flightlog-it-pitch`)
3. **Quiet window check:** If current MST time is 8:15 PM–4:00 AM, say "Agora queued — will run at 4:05 AM with your morning brief." Append to `memory/NOTE_TO_NEXT_VIRGIL.md`: `PENDING: Run Agora on [topic].`
4. **Lock check:** If `tmp/agora.lock` exists and is < 30 min old, reject: "Agora already in flight. Wait for completion or delete `tmp/agora.lock` to force."
5. Confirm with Treynor: *"Running Agora on: [topic]. ~6-8 min. No extra cost (OAuth tokens). Confirm?"*
6. On confirm: create `tmp/agora.lock`, write checkpoint to `memory/NOTE_TO_NEXT_VIRGIL.md`, then execute the coordinator workflow below.

---

## Coordinator Workflow (Option A — Virgil Direct Spawns)

Virgil main session manages all spawns. No coordinator subagent.

### Step 1: Assemble Briefing Doc

Gather context from live sources:

```
a. GET https://sitrep.up.railway.app/api/tasks
   Header: x-api-key: M2icO3BeTJP9uc9oVpjJ16qaW1UlcI0w
   Filter: status IN (open, in-progress)

b. Read: memory/goals.md

c. GET https://sitrep.up.railway.app/api/memory/documents?tags=agora
   Header: x-api-key: M2icO3BeTJP9uc9oVpjJ16qaW1UlcI0w
   Filter: any doc whose title or tags mention topicSlug keywords

d. Read: memory/[today's date].md (if exists)

e. (Optional) VirgilBridge email context if topic involves external people/orgs
```

Assemble into `tmp/agora-[topicSlug]-brief.md`:

```markdown
# Agora Briefing: [Topic]
**Date:** [YYYY-MM-DD]
**Topic Slug:** [topicSlug]

## Treynor's Current Goals
[from memory/goals.md — the 3-5 most relevant to this topic]

## Active Tasks (SITREP)
[active/in-progress tasks — title, status, priority]

## Prior Agora Context
[any prior Agora memos on related topics — 1-2 sentence summary each]

## Today's Context
[relevant notes from today's memory log, if any]

## The Decision / Question
[The exact topic as Treynor stated it, plus: "What specifically is uncertain here? What would change the decision?"]
```

If briefing source data exceeds 1,000 words: summarize via Ollama (`wsl -d Ubuntu -- curl -s http://localhost:11434/api/generate -d '{"model":"qwen3:8b","prompt":"Summarize concisely for a decision council briefing: ...","stream":false}'`) to keep it tight.

Save to `tmp/agora-[topicSlug]-brief.md`.

---

### Step 2: Round 1 — Parallel Independent Takes

Read persona prompts from `skills/agora/prompts/`. Spawn 5 agents in parallel:

| Seat | Label | Model | Prompt File |
|------|-------|-------|-------------|
| 🐂 Bull | `agora-bull` | `openai/gpt-5.4` | `prompts/bull.md` |
| 🐻 Bear | `agora-bear` | `anthropic/claude-opus-4-6` | `prompts/bear.md` |
| 👤 Customer | `agora-customer` | `openai/gpt-5.4` | `prompts/customer.md` |
| ⚙️ Operator | `agora-operator` | `anthropic/claude-sonnet-4-6` | `prompts/operator.md` |
| 🗡️ Contrarian | `agora-contrarian` | `anthropic/claude-opus-4-6` | `prompts/contrarian.md` |

Each agent receives this task:

```
[PERSONA PROMPT — full content of the relevant prompts/*.md file]

---
BRIEFING DOCUMENT:
[full content of tmp/agora-[topicSlug]-brief.md]

---
INSTRUCTION: Give your independent assessment of this decision. You have NOT seen what the other council seats will say. Do not hedge. Do not qualify with "it depends." Take a position and defend it. 300–500 words.
```

Wait for all 5 to complete (or timeout at 3 min each). If one fails: retry once. If still failing: proceed without it, note the absent seat.

Collect outputs. Write to `tmp/agora-[topicSlug]-r1.md`:

```markdown
# Agora Round 1: [Topic]

## 🐂 Bull
[output]

## 🐻 Bear
[output]

## 👤 Customer
[output]

## ⚙️ Operator
[output]

## 🗡️ Contrarian
[output]
```

---

### Step 3: Round 2 — Sequential Cross-Examination

Spawn each agent sequentially, this time with all R1 outputs visible:

```
[PERSONA PROMPT]

---
BRIEFING DOCUMENT:
[full content of tmp/agora-[topicSlug]-brief.md]

---
ROUND 1 TRANSCRIPT:
[full content of tmp/agora-[topicSlug]-r1.md]

---
INSTRUCTION: You have now read all five Round 1 takes. Respond directly to specific arguments from other council seats. Call out what's wrong. Defend what's right. Engage with names (Bull said X, Bear said Y). Do NOT repeat your Round 1 take — this is cross-examination. 200–350 words.
```

Append outputs to `tmp/agora-[topicSlug]-r2.md` with same section headers as R1.

---

### Step 4: Synthesis

Spawn synthesis agent:

```
Model: anthropic/claude-opus-4-6
Label: agora-synthesis
Thinking: high
```

Task:

```
[SYNTHESIS PROMPT — full content of skills/agora/prompts/synthesis.md]

---
BRIEFING DOCUMENT:
[full content of tmp/agora-[topicSlug]-brief.md]

---
ROUND 1 TRANSCRIPT:
[full content of tmp/agora-[topicSlug]-r1.md]

---
ROUND 2 TRANSCRIPT:
[full content of tmp/agora-[topicSlug]-r2.md]
```

Parse output:
- Everything before `SPOKEN:` → written memo → `tmp/agora-[topicSlug]-memo.md`
- Everything after `SPOKEN:` → spoken summary (strip SPOKEN: prefix)

---

### Step 5: Deliver

**a. Push to SITREP:**
```bash
POST https://sitrep.up.railway.app/api/memory/documents
x-api-key: M2icO3BeTJP9uc9oVpjJ16qaW1UlcI0w
{
  "title": "Agora Memo — [Topic] ([YYYY-MM-DD])",
  "content": "[full memo text]",
  "tags": ["agora", "council-memo", "[topicSlug]"],
  "date": "[YYYY-MM-DD]",
  "source": "agora-council"
}
```
If SITREP fails: save to `memory/agora/[topicSlug]/memo.md` and log to `.error-queue/`.

**b. Send memo to Telegram:**
Use `message` tool, `target: "8537198892"`. Send memo as file attachment if >600 words, inline if shorter:
- `filePath: "tmp/agora-[topicSlug]-memo.md"`
- `caption: "🔥 Agora: [Topic] | [one-line DECISION REQUIRED summary]"`

**c. Fire TTS (background exec):**
```
python -W ignore scripts/tts-speak.py "[spoken summary from synthesis]" --voice am_adam
```
background: true, workdir: `C:\Users\Treynor Tetik\.openclaw\workspace`

**d. SITREP task (if DECISION REQUIRED):**
```
POST /api/tasks
{ "title": "Agora Decision: [topic]", "status": "pending-decision", "priority": 1 }
```

**e. Queue VIRGIL EXECUTES actions:**
Parse VIRGIL EXECUTES section from memo. Append to `memory/NOTE_TO_NEXT_VIRGIL.md`:
```
PENDING (Agora — [topicSlug]): [action 1]
PENDING (Agora — [topicSlug]): [action 2]
```

---

### Step 6: Archive + Cleanup

Move intermediate files to `memory/agora/[topicSlug]/`:
- `tmp/agora-[topicSlug]-brief.md` → `memory/agora/[topicSlug]/brief.md`
- `tmp/agora-[topicSlug]-r1.md` → `memory/agora/[topicSlug]/r1.md`
- `tmp/agora-[topicSlug]-r2.md` → `memory/agora/[topicSlug]/r2.md`
- `tmp/agora-[topicSlug]-memo.md` → `memory/agora/[topicSlug]/memo.md`

Delete `tmp/agora.lock`.

Update checkpoint in `memory/NOTE_TO_NEXT_VIRGIL.md`: mark Agora run complete.

---

## Cost Mode Options

Treynor may request cost-reduced mode. Default is **full mode**.

| Mode | Bull | Bear | Customer | Operator | Contrarian | Synthesis |
|------|------|------|----------|----------|-----------|-----------|
| Full | gpt-5.4 | opus-4-6 | gpt-5.4 | sonnet-4-6 | opus-4-6 | opus-4-6 |
| Reduced | sonnet-4-6 | sonnet-4-6 | sonnet-4-6 | sonnet-4-6 | opus-4-6 | opus-4-6 |

Contrarian and Synthesis always use Opus. Non-negotiable.

---

## Edge Cases

- **Agent fails:** Retry once. Proceed with 4 seats if still failing. Note in memo.
- **Lock file present:** Reject new run, tell Treynor.
- **Quiet window:** Queue for 4:05 AM, don't run.
- **Topic is trivial:** Coordinator judgment call — say so directly and skip full council.
- **SITREP down:** Deliver to Telegram anyway. Log to `.error-queue/`.
- **Context blowout:** R1 cap 500 words/agent, R2 cap 350 words/agent, briefing cap 1,000 words.

---

## First Run Candidate

*"Should I pitch FlightLog to SafelyYou IT for org-wide deployment now, or wait for more alpha data?"*
