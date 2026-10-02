"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CircleAlert,
  FileText,
  Lock,
  Monitor,
  RefreshCw,
  Shield,
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

const SEVERITY_DISPLAY: Record<VigilSecuritySeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

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

function hostForIssue(
  data: VigilSecurityFeedResponse | null,
  hostId: string,
) {
  return data?.dashboard?.hosts.find((entry) => entry.id === hostId) ?? null;
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

function severityDonutBackground(
  data: VigilSecurityFeedResponse,
  counts: Record<VigilSecuritySeverity, number>,
  total: number,
) {
  if (!total) return "conic-gradient(var(--line) 0deg 360deg)";
  const stops: string[] = [];
  let acc = 0;
  for (const severity of VIGIL_SEVERITY_ORDER) {
    const count = counts[severity] || 0;
    if (!count) continue;
    const color = severityColor(data, severity) || "var(--line-dark)";
    const start = (acc / total) * 100;
    acc += count;
    const end = (acc / total) * 100;
    stops.push(`${color} ${start}% ${end}%`);
  }
  if (!stops.length) return "conic-gradient(var(--line) 0deg 360deg)";
  return `conic-gradient(${stops.join(", ")})`;
}

export function SecurityDashboard({ data, loading, error, refresh }: Props) {
  const issues = data?.dashboard?.issues ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusCounts = useMemo(
    () => countByStatus(issues),
    [issues],
  );

  const selectedIssue = useMemo(() => {
    if (!issues.length) return null;
    if (selectedId) {
      const match = issues.find((issue) => issue.id === selectedId);
      if (match) return match;
    }
    return issues[0];
  }, [issues, selectedId]);

  useEffect(() => {
    if (!issues.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && issues.some((issue) => issue.id === selectedId)) return;
    setSelectedId(issues[0].id);
  }, [issues, selectedId]);

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
  const donutStyle = {
    background: severityDonutBackground(data, summary.counts, summary.total),
  } as CSSProperties;

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

      <section className="panel security-overview reveal delay-1">
        <div className="security-overview-top">
          <div
            className="security-donut"
            style={donutStyle}
            role="img"
            aria-label={`Issue composition: ${summary.total} total`}
          >
            <div className="security-donut-center">
              <b>{summary.total}</b>
              <span>issues</span>
            </div>
          </div>

          <div className="security-overview-metrics">
            <p className="eyebrow">Severity overview</p>
            <ul className="security-severity-counts">
              {VIGIL_SEVERITY_ORDER.map((severity) => {
                const color = severityColor(data, severity);
                const count = summary.counts[severity] || 0;
                return (
                  <li key={severity}>
                    <span
                      className="security-severity-dot"
                      style={color ? { background: color } : undefined}
                    />
                    <span className="security-severity-label">
                      {SEVERITY_DISPLAY[severity]}
                    </span>
                    <b>{count}</b>
                  </li>
                );
              })}
            </ul>

            <div className="security-status-summary">
              <p className="security-status-summary-title">Status</p>
              <ul className="security-status-summary-list">
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
            </div>
          </div>
        </div>

        <footer className="security-overview-footer">
          <div className="security-host-identity">
            <Monitor size={16} aria-hidden />
            <div>
              <b>
                {dashboard.hosts.map((host) => host.displayName).join(" · ") ||
                  "No hosts in feed"}
              </b>
              {dashboard.hosts.length === 1 && dashboard.hosts[0].os ? (
                <span>{dashboard.hosts[0].os}</span>
              ) : null}
            </div>
          </div>
          <div className="security-overview-meta">
            <span>
              Feed updated {formatWhen(dashboard.updatedAt || data.checkedAt)}
            </span>
            <span className="security-readonly-badge">
              <Lock size={12} aria-hidden /> Read-only
            </span>
            <span className="muted">
              Source {dashboard.source} ·{" "}
              <code className="inline-code">vigil/issues.json</code>
            </span>
          </div>
        </footer>
      </section>

      <section className="panel security-workspace reveal delay-2">
        <div className="security-queue">
          <header className="security-queue-head">
            <p className="eyebrow">Issue queue</p>
            <h3>Vigil order</h3>
            <small className="muted">{issues.length} ranked</small>
          </header>
          {issues.length ? (
            <ul className="security-queue-list" role="listbox" aria-label="Security issues">
              {issues.map((issue) => (
                <SecurityQueueRow
                  key={issue.id}
                  issue={issue}
                  data={data}
                  selected={selectedIssue?.id === issue.id}
                  onSelect={() => setSelectedId(issue.id)}
                />
              ))}
            </ul>
          ) : (
            <div className="security-queue-empty">
              <p>No issues in this feed.</p>
            </div>
          )}
        </div>

        <div className="security-detail" aria-live="polite">
          {selectedIssue ? (
            <SecurityIssueDetail issue={selectedIssue} data={data} />
          ) : (
            <div className="security-detail-empty">
              <p>Select an issue from the queue.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SecurityQueueRow({
  issue,
  data,
  selected,
  onSelect,
}: {
  issue: VigilSecurityIssue;
  data: VigilSecurityFeedResponse;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = severityColor(data, issue.severity);
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        className={classNames(
          "security-queue-item",
          selected && "security-queue-item-selected",
        )}
        style={
          color
            ? ({ "--queue-accent": color } as CSSProperties)
            : undefined
        }
        onClick={onSelect}
      >
        <span
          className="security-queue-accent"
          style={color ? { background: color } : undefined}
        />
        <span className="security-queue-text">
          <span className="security-queue-title">{issue.title}</span>
          <span
            className={classNames("label", `label-status-${issue.status}`)}
          >
            {statusLabel(data, issue.status)}
          </span>
        </span>
      </button>
    </li>
  );
}

function SecurityIssueDetail({
  issue,
  data,
}: {
  issue: VigilSecurityIssue;
  data: VigilSecurityFeedResponse;
}) {
  const color = severityColor(data, issue.severity);
  const host = hostForIssue(data, issue.hostId);
  const reportPaths = issue.reportPaths?.filter(Boolean) ?? [];

  return (
    <article className="security-detail-card">
      <header className="security-detail-head">
        <div className="security-detail-badges">
          <span
            className="security-chip"
            style={
              color
                ? { background: color, color: "#fff", borderColor: color }
                : undefined
            }
          >
            {issue.severity}
          </span>
          <span
            className={classNames("label", `label-status-${issue.status}`)}
          >
            {statusLabel(data, issue.status)}
          </span>
        </div>
        <h3>{issue.title}</h3>
      </header>

      {issue.notes ? (
        <section className="security-detail-block">
          <h4>Notes</h4>
          <p>{issue.notes}</p>
        </section>
      ) : null}

      <dl className="security-detail-facts">
        <div>
          <dt>Host</dt>
          <dd>
            <b>{host?.displayName || issue.hostId}</b>
            {host?.os ? <span>{host.os}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Flow</dt>
          <dd>
            {issue.flowProjectId == null && issue.flowItemId == null
              ? "—"
              : [
                  issue.flowProjectId != null
                    ? `Project ${String(issue.flowProjectId)}`
                    : null,
                  issue.flowItemId != null
                    ? `Item ${String(issue.flowItemId)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </dd>
        </div>
        <div>
          <dt>Reports</dt>
          <dd>
            {reportPaths.length ? (
              <ul className="security-report-list">
                {reportPaths.map((path) => (
                  <li key={path}>
                    <FileText size={13} aria-hidden />
                    <code>{path}</code>
                  </li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Discovered</dt>
          <dd>{formatWhen(issue.discoveredAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatWhen(issue.updatedAt)}</dd>
        </div>
        {typeof issue.rank === "number" && (
          <div>
            <dt>Vigil rank</dt>
            <dd>{issue.rank}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
