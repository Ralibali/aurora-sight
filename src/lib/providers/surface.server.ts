import type { ProviderAdapter, ProviderAnswer, ProviderRequest } from "@/lib/providers/types";

type SurfaceSource = string | { url?: string | null; href?: string | null };

type SurfaceResponse = {
  answer?: string;
  text?: string;
  content?: string;
  model?: string;
  modelReported?: string;
  citationUrls?: string[];
  citations?: SurfaceSource[];
  sources?: SurfaceSource[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  tokensIn?: number;
  tokensOut?: number;
};

function normalizeUrls(items: SurfaceSource[] | undefined): string[] {
  if (!items) return [];
  const urls = items
    .map((item) => {
      if (typeof item === "string") return item;
      return item.url ?? item.href ?? "";
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(urls)).slice(0, 20);
}

/**
 * Adapter for a real AI-surface/browser capture service.
 *
 * The service is deliberately behind a tiny HTTP contract so Aurora Sight is
 * not locked to one scraping/browser vendor. A Bright Data, Browserbase,
 * Playwright or internal worker can all implement the same endpoint.
 *
 * Expected POST response (flexible aliases are accepted):
 * { answer, citations: [{ url }], model, usage: { input_tokens, output_tokens } }
 */
export function createSurfaceAdapter(endpoint: string, token?: string | null): ProviderAdapter {
  const url = endpoint.trim();

  return {
    id: "surface",
    label: "Real AI Surface",
    isConfigured: () => Boolean(url),
    async ask(request: ProviderRequest): Promise<ProviderAnswer> {
      if (!url) {
        return {
          answer: "",
          citationUrls: [],
          tokensIn: 0,
          tokensOut: 0,
          nativeSearchUsed: true,
          error: "AURORA_SURFACE_PROVIDER_URL saknas.",
        };
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            prompt: request.prompt,
            model: request.modelId,
            modelId: request.modelId,
            language: request.language,
            country: request.country,
            nativeSearch: true,
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return {
            answer: "",
            citationUrls: [],
            tokensIn: 0,
            tokensOut: 0,
            nativeSearchUsed: true,
            error: `Surface provider ${response.status}: ${detail.slice(0, 300)}`,
          };
        }

        const payload = (await response.json()) as SurfaceResponse;
        const answer = payload.answer ?? payload.text ?? payload.content ?? "";
        const citationUrls = Array.from(
          new Set([
            ...(payload.citationUrls ?? []),
            ...normalizeUrls(payload.citations),
            ...normalizeUrls(payload.sources),
          ]),
        );
        const tokensIn =
          payload.tokensIn ?? payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0;
        const tokensOut =
          payload.tokensOut ??
          payload.usage?.output_tokens ??
          payload.usage?.completion_tokens ??
          0;

        if (!answer.trim()) {
          return {
            answer: "",
            citationUrls,
            tokensIn,
            tokensOut,
            modelReported: payload.modelReported ?? payload.model ?? request.modelId,
            nativeSearchUsed: true,
            error: "Surface provider returnerade inget svar.",
          };
        }

        return {
          answer,
          citationUrls,
          tokensIn,
          tokensOut,
          modelReported: payload.modelReported ?? payload.model ?? request.modelId,
          nativeSearchUsed: true,
          error: null,
        };
      } catch (error) {
        return {
          answer: "",
          citationUrls: [],
          tokensIn: 0,
          tokensOut: 0,
          nativeSearchUsed: true,
          error: error instanceof Error ? error.message : "Surface provider misslyckades.",
        };
      }
    },
  };
}
