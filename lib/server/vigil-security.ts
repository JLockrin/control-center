import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { dataDirectory } from "@/lib/server/settings";
import {
  parseVigilSecurityDashboard,
  VIGIL_SECURITY_FILE_SEGMENTS,
} from "@/lib/vigil-security";

export function vigilSecurityPath(root = dataDirectory()) {
  return path.join(root, ...VIGIL_SECURITY_FILE_SEGMENTS);
}

export function readVigilSecurityFile(filePath = vigilSecurityPath()) {
  if (!existsSync(filePath)) {
    return {
      configured: false as const,
      path: filePath,
      dashboard: null,
      error: "",
    };
  }
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    return {
      configured: true as const,
      path: filePath,
      dashboard: parseVigilSecurityDashboard(raw),
      error: "",
    };
  } catch (error) {
    return {
      configured: true as const,
      path: filePath,
      dashboard: null,
      error:
        error instanceof Error
          ? error.message
          : "Vigil security file could not be read.",
    };
  }
}
