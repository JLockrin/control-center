import { summarizeVigilIssues } from "@/lib/vigil-security";
import { readVigilSecurityFile } from "@/lib/server/vigil-security";

export const runtime = "nodejs";

const emptySummary = {
  total: 0,
  openCount: 0,
  remediatedCount: 0,
  counts: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  },
};

export async function GET() {
  const checkedAt = new Date().toISOString();
  const result = readVigilSecurityFile();
  if (!result.configured) {
    return Response.json({
      configured: false,
      checkedAt,
      path: result.path,
      dashboard: null,
      summary: emptySummary,
    });
  }
  if (!result.dashboard) {
    return Response.json(
      {
        configured: true,
        checkedAt,
        path: result.path,
        error: result.error || "Vigil security file is invalid.",
        dashboard: null,
        summary: emptySummary,
      },
      { status: 500 },
    );
  }
  return Response.json({
    configured: true,
    checkedAt,
    path: result.path,
    dashboard: result.dashboard,
    summary: summarizeVigilIssues(result.dashboard.issues),
  });
}
