# Vigil security dashboard

Control Center renders a **read-only** Security tab from Vigil’s ranked issue feed. Joel does not re-rank, recolor, or edit severity in the UI. Adding or changing issues is a **data update only**.

## Where to open it

1. Start Control Center (`npm run launch` or `npm run dev`).
2. Open the **Security** tab in the top nav (or `?tab=security`).

## Vigil write path (Windows)

Upsert the full schema v1.0 document here:

```text
%LOCALAPPDATA%\Control Center\vigil\issues.json
```

That resolves with the same Control Center data directory used for `settings.json` and SQLite (typically `C:\Users\<you>\AppData\Local\Control Center\vigil\issues.json`).

macOS / Linux use the same relative path under the app data directory:

- macOS: `~/Library/Application Support/Control Center/vigil/issues.json`
- Linux: `~/.local/share/control-center/vigil/issues.json`

Create the `vigil` folder if it does not exist. Atomic replace is preferred (write a temp file in the same directory, then rename over `issues.json`).

## Refresh

The Security tab polls about once a minute and has a **Refresh** button. After Vigil writes the file, refresh the tab (or wait for the poll) — no app rebuild or code change.

## Schema (v1.0)

See [`docs/vigil/issues.example.json`](./vigil/issues.example.json) for a full seed matching Vigil’s canonical feed.

Top-level fields:

| Field | Purpose |
| --- | --- |
| `schemaVersion` | Must be `"1.0"`. |
| `source` | Usually `"vigil"`. |
| `updatedAt` | ISO timestamp for the whole feed. |
| `hosts[]` | Host catalog (`id`, `displayName`, optional `machineId`, `os`). |
| `severityColors` | Map of `critical` / `high` / `medium` / `low` / `info` → CSS color. **UI uses these only; nothing is hardcoded.** |
| `statusLabels` | Display labels for remediation statuses. |
| `issues[]` | Ranked findings. |

Issue fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable Vigil id (updates replace in place). |
| `hostId` | Matches `hosts[].id`. |
| `severity` | `critical` \| `high` \| `medium` \| `low` \| `info`. |
| `title` | Short finding title. |
| `status` | `open` \| `in_progress` \| `remediated` \| `accepted_risk` \| `wont_fix`. |
| `notes` | Minimized context. |
| `flowProjectId` / `flowItemId` | Optional Flow links (`null` allowed). |
| `reportPaths` | Optional paths to Vigil markdown reports. |
| `discoveredAt` / `updatedAt` | ISO timestamps. |
| `rank` | Optional number. Within the same severity, **lower sorts first**. Omitted ranks sort after numbered ones. |

### Sort order (Vigil-owned)

1. Severity: critical → high → medium → low → info  
2. Then `rank` ascending when present  
3. Then `updatedAt` descending  

### Remediation statuses

| Status | Typical label |
| --- | --- |
| `open` | Open |
| `in_progress` | In progress |
| `remediated` | Remediated |
| `accepted_risk` | Accepted risk |
| `wont_fix` | Won't fix |

Labels displayed in the UI come from `statusLabels` in the JSON.

## Agent / box seed

Vigil’s working copy on the shared agent box lives at:

```text
/home/box/security-reports/dashboard/issues.json
```

Copy or mirror that document into the Windows write path above when promoting to Joel’s Control Center install. The example in this repo is a snapshot for docs and local testing — runtime always reads the data-directory file, never invents issues in code.

## API

`GET /api/live/security` returns the parsed feed, summary counts, and the absolute file path Control Center read. There is no write API for ranking from the browser.
