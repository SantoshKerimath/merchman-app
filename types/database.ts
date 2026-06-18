export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'agency'
          settings: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['agencies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['agencies']['Insert']>
      }
      team_members: {
        Row: {
          id: string
          agency_id: string
          name: string
          email: string
          role: 'owner' | 'manager' | 'viewer'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>
      }
      brands: {
        Row: {
          id: string
          agency_id: string
          name: string
          amazon_seller_id: string | null
          marketplace_id: string
          sp_api_refresh_token: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['brands']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
      }
      products: {
        Row: {
          id: string
          brand_id: string
          asin: string | null
          sku: string
          fnsku: string | null
          name: string
          short_name: string | null
          category: string | null
          cogs: number | null
          price: number | null
          fba_fee: number | null
          referral_fee: number | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      settlements: {
        Row: {
          id: string
          brand_id: string
          settlement_id: number | null
          transaction_date: string
          order_id: string | null
          sku: string | null
          type: string | null
          quantity: number | null
          product_sales: number | null
          shipping_credits: number | null
          promo_rebates: number | null
          tcs_cgst: number | null
          tcs_sgst: number | null
          tcs_igst: number | null
          tds: number | null
          fba_fees: number | null
          selling_fees: number | null
          other_fees: number | null
          total: number | null
          city: string | null
          state: string | null
          fulfillment: string | null
          imported_at: string
        }
        Insert: Omit<Database['public']['Tables']['settlements']['Row'], 'id' | 'imported_at'>
        Update: Partial<Database['public']['Tables']['settlements']['Insert']>
      }
      ppc_data: {
        Row: {
          id: string
          brand_id: string
          start_date: string
          end_date: string | null
          campaign_name: string | null
          ad_group: string | null
          sku: string | null
          asin: string | null
          impressions: number | null
          clicks: number | null
          ctr: number | null
          cpc: number | null
          spend: number | null
          sales: number | null
          acos: number | null
          roas: number | null
          orders: number | null
          units: number | null
          cvr: number | null
          imported_at: string
        }
        Insert: Omit<Database['public']['Tables']['ppc_data']['Row'], 'id' | 'imported_at'>
        Update: Partial<Database['public']['Tables']['ppc_data']['Insert']>
      }
      daily_metrics: {
        Row: {
          id: string
          brand_id: string
          date: string
          total_sales: number | null
          units_sold: number | null
          income: number | null
          gross_profit: number | null
          net_profit: number | null
          net_margin: number | null
          ppc_spend: number | null
          ppc_sales: number | null
          acos: number | null
          tacos: number | null
          returns: number | null
          refund_value: number | null
        }
        Insert: Omit<Database['public']['Tables']['daily_metrics']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['daily_metrics']['Insert']>
      }
      alerts: {
        Row: {
          id: string
          brand_id: string
          type: 'stock_low' | 'acos_high' | 'rank_drop' | 'sales_drop' | 'roas_drop' | 'no_data'
          severity: 'info' | 'warning' | 'critical'
          message: string
          metric_value: number | null
          threshold: number | null
          resolved_at: string | null
          notified_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      knowledge_entries: {
        Row: {
          id: string
          agency_id: string
          brand_id: string | null
          content: string
          reasoning: string | null
          action_type: 'bid_change' | 'pause' | 'promo' | 'other'
          context_metrics: Json | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['knowledge_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['knowledge_entries']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience type aliases
export type Agency = Database['public']['Tables']['agencies']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']
export type PpcData = Database['public']['Tables']['ppc_data']['Row']
export type DailyMetrics = Database['public']['Tables']['daily_metrics']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type KnowledgeEntry = Database['public']['Tables']['knowledge_entries']['Row']
