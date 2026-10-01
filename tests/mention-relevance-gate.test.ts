import assert from "node:assert/strict";
import test from "node:test";

import type { MentionEvaluation } from "../lib/mention-filter";
import {
  finalizeMentionRelevance,
  parseMentionRelevanceGate,
  shouldConsultLlmRelevanceGate,
} from "../lib/mention-relevance-gate";

const identityOk: MentionEvaluation = {
  accepted: false,
  confidence: "high",
  review: false,
  score: 80,
  reasons: ["Content match: Harvest Home"],
  identityAccepted: true,
  matchedRequiredContexts: [],
};

test("parses Mentions LLM keep/drop decisions and rejects incomplete output", () => {
  assert.deepEqual(parseMentionRelevanceGate({ keep: true, why: "Critical ex-member coverage." }), {
    keep: true,
    why: "Critical ex-member coverage.",
  });
  assert.deepEqual(parseMentionRelevanceGate({ decision: "DROP", reason: "Promotional ministry homepage." }), {
    keep: false,
    why: "Promotional ministry homepage.",
  });
  assert.equal(parseMentionRelevanceGate({ keep: true, why: "no" }), null);
  assert.equal(parseMentionRelevanceGate({ keep: "yes", why: "Not a boolean keep flag." }), null);
});

test("LLM relevance gate short-circuits on keyword matches and fails closed when AI is unavailable", () => {
  assert.equal(shouldConsultLlmRelevanceGate({
    identityAccepted: true,
    matchedRequiredContexts: ["cult"],
    llmRelevanceGate: true,
  }), false);
  assert.equal(shouldConsultLlmRelevanceGate({
    identityAccepted: true,
    matchedRequiredContexts: [],
    llmRelevanceGate: true,
  }), true);

  const keywordKeep = finalizeMentionRelevance({
    evaluation: { ...identityOk, accepted: true, matchedRequiredContexts: ["cult"], reasons: ["Required context: cult"] },
    llmRelevanceGate: true,
    keywordRequired: true,
    llmDecision: null,
    llmConsulted: false,
  });
  assert.equal(keywordKeep.accepted, true);

  const aiUnavailableWithKeywords = finalizeMentionRelevance({
    evaluation: identityOk,
    llmRelevanceGate: true,
    keywordRequired: true,
    llmDecision: null,
    llmConsulted: false,
  });
  assert.equal(aiUnavailableWithKeywords.accepted, false);

  const aiUnavailableLlmOnly = finalizeMentionRelevance({
    evaluation: { ...identityOk, accepted: true },
    llmRelevanceGate: true,
    keywordRequired: false,
    llmDecision: null,
    llmConsulted: false,
  });
  assert.equal(aiUnavailableLlmOnly.accepted, false);
  assert.match(aiUnavailableLlmOnly.reasons.at(-1) || "", /fail closed/i);

  const llmKeep = finalizeMentionRelevance({
    evaluation: identityOk,
    llmRelevanceGate: true,
    keywordRequired: true,
    llmDecision: { keep: true, why: "Investigative allegation coverage of the tracked farm." },
    llmConsulted: true,
  });
  assert.equal(llmKeep.accepted, true);
  assert.match(llmKeep.reasons.at(-1) || "", /LLM relevance:/);

  const llmDrop = finalizeMentionRelevance({
    evaluation: identityOk,
    llmRelevanceGate: true,
    keywordRequired: true,
    llmDecision: { keep: false, why: "Neutral nonprofit directory listing." },
    llmConsulted: true,
  });
  assert.equal(llmDrop.accepted, false);
});
