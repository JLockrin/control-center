import type {
  VigilSecurityDashboard,
  VigilSecurityHost,
  VigilSecurityIssue,
  VigilSecuritySeverity,
  VigilSecurityStatus,
} from "@/lib/types";

export const VIGIL_SECURITY_SCHEMA_VERSION = "1.0";
export const VIGIL_SECURITY_FILE_SEGMENTS = ["vigil", "issues.json"] as const;

export const VIGIL_SEVERITY_ORDER: VigilSecuritySeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const SEVERITIES = new Set<string>(VIGIL_SEVERITY_ORDER);
const STATUSES = new Set<string>([
  "open",
  "in_progress",
  "remediated",
  "accepted_risk",
  "wont_fix",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => cleanText(entry))
    .filter(Boolean)
    .slice(0, 50);
}

function cleanNullableId(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function cleanRank(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function cleanHost(value: unknown): VigilSecurityHost | null {
  const candidate = asRecord(value);
  if (!candidate) return null;
  const id = cleanText(candidate.id);
  const displayName = cleanText(candidate.displayName) || id;
  if (!id) return null;
  return {
    id,
    displayName,
    machineId: cleanText(candidate.machineId) || undefined,
    os: cleanText(candidate.os) || undefined,
  };
}

function cleanIssue(value: unknown): VigilSecurityIssue | null {
  const candidate = asRecord(value);
  if (!candidate) return null;
  const id = cleanText(candidate.id);
  const hostId = cleanText(candidate.hostId);
  const severity = cleanText(candidate.severity).toLowerCase();
  const status = cleanText(candidate.status).toLowerCase();
  const title = cleanText(candidate.title);
  if (!id || !hostId || !title) return null;
  if (!SEVERITIES.has(severity) || !STATUSES.has(status)) return null;
  const rank = cleanRank(candidate.rank);
  return {
    id,
    hostId,
    severity: severity as VigilSecuritySeverity,
    title,
    status: status as VigilSecurityStatus,
    notes: cleanText(candidate.notes),
    flowProjectId: cleanNullableId(candidate.flowProjectId),
    flowItemId: cleanNullableId(candidate.flowItemId),
    reportPaths: cleanStringList(candidate.reportPaths),
    discoveredAt: cleanText(candidate.discoveredAt),
    updatedAt: cleanText(candidate.updatedAt),
    ...(rank === undefined ? {} : { rank }),
  };
}

function cleanColorMap(value: unknown) {
  const candidate = asRecord(value) || {};
  const colors: Partial<Record<VigilSecuritySeverity, string>> = {};
  for (const severity of VIGIL_SEVERITY_ORDER) {
    const color = cleanText(candidate[severity]);
    if (color) colors[severity] = color;
  }
  return colors;
}

function cleanStatusLabels(value: unknown) {
  const candidate = asRecord(value) || {};
  const labels: Partial<Record<VigilSecurityStatus, string>> = {};
  for (const status of STATUSES) {
    const label = cleanText(candidate[status]);
    if (label) labels[status as VigilSecurityStatus] = label;
  }
  return labels;
}

export function severityRank(severity: string) {
  const index = VIGIL_SEVERITY_ORDER.indexOf(
    severity as VigilSecuritySeverity,
  );
  return index === -1 ? VIGIL_SEVERITY_ORDER.length : index;
}

/** Vigil-owned order: severity critical→info, then optional rank, then updatedAt desc. */
export function sortVigilIssues(issues: VigilSecurityIssue[]) {
  return [...issues].sort((left, right) => {
    const severityDelta =
      severityRank(left.severity) - severityRank(right.severity);
    if (severityDelta !== 0) return severityDelta;
    const leftRank =
      typeof left.rank === "number" ? left.rank : Number.POSITIVE_INFINITY;
    const rightRank =
      typeof right.rank === "number" ? right.rank : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    const leftUpdated = Date.parse(left.updatedAt) || 0;
    const rightUpdated = Date.parse(right.updatedAt) || 0;
    return rightUpdated - leftUpdated;
  });
}

export function parseVigilSecurityDashboard(
  raw: unknown,
): VigilSecurityDashboard {
  const candidate = asRecord(raw);
  if (!candidate) throw new Error("Vigil security file must be a JSON object.");
  const schemaVersion =
    cleanText(candidate.schemaVersion) || VIGIL_SECURITY_SCHEMA_VERSION;
  if (schemaVersion !== VIGIL_SECURITY_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Vigil schemaVersion "${schemaVersion}". Expected ${VIGIL_SECURITY_SCHEMA_VERSION}.`,
    );
  }
  const hosts = Array.isArray(candidate.hosts)
    ? candidate.hosts.flatMap((entry) => {
        const host = cleanHost(entry);
        return host ? [host] : [];
      })
    : [];
  const issues = Array.isArray(candidate.issues)
    ? candidate.issues.flatMap((entry) => {
        const issue = cleanIssue(entry);
        return issue ? [issue] : [];
      })
    : [];
  return {
    schemaVersion,
    source: cleanText(candidate.source) || "vigil",
    updatedAt: cleanText(candidate.updatedAt),
    hosts,
    severityColors: cleanColorMap(candidate.severityColors),
    statusLabels: cleanStatusLabels(candidate.statusLabels),
    issues: sortVigilIssues(issues),
  };
}

export function summarizeVigilIssues(issues: VigilSecurityIssue[]) {
  const counts: Record<VigilSecuritySeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  let openCount = 0;
  let remediatedCount = 0;
  for (const issue of issues) {
    counts[issue.severity] += 1;
    if (issue.status === "open" || issue.status === "in_progress") openCount += 1;
    if (issue.status === "remediated") remediatedCount += 1;
  }
  return { counts, openCount, remediatedCount, total: issues.length };
}
