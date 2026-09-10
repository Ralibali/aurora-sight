import { describe, expect, it } from "vitest";
import {
  classifyAnswer,
  comparabilityIssues,
  computeMetrics,
  countMentions,
  extractUrls,
  normalizeDomain,
} from "./geo";

const base = {
  brandName: "Stayboost",
  brandAliases: [] as string[],
  brandDomain: "stayboost.se",
  competitors: [{ name: "Mews" }, { name: "Profitroom" }],
};

describe("countMentions", () => {
  it("kräver ordgräns och räknar inte delsträngar", () => {
    expect(countMentions("Mewsic är ett band", "Mews")).toBe(0);
    expect(countMentions("Vi använder Mews idag", "Mews")).toBe(1);
  });

  it("är skiftlägesokänsligt och hanterar svenska tecken", () => {
    expect(countMentions("hönsgården är bäst", "Hönsgården")).toBe(1);
  });
});

describe("normalizeDomain och extractUrls", () => {
  it("normaliserar domän", () => {
    expect(normalizeDomain("https://www.stayboost.se/pris")).toBe("stayboost.se");
    expect(normalizeDomain("")).toBeNull();
  });

  it("plockar ut url:er ur text", () => {
    const urls = extractUrls("Se https://stayboost.se och https://mews.com/priser.");
    expect(urls.length).toBe(2);
  });
});

describe("classifyAnswer", () => {
  it("ger ABSENT när varumärket inte nämns", () => {
    const out = classifyAnswer({ ...base, answer: "Jag rekommenderar Mews och Profitroom." });
    expect(out.classification).toBe("ABSENT");
    expect(out.competitorMentions.find((c) => c.name === "Mews")?.count).toBe(1);
  });

  it("ger MENTIONED vid enkelt omnämnande utan källa eller rekommendation", () => {
    const out = classifyAnswer({
      ...base,
      answer: "Det finns flera aktörer på marknaden, till exempel Stayboost.",
    });
    expect(out.classification).toBe("MENTIONED");
  });

  it("ger CITED när svaret länkar till varumärkets domän", () => {
    const out = classifyAnswer({
      ...base,
      answer: "Stayboost finns beskrivet här: https://stayboost.se/om-oss",
    });
    expect(out.classification).toBe("CITED");
  });

  it("ger RECOMMENDED när en rekommendationssignal står nära varumärket", () => {
    const out = classifyAnswer({
      ...base,
      answer: "Jag rekommenderar Stayboost för små hotell som vill öka direktbokningar.",
    });
    expect(out.classification).toBe("RECOMMENDED");
  });

  it("prioriterar RECOMMENDED före CITED", () => {
    const out = classifyAnswer({
      ...base,
      answer: "Bästa valet är Stayboost, se https://stayboost.se för detaljer.",
    });
    expect(out.classification).toBe("RECOMMENDED");
  });

  it("motiverar alltid klassificeringen", () => {
    const out = classifyAnswer({ ...base, answer: "Inget relevant." });
    expect(out.reason.length).toBeGreaterThan(0);
  });
});

describe("computeMetrics", () => {
  it("räknar andelar korrekt", () => {
    const m = computeMetrics([
      { classification: "RECOMMENDED", intent: "recommendation", competitorMentions: [] },
      { classification: "CITED", intent: "discovery", competitorMentions: [] },
      { classification: "MENTIONED", intent: "discovery", competitorMentions: [] },
      { classification: "ABSENT", intent: "comparison", competitorMentions: [] },
    ]);
    expect(m.prompt_coverage).toBe(4);
    expect(m.visibility_rate).toBeCloseTo(0.75);
    expect(m.recommendation_rate).toBeCloseTo(0.25);
    expect(m.citation_rate).toBeCloseTo(0.25);
    expect(m.absent_rate).toBeCloseTo(0.25);
  });

  it("hanterar tom lista utan att krascha", () => {
    const m = computeMetrics([]);
    expect(m.prompt_coverage).toBe(0);
    expect(m.visibility_rate).toBe(0);
  });
});

describe("comparabilityIssues", () => {
  const run = {
    brand_id: "b1",
    prompt_set_id: "p1",
    model_id: "openai/gpt-4o-mini",
    provider: "openrouter",
    search_mode: "offline",
    mode: "live",
  };

  it("ger inga invändningar för identiska förutsättningar", () => {
    expect(comparabilityIssues(run, { ...run })).toEqual([]);
  });

  it("flaggar demo mot live", () => {
    expect(comparabilityIssues(run, { ...run, mode: "demo" })).toContain("demo jämfört med live");
  });

  it("flaggar olika modell och sökläge", () => {
    const issues = comparabilityIssues(run, {
      ...run,
      model_id: "perplexity/sonar",
      search_mode: "native_search",
    });
    expect(issues).toContain("olika modeller");
    expect(issues).toContain("olika sökläge");
  });
});
