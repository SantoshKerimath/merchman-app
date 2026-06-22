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
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          message: string
          metric_value: number | null
          notified_at: string | null
          resolved_at: string | null
          severity: string
          threshold: number | null
          type: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          message: string
          metric_value?: number | null
          notified_at?: string | null
          resolved_at?: string | null
          severity: string
          threshold?: number | null
          type: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          message?: string
          metric_value?: number | null
          notified_at?: string | null
          resolved_at?: string | null
          severity?: string
          threshold?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_credentials: {
        Row: {
          access_token_cache: string | null
          access_token_expires_at: string | null
          brand_id: string
          connected_at: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          lwa_client_id: string
          lwa_client_secret: string
          lwa_refresh_token: string
          marketplace_id: string
          seller_id: string
          sync_schedule: Json
        }
        Insert: {
          access_token_cache?: string | null
          access_token_expires_at?: string | null
          brand_id: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          lwa_client_id: string
          lwa_client_secret: string
          lwa_refresh_token: string
          marketplace_id?: string
          seller_id: string
          sync_schedule?: Json
        }
        Update: {
          access_token_cache?: string | null
          access_token_expires_at?: string | null
          brand_id?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          lwa_client_id?: string
          lwa_client_secret?: string
          lwa_refresh_token?: string
          marketplace_id?: string
          seller_id?: string
          sync_schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_credentials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          agency_id: string
          amazon_seller_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_pinned: boolean
          marketplace_id: string
          name: string
          sp_api_refresh_token: string | null
        }
        Insert: {
          agency_id: string
          amazon_seller_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          marketplace_id?: string
          name: string
          sp_api_refresh_token?: string | null
        }
        Update: {
          agency_id?: string
          amazon_seller_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          marketplace_id?: string
          name?: string
          sp_api_refresh_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_metrics: {
        Row: {
          avg_selling_price: number | null
          brand_id: string
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          ordered_sales: number | null
          sessions: number | null
          units_ordered: number | null
        }
        Insert: {
          avg_selling_price?: number | null
          brand_id: string
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          id?: string
          ordered_sales?: number | null
          sessions?: number | null
          units_ordered?: number | null
        }
        Update: {
          avg_selling_price?: number | null
          brand_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          ordered_sales?: number | null
          sessions?: number | null
          units_ordered?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          acos: number | null
          brand_id: string
          date: string
          gross_profit: number | null
          id: string
          income: number | null
          net_margin: number | null
          net_profit: number | null
          ppc_sales: number | null
          ppc_spend: number | null
          refund_value: number | null
          returns: number | null
          tacos: number | null
          total_sales: number | null
          units_sold: number | null
        }
        Insert: {
          acos?: number | null
          brand_id: string
          date: string
          gross_profit?: number | null
          id?: string
          income?: number | null
          net_margin?: number | null
          net_profit?: number | null
          ppc_sales?: number | null
          ppc_spend?: number | null
          refund_value?: number | null
          returns?: number | null
          tacos?: number | null
          total_sales?: number | null
          units_sold?: number | null
        }
        Update: {
          acos?: number | null
          brand_id?: string
          date?: string
          gross_profit?: number | null
          id?: string
          income?: number | null
          net_margin?: number | null
          net_profit?: number | null
          ppc_sales?: number | null
          ppc_spend?: number | null
          refund_value?: number | null
          returns?: number | null
          tacos?: number | null
          total_sales?: number | null
          units_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          action_type: string
          agency_id: string
          brand_id: string | null
          content: string
          context_metrics: Json | null
          created_at: string
          created_by: string
          embedding: string | null
          id: string
          reasoning: string | null
        }
        Insert: {
          action_type: string
          agency_id: string
          brand_id?: string | null
          content: string
          context_metrics?: Json | null
          created_at?: string
          created_by: string
          embedding?: string | null
          id?: string
          reasoning?: string | null
        }
        Update: {
          action_type?: string
          agency_id?: string
          brand_id?: string | null
          content?: string
          context_metrics?: Json | null
          created_at?: string
          created_by?: string
          embedding?: string | null
          id?: string
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ppc_data: {
        Row: {
          acos: number | null
          ad_group: string | null
          asin: string | null
          brand_id: string
          campaign_name: string | null
          clicks: number | null
          cpc: number | null
          ctr: number | null
          cvr: number | null
          end_date: string | null
          id: string
          imported_at: string
          impressions: number | null
          orders: number | null
          roas: number | null
          sales: number | null
          sku: string | null
          spend: number | null
          start_date: string
          units: number | null
        }
        Insert: {
          acos?: number | null
          ad_group?: string | null
          asin?: string | null
          brand_id: string
          campaign_name?: string | null
          clicks?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          end_date?: string | null
          id?: string
          imported_at?: string
          impressions?: number | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          sku?: string | null
          spend?: number | null
          start_date: string
          units?: number | null
        }
        Update: {
          acos?: number | null
          ad_group?: string | null
          asin?: string | null
          brand_id?: string
          campaign_name?: string | null
          clicks?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          end_date?: string | null
          id?: string
          imported_at?: string
          impressions?: number | null
          orders?: number | null
          roas?: number | null
          sales?: number | null
          sku?: string | null
          spend?: number | null
          start_date?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ppc_data_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          asin: string | null
          brand_id: string
          category: string | null
          cogs: number | null
          created_at: string
          fba_fee: number | null
          fnsku: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          referral_fee: number | null
          short_name: string | null
          sku: string
        }
        Insert: {
          asin?: string | null
          brand_id: string
          category?: string | null
          cogs?: number | null
          created_at?: string
          fba_fee?: number | null
          fnsku?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          referral_fee?: number | null
          short_name?: string | null
          sku: string
        }
        Update: {
          asin?: string | null
          brand_id?: string
          category?: string | null
          cogs?: number | null
          created_at?: string
          fba_fee?: number | null
          fnsku?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          referral_fee?: number | null
          short_name?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          brand_id: string
          city: string | null
          fba_fees: number | null
          fulfillment: string | null
          id: string
          imported_at: string
          order_id: string | null
          other_fees: number | null
          product_sales: number | null
          promo_rebates: number | null
          quantity: number | null
          selling_fees: number | null
          settlement_id: number | null
          shipping_credits: number | null
          sku: string | null
          state: string | null
          tcs_cgst: number | null
          tcs_igst: number | null
          tcs_sgst: number | null
          tds: number | null
          total: number | null
          transaction_date: string
          type: string | null
        }
        Insert: {
          brand_id: string
          city?: string | null
          fba_fees?: number | null
          fulfillment?: string | null
          id?: string
          imported_at?: string
          order_id?: string | null
          other_fees?: number | null
          product_sales?: number | null
          promo_rebates?: number | null
          quantity?: number | null
          selling_fees?: number | null
          settlement_id?: number | null
          shipping_credits?: number | null
          sku?: string | null
          state?: string | null
          tcs_cgst?: number | null
          tcs_igst?: number | null
          tcs_sgst?: number | null
          tds?: number | null
          total?: number | null
          transaction_date: string
          type?: string | null
        }
        Update: {
          brand_id?: string
          city?: string | null
          fba_fees?: number | null
          fulfillment?: string | null
          id?: string
          imported_at?: string
          order_id?: string | null
          other_fees?: number | null
          product_sales?: number | null
          promo_rebates?: number | null
          quantity?: number | null
          selling_fees?: number | null
          settlement_id?: number | null
          shipping_credits?: number | null
          sku?: string | null
          state?: string | null
          tcs_cgst?: number | null
          tcs_igst?: number | null
          tcs_sgst?: number | null
          tds?: number | null
          total?: number | null
          transaction_date?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          api_calls_used: number | null
          brand_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          report_type: string
          rows_inserted: number | null
          status: string
          trigger: string
        }
        Insert: {
          api_calls_used?: number | null
          brand_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          report_type: string
          rows_inserted?: number | null
          status?: string
          trigger: string
        }
        Update: {
          api_calls_used?: number | null
          brand_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          report_type?: string
          rows_inserted?: number | null
          status?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          agency_id: string
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_brand_skus_with_cogs: {
        Args: { p_brand_id: string }
        Returns: {
          cogs: number
          product_id: string
          product_sales: number
          sku: string
          units_sold: number
        }[]
      }
      my_agency_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
