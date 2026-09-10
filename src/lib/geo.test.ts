import { describe, expect, it } from "vitest";
import {
  classifyAnswer,
  comparabilityIssues,
  computeMetrics,
  countMentions,
  extractUrls,
  normalizeDomain,
  type ClassifyInput,
} from "./geo";

function input(answer: string, citationUrls: string[] = []): ClassifyInput {
  return {
    answer,
    brandNames: ["Stayboost"],
    brandDomain: "stayboost.se",
    competitors: [{ name: "Mews" }, { name: "Profitroom" }],
    citationUrls,
  };
}

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
    expect(extractUrls("Se https://stayboost.se och https://mews.com/priser.").length).toBe(2);
  });
});

describe("classifyAnswer", () => {
  it("ger ABSENT när varumärket inte nämns", () => {
    const out = classifyAnswer(input("Jag rekommenderar Mews och Profitroom."));
    expect(out.classification).toBe("ABSENT");
    expect(out.competitorMentions.find((c) => c.name === "Mews")?.count).toBe(1);
  });

  it("ger MENTIONED vid enkelt omnämnande", () => {
    const out = classifyAnswer(
      input("Det finns flera aktörer på marknaden, till exempel Stayboost."),
    );
    expect(out.classification).toBe("MENTIONED");
  });

  it("ger CITED när svaret länkar till varumärkets domän", () => {
    const out = classifyAnswer(
      input("Stayboost finns beskrivet här: https://stayboost.se/om-oss"),
    );
    expect(out.classification).toBe("CITED");
  });

  it("ger CITED när leverantörens citat pekar på varumärkets domän", () => {
    const out = classifyAnswer(
      input("Stayboost är ett alternativ.", ["https://stayboost.se/priser"]),
    );
    expect(out.classification).toBe("CITED");
  });

  it("ger RECOMMENDED vid rekommendationssignal nära varumärket", () => {
    const out = classifyAnswer(
      input("Jag rekommenderar Stayboost för små hotell som vill öka direktbokningar."),
    );
    expect(out.classification).toBe("RECOMMENDED");
  });

  it("prioriterar RECOMMENDED före CITED", () => {
    const out = classifyAnswer(
      input("Bästa valet är Stayboost, se https://stayboost.se för detaljer."),
    );
    expect(out.classification).toBe("RECOMMENDED");
  });

  it("motiverar alltid klassificeringen", () => {
    expect(classifyAnswer(input("Inget relevant.")).reason.length).toBeGreaterThan(0);
  });
});

describe("computeMetrics", () => {
  it("räknar andelar korrekt", () => {
    const m = computeMetrics([
      { classification: "RECOMMENDED", intent: "recommendation" },
      { classification: "CITED", intent: "discovery" },
      { classification: "MENTIONED", intent: "discovery" },
      { classification: "ABSENT", intent: "comparison" },
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

  it("summerar konkurrensomnämnanden", () => {
    const m = computeMetrics([
      {
        classification: "ABSENT",
        intent: "comparison",
        competitor_mentions: [{ name: "Mews", count: 2 }],
      },
      {
        classification: "MENTIONED",
        intent: "discovery",
        competitor_mentions: [{ name: "Mews", count: 1 }],
      },
    ]);
    expect(m.competitor_share.find((c) => c.name === "Mews")?.count).toBe(3);
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
