export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      user_roles: {
        Row: { id: string; user_id: string; role: 'owner' | 'observer' | 'member' }
        Insert: { id?: string; user_id: string; role?: 'owner' | 'observer' | 'member' }
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          base_salary: number
          share_enabled: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          base_salary?: number
          share_enabled?: boolean
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          owner_id: string
          date: string
          lead_name: string
          phone: string | null
          payment_method: 'PIX' | 'Cartão'
          value: number
          product: string | null
          lead_source: string | null
          is_opportunity: boolean
          contract_signed: boolean
          payment_received: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          date: string
          lead_name: string
          phone?: string | null
          payment_method: 'PIX' | 'Cartão'
          value: number
          product?: string | null
          lead_source?: string | null
          is_opportunity?: boolean
          contract_signed?: boolean
          payment_received?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
        Relationships: []
      }
      installments: {
        Row: {
          id: string
          sale_id: string
          value: number
          due_date: string | null
          received: boolean
          position: number
        }
        Insert: {
          id?: string
          sale_id: string
          value: number
          due_date?: string | null
          received?: boolean
          position?: number
        }
        Update: Partial<Database['public']['Tables']['installments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'installments_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
        ]
      }
      receipts: {
        Row: {
          id: string
          owner_id: string
          sale_id: string
          installment_id: string | null
          path: string
          filename: string
          mime: string | null
          size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          sale_id: string
          installment_id?: string | null
          path: string
          filename: string
          mime?: string | null
          size?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['receipts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'receipts_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_installment_id_fkey'
            columns: ['installment_id']
            isOneToOne: false
            referencedRelation: 'installments'
            referencedColumns: ['id']
          },
        ]
      }
      sales_goals: {
        Row: {
          id: string
          owner_id: string
          cycle_start: string
          cycle_end: string
          goal_amount: number
          received_override: number | null
          sold_override: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          cycle_start: string
          cycle_end: string
          goal_amount?: number
          received_override?: number | null
          sold_override?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sales_goals']['Insert']>
        Relationships: []
      }
      dashboard_shares: {
        Row: {
          id: string
          owner_id: string
          email: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          email: string
          user_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['dashboard_shares']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: 'owner' | 'observer' | 'member'
    }
    CompositeTypes: Record<string, never>
  }
}
