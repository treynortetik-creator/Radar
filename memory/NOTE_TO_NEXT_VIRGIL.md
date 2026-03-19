# NOTE TO NEXT VIRGIL
Updated: 2026-03-19 ~10:02 MST

## 🔥 ACTIVE: Metis Eval Running
- **Eval in progress**: `/tmp/run-eval.sh` running as background WSL process
- **Log**: `/tmp/metis-eval-standalone.log` — check for progress
- **Results output**: `experiments/metis/results/baseline-2026-03-19.json` when done
- **Expected runtime**: ~20 min from ~10:02 MST → done ~10:22 MST
- **Script**: `tmp/metis-eval-standalone.py` — 25 questions, qwen3.5:9b judge

## 🔧 CRITICAL INFRASTRUCTURE FIX APPLIED
**Triton autotune patch (PERMANENT — do NOT lose this)**

The Metis inference stack requires this patch to work with sequences >19 tokens:

**File**: `/home/treynor/metis-venv/lib/python3.12/site-packages/triton/runtime/autotuner.py`
**Line 146** changed from:
```python
key = [_args[i] for i in self.key_idx]
```
to:
```python
key = [_args[i] for i in self.key_idx if i < len(_args)]
```

Backup at `autotuner.py.bak`. This patch makes fla's chunked triton kernels handle
out-of-range key index lookups gracefully instead of crashing with IndexError.

Also required: `chunk_delta_h.py:524` autotune key MUST NOT contain 'BT' (separate patch already applied).

**If venv is rebuilt, re-apply both patches.**

## Metis Stack State
- **Base model**: Qwen/Qwen3.5-0.8B
- **LoRA rank**: 16, alpha 32, dropout 0.05
- **Best checkpoint**: checkpoint-4000 (eval loss 1.152)
- **Merged model**: `/home/treynor/metis-train/metis-merged/`
- **GGUF**: in `/home/treynor/metis-train/metis-gguf/` (Q4_K_M quantized)
- **Ollama 500 error**: GGUF loads but Ollama crashes at inference — known issue, skip for now
- **Inference**: Use transformers directly (metis-eval-standalone.py pattern)
- **triton**: 3.1.0 (downgraded from 3.2.0 due to chunked kernel failures)

## After Eval Completes
1. Read `experiments/metis/results/baseline-2026-03-19.json`
2. Report scores to Treynor via Telegram
3. Update SITREP task for Metis eval
4. Push results to SITREP `/api/memory/documents`
5. Decide next steps: more training data, higher rank LoRA, or ship as-is

## Curley Pipeline
- `intel/curley-raw/curley-pipeline.py` — gather only (RSS/Reddit/Grok)
- Simplification decided: Curley writes its OWN summary via Gemini Flash (not Haiku subagent)
- Need: add `--summarize` mode or post-process step in curley-pipeline.py
- Status: pipeline exists but summarization not yet wired up

## PENDING (carry forward)
- [ ] Metis eval results → Treynor + SITREP (after ~10:22 MST)
- [ ] Curley summarization: add Gemini Flash summary step to pipeline
- [ ] Metis next steps after baseline eval
- [ ] SITREP task hygiene: 219 tasks remain (49 event tasks already deleted)

## 2026-03-19 Metis Eval Artifacts
- Added `experiments/metis/test-cases-v2.json` with 97 prompts across product, clinical, platform, adversarial, refusal, competitor deflection, and consistency categories.
- Added `experiments/metis/metis-eval-v3.py` to use `~/.codex/auth.json` OAuth bearer tokens, refresh on 401 via `https://auth0.openai.com/oauth/token`, judge with `gpt-5.4`, and compute composite plus consistency drift.
- Did not run the eval. Next step is syntax-only validation or manual execution when ready.
