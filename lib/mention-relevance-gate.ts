import type { MentionEvaluation } from "@/lib/mention-filter";

export type MentionRelevanceGateDecision = {
  keep: boolean;
  why: string;
};

/** Keyword short-circuit: do not call the LLM when a required context already matched. */
export function shouldConsultLlmRelevanceGate(options: {
  identityAccepted: boolean;
  matchedRequiredContexts: string[];
  llmRelevanceGate: boolean;
}) {
  return options.identityAccepted &&
    options.llmRelevanceGate &&
    options.matchedRequiredContexts.length === 0;
}

/**
 * Finalize KEEP/DROP after identity (+ optional keyword requireAnyContexts).
 * When the LLM was consulted, only KEEP decisions accept. When AI is unavailable:
 * fall back to keyword requireAnyContexts if configured; otherwise fail closed.
 */
export function finalizeMentionRelevance(options: {
  evaluation: MentionEvaluation;
  llmRelevanceGate: boolean;
  keywordRequired: boolean;
  llmDecision: MentionRelevanceGateDecision | null;
  llmConsulted: boolean;
}): { accepted: boolean; reasons: string[] } {
  const { evaluation } = options;
  if (!evaluation.identityAccepted) {
    return { accepted: false, reasons: evaluation.reasons };
  }
  if (evaluation.matchedRequiredContexts.length > 0) {
    return { accepted: true, reasons: evaluation.reasons };
  }
  if (options.llmRelevanceGate) {
    if (options.llmConsulted && options.llmDecision?.keep) {
      return {
        accepted: true,
        reasons: [...evaluation.reasons, `LLM relevance: ${options.llmDecision.why}`],
      };
    }
    if (options.llmConsulted && options.llmDecision && !options.llmDecision.keep) {
      return {
        accepted: false,
        reasons: [...evaluation.reasons, `LLM relevance drop: ${options.llmDecision.why}`],
      };
    }
    if (options.keywordRequired) {
      return { accepted: false, reasons: evaluation.reasons };
    }
    return {
      accepted: false,
      reasons: [...evaluation.reasons, "LLM relevance gate unavailable; fail closed"],
    };
  }
  return { accepted: evaluation.accepted, reasons: evaluation.reasons };
}

/**
 * Parses a keep/drop JSON decision from Mentions AI relevance gating.
 * Invalid or incomplete output returns null so callers can fall back.
 */
export function parseMentionRelevanceGate(value: unknown): MentionRelevanceGateDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as { keep?: unknown; decision?: unknown; why?: unknown; reason?: unknown };
  const decision = typeof entry.keep === "boolean"
    ? entry.keep
    : typeof entry.decision === "string"
      ? entry.decision.trim().toLocaleLowerCase() === "keep"
        ? true
        : entry.decision.trim().toLocaleLowerCase() === "drop"
          ? false
          : null
      : null;
  if (decision === null) return null;
  const why = typeof entry.why === "string"
    ? entry.why.trim()
    : typeof entry.reason === "string"
      ? entry.reason.trim()
      : "";
  if (why.length < 3) return null;
  return { keep: decision, why: why.slice(0, 280) };
}

export type MentionRelevanceGateCandidate = {
  title: string;
  summary: string;
  pageText: string;
  matchedTerm: string;
  requireAnyContexts: string[];
};

export function boundedRelevanceGateEvidence(candidate: MentionRelevanceGateCandidate) {
  const identityOffset = candidate.pageText.toLowerCase().indexOf(candidate.matchedTerm.toLowerCase());
  const excerpt = identityOffset > 600
    ? `${candidate.pageText.slice(0, 400)} … ${candidate.pageText.slice(Math.max(0, identityOffset - 500), identityOffset + 2_400)}`
    : candidate.pageText.slice(0, 2_800);
  return {
    title: candidate.title.slice(0, 350),
    matchedTerm: candidate.matchedTerm.slice(0, 150),
    summary: candidate.summary.slice(0, 500),
    requireAnyContexts: candidate.requireAnyContexts.slice(0, 24),
    evidence: excerpt
      .replace(/https?:\/\/[^\s<>]+/gi, "[source link]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email address]")
      .slice(0, 3_200),
  };
}
