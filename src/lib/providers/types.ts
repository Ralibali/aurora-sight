/**
 * Leverantörsadaptrar för Aurora GEO.
 * Alla nycklar läses server-side. Inga hemligheter får nå klienten eller databasen.
 */

export type ProviderAnswer = {
  answer: string;
  citationUrls: string[];
  tokensIn: number;
  tokensOut: number;
  modelReported?: string | null;
  nativeSearchUsed: boolean;
  error?: string | null;
};

export type ProviderRequest = {
  prompt: string;
  modelId: string;
  language: string;
  country: string;
  nativeSearch: boolean;
};

export interface ProviderAdapter {
  readonly id: string;
  readonly label: string;
  isConfigured(): boolean;
  ask(request: ProviderRequest): Promise<ProviderAnswer>;
}

/**
 * Framtida integration: en självhostad NiubiGEO v0.2.x-instans kan kopplas in
 * genom att implementera detta interface. MVP:n är inte beroende av den.
 * NiubiGEO är Apache-2.0 och används endast som arkitektonisk referens.
 * Se /docs/UPSTREAM_NIUBIGEO.md.
 */
export interface NiubiGeoAdapter extends ProviderAdapter {
  readonly baseUrl: string;
  /** Hämtar tillgängliga modeller från den självhostade instansen. */
  listModels(): Promise<{ id: string; label: string; nativeSearch: boolean }[]>;
}
