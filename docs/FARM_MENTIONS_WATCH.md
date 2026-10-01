# Farm (Missouri) Mentions negative-press watch

Documented preset for **Harvest Home / Our Father’s Farm** (Holden, MO; Danny & Rhonda Calhoun). Aliases include Our Father’s Farm, Harvest Home, Calhoun, and `thefarmprojectmo.org` (“The Farm Project”).

This is **not** JPUSA Doniphan, Grand Valley Ozarks, JPII Catholic Worker Farm, or Wisconsin Harvest Home Farm.

## How to enable (no auto-apply)

1. Open **Settings → Mentions** (or merge JSON into your local `settings.json` under the Control Center data directory).
2. Copy fields from [`farm-mentions-watch.preset.json`](./farm-mentions-watch.preset.json).
3. Confirm:
   - **Require contexts** lists cult/abuse/scandal-style cues.
   - **Require at least one context** is on (`relevanceMode: "require-any"`).
   - **Exclude namesakes** (`negativeTerms`) stays **empty** for this watch — those terms *exclude* pages; putting cult words there would drop the press you want to keep.
   - Optional: **AI relevance keep/drop** (`llmRelevanceGate: true`) if a cloud/local AI provider is configured.

Fresh installs start empty. This preset is never written to live LocalAppData by the app.

## Discover → filter semantics

1. **Discover** with Mentions queries on primary terms (wide pass; not gated by cult words).
2. **Identity** — same Mentions identity rules as today (`terms`, `websites`, `identityAnchors`, strict mode).
3. **`requireAnyContexts`** — after identity acceptance, **KEEP only** if at least one required context appears near the match (mirror of `negativeTerms`, inverted polarity).
4. **`negativeTerms`** — still **EXCLUDE only**. Never invert them for this feature.
5. **`llmRelevanceGate`** — when enabled and AI is configured:
   - Keyword `requireAnyContexts` hits short-circuit to **KEEP** (no LLM call).
   - Identity-ok candidates that miss keywords (or have an empty required list) get an LLM keep/drop with a one-sentence why; only **KEEP** is accepted.
   - If AI is unavailable or returns invalid JSON: **fall back to keyword `requireAnyContexts`** when that list is non-empty; **fail closed** for LLM-only watches (gate on, no required contexts).

## Expected sample polarity (keyword path)

| Decision | Example |
| --- | --- |
| KEEP | Farm Project home, J’s Story, cult podcast, Mercer County Outlook TFC/Harvest Home |
| DROP | Ministry promo, GuideStar, ag news, JPUSA “the Farm”, Wisconsin Harvest Home Farm |

See `tests/mentions.test.ts` (“Farm discover-then-filter”) for the encoded fixtures.
