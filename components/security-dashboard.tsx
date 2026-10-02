"use client";

import { useMemo, useState } from "react";
import {
  CircleAlert,
  FileText,
  Monitor,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type {
  VigilSecurityFeedResponse,
  VigilSecurityIssue,
  VigilSecuritySeverity,
  VigilSecurityStatus,
} from "@/lib/types";
import { VIGIL_SEVERITY_ORDER } from "@/lib/vigil-security";

type Props = {
  data: VigilSecurityFeedResponse | null;
  loading: boolean;
  error: string;
  refresh: () => void;
};

const VIGIL_STATUS_ORDER: VigilSecurityStatus[] = [
  "open",
  "in_progress",
  "remediated",
  "accepted_risk",
  "wont_fix",
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function hostLabel(
  data: VigilSecurityFeedResponse | null,
  hostId: string,
) {
  const host = data?.dashboard?.hosts.find((entry) => entry.id === hostId);
  return host?.displayName || hostId;
}

function statusLabel(
  data: VigilSecurityFeedResponse | null,
  status: VigilSecurityStatus,
) {
  return data?.dashboard?.statusLabels[status] || status.replaceAll("_", " ");
}

function severityColor(
  data: VigilSecurityFeedResponse | null,
  severity: VigilSecuritySeverity,
) {
  return data?.dashboard?.severityColors[severity] || "";
}

function countByStatus(issues: VigilSecurityIssue[]) {
  const counts: Record<VigilSecurityStatus, number> = {
    open: 0,
    in_progress: 0,
    remediated: 0,
    accepted_risk: 0,
    wont_fix: 0,
  };
  for (const issue of issues) counts[issue.status] += 1;
  return counts;
}

function topSeverityColor(
  data: VigilSecurityFeedResponse | null,
  counts: Record<VigilSecuritySeverity, number>,
) {
  for (const severity of VIGIL_SEVERITY_ORDER) {
    if ((counts[severity] || 0) > 0) {
      return severityColor(data, severity);
    }
  }
  return "";
}

export function SecurityDashboard({ data, loading, error, refresh }: Props) {
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");

  const issues = useMemo(() => {
    const list = data?.dashboard?.issues || [];
    if (statusFilter === "all") return list;
    return list.filter(
      (issue) =>
        issue.status === "open" || issue.status === "in_progress",
    );
  }, [data, statusFilter]);

  const statusCounts = useMemo(
    () => countByStatus(data?.dashboard?.issues || []),
    [data],
  );

  if (loading && !data) {
    return (
      <section className="panel empty-state">
        <RefreshCw className="spin" size={24} />
        <h2>Loading Vigil security feed</h2>
        <p>Reading the local Vigil issues file.</p>
      </section>
    );
  }

  if (error && !data?.dashboard) {
    return (
      <section className="panel empty-state error-state" role="alert">
        <CircleAlert size={26} />
        <h2>Security feed could not be loaded</h2>
        <p>{error}</p>
        <button className="button button-primary" onClick={refresh}>
          <RefreshCw size={15} /> Retry
        </button>
      </section>
    );
  }

  if (!data?.configured || !data.dashboard) {
    return (
      <div className="view security-view">
        <div className="page-heading reveal">
          <div>
            <p className="eyebrow">Vigil</p>
            <h1>Security</h1>
            <p className="page-description">
              Vigil ranks and updates issues in a local JSON file. Control Center
              only renders that feed — there is no manual re-ranking here.
            </p>
          </div>
          <button className="button" onClick={refresh}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        <section className="panel empty-state reveal delay-1">
          <Shield size={28} />
          <h2>No Vigil issues file yet</h2>
          <p>
            Drop Vigil&apos;s schema v1.0 feed at{" "}
            <code>{data?.path || "…/Control Center/vigil/issues.json"}</code>.
            On Windows that is{" "}
            <code>%LOCALAPPDATA%\Control Center\vigil\issues.json</code>.
          </p>
          <p>
            See <code>docs/VIGIL_SECURITY.md</code> for the write path and
            example JSON.
          </p>
        </section>
      </div>
    );
  }

  const summary = data.summary;
  const dashboard = data.dashboard;
  const accent = topSeverityColor(data, summary.counts);
  const activeCount = statusCounts.open + statusCounts.in_progress;
  const closedPosture =
    statusCounts.remediated +
    statusCounts.accepted_risk +
    statusCounts.wont_fix;

  return (
    <div className="view security-view">
      <div className="page-heading reveal">
        <div>
          <p className="eyebrow">Vigil · ranked feed</p>
          <h1>Security</h1>
          <p className="page-description">
            Severity colors and remediation status come from Vigil&apos;s data.
            Joel does not re-rank here — updates are file-only.
          </p>
        </div>
        <button className="button" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? "spin" : undefined} size={15} />{" "}
          Refresh
        </button>
      </div>

      <section
        className="security-hero panel reveal delay-1"
        style={
          accent
            ? {
                "--security-accent": accent,
              }
            : undefined
        }
      >
        <div className="security-hero-main">
          <div className="security-hero-icon" aria-hidden>
            {activeCount > 0 ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
          </div>
          <div>
            <p className="security-hero-kicker">Vigil posture</p>
            <h2 className="security-hero-title">
              {activeCount > 0
                ? `${activeCount} finding${activeCount === 1 ? "" : "s"} need attention`
                : "No active findings in the feed"}
            </h2>
            <p className="security-hero-meta">
              {summary.total} ranked in feed · {summary.remediatedCount}{" "}
              {statusLabel(data, "remediated").toLowerCase()} · updated{" "}
              {formatWhen(dashboard.updatedAt || data.checkedAt)}
            </p>
          </div>
        </div>
        <div className="security-hero-stats">
          <div className="security-hero-stat">
            <span>{statusLabel(data, "open")}</span>
            <b>{statusCounts.open}</b>
          </div>
          <div className="security-hero-stat">
            <span>{statusLabel(data, "in_progress")}</span>
            <b>{statusCounts.in_progress}</b>
          </div>
          <div className="security-hero-stat security-hero-stat-muted">
            <span>{statusLabel(data, "remediated")}</span>
            <b>{statusCounts.remediated}</b>
          </div>
        </div>
      </section>

      <div className="security-dashboard-grid reveal delay-2">
        <div className="security-analytics-stack">
          <section className="panel security-panel">
            <header className="security-panel-head">
              <div>
                <p className="eyebrow">Composition</p>
                <h3>Severity mix</h3>
              </div>
              <span className="security-panel-total">{summary.total} issues</span>
            </header>
            <SeverityStackBar data={data} counts={summary.counts} total={summary.total} />
            <ul className="security-severity-legend">
              {VIGIL_SEVERITY_ORDER.map((severity) => {
                const color = severityColor(data, severity);
                const count = summary.counts[severity] || 0;
                return (
                  <li key={severity}>
                    <span
                      className="security-severity-swatch"
                      style={color ? { background: color } : undefined}
                    />
                    <span className="security-severity-name">{severity}</span>
                    <b>{count}</b>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel security-panel">
            <header className="security-panel-head">
              <div>
                <p className="eyebrow">Remediation</p>
                <h3>Status breakdown</h3>
              </div>
              <span className="security-panel-total">
                {closedPosture} closed posture
              </span>
            </header>
            <StatusStackBar
              data={data}
              counts={statusCounts}
              total={summary.total}
            />
            <ul className="security-status-legend">
              {VIGIL_STATUS_ORDER.map((status) => (
                <li key={status}>
                  <span
                    className={classNames(
                      "label",
                      `label-status-${status}`,
                    )}
                  >
                    {statusLabel(data, status)}
                  </span>
                  <b>{statusCounts[status]}</b>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel security-panel security-hosts-panel">
          <header className="security-panel-head">
            <div>
              <p className="eyebrow">Scope</p>
              <h3>Hosts in feed</h3>
            </div>
            <span className="security-panel-total">
              {dashboard.hosts.length} host
              {dashboard.hosts.length === 1 ? "" : "s"}
            </span>
          </header>
          <ul className="security-host-list">
            {dashboard.hosts.map((host) => {
              const hostIssues = dashboard.issues.filter(
                (issue) => issue.hostId === host.id,
              );
              const hostActive = hostIssues.filter(
                (issue) =>
                  issue.status === "open" || issue.status === "in_progress",
              ).length;
              return (
                <li key={host.id} className="security-host-card">
                  <div className="security-host-icon" aria-hidden>
                    <Monitor size={20} />
                  </div>
                  <div className="security-host-body">
                    <b>{host.displayName}</b>
                    {host.os ? <span>{host.os}</span> : null}
                    {host.machineId ? (
                      <code className="security-host-id">{host.machineId}</code>
                    ) : null}
                  </div>
                  <div className="security-host-counts">
                    <span>
                      <strong>{hostIssues.length}</strong> findings
                    </span>
                    <span>
                      <strong>{hostActive}</strong> active
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="security-source-line">
            Source <strong>{dashboard.source}</strong> · file{" "}
            <code className="inline-code">vigil/issues.json</code>
          </p>
        </section>
      </div>

      <div className="security-findings-toolbar reveal delay-3">
        <div className="segmented">
          <button
            className={statusFilter === "active" ? "active" : ""}
            onClick={() => setStatusFilter("active")}
          >
            Active
          </button>
          <button
            className={statusFilter === "all" ? "active" : ""}
            onClick={() => setStatusFilter("all")}
          >
            All ranked
          </button>
        </div>
        <small className="muted">
          {issues.length} shown · Vigil sort order preserved
        </small>
      </div>

      <section className="panel security-findings-panel reveal delay-4">
        <header className="security-findings-head">
          <div>
            <p className="eyebrow">Findings</p>
            <h3>Ranked issues</h3>
          </div>
        </header>
        {issues.length ? (
          <ol className="security-findings-list">
            {issues.map((issue, index) => (
              <SecurityFindingRow
                key={issue.id}
                issue={issue}
                data={data}
                index={index + 1}
                host={hostLabel(data, issue.hostId)}
                showHost={dashboard.hosts.length > 1}
              />
            ))}
          </ol>
        ) : (
          <div className="security-findings-empty">
            <ShieldCheck size={24} />
            <div>
              <b>No active issues</b>
              <p>Everything in Vigil&apos;s feed is remediated or closed.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SeverityStackBar({
  data,
  counts,
  total,
}: {
  data: VigilSecurityFeedResponse;
  counts: Record<VigilSecuritySeverity, number>;
  total: number;
}) {
  if (!total) {
    return <div className="security-stack-bar security-stack-bar-empty">No issues</div>;
  }
  return (
    <div
      className="security-stack-bar security-stack-bar-severity"
      role="img"
      aria-label="Issue count by severity"
    >
      {VIGIL_SEVERITY_ORDER.map((severity) => {
        const count = counts[severity] || 0;
        if (!count) return null;
        const color = severityColor(data, severity);
        const width = (count / total) * 100;
        return (
          <span
            key={severity}
            className="security-stack-segment"
            style={{
              flexGrow: count,
              flexBasis: `${width}%`,
              background: color || undefined,
            }}
            title={`${severity}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function StatusStackBar({
  data,
  counts,
  total,
}: {
  data: VigilSecurityFeedResponse;
  counts: Record<VigilSecurityStatus, number>;
  total: number;
}) {
  if (!total) {
    return <div className="security-stack-bar security-stack-bar-empty">No issues</div>;
  }
  return (
    <div
      className="security-stack-bar security-stack-bar-status"
      role="img"
      aria-label="Issue count by remediation status"
    >
      {VIGIL_STATUS_ORDER.map((status) => {
        const count = counts[status] || 0;
        if (!count) return null;
        return (
          <span
            key={status}
            className={classNames(
              "security-stack-segment",
              `security-stack-status-${status}`,
            )}
            style={{ flexGrow: count }}
            title={`${statusLabel(data, status)}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function SecurityFindingRow({
  issue,
  data,
  index,
  host,
  showHost,
}: {
  issue: VigilSecurityIssue;
  data: VigilSecurityFeedResponse;
  index: number;
  host: string;
  showHost: boolean;
}) {
  const color = severityColor(data, issue.severity);
  return (
    <li
      className={classNames(
        "security-finding-row",
        `security-finding-status-${issue.status}`,
      )}
      style={
        color
          ? {
              "--finding-severity": color,
            }
          : undefined
      }
    >
      <div className="security-finding-rank" aria-hidden>
        <span>{index}</span>
      </div>
      <div className="security-finding-severity" aria-hidden>
        <span
          className="security-finding-severity-bar"
          style={color ? { background: color } : undefined}
        />
        <span
          className="security-chip security-finding-chip"
          style={
            color
              ? { background: color, color: "#fff", borderColor: color }
              : undefined
          }
        >
          {issue.severity}
        </span>
      </div>
      <div className="security-finding-body">
        <div className="security-finding-title-row">
          <h4>{issue.title}</h4>
          <span
            className={classNames("label", `label-status-${issue.status}`)}
          >
            {statusLabel(data, issue.status)}
          </span>
        </div>
        {issue.notes ? <p>{issue.notes}</p> : null}
        <div className="security-finding-meta">
          {showHost ? <span>{host}</span> : null}
          {typeof issue.rank === "number" && (
            <span>Vigil rank {issue.rank}</span>
          )}
          <span>Updated {formatWhen(issue.updatedAt)}</span>
          {issue.flowItemId != null && (
            <span>Flow item {String(issue.flowItemId)}</span>
          )}
          {issue.reportPaths?.[0] ? (
            <span className="security-report-path" title={issue.reportPaths[0]}>
              <FileText size={12} /> Report on file
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
