import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PricingPlan = {
  key: string;
  name: string;
  price_sek: number;
  interval: string;
  tagline: string | null;
  features: string[];
  cta_label: string;
  is_contact: boolean;
  highlight: boolean;
};

export const getPricingPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("pricing_plans")
    .select("key, name, price_sek, interval, tagline, features, cta_label, is_contact, highlight")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) return [] as PricingPlan[];
  return (data ?? []).map((p) => ({
    ...p,
    price_sek: Number(p.price_sek),
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
  })) as PricingPlan[];
});

const LeadInput = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  plan_interest: z.string().max(60).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LeadInput.parse(input))
  .handler(async ({ data }) => {
    const { error } = await publicClient().from("leads").insert({
      name: data.name,
      email: data.email,
      company: data.company || null,
      website: data.website || null,
      plan_interest: data.plan_interest || null,
      message: data.message || null,
    });
    if (error) throw new Error("Förfrågan kunde inte skickas just nu. Försök igen.");
    return { ok: true };
  });
