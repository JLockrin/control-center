# Farm (Missouri) Mentions negative-press watch

Documented preset for **Harvest Home / Our Father’s Farm** (Holden, MO; Danny & Rhonda Calhoun). Aliases include Our Father’s Farm, Harvest Home, Calhoun, and `thefarmprojectmo.org` (“The Farm Project”).

This is **not** JPUSA Doniphan, Grand Valley Ozarks, JPII Catholic Worker Farm, or Wisconsin Harvest Home Farm.

## How to enable (merge alongside brands — no auto-apply)

Do **not** paste the Farm fragment as a wholesale Mentions replacement. Joel-style installs already watch brand terms with exclusions such as `obituary` / `arrest` / `lawsuit`.

1. Open **Settings → Mentions** (or merge carefully into local `settings.json`).
2. Follow [`farm-mentions-watch.preset.json`](./farm-mentions-watch.preset.json):
   - **Append** Farm `terms`, `websites`, and `identityAnchors` to the existing lists (respect the 12-identity / 24-context caps).
   - **Set** `requireAnyContexts`, `requireContextsTerms` (Farm primaries only), `relevanceMode: "require-any"`, and optionally `llmRelevanceGate: true`.
   - **Leave** global `negativeTerms` alone for brands (e.g. keep `obituary`, `arrest`, `lawsuit`).
3. Confirm:
   - **Apply require-contexts to these names** lists only Farm primaries (`Harvest Home`, `Our Father's Farm`).
   - Brand primaries are **not** in that allowlist, so they do not need cult/abuse cues.
   - Cult/abuse/scandal cues stay in **Require contexts**, never in `negativeTerms`.

Fresh installs start empty. This preset is never written to live LocalAppData by the app.

## Scoping semantics (safe for mixed watches)

| Setting | Brand primary (not in allowlist) | Farm primary (in `requireContextsTerms`) |
| --- | --- | --- |
| `negativeTerms` | Applied (EXCLUDE) | **Skipped** so lawsuit/arrest/allegation language can KEEP |
| `requireAnyContexts` | Ignored | KEEP only if ≥1 cue near the match when `relevanceMode` is `require-any` |
| `llmRelevanceGate` | Off | Optional AI keep/drop after identity |

**Empty `requireContextsTerms`** means discover-then-filter is **off for every primary** (existing brand Mentions unchanged), even if `requireAnyContexts` is filled and relevance mode is on.

## Discover → filter flow (allowlisted primaries only)

1. **Discover** with Mentions queries on primary terms (wide pass; not gated by cult words).
2. **Identity** — same Mentions identity rules as today.
3. **Skip `negativeTerms`** for allowlisted primaries.
4. **`requireAnyContexts`** — KEEP only if at least one required context appears near the match.
5. **`llmRelevanceGate`** — keyword hits short-circuit to KEEP; otherwise AI keep/drop when configured. If AI is unavailable: fall back to keyword required contexts, or fail closed for LLM-only watches.

## Expected sample polarity (keyword path)

| Decision | Example |
| --- | --- |
| KEEP | Farm Project home, J’s Story, cult podcast, Mercer County Outlook TFC/Harvest Home |
| DROP | Ministry promo, GuideStar, ag news, JPUSA “the Farm”, Wisconsin Harvest Home Farm |

Brand hits (e.g. Strategrow / Joel Loughrin) continue under ordinary Mentions + brand `negativeTerms` and are unaffected by Farm required contexts.

See `tests/mentions.test.ts` for encoded fixtures.
