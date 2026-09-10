/**
 * Aurora GEO – transparenta klassificeringsregler och aggregerade mått.
 * Rena funktioner, inga sidoeffekter. Används av både live-motorn och tester.
 */

export type Classification = "RECOMMENDED" | "CITED" | "MENTIONED" | "ABSENT";
export type Intent =
  | "discovery"
  | "comparison"
  | "recommendation"
  | "local_buyer"
  | "branded"
  | "problem_solution";

export const INTENT_LABELS: Record<Intent, string> = {
  discovery: "Upptäckt",
  comparison: "Jämförelse",
  recommendation: "Rekommendation",
  local_buyer: "Lokal köpintention",
  branded: "Varumärkt",
  problem_solution: "Problem → lösning",
};

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  RECOMMENDED: "Rekommenderad",
  CITED: "Citerad",
  MENTIONED: "Nämnd",
  ABSENT: "Frånvarande",
};

export const CLASSIFICATION_HELP: Record<Classification, string> = {
  RECOMMENDED:
    "Varumärket nämns i ett rekommenderande sammanhang (t.ex. i en topplista eller efter ord som ”rekommenderar”, ”bäst”, ”välj”).",
  CITED: "Varumärkets egen domän förekommer som källa/länk i svaret.",
  MENTIONED: "Varumärket nämns men utan rekommendation eller källänk.",
  ABSENT: "Varumärket förekommer inte alls i modellens svar.",
};

const RECOMMENDATION_CUES = [
  "rekommenderar",
  "rekommenderas",
  "rekommendation",
  "bäst",
  "bästa",
  "toppval",
  "förstahandsval",
  "vi föreslår",
  "föreslår",
  "välj",
  "mitt val",
  "starkast",
  "vinnare",
  "recommend",
  "best choice",
  "top pick",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Konservativ ordgränsmatchning – undviker delsträngsträffar som "Updro" i "Updrone". */
export function countMentions(text: string, term: string): number {
  const cleaned = term.trim();
  if (cleaned.length < 2) return 0;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(cleaned)}([^\\p{L}\\p{N}]|$)`, "giu");
  return (text.match(re) ?? []).length;
}

export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const host = withoutProtocol.split("/")[0];
  return host || null;
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>()"'\]]+/gi) ?? [];
  const cleaned = matches.map((u) => u.replace(/[.,;:]+$/, ""));
  return Array.from(new Set(cleaned));
}

export type MentionCount = { name: string; count: number };

export type ClassifyInput = {
  answer: string;
  brandNames: string[];
  brandDomain?: string | null;
  competitors: { name: string; aliases?: string[] }[];
  citationUrls: string[];
};

export type ClassifyOutput = {
  classification: Classification;
  reason: string;
  brandMentions: MentionCount[];
  competitorMentions: MentionCount[];
  brandCitationUrls: string[];
};

export function classifyAnswer(input: ClassifyInput): ClassifyOutput {
  const answer = input.answer ?? "";
  const lower = answer.toLowerCase();

  const brandMentions: MentionCount[] = input.brandNames
    .map((name) => ({ name, count: countMentions(answer, name) }))
    .filter((m) => m.count > 0);

  const competitorMentions: MentionCount[] = input.competitors
    .map((c) => {
      const terms = [c.name, ...(c.aliases ?? [])];
      const count = terms.reduce((sum, t) => sum + countMentions(answer, t), 0);
      return { name: c.name, count };
    })
    .filter((m) => m.count > 0);

  const brandDomain = normalizeDomain(input.brandDomain);
  const allUrls = Array.from(new Set([...input.citationUrls, ...extractUrls(answer)]));
  const brandCitationUrls = brandDomain
    ? allUrls.filter((u) => (normalizeDomain(u) ?? "").endsWith(brandDomain))
    : [];

  const totalBrandMentions = brandMentions.reduce((s, m) => s + m.count, 0);

  if (totalBrandMentions === 0 && brandCitationUrls.length === 0) {
    return {
      classification: "ABSENT",
      reason: "Ingen ordgränsträff på varumärkesnamn eller egen domän i svaret.",
      brandMentions,
      competitorMentions,
      brandCitationUrls,
    };
  }

  // Rekommendationskontext: en signalfras inom 220 tecken före/efter en varumärkesträff,
  // eller att varumärket står i en numrerad/punktad lista bland de tre första posterna.
  let recommended = false;
  let reason = "";
  for (const name of input.brandNames) {
    const re = new RegExp(escapeRegExp(name.toLowerCase()), "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower)) !== null) {
      const start = Math.max(0, match.index - 220);
      const window = lower.slice(start, match.index + name.length + 220);
      const cue = RECOMMENDATION_CUES.find((c) => window.includes(c));
      if (cue) {
        recommended = true;
        reason = `Signalordet ”${cue}” förekommer inom 220 tecken från varumärkesträffen.`;
        break;
      }
      const lineStart = lower.lastIndexOf("\n", match.index) + 1;
      const line = lower.slice(lineStart, match.index + name.length);
      const listMatch = line.match(/^\s*(\d+)[.)]/);
      if (listMatch && Number(listMatch[1]) <= 3) {
        recommended = true;
        reason = `Varumärket står på plats ${listMatch[1]} i en numrerad lista.`;
        break;
      }
    }
    if (recommended) break;
  }

  if (recommended) {
    return {
      classification: "RECOMMENDED",
      reason,
      brandMentions,
      competitorMentions,
      brandCitationUrls,
    };
  }

  if (brandCitationUrls.length > 0) {
    return {
      classification: "CITED",
      reason: `Egen domän förekommer som källa: ${brandCitationUrls[0]}`,
      brandMentions,
      competitorMentions,
      brandCitationUrls,
    };
  }

  return {
    classification: "MENTIONED",
    reason: "Varumärket nämns utan rekommendationssignal eller källänk.",
    brandMentions,
    competitorMentions,
    brandCitationUrls,
  };
}

export type ResultLike = {
  classification: Classification;
  intent?: Intent | string | null;
  competitor_mentions?: MentionCount[] | null;
  error?: string | null;
};

export type RunMetrics = {
  total: number;
  counts: Record<Classification, number>;
  visibility_rate: number;
  recommendation_rate: number;
  citation_rate: number;
  absent_rate: number;
  prompt_coverage: number;
  competitor_share: MentionCount[];
  by_intent: { intent: string; total: number; visible: number; rate: number }[];
};

export function computeMetrics(results: ResultLike[]): RunMetrics {
  const counts: Record<Classification, number> = {
    RECOMMENDED: 0,
    CITED: 0,
    MENTIONED: 0,
    ABSENT: 0,
  };
  for (const r of results) counts[r.classification] += 1;
  const total = results.length || 0;
  const visible = counts.RECOMMENDED + counts.CITED + counts.MENTIONED;
  const safe = (n: number) => (total === 0 ? 0 : Number((n / total).toFixed(4)));

  const competitorTotals = new Map<string, number>();
  for (const r of results) {
    for (const m of r.competitor_mentions ?? []) {
      competitorTotals.set(m.name, (competitorTotals.get(m.name) ?? 0) + m.count);
    }
  }

  const intentMap = new Map<string, { total: number; visible: number }>();
  for (const r of results) {
    const key = String(r.intent ?? "discovery");
    const entry = intentMap.get(key) ?? { total: 0, visible: 0 };
    entry.total += 1;
    if (r.classification !== "ABSENT") entry.visible += 1;
    intentMap.set(key, entry);
  }

  return {
    total,
    counts,
    visibility_rate: safe(visible),
    recommendation_rate: safe(counts.RECOMMENDED),
    citation_rate: safe(counts.CITED),
    absent_rate: safe(counts.ABSENT),
    prompt_coverage: total,
    competitor_share: Array.from(competitorTotals.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    by_intent: Array.from(intentMap.entries())
      .map(([intent, v]) => ({
        intent,
        total: v.total,
        visible: v.visible,
        rate: v.total === 0 ? 0 : Number((v.visible / v.total).toFixed(4)),
      }))
      .sort((a, b) => a.rate - b.rate),
  };
}

/** Två körningar får bara jämföras när alla villkor nedan är lika. */
export type RunComparable = {
  brand_id: string;
  prompt_set_id: string | null;
  model_id: string;
  provider: string;
  search_mode: string;
  mode: string;
};

export function comparabilityIssues(a: RunComparable, b: RunComparable): string[] {
  const issues: string[] = [];
  if (a.brand_id !== b.brand_id) issues.push("olika varumärken");
  if (a.prompt_set_id !== b.prompt_set_id) issues.push("olika promptset");
  if (a.model_id !== b.model_id) issues.push("olika modeller");
  if (a.provider !== b.provider) issues.push("olika leverantörer");
  if (a.search_mode !== b.search_mode) issues.push("olika sökläge");
  if (a.mode !== b.mode) issues.push("demo jämfört med live");
  return issues;
}

export const MAX_PROMPTS_PER_RUN = 25;
export const MAX_PROMPT_MODEL_COMBINATIONS = 50;
