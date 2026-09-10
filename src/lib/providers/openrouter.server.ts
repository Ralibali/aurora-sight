import type { ProviderAdapter, ProviderAnswer, ProviderRequest } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function systemPrompt(language: string, country: string): string {
  if (language === "sv") {
    return [
      "Du är en hjälpsam assistent som svarar en verklig köpare.",
      `Svara på svenska och utgå från marknaden ${country}.`,
      "Namnge konkreta företag, produkter eller tjänster när det är relevant.",
      "Ange källor som fullständiga URL:er när du har dem. Hitta aldrig på källor.",
    ].join(" ");
  }
  return [
    "You are a helpful assistant answering a real buyer.",
    `Answer in ${language} for the ${country} market.`,
    "Name concrete companies, products or services when relevant.",
    "Provide sources as full URLs when you have them. Never invent sources.",
  ].join(" ");
}

type OpenRouterResponse = {
  choices?: { message?: { content?: string; annotations?: unknown[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
  error?: { message?: string };
};

function collectAnnotationUrls(annotations: unknown[] | undefined): string[] {
  if (!Array.isArray(annotations)) return [];
  const urls: string[] = [];
  for (const item of annotations) {
    if (item && typeof item === "object") {
      const citation = (item as { url_citation?: { url?: string } }).url_citation;
      if (citation?.url) urls.push(citation.url);
    }
  }
  return urls;
}

export function createOpenRouterAdapter(apiKey: string | undefined): ProviderAdapter {
  return {
    id: "openrouter",
    label: "OpenRouter",
    isConfigured: () => Boolean(apiKey),
    async ask(request: ProviderRequest): Promise<ProviderAnswer> {
      if (!apiKey) {
        return {
          answer: "",
          citationUrls: [],
          tokensIn: 0,
          tokensOut: 0,
          nativeSearchUsed: false,
          error: "OPENROUTER_API_KEY saknas i servermiljön.",
        };
      }

      const modelId = request.nativeSearch ? `${request.modelId}:online` : request.modelId;

      try {
        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Aurora GEO",
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: "system", content: systemPrompt(request.language, request.country) },
              { role: "user", content: request.prompt },
            ],
            max_tokens: 900,
          }),
        });

        const bodyText = await response.text();
        if (!response.ok) {
          return {
            answer: "",
            citationUrls: [],
            tokensIn: 0,
            tokensOut: 0,
            nativeSearchUsed: request.nativeSearch,
            error: `OpenRouter ${response.status}: ${bodyText.slice(0, 400)}`,
          };
        }

        const data = JSON.parse(bodyText) as OpenRouterResponse;
        if (data.error?.message) {
          return {
            answer: "",
            citationUrls: [],
            tokensIn: 0,
            tokensOut: 0,
            nativeSearchUsed: request.nativeSearch,
            error: `OpenRouter: ${data.error.message}`,
          };
        }

        const message = data.choices?.[0]?.message;
        return {
          answer: message?.content ?? "",
          citationUrls: collectAnnotationUrls(message?.annotations),
          tokensIn: data.usage?.prompt_tokens ?? 0,
          tokensOut: data.usage?.completion_tokens ?? 0,
          modelReported: data.model ?? modelId,
          nativeSearchUsed: request.nativeSearch,
          error: null,
        };
      } catch (error) {
        return {
          answer: "",
          citationUrls: [],
          tokensIn: 0,
          tokensOut: 0,
          nativeSearchUsed: request.nativeSearch,
          error: error instanceof Error ? error.message : "Okänt nätverksfel mot OpenRouter.",
        };
      }
    },
  };
}
