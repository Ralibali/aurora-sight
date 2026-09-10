export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          brand_id: string
          category: Database["public"]["Enums"]["action_category"]
          created_at: string
          due_date: string | null
          finding_id: string | null
          id: string
          org_id: string
          owner: string | null
          priority: number
          rationale: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
        }
        Insert: {
          brand_id: string
          category?: Database["public"]["Enums"]["action_category"]
          created_at?: string
          due_date?: string | null
          finding_id?: string | null
          id?: string
          org_id: string
          owner?: string | null
          priority?: number
          rationale?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
        }
        Update: {
          brand_id?: string
          category?: Database["public"]["Enums"]["action_category"]
          created_at?: string
          due_date?: string | null
          finding_id?: string | null
          id?: string
          org_id?: string
          owner?: string | null
          priority?: number
          rationale?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_results: {
        Row: {
          brand_mentions: Json
          classification: Database["public"]["Enums"]["result_class"]
          classification_reason: string | null
          competitor_mentions: Json
          cost_estimate_usd: number
          created_at: string
          error: string | null
          id: string
          intent: Database["public"]["Enums"]["prompt_intent"]
          org_id: string
          prompt_id: string | null
          prompt_text: string
          raw_answer: string | null
          run_id: string
          tokens_in: number
          tokens_out: number
        }
        Insert: {
          brand_mentions?: Json
          classification?: Database["public"]["Enums"]["result_class"]
          classification_reason?: string | null
          competitor_mentions?: Json
          cost_estimate_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          org_id: string
          prompt_id?: string | null
          prompt_text: string
          raw_answer?: string | null
          run_id: string
          tokens_in?: number
          tokens_out?: number
        }
        Update: {
          brand_mentions?: Json
          classification?: Database["public"]["Enums"]["result_class"]
          classification_reason?: string | null
          competitor_mentions?: Json
          cost_estimate_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          org_id?: string
          prompt_id?: string | null
          prompt_text?: string
          raw_answer?: string | null
          run_id?: string
          tokens_in?: number
          tokens_out?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_results_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          brand_id: string
          completed_at: string | null
          completed_prompts: number
          cost_estimate_usd: number
          country: string
          created_by: string | null
          error: string | null
          failed_prompts: number
          id: string
          label: string | null
          language: string
          metrics: Json
          mode: Database["public"]["Enums"]["run_mode"]
          model_id: string
          model_label: string
          org_id: string
          prompt_set_id: string | null
          provider: string
          search_mode: Database["public"]["Enums"]["search_mode"]
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          total_prompts: number
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          completed_prompts?: number
          cost_estimate_usd?: number
          country?: string
          created_by?: string | null
          error?: string | null
          failed_prompts?: number
          id?: string
          label?: string | null
          language?: string
          metrics?: Json
          mode?: Database["public"]["Enums"]["run_mode"]
          model_id: string
          model_label: string
          org_id: string
          prompt_set_id?: string | null
          provider?: string
          search_mode?: Database["public"]["Enums"]["search_mode"]
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          total_prompts?: number
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          completed_prompts?: number
          cost_estimate_usd?: number
          country?: string
          created_by?: string | null
          error?: string | null
          failed_prompts?: number
          id?: string
          label?: string | null
          language?: string
          metrics?: Json
          mode?: Database["public"]["Enums"]["run_mode"]
          model_id?: string
          model_label?: string
          org_id?: string
          prompt_set_id?: string | null
          provider?: string
          search_mode?: Database["public"]["Enums"]["search_mode"]
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          total_prompts?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_runs_prompt_set_id_fkey"
            columns: ["prompt_set_id"]
            isOneToOne: false
            referencedRelation: "prompt_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          aliases: string[]
          client_id: string | null
          country: string
          created_at: string
          description: string | null
          domain: string | null
          id: string
          is_demo: boolean
          language: string
          name: string
          org_id: string
          products: string | null
        }
        Insert: {
          aliases?: string[]
          client_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          is_demo?: boolean
          language?: string
          name: string
          org_id: string
          products?: string | null
        }
        Update: {
          aliases?: string[]
          client_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          is_demo?: boolean
          language?: string
          name?: string
          org_id?: string
          products?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      citations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_brand_domain: boolean
          org_id: string
          result_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_brand_domain?: boolean
          org_id: string
          result_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_brand_domain?: boolean
          org_id?: string
          result_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "audit_results"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          is_demo: boolean
          name: string
          notes: string | null
          org_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          notes?: string | null
          org_id: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          notes?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          aliases: string[]
          brand_id: string
          created_at: string
          domain: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          aliases?: string[]
          brand_id: string
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          aliases?: string[]
          brand_id?: string
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          evidence_result_ids: string[]
          id: string
          org_id: string
          run_id: string | null
          severity: number
          title: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          evidence_result_ids?: string[]
          id?: string
          org_id: string
          run_id?: string | null
          severity?: number
          title: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          evidence_result_ids?: string[]
          id?: string
          org_id?: string
          run_id?: string | null
          severity?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          plan_interest: string | null
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          plan_interest?: string | null
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          plan_interest?: string | null
          website?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_aurora: boolean
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_aurora?: boolean
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_aurora?: boolean
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          active: boolean
          cta_label: string
          features: Json
          highlight: boolean
          id: string
          interval: string
          is_contact: boolean
          key: string
          name: string
          price_sek: number
          sort_order: number
          tagline: string | null
        }
        Insert: {
          active?: boolean
          cta_label?: string
          features?: Json
          highlight?: boolean
          id?: string
          interval?: string
          is_contact?: boolean
          key: string
          name: string
          price_sek?: number
          sort_order?: number
          tagline?: string | null
        }
        Update: {
          active?: boolean
          cta_label?: string
          features?: Json
          highlight?: boolean
          id?: string
          interval?: string
          is_contact?: boolean
          key?: string
          name?: string
          price_sek?: number
          sort_order?: number
          tagline?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_sets: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_sets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          intent: Database["public"]["Enums"]["prompt_intent"]
          language: string
          org_id: string
          prompt_set_id: string
          text: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          language?: string
          org_id: string
          prompt_set_id: string
          text: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          language?: string
          org_id?: string
          prompt_set_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_prompt_set_id_fkey"
            columns: ["prompt_set_id"]
            isOneToOne: false
            referencedRelation: "prompt_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_configs: {
        Row: {
          created_at: string
          enabled: boolean
          est_cost_per_1k_in: number
          est_cost_per_1k_out: number
          id: string
          model_id: string
          model_label: string
          org_id: string
          provider: string
          supports_native_search: boolean
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          est_cost_per_1k_in?: number
          est_cost_per_1k_out?: number
          id?: string
          model_id: string
          model_label: string
          org_id: string
          provider?: string
          supports_native_search?: boolean
        }
        Update: {
          created_at?: string
          enabled?: boolean
          est_cost_per_1k_in?: number
          est_cost_per_1k_out?: number
          id?: string
          model_id?: string
          model_label?: string
          org_id?: string
          provider?: string
          supports_native_search?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "provider_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          is_shared: boolean
          org_id: string
          run_id: string | null
          share_token: string | null
          summary: string | null
          title: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          is_shared?: boolean
          org_id: string
          run_id?: string | null
          share_token?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          org_id?: string
          run_id?: string | null
          share_token?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          brand_id: string
          cadence: string
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          model_id: string | null
          next_run_at: string | null
          org_id: string
          prompt_set_id: string | null
        }
        Insert: {
          brand_id: string
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          model_id?: string | null
          next_run_at?: string | null
          org_id: string
          prompt_set_id?: string | null
        }
        Update: {
          brand_id?: string
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          model_id?: string | null
          next_run_at?: string | null
          org_id?: string
          prompt_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_prompt_set_id_fkey"
            columns: ["prompt_set_id"]
            isOneToOne: false
            referencedRelation: "prompt_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: string | null
          created_at: string
          current_period_end: string | null
          id: string
          mrr_sek: number
          org_id: string
          plan_key: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          mrr_sek?: number
          org_id: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          mrr_sek?: number
          org_id?: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_org: { Args: { _org_id: string }; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_aurora_admin: { Args: never; Returns: boolean }
      seed_demo_org: { Args: { _org_id: string }; Returns: undefined }
    }
    Enums: {
      action_category:
        | "entity_clarity"
        | "landing_page"
        | "structured_data"
        | "content_gap"
        | "third_party_citation"
        | "internal_linking"
        | "review_authority"
        | "technical_seo"
      action_status: "open" | "in_progress" | "done" | "dismissed"
      app_role: "aurora_admin" | "org_admin" | "member"
      prompt_intent:
        | "discovery"
        | "comparison"
        | "recommendation"
        | "local_buyer"
        | "branded"
        | "problem_solution"
      result_class: "RECOMMENDED" | "CITED" | "MENTIONED" | "ABSENT"
      run_mode: "live" | "demo"
      run_status: "pending" | "running" | "completed" | "failed" | "partial"
      search_mode: "offline" | "native_search"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_category: [
        "entity_clarity",
        "landing_page",
        "structured_data",
        "content_gap",
        "third_party_citation",
        "internal_linking",
        "review_authority",
        "technical_seo",
      ],
      action_status: ["open", "in_progress", "done", "dismissed"],
      app_role: ["aurora_admin", "org_admin", "member"],
      prompt_intent: [
        "discovery",
        "comparison",
        "recommendation",
        "local_buyer",
        "branded",
        "problem_solution",
      ],
      result_class: ["RECOMMENDED", "CITED", "MENTIONED", "ABSENT"],
      run_mode: ["live", "demo"],
      run_status: ["pending", "running", "completed", "failed", "partial"],
      search_mode: ["offline", "native_search"],
    },
  },
} as const
