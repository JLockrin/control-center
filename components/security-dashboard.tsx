"use client";

import { useMemo, useState } from "react";
import {
  CircleAlert,
  RefreshCw,
  Shield,
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

      <section className="security-summary reveal delay-1">
        {VIGIL_SEVERITY_ORDER.map((severity) => {
          const color = severityColor(data, severity);
          const count = summary.counts[severity] || 0;
          return (
            <div
              key={severity}
              className="security-summary-card"
              style={
                color
                  ? {
                      borderColor: color,
                      boxShadow: `inset 3px 0 0 ${color}`,
                    }
                  : undefined
              }
            >
              <span
                className="security-chip"
                style={
                  color
                    ? { background: color, color: "#fff", borderColor: color }
                    : undefined
                }
              >
                {severity}
              </span>
              <b>{count}</b>
            </div>
          );
        })}
        <div className="security-summary-card security-summary-meta">
          <ShieldCheck size={18} />
          <div>
            <b>{summary.openCount} open</b>
            <small>
              {summary.remediatedCount} remediated · updated{" "}
              {formatWhen(dashboard.updatedAt || data.checkedAt)}
            </small>
          </div>
        </div>
      </section>

      <div className="toolbar reveal delay-2">
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
            All
          </button>
        </div>
        <small className="muted">
          Source {dashboard.source} · {issues.length} shown · file{" "}
          <code className="inline-code">vigil/issues.json</code>
        </small>
      </div>

      <div className="security-issue-list reveal delay-3">
        {issues.map((issue) => (
          <SecurityIssueCard
            key={issue.id}
            issue={issue}
            data={data}
            host={hostLabel(data, issue.hostId)}
          />
        ))}
        {!issues.length && (
          <section className="panel empty-state">
            <ShieldCheck size={24} />
            <h2>No active issues</h2>
            <p>Everything in Vigil&apos;s feed is remediated or closed.</p>
          </section>
        )}
      </div>
    </div>
  );
}

function SecurityIssueCard({
  issue,
  data,
  host,
}: {
  issue: VigilSecurityIssue;
  data: VigilSecurityFeedResponse;
  host: string;
}) {
  const color = severityColor(data, issue.severity);
  return (
    <article
      className={classNames(
        "panel security-issue-card",
        `security-status-${issue.status}`,
      )}
      style={
        color
          ? {
              borderLeftColor: color,
              borderLeftWidth: 4,
              borderLeftStyle: "solid",
            }
          : undefined
      }
    >
      <div className="security-issue-top">
        <div className="security-issue-badges">
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
          <span className={classNames("label", `label-status-${issue.status}`)}>
            {statusLabel(data, issue.status)}
          </span>
          {typeof issue.rank === "number" && (
            <span className="label label-neutral">rank {issue.rank}</span>
          )}
        </div>
        <small>{host}</small>
      </div>
      <h3>{issue.title}</h3>
      {issue.notes ? <p>{issue.notes}</p> : null}
      <div className="security-issue-meta">
        <span>Updated {formatWhen(issue.updatedAt)}</span>
        {issue.flowItemId != null && (
          <span>Flow item {String(issue.flowItemId)}</span>
        )}
        {issue.reportPaths?.[0] ? (
          <span className="security-report-path" title={issue.reportPaths[0]}>
            Report on file
          </span>
        ) : null}
      </div>
    </article>
  );
}
