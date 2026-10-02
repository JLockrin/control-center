import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseVigilSecurityDashboard,
  sortVigilIssues,
  summarizeVigilIssues,
  VIGIL_SEVERITY_ORDER,
  VIGIL_SECURITY_FILE_SEGMENTS,
} from "../lib/vigil-security";
import type { VigilSecurityIssue } from "../lib/types";

const sample = {
  schemaVersion: "1.0",
  source: "vigil",
  updatedAt: "2026-10-02T13:15:00-04:00",
  hosts: [
    {
      id: "precision3591",
      displayName: "Precision3591",
      machineId: "24c3b836-1ff9-4700-b9b9-ff818bdc5f8c",
    },
  ],
  severityColors: {
    critical: "#DC2626",
    high: "#EA580C",
    medium: "#CA8A04",
    low: "#2563EB",
    info: "#64748B",
  },
  statusLabels: {
    open: "Open",
    in_progress: "In progress",
    remediated: "Remediated",
    accepted_risk: "Accepted risk",
    wont_fix: "Won't fix",
  },
  issues: [
    {
      id: "a-low",
      hostId: "precision3591",
      severity: "low",
      title: "Low later",
      status: "open",
      notes: "",
      flowProjectId: null,
      flowItemId: null,
      reportPaths: [],
      discoveredAt: "2026-09-27T08:00:00-04:00",
      updatedAt: "2026-09-28T08:00:00-04:00",
      rank: 2,
    },
    {
      id: "b-high-rank2",
      hostId: "precision3591",
      severity: "high",
      title: "High rank 2",
      status: "open",
      notes: "",
      flowProjectId: 47,
      flowItemId: 47,
      reportPaths: [],
      discoveredAt: "2026-09-27T08:00:00-04:00",
      updatedAt: "2026-09-29T08:00:00-04:00",
      rank: 2,
    },
    {
      id: "c-high-rank1",
      hostId: "precision3591",
      severity: "high",
      title: "High rank 1",
      status: "in_progress",
      notes: "",
      flowProjectId: 47,
      flowItemId: 48,
      reportPaths: [],
      discoveredAt: "2026-09-27T08:00:00-04:00",
      updatedAt: "2026-09-27T08:00:00-04:00",
      rank: 1,
    },
    {
      id: "d-high-norank-newer",
      hostId: "precision3591",
      severity: "high",
      title: "High no rank newer",
      status: "remediated",
      notes: "",
      flowProjectId: null,
      flowItemId: null,
      reportPaths: [],
      discoveredAt: "2026-09-27T08:00:00-04:00",
      updatedAt: "2026-10-01T08:00:00-04:00",
    },
    {
      id: "e-critical",
      hostId: "precision3591",
      severity: "critical",
      title: "Critical",
      status: "open",
      notes: "x",
      flowProjectId: null,
      flowItemId: null,
      reportPaths: ["/tmp/r.md"],
      discoveredAt: "2026-09-27T08:00:00-04:00",
      updatedAt: "2026-09-27T08:00:00-04:00",
    },
  ],
};

function readLikeServer(root: string) {
  const filePath = path.join(root, ...VIGIL_SECURITY_FILE_SEGMENTS);
  if (!existsSync(filePath)) {
    return { configured: false as const, path: filePath, dashboard: null };
  }
  const dashboard = parseVigilSecurityDashboard(
    JSON.parse(readFileSync(filePath, "utf8")) as unknown,
  );
  return { configured: true as const, path: filePath, dashboard };
}

test("parseVigilSecurityDashboard sorts severity then rank then updatedAt", () => {
  const dashboard = parseVigilSecurityDashboard(sample);
  assert.deepEqual(
    dashboard.issues.map((issue) => issue.id),
    ["e-critical", "c-high-rank1", "b-high-rank2", "d-high-norank-newer", "a-low"],
  );
  assert.equal(dashboard.severityColors.high, "#EA580C");
  assert.equal(dashboard.statusLabels.open, "Open");
});

test("sortVigilIssues ranks within severity and leaves omitted ranks last", () => {
  const sorted = sortVigilIssues(sample.issues as VigilSecurityIssue[]);
  assert.equal(sorted[0].severity, "critical");
  assert.equal(sorted[1].id, "c-high-rank1");
  assert.equal(sorted[2].id, "b-high-rank2");
  assert.equal(sorted[3].id, "d-high-norank-newer");
});

test("summarizeVigilIssues counts open and severity buckets", () => {
  const dashboard = parseVigilSecurityDashboard(sample);
  const summary = summarizeVigilIssues(dashboard.issues);
  assert.equal(summary.total, 5);
  assert.equal(summary.openCount, 4);
  assert.equal(summary.remediatedCount, 1);
  assert.equal(summary.counts.critical, 1);
  assert.equal(summary.counts.high, 3);
  assert.equal(summary.counts.low, 1);
  assert.equal(VIGIL_SEVERITY_ORDER[0], "critical");
});

test("data-dir relative path is vigil/issues.json", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cc-vigil-"));
  const filePath = path.join(root, ...VIGIL_SECURITY_FILE_SEGMENTS);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(sample));
  const result = readLikeServer(root);
  assert.equal(result.configured, true);
  assert.equal(result.dashboard?.issues[0].id, "e-critical");
  assert.match(result.path, /vigil[/\\]issues\.json$/);
});

test("missing vigil/issues.json means unconfigured empty feed", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cc-vigil-missing-"));
  const result = readLikeServer(root);
  assert.equal(result.configured, false);
  assert.equal(result.dashboard, null);
});

test("rejects unsupported schemaVersion", () => {
  assert.throws(
    () => parseVigilSecurityDashboard({ ...sample, schemaVersion: "9.9" }),
    /Unsupported Vigil schemaVersion/,
  );
});

test("docs example matches schema v1.0 and sorts", () => {
  const examplePath = path.join(
    process.cwd(),
    "docs",
    "vigil",
    "issues.example.json",
  );
  const raw = JSON.parse(readFileSync(examplePath, "utf8")) as unknown;
  const dashboard = parseVigilSecurityDashboard(raw);
  assert.equal(dashboard.schemaVersion, "1.0");
  assert.ok(dashboard.issues.length >= 8);
  assert.equal(dashboard.severityColors.critical, "#DC2626");
  const order = dashboard.issues.map((issue) => issue.severity);
  const ranks = order.map((severity) => VIGIL_SEVERITY_ORDER.indexOf(severity));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});
