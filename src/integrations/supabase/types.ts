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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accessorials: {
        Row: {
          amount: number | null
          applies_to: Database["public"]["Enums"]["accessorial_applies_to"]
          calc_type: Database["public"]["Enums"]["accessorial_calc_type"]
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          requires_proof: boolean | null
          tax_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          applies_to?: Database["public"]["Enums"]["accessorial_applies_to"]
          calc_type?: Database["public"]["Enums"]["accessorial_calc_type"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          requires_proof?: boolean | null
          tax_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          applies_to?: Database["public"]["Enums"]["accessorial_applies_to"]
          calc_type?: Database["public"]["Enums"]["accessorial_calc_type"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          requires_proof?: boolean | null
          tax_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessorials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_health_signals: {
        Row: {
          account_id: string
          created_at: string
          details_json: Json | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          signal_type: string
          suggested_action: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          account_id: string
          created_at?: string
          details_json?: Json | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type: string
          suggested_action?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          account_id?: string
          created_at?: string
          details_json?: Json | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type?: string
          suggested_action?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_health_signals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_health_signals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_health_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_lane_profiles: {
        Row: {
          account_id: string
          competitor_notes: string | null
          created_at: string
          equipment_type: string | null
          id: string
          lane_id: string
          service_level: string | null
          status: string
          target_margin_percent: number | null
          tenant_id: string
          time_windows_json: Json | null
          updated_at: string
          volume_per_week: number | null
        }
        Insert: {
          account_id: string
          competitor_notes?: string | null
          created_at?: string
          equipment_type?: string | null
          id?: string
          lane_id: string
          service_level?: string | null
          status?: string
          target_margin_percent?: number | null
          tenant_id: string
          time_windows_json?: Json | null
          updated_at?: string
          volume_per_week?: number | null
        }
        Update: {
          account_id?: string
          competitor_notes?: string | null
          created_at?: string
          equipment_type?: string | null
          id?: string
          lane_id?: string
          service_level?: string | null
          status?: string
          target_margin_percent?: number | null
          tenant_id?: string
          time_windows_json?: Json | null
          updated_at?: string
          volume_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_lane_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_lane_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_lane_profiles_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_lane_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_policy_overrides: {
        Row: {
          account_id: string
          approved_at: string | null
          approved_by: string | null
          auto_invoice: boolean | null
          created_at: string
          custom_rules_json: Json | null
          id: string
          max_credit_limit: number | null
          min_margin_percent_override: number | null
          payment_terms_days: number | null
          pod_required: boolean | null
          requires_booking_confirmation: boolean | null
          status: string
          tenant_id: string
          tracking_privacy_km: number | null
          updated_at: string
          updated_by: string | null
          waiting_time_auto: boolean | null
        }
        Insert: {
          account_id: string
          approved_at?: string | null
          approved_by?: string | null
          auto_invoice?: boolean | null
          created_at?: string
          custom_rules_json?: Json | null
          id?: string
          max_credit_limit?: number | null
          min_margin_percent_override?: number | null
          payment_terms_days?: number | null
          pod_required?: boolean | null
          requires_booking_confirmation?: boolean | null
          status?: string
          tenant_id: string
          tracking_privacy_km?: number | null
          updated_at?: string
          updated_by?: string | null
          waiting_time_auto?: boolean | null
        }
        Update: {
          account_id?: string
          approved_at?: string | null
          approved_by?: string | null
          auto_invoice?: boolean | null
          created_at?: string
          custom_rules_json?: Json | null
          id?: string
          max_credit_limit?: number | null
          min_margin_percent_override?: number | null
          payment_terms_days?: number | null
          pod_required?: boolean | null
          requires_booking_confirmation?: boolean | null
          status?: string
          tenant_id?: string
          tracking_privacy_km?: number | null
          updated_at?: string
          updated_by?: string | null
          waiting_time_auto?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "account_policy_overrides_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_policy_overrides_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_policy_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_integrations: {
        Row: {
          created_at: string
          credentials_encrypted: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          ledger_mappings: Json | null
          provider: string
          sync_customers: boolean | null
          sync_error: string | null
          sync_invoices: boolean | null
          sync_payments: boolean | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
          vault_secret_id: string | null
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          ledger_mappings?: Json | null
          provider: string
          sync_customers?: boolean | null
          sync_error?: string | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
          vault_secret_id?: string | null
        }
        Update: {
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          ledger_mappings?: Json | null
          provider?: string
          sync_customers?: boolean | null
          sync_error?: string | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
          vault_secret_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      action_execution_log: {
        Row: {
          action_key: string
          ai_action_id: string | null
          blocked_reason_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          executed_at: string
          id: string
          idempotency_key: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_key: string
          ai_action_id?: string | null
          blocked_reason_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          action_key?: string
          ai_action_id?: string | null
          blocked_reason_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_execution_log_ai_action_id_fkey"
            columns: ["ai_action_id"]
            isOneToOne: false
            referencedRelation: "ai_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      address_book: {
        Row: {
          city: string | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          house_number: string | null
          id: string
          is_active: boolean
          label: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          postal_code: string | null
          street: string
          tags: string[] | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          is_active?: boolean
          label: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          street: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          is_active?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          street?: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "address_book_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          action_type: string
          approval_request_id: string | null
          assistant_type: Database["public"]["Enums"]["copilot_assistant_type"]
          conversation_id: string | null
          correlation_id: string | null
          created_at: string
          evidence_links: Json | null
          executed_at: string | null
          executed_by: string | null
          explainability_json: Json | null
          id: string
          proposed_actions_json: Json
          result_json: Json | null
          status: Database["public"]["Enums"]["ai_action_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          approval_request_id?: string | null
          assistant_type: Database["public"]["Enums"]["copilot_assistant_type"]
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence_links?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          explainability_json?: Json | null
          id?: string
          proposed_actions_json: Json
          result_json?: Json | null
          status?: Database["public"]["Enums"]["ai_action_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          approval_request_id?: string | null
          assistant_type?: Database["public"]["Enums"]["copilot_assistant_type"]
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence_links?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          explainability_json?: Json | null
          id?: string
          proposed_actions_json?: Json
          result_json?: Json | null
          status?: Database["public"]["Enums"]["ai_action_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "copilot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_transactions: {
        Row: {
          action_type: string
          conversation_id: string | null
          created_at: string
          credits_used: number
          id: string
          intent_complexity: string
          metadata_json: Json | null
          model_used: string | null
          request_id: string | null
          tenant_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          intent_complexity?: string
          metadata_json?: Json | null
          model_used?: string | null
          request_id?: string | null
          tenant_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          intent_complexity?: string
          metadata_json?: Json | null
          model_used?: string | null
          request_id?: string | null
          tenant_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_plans: {
        Row: {
          created_at: string
          credits_included: number
          features_json: Json
          id: string
          is_active: boolean
          max_conversations_per_day: number
          max_tokens_per_request: number
          model_access: string[]
          name: string
          price_monthly_eur: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_included?: number
          features_json?: Json
          id?: string
          is_active?: boolean
          max_conversations_per_day?: number
          max_tokens_per_request?: number
          model_access?: string[]
          name: string
          price_monthly_eur?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_included?: number
          features_json?: Json
          id?: string
          is_active?: boolean
          max_conversations_per_day?: number
          max_tokens_per_request?: number
          model_access?: string[]
          name?: string
          price_monthly_eur?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tenant_subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          credits_remaining: number
          credits_used_this_cycle: number
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          credits_remaining?: number
          credits_used_this_cycle?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          credits_remaining?: number
          credits_used_this_cycle?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ai_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_daily_rollup: {
        Row: {
          cost_estimate_eur: number
          created_at: string
          date: string
          id: string
          tenant_id: string
          total_credits: number
          total_requests: number
          total_tokens: number
          unique_users: number
        }
        Insert: {
          cost_estimate_eur?: number
          created_at?: string
          date: string
          id?: string
          tenant_id: string
          total_credits?: number
          total_requests?: number
          total_tokens?: number
          unique_users?: number
        }
        Update: {
          cost_estimate_eur?: number
          created_at?: string
          date?: string
          id?: string
          tenant_id?: string
          total_credits?: number
          total_requests?: number
          total_tokens?: number
          unique_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_rollup_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_memory: {
        Row: {
          created_at: string | null
          id: string
          memory_key: string
          memory_value: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_key: string
          memory_value: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_key?: string
          memory_value?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          escalation_after_minutes: number | null
          exception_types:
            | Database["public"]["Enums"]["exception_type"][]
            | null
          id: string
          is_active: boolean | null
          name: string
          notification_channels: string[] | null
          notify_roles: string[] | null
          notify_users: string[] | null
          severity_filter:
            | Database["public"]["Enums"]["exception_severity"][]
            | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          escalation_after_minutes?: number | null
          exception_types?:
            | Database["public"]["Enums"]["exception_type"][]
            | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_channels?: string[] | null
          notify_roles?: string[] | null
          notify_users?: string[] | null
          severity_filter?:
            | Database["public"]["Enums"]["exception_severity"][]
            | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          escalation_after_minutes?: number | null
          exception_types?:
            | Database["public"]["Enums"]["exception_type"][]
            | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_channels?: string[] | null
          notify_roles?: string[] | null
          notify_users?: string[] | null
          severity_filter?:
            | Database["public"]["Enums"]["exception_severity"][]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_events: {
        Row: {
          anomaly_type: string
          created_at: string | null
          description: string | null
          detection_algorithm: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_resolved: boolean | null
          metrics_json: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          anomaly_type: string
          created_at?: string | null
          description?: string | null
          detection_algorithm?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean | null
          metrics_json?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          anomaly_type?: string
          created_at?: string | null
          description?: string | null
          detection_algorithm?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_resolved?: boolean | null
          metrics_json?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_tolerance_rules: {
        Row: {
          auto_flag_enabled: boolean | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          tolerance_amount: number | null
          tolerance_percentage: number | null
          updated_at: string
        }
        Insert: {
          auto_flag_enabled?: boolean | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: string
          tolerance_amount?: number | null
          tolerance_percentage?: number | null
          updated_at?: string
        }
        Update: {
          auto_flag_enabled?: boolean | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          tolerance_amount?: number | null
          tolerance_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_tolerance_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_rules: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_active: boolean | null
          max_amount: number | null
          requires_escalation_to_role: string | null
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          requires_escalation_to_role?: string | null
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          requires_escalation_to_role?: string | null
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authority_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_dispatch_logs: {
        Row: {
          candidates_json: Json | null
          created_at: string | null
          human_override: boolean | null
          id: string
          order_id: string | null
          override_by: string | null
          rule_id: string | null
          selected_driver_id: string | null
          selection_reason: string | null
          tenant_id: string
          was_auto_assigned: boolean | null
        }
        Insert: {
          candidates_json?: Json | null
          created_at?: string | null
          human_override?: boolean | null
          id?: string
          order_id?: string | null
          override_by?: string | null
          rule_id?: string | null
          selected_driver_id?: string | null
          selection_reason?: string | null
          tenant_id: string
          was_auto_assigned?: boolean | null
        }
        Update: {
          candidates_json?: Json | null
          created_at?: string | null
          human_override?: boolean | null
          id?: string
          order_id?: string | null
          override_by?: string | null
          rule_id?: string | null
          selected_driver_id?: string | null
          selection_reason?: string | null
          tenant_id?: string
          was_auto_assigned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_dispatch_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_dispatch_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_dispatch_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_dispatch_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_dispatch_rules: {
        Row: {
          auto_assign: boolean | null
          conditions_json: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          max_distance_km: number | null
          name: string
          priority: number | null
          scoring_weights_json: Json | null
          tenant_id: string
          time_window_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          auto_assign?: boolean | null
          conditions_json?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_distance_km?: number | null
          name: string
          priority?: number | null
          scoring_weights_json?: Json | null
          tenant_id: string
          time_window_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_assign?: boolean | null
          conditions_json?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_distance_km?: number | null
          name?: string
          priority?: number | null
          scoring_weights_json?: Json | null
          tenant_id?: string
          time_window_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_dispatch_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_run_items: {
        Row: {
          automation_run_id: string
          created_at: string
          diff_preview_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          impact_amount: number | null
          reason: string | null
          result: string
        }
        Insert: {
          automation_run_id: string
          created_at?: string
          diff_preview_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          impact_amount?: number | null
          reason?: string | null
          result: string
        }
        Update: {
          automation_run_id?: string
          created_at?: string
          diff_preview_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          impact_amount?: number | null
          reason?: string | null
          result?: string
        }
        Relationships: []
      }
      availability_blocks: {
        Row: {
          block_type: string | null
          company_id: string
          created_at: string
          created_by: string | null
          end_time: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          id: string
          is_recurring: boolean | null
          reason: string | null
          recurrence_rule: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          block_type?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          end_time: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurrence_rule?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          block_type?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["compliance_entity_type"]
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurrence_rule?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account: string | null
          company_id: string | null
          counterparty_iban: string | null
          counterparty_name: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_matched: boolean | null
          match_confidence: number | null
          matched_invoice_id: string | null
          matched_transaction_id: string | null
          needs_review: boolean | null
          reference: string | null
          status: string | null
          transaction_date: string
          updated_at: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          company_id?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_matched?: boolean | null
          match_confidence?: number | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          needs_review?: boolean | null
          reference?: string | null
          status?: string | null
          transaction_date: string
          updated_at?: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          company_id?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_matched?: boolean | null
          match_confidence?: number | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          needs_review?: boolean | null
          reference?: string | null
          status?: string | null
          transaction_date?: string
          updated_at?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_templates: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          is_favorite: boolean | null
          name: string
          payload_json: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          is_favorite?: boolean | null
          name: string
          payload_json?: Json
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          is_favorite?: boolean | null
          name?: string
          payload_json?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          entity_ids: string[]
          entity_type: string
          error_details: Json | null
          failed_count: number | null
          id: string
          operation_type: string
          payload: Json | null
          started_at: string | null
          status: string | null
          success_count: number | null
          total_count: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          entity_ids: string[]
          entity_type: string
          error_details?: Json | null
          failed_count?: number | null
          id?: string
          operation_type: string
          payload?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          entity_ids?: string[]
          entity_type?: string
          error_details?: Json | null
          failed_count?: number | null
          id?: string
          operation_type?: string
          payload?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_audit_log: {
        Row: {
          action: string
          carrier_id: string
          changes: Json | null
          created_at: string
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          carrier_id: string
          changes?: Json | null
          created_at?: string
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          carrier_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_audit_log_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_audit_log_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_contacts: {
        Row: {
          carrier_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          portal_access: boolean
          portal_role: string
          portal_scope: string
          role: string | null
          show_purchase_rates: boolean
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          carrier_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          portal_access?: boolean
          portal_role?: string
          portal_scope?: string
          role?: string | null
          show_purchase_rates?: boolean
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          carrier_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          portal_access?: boolean
          portal_role?: string
          portal_scope?: string
          role?: string | null
          show_purchase_rates?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_contacts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_contacts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_pool_members: {
        Row: {
          carrier_id: string
          created_at: string
          id: string
          pool_id: string
          priority: number | null
        }
        Insert: {
          carrier_id: string
          created_at?: string
          id?: string
          pool_id: string
          priority?: number | null
        }
        Update: {
          carrier_id?: string
          created_at?: string
          id?: string
          pool_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_pool_members_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_pool_members_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "carrier_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_pools: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_pools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_portal_settings: {
        Row: {
          allow_document_upload: boolean
          auto_internal_documents: boolean
          carrier_id: string
          created_at: string
          id: string
          show_documents: boolean
          show_purchase_rates: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_document_upload?: boolean
          auto_internal_documents?: boolean
          carrier_id: string
          created_at?: string
          id?: string
          show_documents?: boolean
          show_purchase_rates?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_document_upload?: boolean
          auto_internal_documents?: boolean
          carrier_id?: string
          created_at?: string
          id?: string
          show_documents?: boolean
          show_purchase_rates?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_portal_settings_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: true
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_portal_settings_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: true
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_portal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_scorecards: {
        Row: {
          accept_rate: number | null
          accepted_tenders: number | null
          carrier_id: string
          claims_count: number | null
          company_id: string
          completed_orders: number | null
          created_at: string
          id: string
          last_calculated_at: string | null
          no_show_rate: number | null
          on_time_deliveries: number | null
          on_time_pickups: number | null
          otif_percentage: number | null
          total_tenders: number | null
          updated_at: string
        }
        Insert: {
          accept_rate?: number | null
          accepted_tenders?: number | null
          carrier_id: string
          claims_count?: number | null
          company_id: string
          completed_orders?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          no_show_rate?: number | null
          on_time_deliveries?: number | null
          on_time_pickups?: number | null
          otif_percentage?: number | null
          total_tenders?: number | null
          updated_at?: string
        }
        Update: {
          accept_rate?: number | null
          accepted_tenders?: number | null
          carrier_id?: string
          claims_count?: number | null
          company_id?: string
          completed_orders?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          no_show_rate?: number | null
          on_time_deliveries?: number | null
          on_time_pickups?: number | null
          otif_percentage?: number | null
          total_tenders?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_scorecards_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_scorecards_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_scorecards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          address: string | null
          bic: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          deleted_at: string | null
          email: string | null
          iban: string | null
          id: string
          is_active: boolean
          kvk_number: string | null
          notes: string | null
          payment_method: string | null
          payment_terms_days: number | null
          permits: string[] | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          tenant_id: string
          updated_at: string
          vat_liable_eu: boolean | null
          vat_liable_non_eu: boolean | null
          vat_number: string | null
          vehicle_types: string[] | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          deleted_at?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          kvk_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms_days?: number | null
          permits?: string[] | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          tenant_id: string
          updated_at?: string
          vat_liable_eu?: boolean | null
          vat_liable_non_eu?: boolean | null
          vat_number?: string | null
          vehicle_types?: string[] | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          deleted_at?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          kvk_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms_days?: number | null
          permits?: string[] | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          tenant_id?: string
          updated_at?: string
          vat_liable_eu?: boolean | null
          vat_liable_non_eu?: boolean | null
          vat_number?: string | null
          vehicle_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "carriers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          case_id: string
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          sender_id: string | null
          sender_name: string
          sender_role: string | null
          tenant_id: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_id?: string | null
          sender_name: string
          sender_role?: string | null
          tenant_id: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "claim_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_of_custody_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          details_json: Json | null
          event_type: Database["public"]["Enums"]["custody_event_type"]
          id: string
          order_id: string
          recorded_at: string
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          details_json?: Json | null
          event_type: Database["public"]["Enums"]["custody_event_type"]
          id?: string
          order_id: string
          recorded_at?: string
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          details_json?: Json | null
          event_type?: Database["public"]["Enums"]["custody_event_type"]
          id?: string
          order_id?: string
          recorded_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_of_custody_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_of_custody_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          payload_json: Json
          request_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shipment_id: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          payload_json?: Json
          request_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipment_id: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          payload_json?: Json
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipment_id?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_audit_logs: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          company_id: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          request_id: string
          success: boolean | null
          target_entity: string | null
          target_id: string | null
          tool_arguments: Json | null
          tool_name: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id: string
          success?: boolean | null
          target_entity?: string | null
          target_id?: string | null
          tool_arguments?: Json | null
          tool_name?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id?: string
          success?: boolean | null
          target_entity?: string | null
          target_id?: string | null
          tool_arguments?: Json | null
          tool_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_audit_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_conversations: {
        Row: {
          company_id: string | null
          context: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatgpt_messages: {
        Row: {
          confirmation_payload: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          pending_confirmation: boolean | null
          role: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          confirmation_payload?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          pending_confirmation?: boolean | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          confirmation_payload?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          pending_confirmation?: boolean | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_tenant_settings: {
        Row: {
          chauffeur_access_enabled: boolean | null
          company_id: string | null
          created_at: string | null
          hard_cap_usd: number | null
          id: string
          klant_access_enabled: boolean | null
          max_tokens_per_request: number | null
          monthly_budget_usd: number | null
          rate_limit_per_minute: number | null
          updated_at: string | null
        }
        Insert: {
          chauffeur_access_enabled?: boolean | null
          company_id?: string | null
          created_at?: string | null
          hard_cap_usd?: number | null
          id?: string
          klant_access_enabled?: boolean | null
          max_tokens_per_request?: number | null
          monthly_budget_usd?: number | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
        }
        Update: {
          chauffeur_access_enabled?: boolean | null
          company_id?: string | null
          created_at?: string | null
          hard_cap_usd?: number | null
          id?: string
          klant_access_enabled?: boolean | null
          max_tokens_per_request?: number | null
          monthly_budget_usd?: number | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatgpt_usage: {
        Row: {
          company_id: string | null
          completion_tokens: number | null
          conversation_id: string | null
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          model: string
          prompt_tokens: number | null
          request_id: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          model: string
          prompt_tokens?: number | null
          request_id: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          model?: string
          prompt_tokens?: number | null
          request_id?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_cases: {
        Row: {
          approved_amount: number | null
          claim_type: Database["public"]["Enums"]["claim_type"]
          claimed_amount: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          evidence_urls: string[] | null
          id: string
          liability: Database["public"]["Enums"]["claim_liability"]
          notes: string | null
          opened_by_role: string
          order_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          stop_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_type?: Database["public"]["Enums"]["claim_type"]
          claimed_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          evidence_urls?: string[] | null
          id?: string
          liability?: Database["public"]["Enums"]["claim_liability"]
          notes?: string | null
          opened_by_role?: string
          order_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          stop_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_type?: Database["public"]["Enums"]["claim_type"]
          claimed_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          evidence_urls?: string[] | null
          id?: string
          liability?: Database["public"]["Enums"]["claim_liability"]
          notes?: string | null
          opened_by_role?: string
          order_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          stop_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_cases_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collection_cases: {
        Row: {
          created_at: string
          customer_id: string
          history_json: Json | null
          id: string
          invoice_id: string | null
          next_action_at: string | null
          notes: string | null
          owner_user_id: string | null
          promised_amount: number | null
          promised_date: string | null
          status: Database["public"]["Enums"]["collection_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          history_json?: Json | null
          id?: string
          invoice_id?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          promised_amount?: number | null
          promised_date?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          history_json?: Json | null
          id?: string
          invoice_id?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          promised_amount?: number | null
          promised_date?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_cases_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bic: string | null
          branding_config: Json | null
          city: string | null
          country: string | null
          created_at: string
          custom_domain: string | null
          default_language: string | null
          document_footer_html: string | null
          document_header_html: string | null
          email: string | null
          email_footer_html: string | null
          email_header_html: string | null
          favicon_url: string | null
          iban: string | null
          id: string
          is_active: boolean
          kvk_number: string | null
          login_branding: Json | null
          logo_url: string | null
          name: string
          phone: string | null
          portal_branding: Json | null
          postal_code: string | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string | null
          social_links: Json | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          branding_config?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string | null
          document_footer_html?: string | null
          document_header_html?: string | null
          email?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          favicon_url?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          kvk_number?: string | null
          login_branding?: Json | null
          logo_url?: string | null
          name: string
          phone?: string | null
          portal_branding?: Json | null
          postal_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          branding_config?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_language?: string | null
          document_footer_html?: string | null
          document_header_html?: string | null
          email?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          favicon_url?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          kvk_number?: string | null
          login_branding?: Json | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          portal_branding?: Json | null
          postal_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      company_branches: {
        Row: {
          address: string | null
          branch_code: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          house_number: string | null
          id: string
          is_active: boolean | null
          is_headquarters: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_code?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_code?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_connections: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          receiving_company_id: string
          requested_at: string
          requesting_company_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          receiving_company_id: string
          requested_at?: string
          requesting_company_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          receiving_company_id?: string
          requested_at?: string
          requesting_company_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_connections_receiving_company_id_fkey"
            columns: ["receiving_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_connections_requesting_company_id_fkey"
            columns: ["requesting_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          days_until_expiry: number | null
          document_id: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          days_until_expiry?: number | null
          document_id: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          days_until_expiry?: number | null
          document_id?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          alert_14_days_sent: boolean | null
          alert_30_days_sent: boolean | null
          alert_7_days_sent: boolean | null
          blocks_planning: boolean | null
          company_id: string
          created_at: string
          doc_name: string
          doc_number: string | null
          doc_type: Database["public"]["Enums"]["compliance_doc_type"]
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          notes: string | null
          status: Database["public"]["Enums"]["compliance_doc_status"]
          updated_at: string
        }
        Insert: {
          alert_14_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          blocks_planning?: boolean | null
          company_id: string
          created_at?: string
          doc_name: string
          doc_number?: string | null
          doc_type: Database["public"]["Enums"]["compliance_doc_type"]
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_doc_status"]
          updated_at?: string
        }
        Update: {
          alert_14_days_sent?: boolean | null
          alert_30_days_sent?: boolean | null
          alert_7_days_sent?: boolean | null
          blocks_planning?: boolean | null
          company_id?: string
          created_at?: string
          doc_name?: string
          doc_number?: string | null
          doc_type?: Database["public"]["Enums"]["compliance_doc_type"]
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["compliance_entity_type"]
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_doc_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          audit_hash: string | null
          certificate_url: string | null
          company_id: string
          completed_at: string | null
          content_html: string | null
          counterparty_id: string
          counterparty_type: Database["public"]["Enums"]["counterparty_type"]
          created_at: string
          created_by: string | null
          declined_at: string | null
          document_hash: string | null
          expires_at: string | null
          id: string
          merged_data: Json | null
          parent_contract_id: string | null
          pdf_storage_url: string | null
          related_order_id: string | null
          require_sms_otp: boolean | null
          sent_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string | null
          title: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          audit_hash?: string | null
          certificate_url?: string | null
          company_id: string
          completed_at?: string | null
          content_html?: string | null
          counterparty_id: string
          counterparty_type: Database["public"]["Enums"]["counterparty_type"]
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          merged_data?: Json | null
          parent_contract_id?: string | null
          pdf_storage_url?: string | null
          related_order_id?: string | null
          require_sms_otp?: boolean | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          title: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          audit_hash?: string | null
          certificate_url?: string | null
          company_id?: string
          completed_at?: string | null
          content_html?: string | null
          counterparty_id?: string
          counterparty_type?: Database["public"]["Enums"]["counterparty_type"]
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          merged_data?: Json | null
          parent_contract_id?: string | null
          pdf_storage_url?: string | null
          related_order_id?: string | null
          require_sms_otp?: boolean | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_draft_links: {
        Row: {
          contract_instance_id: string | null
          contract_template_id: string | null
          created_at: string
          deal_id: string
          id: string
          sales_process_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contract_instance_id?: string | null
          contract_template_id?: string | null
          created_at?: string
          deal_id: string
          id?: string
          sales_process_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contract_instance_id?: string | null
          contract_template_id?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          sales_process_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_draft_links_sales_process_id_fkey"
            columns: ["sales_process_id"]
            isOneToOne: false
            referencedRelation: "sales_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_draft_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_email: string | null
          actor_name: string | null
          actor_party_id: string | null
          actor_party_type:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          actor_user_id: string | null
          contract_id: string
          device_type: string | null
          event_description: string | null
          event_type: Database["public"]["Enums"]["contract_event_type"]
          id: string
          ip_address: string | null
          payload: Json | null
          signature_request_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_name?: string | null
          actor_party_id?: string | null
          actor_party_type?:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          actor_user_id?: string | null
          contract_id: string
          device_type?: string | null
          event_description?: string | null
          event_type: Database["public"]["Enums"]["contract_event_type"]
          id?: string
          ip_address?: string | null
          payload?: Json | null
          signature_request_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_name?: string | null
          actor_party_id?: string | null
          actor_party_type?:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          actor_user_id?: string | null
          contract_id?: string
          device_type?: string | null
          event_description?: string | null
          event_type?: Database["public"]["Enums"]["contract_event_type"]
          id?: string
          ip_address?: string | null
          payload?: Json | null
          signature_request_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_share_links: {
        Row: {
          access_count: number | null
          allowed_email: string | null
          allowed_party_id: string | null
          allowed_party_type:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          can_download: boolean
          can_sign: boolean
          can_view: boolean
          contract_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          max_access_count: number | null
          token: string
        }
        Insert: {
          access_count?: number | null
          allowed_email?: string | null
          allowed_party_id?: string | null
          allowed_party_type?:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          can_download?: boolean
          can_sign?: boolean
          can_view?: boolean
          contract_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_access_count?: number | null
          token?: string
        }
        Update: {
          access_count?: number | null
          allowed_email?: string | null
          allowed_party_id?: string | null
          allowed_party_type?:
            | Database["public"]["Enums"]["counterparty_type"]
            | null
          can_download?: boolean
          can_sign?: boolean
          can_view?: boolean
          contract_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_access_count?: number | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_share_links_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          company_id: string | null
          content_html: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields_schema: Json | null
          id: string
          is_active: boolean
          is_system_template: boolean
          name: string
          routing_schema: Json | null
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          company_id?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_schema?: Json | null
          id?: string
          is_active?: boolean
          is_system_template?: boolean
          name: string
          routing_schema?: Json | null
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_schema?: Json | null
          id?: string
          is_active?: boolean
          is_system_template?: boolean
          name?: string
          routing_schema?: Json | null
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_audit_log: {
        Row: {
          action_type: string
          after_state: Json | null
          ai_action_id: string | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          evidence_used: Json | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          ai_action_id?: string | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          evidence_used?: Json | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          ai_action_id?: string | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          evidence_used?: Json | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_audit_log_ai_action_id_fkey"
            columns: ["ai_action_id"]
            isOneToOne: false
            referencedRelation: "ai_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_conversations: {
        Row: {
          assistant_type: Database["public"]["Enums"]["copilot_assistant_type"]
          context_json: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_type?: Database["public"]["Enums"]["copilot_assistant_type"]
          context_json?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_type?: Database["public"]["Enums"]["copilot_assistant_type"]
          context_json?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          action_cards: Json | null
          content: string
          conversation_id: string
          created_at: string
          evidence_links: Json | null
          id: string
          intent_key: string | null
          role: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          action_cards?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          evidence_links?: Json | null
          id?: string
          intent_key?: string | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          action_cards?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          evidence_links?: Json | null
          id?: string
          intent_key?: string | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "copilot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_tool_registry: {
        Row: {
          assistant_types: Database["public"]["Enums"]["copilot_assistant_type"][]
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          parameters_schema: Json
          required_permission: string | null
          requires_approval: boolean | null
          tool_name: string
        }
        Insert: {
          assistant_types: Database["public"]["Enums"]["copilot_assistant_type"][]
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          parameters_schema?: Json
          required_permission?: string | null
          requires_approval?: boolean | null
          tool_name: string
        }
        Update: {
          assistant_types?: Database["public"]["Enums"]["copilot_assistant_type"][]
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          parameters_schema?: Json
          required_permission?: string | null
          requires_approval?: boolean | null
          tool_name?: string
        }
        Relationships: []
      }
      credit_exposures: {
        Row: {
          customer_id: string
          exposure_total: number | null
          id: string
          open_invoices_amount: number | null
          overdue_amount: number | null
          reserved_amount: number | null
          tenant_id: string
          unbilled_delivered_amount: number | null
          updated_at: string
        }
        Insert: {
          customer_id: string
          exposure_total?: number | null
          id?: string
          open_invoices_amount?: number | null
          overdue_amount?: number | null
          reserved_amount?: number | null
          tenant_id: string
          unbilled_delivered_amount?: number | null
          updated_at?: string
        }
        Update: {
          customer_id?: string
          exposure_total?: number | null
          id?: string
          open_invoices_amount?: number | null
          overdue_amount?: number | null
          reserved_amount?: number | null
          tenant_id?: string
          unbilled_delivered_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_exposures_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_exposures_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_exposures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          company_id: string | null
          created_at: string
          credit_date: string
          credit_note_number: string
          customer_id: string
          id: string
          invoice_id: string | null
          reason: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          vat_amount: number
          vat_percentage: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          credit_date?: string
          credit_note_number: string
          customer_id: string
          id?: string
          invoice_id?: string | null
          reason: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_percentage?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          credit_date?: string
          credit_note_number?: string
          customer_id?: string
          id?: string
          invoice_id?: string | null
          reason?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_profiles: {
        Row: {
          created_at: string
          credit_limit: number
          currency: string | null
          customer_id: string
          grace_days: number | null
          id: string
          last_reviewed_at: string | null
          payment_terms_days: number | null
          proforma_required: boolean | null
          reviewed_by: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          stop_shipping_on_overdue: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number
          currency?: string | null
          customer_id: string
          grace_days?: number | null
          id?: string
          last_reviewed_at?: string | null
          payment_terms_days?: number | null
          proforma_required?: boolean | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          stop_shipping_on_overdue?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          currency?: string | null
          customer_id?: string
          grace_days?: number | null
          id?: string
          last_reviewed_at?: string | null
          payment_terms_days?: number | null
          proforma_required?: boolean | null
          reviewed_by?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          stop_shipping_on_overdue?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          chart_config: Json | null
          columns_config: Json | null
          created_at: string
          created_by: string | null
          data_source: string
          description: string | null
          filters_config: Json | null
          id: string
          is_public: boolean | null
          is_scheduled: boolean | null
          name: string
          recipients_json: Json | null
          report_type: string
          schedule_cron: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          chart_config?: Json | null
          columns_config?: Json | null
          created_at?: string
          created_by?: string | null
          data_source: string
          description?: string | null
          filters_config?: Json | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          name: string
          recipients_json?: Json | null
          report_type: string
          schedule_cron?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          chart_config?: Json | null
          columns_config?: Json | null
          created_at?: string
          created_by?: string | null
          data_source?: string
          description?: string | null
          filters_config?: Json | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          name?: string
          recipients_json?: Json | null
          report_type?: string
          schedule_cron?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_address_book: {
        Row: {
          address_quality: string | null
          city: string
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          customer_id: string
          email: string | null
          house_number: string | null
          id: string
          is_delivery_default: boolean | null
          is_pickup_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          postal_code: string | null
          street: string
          tenant_id: string | null
          updated_at: string
          use_count: number | null
        }
        Insert: {
          address_quality?: string | null
          city: string
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_id: string
          email?: string | null
          house_number?: string | null
          id?: string
          is_delivery_default?: boolean | null
          is_pickup_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          street: string
          tenant_id?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          address_quality?: string | null
          city?: string
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_id?: string
          email?: string | null
          house_number?: string | null
          id?: string
          is_delivery_default?: boolean | null
          is_pickup_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          street?: string
          tenant_id?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_address_book_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_address_book_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_address_book_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          customer_id: string
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          customer_id: string
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          customer_id?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_booking_templates: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          payload_json: Json
          tenant_id: string | null
          updated_at: string
          use_count: number | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          payload_json?: Json
          tenant_id?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          payload_json?: Json
          tenant_id?: string | null
          updated_at?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_booking_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_booking_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_booking_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_locations: {
        Row: {
          access_notes: string | null
          address_line: string
          city: string
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          customer_id: string
          default_instructions: string | null
          house_number: string | null
          id: string
          is_favorite: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          postcode: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_notes?: string | null
          address_line: string
          city: string
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          customer_id: string
          default_instructions?: string | null
          house_number?: string | null
          id?: string
          is_favorite?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          postcode: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_notes?: string | null
          address_line?: string
          city?: string
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string
          default_instructions?: string | null
          house_number?: string | null
          id?: string
          is_favorite?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          postcode?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          customer_id: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          notification_type: string
          read_at: string | null
          tenant_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          read_at?: string | null
          tenant_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          read_at?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_audit_log: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          customer_id: string | null
          diff_json: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          diff_json?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          diff_json?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_settings: {
        Row: {
          allow_customer_chat: boolean | null
          attach_documents_to_invoice: boolean | null
          auto_send_tracking: boolean | null
          auto_waiting_enabled: boolean | null
          checkout_mode: string | null
          clickops_enabled: boolean | null
          created_at: string
          customer_can_cancel: boolean | null
          customer_can_request_changes: boolean | null
          customer_can_view_invoices: boolean | null
          customer_id: string
          default_product_id: string | null
          delivery_confirmation_enabled: boolean | null
          delivery_confirmation_per_stop: boolean | null
          delivery_confirmation_recipients: string[] | null
          id: string
          messenger_enabled: boolean | null
          pricing_visible_to_customer: boolean | null
          special_rates: Json | null
          tenant_id: string
          tracking_share_link_enabled: boolean | null
          updated_at: string
          waiting_grace_minutes: number | null
          waiting_max_minutes: number | null
          waiting_rounding_rule: string | null
          waiting_time_visible_to_customer: boolean | null
        }
        Insert: {
          allow_customer_chat?: boolean | null
          attach_documents_to_invoice?: boolean | null
          auto_send_tracking?: boolean | null
          auto_waiting_enabled?: boolean | null
          checkout_mode?: string | null
          clickops_enabled?: boolean | null
          created_at?: string
          customer_can_cancel?: boolean | null
          customer_can_request_changes?: boolean | null
          customer_can_view_invoices?: boolean | null
          customer_id: string
          default_product_id?: string | null
          delivery_confirmation_enabled?: boolean | null
          delivery_confirmation_per_stop?: boolean | null
          delivery_confirmation_recipients?: string[] | null
          id?: string
          messenger_enabled?: boolean | null
          pricing_visible_to_customer?: boolean | null
          special_rates?: Json | null
          tenant_id: string
          tracking_share_link_enabled?: boolean | null
          updated_at?: string
          waiting_grace_minutes?: number | null
          waiting_max_minutes?: number | null
          waiting_rounding_rule?: string | null
          waiting_time_visible_to_customer?: boolean | null
        }
        Update: {
          allow_customer_chat?: boolean | null
          attach_documents_to_invoice?: boolean | null
          auto_send_tracking?: boolean | null
          auto_waiting_enabled?: boolean | null
          checkout_mode?: string | null
          clickops_enabled?: boolean | null
          created_at?: string
          customer_can_cancel?: boolean | null
          customer_can_request_changes?: boolean | null
          customer_can_view_invoices?: boolean | null
          customer_id?: string
          default_product_id?: string | null
          delivery_confirmation_enabled?: boolean | null
          delivery_confirmation_per_stop?: boolean | null
          delivery_confirmation_recipients?: string[] | null
          id?: string
          messenger_enabled?: boolean | null
          pricing_visible_to_customer?: boolean | null
          special_rates?: Json | null
          tenant_id?: string
          tracking_share_link_enabled?: boolean | null
          updated_at?: string
          waiting_grace_minutes?: number | null
          waiting_max_minutes?: number | null
          waiting_rounding_rule?: string | null
          waiting_time_visible_to_customer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_settings_default_product_id_fkey"
            columns: ["default_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sla_targets: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          delivery_time_buffer_minutes: number | null
          id: string
          is_active: boolean | null
          max_waiting_minutes: number | null
          otif_target_percentage: number | null
          pickup_time_buffer_minutes: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          delivery_time_buffer_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_waiting_minutes?: number | null
          otif_target_percentage?: number | null
          pickup_time_buffer_minutes?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          delivery_time_buffer_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_waiting_minutes?: number | null
          otif_target_percentage?: number | null
          pickup_time_buffer_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sla_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sla_targets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sla_targets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          carrier_id: string | null
          converted_trip_id: string | null
          created_at: string
          customer_id: string
          delivery_address: string
          delivery_city: string
          delivery_company: string
          delivery_contact_person: string | null
          delivery_country: string | null
          delivery_date: string | null
          delivery_email: string | null
          delivery_flexible: boolean | null
          delivery_phone: string | null
          delivery_postal_code: string | null
          delivery_time_from: string | null
          delivery_time_to: string | null
          distance_km: number | null
          estimated_price: number | null
          house_number_delivery: string | null
          house_number_pickup: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          pickup_address: string
          pickup_city: string
          pickup_company: string
          pickup_contact_person: string | null
          pickup_country: string | null
          pickup_date: string
          pickup_email: string | null
          pickup_flexible: boolean | null
          pickup_phone: string | null
          pickup_postal_code: string | null
          pickup_time_from: string | null
          pickup_time_to: string | null
          product_description: string | null
          product_id: string | null
          quantity: number | null
          reference_number: string | null
          rejection_reason: string | null
          service_type: string | null
          special_instructions: string | null
          status: string
          updated_at: string
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          carrier_id?: string | null
          converted_trip_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address: string
          delivery_city: string
          delivery_company: string
          delivery_contact_person?: string | null
          delivery_country?: string | null
          delivery_date?: string | null
          delivery_email?: string | null
          delivery_flexible?: boolean | null
          delivery_phone?: string | null
          delivery_postal_code?: string | null
          delivery_time_from?: string | null
          delivery_time_to?: string | null
          distance_km?: number | null
          estimated_price?: number | null
          house_number_delivery?: string | null
          house_number_pickup?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          pickup_address: string
          pickup_city: string
          pickup_company: string
          pickup_contact_person?: string | null
          pickup_country?: string | null
          pickup_date: string
          pickup_email?: string | null
          pickup_flexible?: boolean | null
          pickup_phone?: string | null
          pickup_postal_code?: string | null
          pickup_time_from?: string | null
          pickup_time_to?: string | null
          product_description?: string | null
          product_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          rejection_reason?: string | null
          service_type?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          carrier_id?: string | null
          converted_trip_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string
          delivery_city?: string
          delivery_company?: string
          delivery_contact_person?: string | null
          delivery_country?: string | null
          delivery_date?: string | null
          delivery_email?: string | null
          delivery_flexible?: boolean | null
          delivery_phone?: string | null
          delivery_postal_code?: string | null
          delivery_time_from?: string | null
          delivery_time_to?: string | null
          distance_km?: number | null
          estimated_price?: number | null
          house_number_delivery?: string | null
          house_number_pickup?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          pickup_address?: string
          pickup_city?: string
          pickup_company?: string
          pickup_contact_person?: string | null
          pickup_country?: string | null
          pickup_date?: string
          pickup_email?: string | null
          pickup_flexible?: boolean | null
          pickup_phone?: string | null
          pickup_postal_code?: string | null
          pickup_time_from?: string | null
          pickup_time_to?: string | null
          product_description?: string | null
          product_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          rejection_reason?: string | null
          service_type?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_submissions_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_converted_trip_id_fkey"
            columns: ["converted_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          auto_invoice_enabled: boolean | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          credit_blocked: boolean | null
          credit_blocked_reason: string | null
          credit_limit: number | null
          customer_number: number
          deleted_at: string | null
          email: string | null
          feature_overrides: Json | null
          first_login_at: string | null
          hide_destinations: boolean | null
          id: string
          invoice_notes: string | null
          invoice_per_order: boolean | null
          invoice_type: string | null
          is_active: boolean | null
          notes: string | null
          onboarding_completed: boolean | null
          payment_method: string | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          send_invoice_digitally: boolean | null
          settings_json: Json | null
          show_only_subtotals: boolean | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          auto_invoice_enabled?: boolean | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_blocked?: boolean | null
          credit_blocked_reason?: string | null
          credit_limit?: number | null
          customer_number?: number
          deleted_at?: string | null
          email?: string | null
          feature_overrides?: Json | null
          first_login_at?: string | null
          hide_destinations?: boolean | null
          id?: string
          invoice_notes?: string | null
          invoice_per_order?: boolean | null
          invoice_type?: string | null
          is_active?: boolean | null
          notes?: string | null
          onboarding_completed?: boolean | null
          payment_method?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          send_invoice_digitally?: boolean | null
          settings_json?: Json | null
          show_only_subtotals?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          auto_invoice_enabled?: boolean | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_blocked?: boolean | null
          credit_blocked_reason?: string | null
          credit_limit?: number | null
          customer_number?: number
          deleted_at?: string | null
          email?: string | null
          feature_overrides?: Json | null
          first_login_at?: string | null
          hide_destinations?: boolean | null
          id?: string
          invoice_notes?: string | null
          invoice_per_order?: boolean | null
          invoice_type?: string | null
          is_active?: boolean | null
          notes?: string | null
          onboarding_completed?: boolean | null
          payment_method?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          send_invoice_digitally?: boolean | null
          settings_json?: Json | null
          show_only_subtotals?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_declarations: {
        Row: {
          commodity_codes: string[] | null
          created_at: string | null
          customs_office_departure: string | null
          customs_office_destination: string | null
          declaration_data_json: Json | null
          declaration_type: string
          documents_json: Json | null
          goods_description: string | null
          gross_weight_kg: number | null
          id: string
          lrn: string | null
          mrn: string | null
          order_id: string | null
          released_at: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string
          total_packages: number | null
          updated_at: string | null
        }
        Insert: {
          commodity_codes?: string[] | null
          created_at?: string | null
          customs_office_departure?: string | null
          customs_office_destination?: string | null
          declaration_data_json?: Json | null
          declaration_type: string
          documents_json?: Json | null
          goods_description?: string | null
          gross_weight_kg?: number | null
          id?: string
          lrn?: string | null
          mrn?: string | null
          order_id?: string | null
          released_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id: string
          total_packages?: number | null
          updated_at?: string | null
        }
        Update: {
          commodity_codes?: string[] | null
          created_at?: string | null
          customs_office_departure?: string | null
          customs_office_destination?: string | null
          declaration_data_json?: Json | null
          declaration_type?: string
          documents_json?: Json | null
          goods_description?: string | null
          gross_weight_kg?: number | null
          id?: string
          lrn?: string | null
          mrn?: string | null
          order_id?: string | null
          released_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          total_packages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_declarations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_declarations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_lines: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string | null
          cycle_count_id: string
          expected_quantity: number | null
          id: string
          inventory_id: string | null
          location_id: string
          notes: string | null
          product_id: string
          status: string | null
          variance: number | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id: string
          expected_quantity?: number | null
          id?: string
          inventory_id?: string | null
          location_id: string
          notes?: string | null
          product_id: string
          status?: string | null
          variance?: number | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string | null
          cycle_count_id?: string
          expected_quantity?: number | null
          id?: string
          inventory_id?: string | null
          location_id?: string
          notes?: string | null
          product_id?: string
          status?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_lines_cycle_count_id_fkey"
            columns: ["cycle_count_id"]
            isOneToOne: false
            referencedRelation: "cycle_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_lines_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_counts: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          count_number: string
          count_type: string | null
          created_at: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          warehouse_id: string
          zone_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          count_number: string
          count_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          warehouse_id: string
          zone_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          count_number?: string
          count_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          warehouse_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_counts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_report_photos: {
        Row: {
          caption: string | null
          created_at: string
          damage_report_id: string
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          damage_report_id: string
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          damage_report_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_report_photos_damage_report_id_fkey"
            columns: ["damage_report_id"]
            isOneToOne: false
            referencedRelation: "damage_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_reports: {
        Row: {
          created_at: string
          damage_type: string
          description: string
          driver_id: string
          id: string
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          police_report_number: string | null
          report_date: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          tenant_id: string | null
          third_party_details: string | null
          third_party_involved: boolean | null
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          damage_type: string
          description: string
          driver_id: string
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          police_report_number?: string | null
          report_date?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          third_party_details?: string | null
          third_party_involved?: boolean | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          damage_type?: string
          description?: string
          driver_id?: string
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          police_report_number?: string | null
          report_date?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          third_party_details?: string | null
          third_party_involved?: boolean | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_provenance: {
        Row: {
          entity_id: string
          entity_type: Database["public"]["Enums"]["staging_entity_type"]
          id: string
          imported_at: string
          imported_by: string | null
          mapping_profile_version: number | null
          source_batch_id: string | null
          source_hash: string | null
          source_primary_key: string | null
          source_system: Database["public"]["Enums"]["migration_source_system"]
          tenant_id: string
        }
        Insert: {
          entity_id: string
          entity_type: Database["public"]["Enums"]["staging_entity_type"]
          id?: string
          imported_at?: string
          imported_by?: string | null
          mapping_profile_version?: number | null
          source_batch_id?: string | null
          source_hash?: string | null
          source_primary_key?: string | null
          source_system: Database["public"]["Enums"]["migration_source_system"]
          tenant_id: string
        }
        Update: {
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["staging_entity_type"]
          id?: string
          imported_at?: string
          imported_by?: string | null
          mapping_profile_version?: number | null
          source_batch_id?: string | null
          source_hash?: string | null
          source_primary_key?: string | null
          source_system?: Database["public"]["Enums"]["migration_source_system"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_provenance_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_provenance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_options: {
        Row: {
          access_code: string | null
          call_before_arrival: boolean | null
          created_at: string | null
          id: string
          instructions: string | null
          neighbor_allowed: boolean | null
          safe_drop_allowed: boolean | null
          shipment_id: string
          stop_id: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_code?: string | null
          call_before_arrival?: boolean | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          neighbor_allowed?: boolean | null
          safe_drop_allowed?: boolean | null
          shipment_id: string
          stop_id?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_code?: string | null
          call_before_arrival?: boolean | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          neighbor_allowed?: boolean | null
          safe_drop_allowed?: boolean | null
          shipment_id?: string
          stop_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_options_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_options_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_anomalies: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          anomaly_type: string
          created_at: string
          description: string | null
          detected_at: string
          deviation: Json | null
          id: string
          possible_causes: string[] | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          suggested_action: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type: string
          created_at?: string
          description?: string | null
          detected_at?: string
          deviation?: Json | null
          id?: string
          possible_causes?: string[] | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          suggested_action?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          deviation?: Json | null
          id?: string
          possible_causes?: string[] | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          suggested_action?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_anomalies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_pods: {
        Row: {
          created_at: string | null
          created_by: string | null
          damage_description: string | null
          damage_photo_urls: string[] | null
          damage_reported: boolean | null
          device_info_json: Json | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          notes: string | null
          order_id: string
          photo_urls: string[] | null
          pod_type: string | null
          recipient_name: string | null
          recipient_signature_url: string | null
          signature_timestamp: string | null
          stop_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          damage_description?: string | null
          damage_photo_urls?: string[] | null
          damage_reported?: boolean | null
          device_info_json?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          notes?: string | null
          order_id: string
          photo_urls?: string[] | null
          pod_type?: string | null
          recipient_name?: string | null
          recipient_signature_url?: string | null
          signature_timestamp?: string | null
          stop_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          damage_description?: string | null
          damage_photo_urls?: string[] | null
          damage_reported?: boolean | null
          device_info_json?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          photo_urls?: string[] | null
          pod_type?: string | null
          recipient_name?: string | null
          recipient_signature_url?: string | null
          signature_timestamp?: string | null
          stop_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_pods_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_pods_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_pods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_automation_config: {
        Row: {
          created_at: string | null
          double_check_enabled: boolean | null
          fallback_to_manual: boolean | null
          id: string
          is_active: boolean | null
          max_drivers_per_trip: number | null
          min_confidence_auto_assign: number | null
          min_confidence_auto_send: number | null
          notification_channels: string[] | null
          response_timeout_minutes: number | null
          tenant_id: string
          updated_at: string | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          created_at?: string | null
          double_check_enabled?: boolean | null
          fallback_to_manual?: boolean | null
          id?: string
          is_active?: boolean | null
          max_drivers_per_trip?: number | null
          min_confidence_auto_assign?: number | null
          min_confidence_auto_send?: number | null
          notification_channels?: string[] | null
          response_timeout_minutes?: number | null
          tenant_id: string
          updated_at?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          created_at?: string | null
          double_check_enabled?: boolean | null
          fallback_to_manual?: boolean | null
          id?: string
          is_active?: boolean | null
          max_drivers_per_trip?: number | null
          min_confidence_auto_assign?: number | null
          min_confidence_auto_send?: number | null
          notification_channels?: string[] | null
          response_timeout_minutes?: number | null
          tenant_id?: string
          updated_at?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_automation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_conversations: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          auto_assigned: boolean | null
          confirmed_at: string | null
          created_at: string | null
          driver_id: string
          expires_at: string | null
          id: string
          initiated_at: string | null
          priority_score: number | null
          responded_at: string | null
          status: string
          tenant_id: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          auto_assigned?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          driver_id: string
          expires_at?: string | null
          id?: string
          initiated_at?: string | null
          priority_score?: number | null
          responded_at?: string | null
          status?: string
          tenant_id: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          auto_assigned?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          driver_id?: string
          expires_at?: string | null
          id?: string
          initiated_at?: string | null
          priority_score?: number | null
          responded_at?: string | null
          status?: string
          tenant_id?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_conversations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_conversations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_conversations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_messages: {
        Row: {
          ai_interpretation: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          id: string
          message_type: string
          read_at: string | null
          requires_followup: boolean | null
          sentiment: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          ai_interpretation?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          message_type?: string
          read_at?: string | null
          requires_followup?: boolean | null
          sentiment?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          ai_interpretation?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          message_type?: string
          read_at?: string | null
          requires_followup?: boolean | null
          sentiment?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dispatch_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_notifications: {
        Row: {
          company_id: string
          created_at: string
          dispatch_id: string
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          dispatch_id: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          dispatch_id?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_notifications_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "intercompany_dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_plan_revisions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          created_at: string
          diff_json: Json
          id: string
          impact_summary: Json | null
          plan_id: string
          reason: string
          revision_number: number
          status: Database["public"]["Enums"]["plan_revision_status"]
          trigger_entity_id: string | null
          trigger_type: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          diff_json?: Json
          id?: string
          impact_summary?: Json | null
          plan_id: string
          reason: string
          revision_number?: number
          status?: Database["public"]["Enums"]["plan_revision_status"]
          trigger_entity_id?: string | null
          trigger_type: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          diff_json?: Json
          id?: string
          impact_summary?: Json | null
          plan_id?: string
          reason?: string
          revision_number?: number
          status?: Database["public"]["Enums"]["plan_revision_status"]
          trigger_entity_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_plan_revisions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dispatch_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_plans: {
        Row: {
          assignments_json: Json | null
          constraints_json: Json | null
          created_at: string
          created_by: string | null
          id: string
          metrics_json: Json | null
          plan_date: string
          status: Database["public"]["Enums"]["dispatch_plan_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignments_json?: Json | null
          constraints_json?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metrics_json?: Json | null
          plan_date: string
          status?: Database["public"]["Enums"]["dispatch_plan_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignments_json?: Json | null
          constraints_json?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metrics_json?: Json | null
          plan_date?: string
          status?: Database["public"]["Enums"]["dispatch_plan_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_scoring_log: {
        Row: {
          ai_confidence: number | null
          availability_score: number | null
          created_at: string | null
          distance_score: number | null
          driver_id: string
          history_score: number | null
          id: string
          overall_score: number
          rating_score: number | null
          scoring_factors: Json | null
          trip_id: string
          workload_score: number | null
        }
        Insert: {
          ai_confidence?: number | null
          availability_score?: number | null
          created_at?: string | null
          distance_score?: number | null
          driver_id: string
          history_score?: number | null
          id?: string
          overall_score: number
          rating_score?: number | null
          scoring_factors?: Json | null
          trip_id: string
          workload_score?: number | null
        }
        Update: {
          ai_confidence?: number | null
          availability_score?: number | null
          created_at?: string | null
          distance_score?: number | null
          driver_id?: string
          history_score?: number | null
          id?: string
          overall_score?: number
          rating_score?: number | null
          scoring_factors?: Json | null
          trip_id?: string
          workload_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_scoring_log_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_scoring_log_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_scoring_log_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          dispute_id: string
          id: string
          message: string
          sender_id: string | null
          sender_name: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          dispute_id: string
          id?: string
          message: string
          sender_id?: string | null
          sender_name?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          dispute_id?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "freight_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content_html: string
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          template_type: string
          tenant_id: string
          updated_at: string
          variables_schema: Json | null
        }
        Insert: {
          content_html: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          template_type: string
          tenant_id: string
          updated_at?: string
          variables_schema?: Json | null
        }
        Update: {
          content_html?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          template_type?: string
          tenant_id?: string
          updated_at?: string
          variables_schema?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verification_notifications: {
        Row: {
          delivery_method: string[] | null
          document_id: string
          id: string
          notification_type: string
          sent_at: string | null
          user_id: string
          was_read: boolean | null
        }
        Insert: {
          delivery_method?: string[] | null
          document_id: string
          id?: string
          notification_type: string
          sent_at?: string | null
          user_id: string
          was_read?: boolean | null
        }
        Update: {
          delivery_method?: string[] | null
          document_id?: string
          id?: string
          notification_type?: string
          sent_at?: string | null
          user_id?: string
          was_read?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "document_verification_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "driver_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          created_by_user_id: string | null
          event_type: string
          event_version: number
          id: string
          idempotency_key: string | null
          payload_json: Json
          stream_id: string
          stream_type: string
          tenant_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          event_type: string
          event_version?: number
          id?: string
          idempotency_key?: string | null
          payload_json?: Json
          stream_id: string
          stream_type: string
          tenant_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          event_type?: string
          event_version?: number
          id?: string
          idempotency_key?: string | null
          payload_json?: Json
          stream_id?: string
          stream_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_documents: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          doc_type: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          hash: string | null
          id: string
          locked_after_signature: boolean
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          doc_type: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          hash?: string | null
          id?: string
          locked_after_signature?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          hash?: string | null
          id?: string
          locked_after_signature?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dossier_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availability: {
        Row: {
          created_at: string
          date: string
          driver_id: string
          end_time: string | null
          id: string
          is_available: boolean | null
          max_distance_km: number | null
          notes: string | null
          preferred_regions: string[] | null
          preferred_vehicle_types: string[] | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          driver_id: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          max_distance_km?: number | null
          notes?: string | null
          preferred_regions?: string[] | null
          preferred_vehicle_types?: string[] | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          driver_id?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          max_distance_km?: number | null
          notes?: string | null
          preferred_regions?: string[] | null
          preferred_vehicle_types?: string[] | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_breaks: {
        Row: {
          break_end: string | null
          break_start: string
          break_type: string
          created_at: string
          driver_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          tenant_id: string | null
          trip_id: string | null
        }
        Insert: {
          break_end?: string | null
          break_start?: string
          break_type?: string
          created_at?: string
          driver_id: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          tenant_id?: string | null
          trip_id?: string | null
        }
        Update: {
          break_end?: string | null
          break_start?: string
          break_type?: string
          created_at?: string
          driver_id?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          tenant_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_breaks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_breaks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_document_access_log: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          document_name: string | null
          document_type: string
          driver_user_id: string
          id: string
          trip_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          document_name?: string | null
          document_type: string
          driver_user_id: string
          id?: string
          trip_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          document_name?: string | null
          document_type?: string
          driver_user_id?: string
          id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_document_access_log_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          admin_review_required: boolean | null
          ai_analysis_json: Json | null
          ai_analyzed_at: string | null
          ai_confidence_score: number | null
          ai_detected_expiry: string | null
          ai_quality_issues: string[] | null
          created_at: string
          document_number: string | null
          document_type: Database["public"]["Enums"]["driver_document_type"]
          expiry_date: string | null
          file_name: string | null
          file_url: string
          id: string
          priority_level: string | null
          rejection_reason: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["document_verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_review_required?: boolean | null
          ai_analysis_json?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence_score?: number | null
          ai_detected_expiry?: string | null
          ai_quality_issues?: string[] | null
          created_at?: string
          document_number?: string | null
          document_type: Database["public"]["Enums"]["driver_document_type"]
          expiry_date?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          priority_level?: string | null
          rejection_reason?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_review_required?: boolean | null
          ai_analysis_json?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence_score?: number | null
          ai_detected_expiry?: string | null
          ai_quality_issues?: string[] | null
          created_at?: string
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          priority_level?: string | null
          rejection_reason?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      driver_emergency_contacts: {
        Row: {
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          currency: string
          description: string | null
          driver_id: string
          expense_date: string
          id: string
          receipt_url: string | null
          status: string
          tenant_id: string
          trip_id: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: string
          description?: string | null
          driver_id: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string
          tenant_id: string
          trip_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: string
          description?: string | null
          driver_id?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string
          tenant_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_expenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_expenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
          trip_id: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed?: number | null
          trip_id?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_onboarding: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          step_app_installed: boolean | null
          step_bank_details: boolean | null
          step_contract_signed: boolean | null
          step_documents_uploaded: boolean | null
          step_personal_info: boolean | null
          step_training_completed: boolean | null
          step_vehicle_assigned: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          step_app_installed?: boolean | null
          step_bank_details?: boolean | null
          step_contract_signed?: boolean | null
          step_documents_uploaded?: boolean | null
          step_personal_info?: boolean | null
          step_training_completed?: boolean | null
          step_vehicle_assigned?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          step_app_installed?: boolean | null
          step_bank_details?: boolean | null
          step_contract_signed?: boolean | null
          step_documents_uploaded?: boolean | null
          step_personal_info?: boolean | null
          step_training_completed?: boolean | null
          step_vehicle_assigned?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_preferences: {
        Row: {
          analytics_enabled: boolean
          created_at: string
          email_notifications: boolean
          id: string
          languages: string[] | null
          location_sharing: boolean
          max_distance_km: number | null
          preferred_regions: string[] | null
          profile_visible: boolean
          reminders_before_departure: boolean
          updated_at: string
          user_id: string
          vehicle_types: string[] | null
        }
        Insert: {
          analytics_enabled?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          languages?: string[] | null
          location_sharing?: boolean
          max_distance_km?: number | null
          preferred_regions?: string[] | null
          profile_visible?: boolean
          reminders_before_departure?: boolean
          updated_at?: string
          user_id: string
          vehicle_types?: string[] | null
        }
        Update: {
          analytics_enabled?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          languages?: string[] | null
          location_sharing?: boolean
          max_distance_km?: number | null
          preferred_regions?: string[] | null
          profile_visible?: boolean
          reminders_before_departure?: boolean
          updated_at?: string
          user_id?: string
          vehicle_types?: string[] | null
        }
        Relationships: []
      }
      driver_scores: {
        Row: {
          completion_rate: number | null
          created_at: string
          driver_id: string
          early_cancel_count: number | null
          id: string
          is_standby: boolean | null
          late_arrival_count: number | null
          no_show_count: number | null
          on_time_last_30_days: number | null
          overall_score: number | null
          punctuality_score: number | null
          reliability_score: number | null
          shifts_last_30_days: number | null
          standby_regions: string[] | null
          total_shifts_assigned: number | null
          total_shifts_completed: number | null
          updated_at: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string
          driver_id: string
          early_cancel_count?: number | null
          id?: string
          is_standby?: boolean | null
          late_arrival_count?: number | null
          no_show_count?: number | null
          on_time_last_30_days?: number | null
          overall_score?: number | null
          punctuality_score?: number | null
          reliability_score?: number | null
          shifts_last_30_days?: number | null
          standby_regions?: string[] | null
          total_shifts_assigned?: number | null
          total_shifts_completed?: number | null
          updated_at?: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string
          driver_id?: string
          early_cancel_count?: number | null
          id?: string
          is_standby?: boolean | null
          late_arrival_count?: number | null
          no_show_count?: number | null
          on_time_last_30_days?: number | null
          overall_score?: number | null
          punctuality_score?: number | null
          reliability_score?: number | null
          shifts_last_30_days?: number | null
          standby_regions?: string[] | null
          total_shifts_assigned?: number | null
          total_shifts_completed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          adr_expiry: string | null
          cpc_expiry: string | null
          created_at: string
          current_city: string | null
          date_of_birth: string | null
          deleted_at: string | null
          driver_category: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          is_zzp: boolean | null
          license_expiry: string | null
          license_number: string | null
          name: string
          notes: string | null
          on_time_percentage: number | null
          onboarding_completed_at: string | null
          phone: string | null
          profile_photo_url: string | null
          rating: number | null
          status: string
          tenant_id: string | null
          total_trips: number | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          adr_expiry?: string | null
          cpc_expiry?: string | null
          created_at?: string
          current_city?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          driver_category?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          is_zzp?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          name: string
          notes?: string | null
          on_time_percentage?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          status?: string
          tenant_id?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          adr_expiry?: string | null
          cpc_expiry?: string | null
          created_at?: string
          current_city?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          driver_category?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          is_zzp?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          name?: string
          notes?: string | null
          on_time_percentage?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          status?: string
          tenant_id?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driving_time_logs: {
        Row: {
          auto_detected: boolean
          created_at: string
          driver_id: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          log_type: Database["public"]["Enums"]["driving_log_type"]
          started_at: string
          tenant_id: string
          trip_id: string | null
        }
        Insert: {
          auto_detected?: boolean
          created_at?: string
          driver_id: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          log_type: Database["public"]["Enums"]["driving_log_type"]
          started_at?: string
          tenant_id: string
          trip_id?: string | null
        }
        Update: {
          auto_detected?: boolean
          created_at?: string
          driver_id?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          log_type?: Database["public"]["Enums"]["driving_log_type"]
          started_at?: string
          tenant_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driving_time_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_time_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_time_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_time_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      dual_run_syncs: {
        Row: {
          backlog_count: number | null
          created_at: string
          id: string
          last_delta_at: string | null
          last_error: string | null
          project_id: string
          schedule_json: Json | null
          status: Database["public"]["Enums"]["dual_run_status"]
          updated_at: string
        }
        Insert: {
          backlog_count?: number | null
          created_at?: string
          id?: string
          last_delta_at?: string | null
          last_error?: string | null
          project_id: string
          schedule_json?: Json | null
          status?: Database["public"]["Enums"]["dual_run_status"]
          updated_at?: string
        }
        Update: {
          backlog_count?: number | null
          created_at?: string
          id?: string
          last_delta_at?: string | null
          last_error?: string | null
          project_id?: string
          schedule_json?: Json | null
          status?: Database["public"]["Enums"]["dual_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dual_run_syncs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_candidates: {
        Row: {
          confidence: number
          created_at: string
          entity_id_a: string
          entity_id_b: string
          entity_type: string
          id: string
          match_reasons: Json | null
          merged_to_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          entity_id_a: string
          entity_id_b: string
          entity_type: string
          id?: string
          match_reasons?: Json | null
          merged_to_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entity_id_a?: string
          entity_id_b?: string
          entity_type?: string
          id?: string
          match_reasons?: Json | null
          merged_to_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_connections: {
        Row: {
          access_token_encrypted: string | null
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          platform: string
          settings_json: Json | null
          store_name: string
          store_url: string
          sync_error: string | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform: string
          settings_json?: Json | null
          store_name: string
          store_url: string
          sync_error?: string | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: string
          settings_json?: Json | null
          store_name?: string
          store_url?: string
          sync_error?: string | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_orders: {
        Row: {
          billing_address_json: Json | null
          connection_id: string
          conversion_status: string | null
          converted_to_trip_id: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          external_order_id: string
          external_order_number: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          imported_at: string
          line_items_json: Json
          notes: string | null
          order_date: string
          order_status: string
          platform: string
          shipping_address_json: Json | null
          shipping_cost: number | null
          subtotal: number | null
          tags: string[] | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          billing_address_json?: Json | null
          connection_id: string
          conversion_status?: string | null
          converted_to_trip_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_order_id: string
          external_order_number?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          imported_at?: string
          line_items_json?: Json
          notes?: string | null
          order_date: string
          order_status: string
          platform: string
          shipping_address_json?: Json | null
          shipping_cost?: number | null
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tenant_id: string
          total_amount: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          billing_address_json?: Json | null
          connection_id?: string
          conversion_status?: string | null
          converted_to_trip_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_order_id?: string
          external_order_number?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          imported_at?: string
          line_items_json?: Json
          notes?: string | null
          order_date?: string
          order_status?: string
          platform?: string
          shipping_address_json?: Json | null
          shipping_cost?: number | null
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_converted_to_trip_id_fkey"
            columns: ["converted_to_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          errors_json: Json | null
          id: string
          orders_created: number | null
          orders_fetched: number | null
          orders_skipped: number | null
          orders_updated: number | null
          started_at: string
          status: string | null
          sync_type: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          errors_json?: Json | null
          id?: string
          orders_created?: number | null
          orders_fetched?: number | null
          orders_skipped?: number | null
          orders_updated?: number | null
          started_at?: string
          status?: string | null
          sync_type: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          errors_json?: Json | null
          id?: string
          orders_created?: number | null
          orders_fetched?: number | null
          orders_skipped?: number | null
          orders_updated?: number | null
          started_at?: string
          status?: string | null
          sync_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      edi_messages: {
        Row: {
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          message_type: string
          parsed_json: Json | null
          partner_id: string | null
          partner_name: string | null
          processed_at: string | null
          raw_content: string | null
          related_order_id: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          message_type: string
          parsed_json?: Json | null
          partner_id?: string | null
          partner_name?: string | null
          processed_at?: string | null
          raw_content?: string | null
          related_order_id?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          message_type?: string
          parsed_json?: Json | null
          partner_id?: string | null
          partner_name?: string | null
          processed_at?: string | null
          raw_content?: string | null
          related_order_id?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edi_messages_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edi_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_domains: {
        Row: {
          created_at: string | null
          dns_records: Json | null
          domain: string
          id: string
          resend_domain_id: string | null
          sender_email: string
          sender_name: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_records?: Json | null
          domain: string
          id?: string
          resend_domain_id?: string | null
          sender_email: string
          sender_name?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_records?: Json | null
          domain?: string
          id?: string
          resend_domain_id?: string | null
          sender_email?: string
          sender_name?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingest_queue: {
        Row: {
          company_id: string
          created_at: string
          created_order_id: string | null
          error_message: string | null
          id: string
          parsed_data: Json | null
          processed_at: string | null
          raw_content: string | null
          received_at: string | null
          sender_email: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_order_id?: string | null
          error_message?: string | null
          id?: string
          parsed_data?: Json | null
          processed_at?: string | null
          raw_content?: string | null
          received_at?: string | null
          sender_email?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_order_id?: string | null
          error_message?: string | null
          id?: string
          parsed_data?: Json | null
          processed_at?: string | null
          raw_content?: string | null
          received_at?: string | null
          sender_email?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ingest_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ingest_queue_created_order_id_fkey"
            columns: ["created_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emission_records: {
        Row: {
          calculation_method: string | null
          co2_kg: number
          created_at: string
          distance_km: number
          emission_factor: number | null
          euro_class: string | null
          fuel_consumed_liters: number | null
          fuel_type: string | null
          id: string
          load_factor_percent: number | null
          nox_g: number | null
          pm_g: number | null
          record_date: string
          tenant_id: string
          trip_id: string | null
          vehicle_id: string | null
          verified: boolean | null
        }
        Insert: {
          calculation_method?: string | null
          co2_kg: number
          created_at?: string
          distance_km: number
          emission_factor?: number | null
          euro_class?: string | null
          fuel_consumed_liters?: number | null
          fuel_type?: string | null
          id?: string
          load_factor_percent?: number | null
          nox_g?: number | null
          pm_g?: number | null
          record_date: string
          tenant_id: string
          trip_id?: string | null
          vehicle_id?: string | null
          verified?: boolean | null
        }
        Update: {
          calculation_method?: string | null
          co2_kg?: number
          created_at?: string
          distance_km?: number
          emission_factor?: number | null
          euro_class?: string | null
          fuel_consumed_liters?: number | null
          fuel_type?: string | null
          id?: string
          load_factor_percent?: number | null
          nox_g?: number | null
          pm_g?: number | null
          record_date?: string
          tenant_id?: string
          trip_id?: string | null
          vehicle_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_records_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          ai_action_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          label: string
          note: string | null
          tenant_id: string
          url: string | null
        }
        Insert: {
          ai_action_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          label: string
          note?: string | null
          tenant_id: string
          url?: string | null
        }
        Update: {
          ai_action_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          label?: string
          note?: string | null
          tenant_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_ai_action_id_fkey"
            columns: ["ai_action_id"]
            isOneToOne: false
            referencedRelation: "ai_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          exception_id: string
          executed_at: string | null
          executed_by: string | null
          id: string
          result: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          exception_id: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          result?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          exception_id?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exception_actions_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "exception_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_cases: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          auto_detected: boolean | null
          company_id: string
          created_at: string
          description: string | null
          details: Json | null
          detected_at: string | null
          driver_id: string | null
          escalated_at: string | null
          escalation_level: number | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          id: string
          order_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["exception_severity"]
          status: Database["public"]["Enums"]["exception_status"]
          stop_id: string | null
          title: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_detected?: boolean | null
          company_id: string
          created_at?: string
          description?: string | null
          details?: Json | null
          detected_at?: string | null
          driver_id?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          id?: string
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["exception_severity"]
          status?: Database["public"]["Enums"]["exception_status"]
          stop_id?: string | null
          title: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          auto_detected?: boolean | null
          company_id?: string
          created_at?: string
          description?: string | null
          details?: Json | null
          detected_at?: string | null
          driver_id?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          exception_type?: Database["public"]["Enums"]["exception_type"]
          id?: string
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["exception_severity"]
          status?: Database["public"]["Enums"]["exception_status"]
          stop_id?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exception_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_cases_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_cases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_playbooks: {
        Row: {
          actions: Json
          auto_execute: boolean | null
          company_id: string
          created_at: string
          description: string | null
          escalation_delay_minutes: number | null
          exception_types: Database["public"]["Enums"]["exception_type"][]
          id: string
          is_active: boolean | null
          name: string
          severity_threshold:
            | Database["public"]["Enums"]["exception_severity"]
            | null
          updated_at: string
        }
        Insert: {
          actions: Json
          auto_execute?: boolean | null
          company_id: string
          created_at?: string
          description?: string | null
          escalation_delay_minutes?: number | null
          exception_types: Database["public"]["Enums"]["exception_type"][]
          id?: string
          is_active?: boolean | null
          name: string
          severity_threshold?:
            | Database["public"]["Enums"]["exception_severity"]
            | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          auto_execute?: boolean | null
          company_id?: string
          created_at?: string
          description?: string | null
          escalation_delay_minutes?: number | null
          exception_types?: Database["public"]["Enums"]["exception_type"][]
          id?: string
          is_active?: boolean | null
          name?: string
          severity_threshold?:
            | Database["public"]["Enums"]["exception_severity"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exception_playbooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number | null
          scopes: string[] | null
          tenant_id: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
          tenant_id: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
          tenant_id?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config_json: Json | null
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_alerts: {
        Row: {
          action_url: string | null
          alert_type: string
          company_id: string | null
          created_at: string
          data: Json | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          severity: string
          title: string
        }
        Insert: {
          action_url?: string | null
          alert_type: string
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          severity?: string
          title: string
        }
        Update: {
          action_url?: string | null
          alert_type?: string
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_goals: {
        Row: {
          company_id: string | null
          created_at: string
          current_value: number | null
          id: string
          is_active: boolean
          metric_key: string
          name: string
          period: string | null
          target_value: number
          unit: string | null
          updated_at: string
          warning_threshold: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean
          metric_key: string
          name: string
          period?: string | null
          target_value: number
          unit?: string | null
          updated_at?: string
          warning_threshold?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_active?: boolean
          metric_key?: string
          name?: string
          period?: string | null
          target_value?: number
          unit?: string | null
          updated_at?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_holds: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          escalated_at: string | null
          escalation_level: number | null
          hold_type: string
          id: string
          is_active: boolean | null
          owner_id: string | null
          reason: string
          reason_code: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          target_resolution_date: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          escalated_at?: string | null
          escalation_level?: number | null
          hold_type: string
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          reason: string
          reason_code?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          target_resolution_date?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          escalated_at?: string | null
          escalation_level?: number | null
          hold_type?: string
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          reason?: string
          reason_code?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          target_resolution_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_holds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_snapshots: {
        Row: {
          cash_position: number | null
          company_id: string | null
          costs_fuel: number | null
          costs_insurance: number | null
          costs_lease: number | null
          costs_maintenance: number | null
          costs_other: number | null
          costs_parking: number | null
          costs_subcontract: number | null
          costs_toll: number | null
          created_at: string
          dso_days: number | null
          fuel_per_100km: number | null
          gross_margin_pct: number | null
          gross_profit: number | null
          id: string
          km_driven: number | null
          net_margin_pct: number | null
          net_profit: number | null
          orders_count: number | null
          payables_total: number | null
          period_type: string
          receivables_overdue: number | null
          receivables_total: number | null
          revenue_other: number | null
          revenue_total: number | null
          revenue_transport: number | null
          revenue_waiting_time: number | null
          snapshot_date: string
        }
        Insert: {
          cash_position?: number | null
          company_id?: string | null
          costs_fuel?: number | null
          costs_insurance?: number | null
          costs_lease?: number | null
          costs_maintenance?: number | null
          costs_other?: number | null
          costs_parking?: number | null
          costs_subcontract?: number | null
          costs_toll?: number | null
          created_at?: string
          dso_days?: number | null
          fuel_per_100km?: number | null
          gross_margin_pct?: number | null
          gross_profit?: number | null
          id?: string
          km_driven?: number | null
          net_margin_pct?: number | null
          net_profit?: number | null
          orders_count?: number | null
          payables_total?: number | null
          period_type?: string
          receivables_overdue?: number | null
          receivables_total?: number | null
          revenue_other?: number | null
          revenue_total?: number | null
          revenue_transport?: number | null
          revenue_waiting_time?: number | null
          snapshot_date: string
        }
        Update: {
          cash_position?: number | null
          company_id?: string | null
          costs_fuel?: number | null
          costs_insurance?: number | null
          costs_lease?: number | null
          costs_maintenance?: number | null
          costs_other?: number | null
          costs_parking?: number | null
          costs_subcontract?: number | null
          costs_toll?: number | null
          created_at?: string
          dso_days?: number | null
          fuel_per_100km?: number | null
          gross_margin_pct?: number | null
          gross_profit?: number | null
          id?: string
          km_driven?: number | null
          net_margin_pct?: number | null
          net_profit?: number | null
          orders_count?: number | null
          payables_total?: number | null
          period_type?: string
          receivables_overdue?: number | null
          receivables_total?: number | null
          revenue_other?: number | null
          revenue_total?: number | null
          revenue_transport?: number | null
          revenue_waiting_time?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          billed_amount: number | null
          company_id: string | null
          cost_center: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          description: string | null
          document_name: string | null
          document_url: string | null
          driver_id: string | null
          external_id: string | null
          fuel_card_id: string | null
          fuel_type: string | null
          id: string
          import_method: Database["public"]["Enums"]["import_method"]
          invoice_id: string | null
          is_billable: boolean | null
          is_fraud_suspected: boolean | null
          is_outlier: boolean | null
          kwh: number | null
          liters: number | null
          location_address: string | null
          location_latitude: number | null
          location_longitude: number | null
          location_name: string | null
          needs_review: boolean | null
          odometer_reading: number | null
          order_id: string | null
          price_per_unit: number | null
          provider: Database["public"]["Enums"]["fuel_card_provider"] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          trip_id: string | null
          updated_at: string
          vat_amount: number | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          billed_amount?: number | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          driver_id?: string | null
          external_id?: string | null
          fuel_card_id?: string | null
          fuel_type?: string | null
          id?: string
          import_method?: Database["public"]["Enums"]["import_method"]
          invoice_id?: string | null
          is_billable?: boolean | null
          is_fraud_suspected?: boolean | null
          is_outlier?: boolean | null
          kwh?: number | null
          liters?: number | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          needs_review?: boolean | null
          odometer_reading?: number | null
          order_id?: string | null
          price_per_unit?: number | null
          provider?: Database["public"]["Enums"]["fuel_card_provider"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          trip_id?: string | null
          updated_at?: string
          vat_amount?: number | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          billed_amount?: number | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          driver_id?: string | null
          external_id?: string | null
          fuel_card_id?: string | null
          fuel_type?: string | null
          id?: string
          import_method?: Database["public"]["Enums"]["import_method"]
          invoice_id?: string | null
          is_billable?: boolean | null
          is_fraud_suspected?: boolean | null
          is_outlier?: boolean | null
          kwh?: number | null
          liters?: number | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          needs_review?: boolean | null
          odometer_reading?: number | null
          order_id?: string | null
          price_per_unit?: number | null
          provider?: Database["public"]["Enums"]["fuel_card_provider"] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["finance_transaction_type"]
          trip_id?: string | null
          updated_at?: string
          vat_amount?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_fuel_card_id_fkey"
            columns: ["fuel_card_id"]
            isOneToOne: false
            referencedRelation: "fuel_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_fuel_card_id_fkey"
            columns: ["fuel_card_id"]
            isOneToOne: false
            referencedRelation: "fuel_cards_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          created_at: string
          id: string
          metadata_json: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          signal_type: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_json?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata_json?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_audit_cases: {
        Row: {
          actual_amount: number | null
          auto_detected: boolean | null
          carrier_id: string | null
          case_type: Database["public"]["Enums"]["audit_case_type"]
          company_id: string
          created_at: string
          details: Json | null
          detected_at: string | null
          discrepancy_amount: number | null
          discrepancy_percentage: number | null
          expected_amount: number | null
          id: string
          order_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["audit_case_severity"]
          status: Database["public"]["Enums"]["audit_case_status"]
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          auto_detected?: boolean | null
          carrier_id?: string | null
          case_type: Database["public"]["Enums"]["audit_case_type"]
          company_id: string
          created_at?: string
          details?: Json | null
          detected_at?: string | null
          discrepancy_amount?: number | null
          discrepancy_percentage?: number | null
          expected_amount?: number | null
          id?: string
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["audit_case_severity"]
          status?: Database["public"]["Enums"]["audit_case_status"]
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          auto_detected?: boolean | null
          carrier_id?: string | null
          case_type?: Database["public"]["Enums"]["audit_case_type"]
          company_id?: string
          created_at?: string
          details?: Json | null
          detected_at?: string | null
          discrepancy_amount?: number | null
          discrepancy_percentage?: number | null
          expected_amount?: number | null
          id?: string
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["audit_case_severity"]
          status?: Database["public"]["Enums"]["audit_case_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_audit_cases_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_audit_cases_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_audit_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_audit_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_bookings: {
        Row: {
          agreed_price: number
          capacity_company_id: string
          capacity_listing_id: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string | null
          id: string
          load_company_id: string
          load_listing_id: string
          match_id: string | null
          payment_terms: string | null
          status: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          agreed_price: number
          capacity_company_id: string
          capacity_listing_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          load_company_id: string
          load_listing_id: string
          match_id?: string | null
          payment_terms?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          agreed_price?: number
          capacity_company_id?: string
          capacity_listing_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          load_company_id?: string
          load_listing_id?: string
          match_id?: string | null
          payment_terms?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_bookings_capacity_company_id_fkey"
            columns: ["capacity_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_capacity_listing_id_fkey"
            columns: ["capacity_listing_id"]
            isOneToOne: false
            referencedRelation: "freight_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_load_company_id_fkey"
            columns: ["load_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_load_listing_id_fkey"
            columns: ["load_listing_id"]
            isOneToOne: false
            referencedRelation: "freight_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "freight_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_disputes: {
        Row: {
          audit_case_id: string
          company_id: string
          created_at: string
          id: string
          opened_at: string | null
          opened_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          audit_case_id: string
          company_id: string
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          audit_case_id?: string
          company_id?: string
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_disputes_audit_case_id_fkey"
            columns: ["audit_case_id"]
            isOneToOne: false
            referencedRelation: "freight_audit_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_disputes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_listings: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          delivery_time_from: string | null
          delivery_time_until: string | null
          destination_address: string
          destination_city: string
          destination_country: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_postal_code: string | null
          expires_at: string | null
          goods_type: string | null
          id: string
          listing_type: string
          loading_meters: number | null
          notes: string | null
          origin_address: string
          origin_city: string
          origin_country: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_postal_code: string | null
          pickup_date: string
          pickup_time_from: string | null
          pickup_time_until: string | null
          price_amount: number | null
          price_type: string | null
          special_requirements: string[] | null
          status: string | null
          tenant_id: string
          updated_at: string
          vehicle_type: string | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_time_from?: string | null
          delivery_time_until?: string | null
          destination_address: string
          destination_city: string
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_postal_code?: string | null
          expires_at?: string | null
          goods_type?: string | null
          id?: string
          listing_type: string
          loading_meters?: number | null
          notes?: string | null
          origin_address: string
          origin_city: string
          origin_country?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_postal_code?: string | null
          pickup_date: string
          pickup_time_from?: string | null
          pickup_time_until?: string | null
          price_amount?: number | null
          price_type?: string | null
          special_requirements?: string[] | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          vehicle_type?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_time_from?: string | null
          delivery_time_until?: string | null
          destination_address?: string
          destination_city?: string
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_postal_code?: string | null
          expires_at?: string | null
          goods_type?: string | null
          id?: string
          listing_type?: string
          loading_meters?: number | null
          notes?: string | null
          origin_address?: string
          origin_city?: string
          origin_country?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_postal_code?: string | null
          pickup_date?: string
          pickup_time_from?: string | null
          pickup_time_until?: string | null
          price_amount?: number | null
          price_type?: string | null
          special_requirements?: string[] | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_type?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_matches: {
        Row: {
          capacity_listing_id: string
          created_at: string
          detour_km: number | null
          id: string
          load_listing_id: string
          match_reasons: Json | null
          match_score: number
          route_overlap_km: number | null
          status: string | null
          time_compatibility_score: number | null
          updated_at: string
        }
        Insert: {
          capacity_listing_id: string
          created_at?: string
          detour_km?: number | null
          id?: string
          load_listing_id: string
          match_reasons?: Json | null
          match_score: number
          route_overlap_km?: number | null
          status?: string | null
          time_compatibility_score?: number | null
          updated_at?: string
        }
        Update: {
          capacity_listing_id?: string
          created_at?: string
          detour_km?: number | null
          id?: string
          load_listing_id?: string
          match_reasons?: Json | null
          match_score?: number
          route_overlap_km?: number | null
          status?: string | null
          time_compatibility_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_matches_capacity_listing_id_fkey"
            columns: ["capacity_listing_id"]
            isOneToOne: false
            referencedRelation: "freight_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_matches_load_listing_id_fkey"
            columns: ["load_listing_id"]
            isOneToOne: false
            referencedRelation: "freight_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_settlements: {
        Row: {
          adjustments_amount: number | null
          approved_at: string | null
          approved_by: string | null
          carrier_id: string | null
          company_id: string
          created_at: string
          currency: string | null
          generated_at: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string | null
          total_orders: number | null
          updated_at: string
        }
        Insert: {
          adjustments_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          carrier_id?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          generated_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_orders?: number | null
          updated_at?: string
        }
        Update: {
          adjustments_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          carrier_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          generated_at?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_orders?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_settlements_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_settlements_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_settlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_card_connections: {
        Row: {
          api_credentials: Json | null
          company_id: string | null
          connection_name: string
          created_at: string
          id: string
          import_method: Database["public"]["Enums"]["import_method"]
          is_active: boolean
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["fuel_card_provider"]
          sync_status: string | null
          updated_at: string
          vault_secret_id: string | null
        }
        Insert: {
          api_credentials?: Json | null
          company_id?: string | null
          connection_name: string
          created_at?: string
          id?: string
          import_method?: Database["public"]["Enums"]["import_method"]
          is_active?: boolean
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["fuel_card_provider"]
          sync_status?: string | null
          updated_at?: string
          vault_secret_id?: string | null
        }
        Update: {
          api_credentials?: Json | null
          company_id?: string | null
          connection_name?: string
          created_at?: string
          id?: string
          import_method?: Database["public"]["Enums"]["import_method"]
          is_active?: boolean
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["fuel_card_provider"]
          sync_status?: string | null
          updated_at?: string
          vault_secret_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_card_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_cards: {
        Row: {
          card_name: string | null
          card_number: string
          company_id: string | null
          connection_id: string | null
          created_at: string
          driver_id: string | null
          id: string
          is_active: boolean
          monthly_limit: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          card_name?: string | null
          card_number: string
          company_id?: string | null
          connection_id?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          is_active?: boolean
          monthly_limit?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          card_name?: string | null
          card_number?: string
          company_id?: string | null
          connection_id?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          is_active?: boolean
          monthly_limit?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_cards_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "fuel_card_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          created_at: string
          driver_id: string | null
          fuel_card_number: string | null
          id: string
          liters: number
          log_date: string
          mileage_at_fill: number | null
          notes: string | null
          price_per_liter: number | null
          receipt_url: string | null
          station_location: string | null
          station_name: string | null
          tenant_id: string | null
          total_cost: number | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          fuel_card_number?: string | null
          id?: string
          liters: number
          log_date?: string
          mileage_at_fill?: number | null
          notes?: string | null
          price_per_liter?: number | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          fuel_card_number?: string | null
          id?: string
          liters?: number
          log_date?: string
          mileage_at_fill?: number | null
          notes?: string | null
          price_per_liter?: number | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          tenant_id?: string | null
          total_cost?: number | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_transactions: {
        Row: {
          card_number: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          driver_profile_id: string | null
          fuel_type: string
          id: string
          liters: number
          notes: string | null
          odometer_reading: number | null
          payment_method: string | null
          price_per_liter: number | null
          receipt_url: string | null
          station_location: string | null
          station_name: string | null
          tenant_id: string
          total_amount: number
          transaction_date: string
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          card_number?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          driver_profile_id?: string | null
          fuel_type?: string
          id?: string
          liters: number
          notes?: string | null
          odometer_reading?: number | null
          payment_method?: string | null
          price_per_liter?: number | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          tenant_id: string
          total_amount: number
          transaction_date?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          card_number?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          driver_profile_id?: string | null
          fuel_type?: string
          id?: string
          liters?: number
          notes?: string | null
          odometer_reading?: number | null
          payment_method?: string | null
          price_per_liter?: number | null
          receipt_url?: string | null
          station_location?: string | null
          station_name?: string | null
          tenant_id?: string
          total_amount?: number
          transaction_date?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_transactions_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          checksum: string | null
          document_type: string
          file_name: string | null
          file_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          is_signed: boolean | null
          reference_id: string
          reference_type: string
          signed_at: string | null
          signed_by_name: string | null
          template_id: string | null
          tenant_id: string
          variables_used: Json | null
        }
        Insert: {
          checksum?: string | null
          document_type: string
          file_name?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_signed?: boolean | null
          reference_id: string
          reference_type: string
          signed_at?: string | null
          signed_by_name?: string | null
          template_id?: string | null
          tenant_id: string
          variables_used?: Json | null
        }
        Update: {
          checksum?: string | null
          document_type?: string
          file_name?: string | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_signed?: boolean | null
          reference_id?: string
          reference_type?: string
          signed_at?: string | null
          signed_by_name?: string | null
          template_id?: string | null
          tenant_id?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          gift_order_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gift_order_id: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gift_order_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_approvals_gift_order_id_fkey"
            columns: ["gift_order_id"]
            isOneToOne: false
            referencedRelation: "gift_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_audit_logs: {
        Row: {
          created_at: string
          created_by: string | null
          event_key: string
          gift_order_id: string
          id: string
          payload_json: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_key: string
          gift_order_id: string
          id?: string
          payload_json?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_key?: string
          gift_order_id?: string
          id?: string
          payload_json?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_audit_logs_gift_order_id_fkey"
            columns: ["gift_order_id"]
            isOneToOne: false
            referencedRelation: "gift_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_message_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_orders: {
        Row: {
          account_id: string
          budget_amount: number
          category: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_address_json: Json
          delivery_date: string
          delivery_name: string
          fulfillment_mode: string
          id: string
          internal_reason: string | null
          message_card_text: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor: string
        }
        Insert: {
          account_id: string
          budget_amount: number
          category: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address_json?: Json
          delivery_date: string
          delivery_name: string
          fulfillment_mode?: string
          id?: string
          internal_reason?: string | null
          message_card_text?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor: string
        }
        Update: {
          account_id?: string
          budget_amount?: number
          category?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address_json?: Json
          delivery_date?: string
          delivery_name?: string
          fulfillment_mode?: string
          id?: string
          internal_reason?: string | null
          message_card_text?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_policies: {
        Row: {
          allowed_categories_json: Json | null
          created_at: string
          id: string
          max_amount_per_gift: number | null
          max_amount_per_month_per_account: number | null
          requires_approval_over_amount: number | null
          restricted_account_types_json: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_categories_json?: Json | null
          created_at?: string
          id?: string
          max_amount_per_gift?: number | null
          max_amount_per_month_per_account?: number | null
          requires_approval_over_amount?: number | null
          restricted_account_types_json?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_categories_json?: Json | null
          created_at?: string
          id?: string
          max_amount_per_gift?: number | null
          max_amount_per_month_per_account?: number | null
          requires_approval_over_amount?: number | null
          restricted_account_types_json?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_vendor_adapters: {
        Row: {
          api_config_json_secure: Json | null
          created_at: string
          id: string
          mode: string
          portal_url: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor: string
        }
        Insert: {
          api_config_json_secure?: Json | null
          created_at?: string
          id?: string
          mode?: string
          portal_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor: string
        }
        Update: {
          api_config_json_secure?: Json | null
          created_at?: string
          id?: string
          mode?: string
          portal_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_vendor_adapters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content_markdown: string
          created_at: string
          excerpt: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          language: string | null
          order_index: number | null
          slug: string
          tenant_id: string | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category: string
          content_markdown: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          language?: string | null
          order_index?: number | null
          slug: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category?: string
          content_markdown?: string
          created_at?: string
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          language?: string | null
          order_index?: number | null
          slug?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      holds: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          escalated_at: string | null
          escalation_level: number | null
          id: string
          owner_user_id: string | null
          reason_code: string
          reason_description: string | null
          requires_two_person_approval: boolean | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          scope: string
          severity: string
          status: string
          target_resolution_date: string | null
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          owner_user_id?: string | null
          reason_code: string
          reason_description?: string | null
          requires_two_person_approval?: boolean | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scope: string
          severity?: string
          status?: string
          target_resolution_date?: string | null
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          owner_user_id?: string | null
          reason_code?: string
          reason_description?: string | null
          requires_two_person_approval?: boolean | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scope?: string
          severity?: string
          status?: string
          target_resolution_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_registry: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string | null
          result_json: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          request_hash?: string | null
          result_json?: Json | null
          status?: string
          tenant_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string | null
          result_json?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          attachments: Json | null
          company_id: string | null
          created_at: string | null
          from_email: string
          from_name: string | null
          html_body: string | null
          id: string
          read: boolean | null
          received_at: string | null
          reply_to_message_id: string | null
          subject: string | null
          text_body: string | null
          to_email: string | null
        }
        Insert: {
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          from_email: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          read?: boolean | null
          received_at?: string | null
          reply_to_message_id?: string | null
          subject?: string | null
          text_body?: string | null
          to_email?: string | null
        }
        Update: {
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          read?: boolean | null
          received_at?: string | null
          reply_to_message_id?: string | null
          subject?: string | null
          text_body?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_order_lines: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expected_quantity: number
          expiry_date: string | null
          id: string
          inbound_order_id: string
          lot_number: string | null
          notes: string | null
          product_id: string
          put_away_quantity: number | null
          received_quantity: number | null
          target_location_id: string | null
          unit_cost: number | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expected_quantity: number
          expiry_date?: string | null
          id?: string
          inbound_order_id: string
          lot_number?: string | null
          notes?: string | null
          product_id: string
          put_away_quantity?: number | null
          received_quantity?: number | null
          target_location_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expected_quantity?: number
          expiry_date?: string | null
          id?: string
          inbound_order_id?: string
          lot_number?: string | null
          notes?: string | null
          product_id?: string
          put_away_quantity?: number | null
          received_quantity?: number | null
          target_location_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_order_lines_inbound_order_id_fkey"
            columns: ["inbound_order_id"]
            isOneToOne: false
            referencedRelation: "inbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_lines_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_number: string
          received_date: string | null
          status: string | null
          supplier_name: string | null
          supplier_reference: string | null
          tenant_id: string
          trip_id: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          received_date?: string | null
          status?: string | null
          supplier_name?: string | null
          supplier_reference?: string | null
          tenant_id: string
          trip_id?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          received_date?: string | null
          status?: string | null
          supplier_name?: string | null
          supplier_reference?: string | null
          tenant_id?: string
          trip_id?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_failures: {
        Row: {
          attempts: number | null
          created_at: string
          error_message: string | null
          error_type: string | null
          id: string
          last_attempt_at: string
          max_attempts: number | null
          next_retry_at: string | null
          payload_summary: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          source_id: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          last_attempt_at?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          payload_summary?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          source_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: string
          last_attempt_at?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          payload_summary?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          source_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_failures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          company_id: string
          created_at: string
          direction: string
          error_message: string | null
          event_type: string | null
          id: string
          integration_type: string
          processed_at: string | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          integration_type: string
          processed_at?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status: string
        }
        Update: {
          company_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          integration_type?: string
          processed_at?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_templates: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          default_values: Json | null
          description: string | null
          file_type: string | null
          id: string
          is_active: boolean | null
          mapping_schema: Json
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          default_values?: Json | null
          description?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          mapping_schema: Json
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          default_values?: Json | null
          description?: string | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          mapping_schema?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_definitions: {
        Row: {
          assistant_type: Database["public"]["Enums"]["copilot_assistant_type"]
          created_at: string
          description: string | null
          example_prompts_json: Json | null
          governance_requirements_json: Json | null
          id: string
          is_enabled: boolean | null
          key: string
          output_card_types_json: Json | null
          required_context_json: Json | null
          tenant_id: string | null
          title: string
          tool_actions_json: Json | null
          updated_at: string
          version: number | null
          visibility: string
        }
        Insert: {
          assistant_type: Database["public"]["Enums"]["copilot_assistant_type"]
          created_at?: string
          description?: string | null
          example_prompts_json?: Json | null
          governance_requirements_json?: Json | null
          id?: string
          is_enabled?: boolean | null
          key: string
          output_card_types_json?: Json | null
          required_context_json?: Json | null
          tenant_id?: string | null
          title: string
          tool_actions_json?: Json | null
          updated_at?: string
          version?: number | null
          visibility?: string
        }
        Update: {
          assistant_type?: Database["public"]["Enums"]["copilot_assistant_type"]
          created_at?: string
          description?: string | null
          example_prompts_json?: Json | null
          governance_requirements_json?: Json | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          output_card_types_json?: Json | null
          required_context_json?: Json | null
          tenant_id?: string | null
          title?: string
          tool_actions_json?: Json | null
          updated_at?: string
          version?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      intercompany_dispatches: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          agreed_price: number | null
          completed_at: string | null
          created_at: string
          currency: string | null
          decline_reason: string | null
          declined_at: string | null
          dispatch_notes: string | null
          dispatch_type: Database["public"]["Enums"]["dispatch_type"]
          dispatched_at: string
          dispatched_by: string | null
          from_company_id: string
          id: string
          primary_order_id: string
          status: Database["public"]["Enums"]["dispatch_status"]
          subcontract_order_id: string | null
          to_company_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          agreed_price?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          dispatch_notes?: string | null
          dispatch_type?: Database["public"]["Enums"]["dispatch_type"]
          dispatched_at?: string
          dispatched_by?: string | null
          from_company_id: string
          id?: string
          primary_order_id: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          subcontract_order_id?: string | null
          to_company_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          agreed_price?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          dispatch_notes?: string | null
          dispatch_type?: Database["public"]["Enums"]["dispatch_type"]
          dispatched_at?: string
          dispatched_by?: string | null
          from_company_id?: string
          id?: string
          primary_order_id?: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          subcontract_order_id?: string | null
          to_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_dispatches_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_dispatches_primary_order_id_fkey"
            columns: ["primary_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_dispatches_subcontract_order_id_fkey"
            columns: ["subcontract_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_dispatches_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_quantity: number | null
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          last_counted_at: string | null
          location_id: string | null
          lot_number: string | null
          product_id: string
          quantity: number
          received_date: string | null
          reserved_quantity: number | null
          serial_number: string | null
          tenant_id: string
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          location_id?: string | null
          lot_number?: string | null
          product_id: string
          quantity?: number
          received_date?: string | null
          reserved_quantity?: number | null
          serial_number?: string | null
          tenant_id: string
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_at?: string | null
          location_id?: string | null
          lot_number?: string | null
          product_id?: string
          quantity?: number
          received_date?: string | null
          reserved_quantity?: number | null
          serial_number?: string | null
          tenant_id?: string
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          batch_number: string | null
          created_at: string | null
          from_location_id: string | null
          id: string
          inventory_id: string | null
          lot_number: string | null
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          to_location_id: string | null
          transaction_type: string
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          inventory_id?: string | null
          lot_number?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          to_location_id?: string | null
          transaction_type: string
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          inventory_id?: string | null
          lot_number?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          to_location_id?: string | null
          transaction_type?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_disputes: {
        Row: {
          created_at: string | null
          customer_id: string
          dispute_items_json: Json
          id: string
          invoice_id: string | null
          reason: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          dispute_items_json?: Json
          id?: string
          invoice_id?: string | null
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          dispute_items_json?: Json
          id?: string
          invoice_id?: string | null
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_disputes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_disputes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_email_log: {
        Row: {
          attachments_sent: Json | null
          channel: string | null
          company_id: string | null
          created_at: string | null
          delivery_status: string | null
          email_body: string | null
          email_subject: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          recipient_email: string
          recipient_name: string | null
          reminder_type: string | null
          resend_message_id: string | null
          sent_at: string | null
          sms_message_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          attachments_sent?: Json | null
          channel?: string | null
          company_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          email_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          reminder_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          sms_message_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          attachments_sent?: Json | null
          channel?: string | null
          company_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          email_body?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          reminder_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          sms_message_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_type: string | null
          quantity: number | null
          total_price: number
          trip_id: string | null
          unit_price: number
          vat_amount: number | null
          vat_percentage: number | null
          vat_type: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_type?: string | null
          quantity?: number | null
          total_price: number
          trip_id?: string | null
          unit_price: number
          vat_amount?: number | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_type?: string | null
          quantity?: number | null
          total_price?: number
          trip_id?: string | null
          unit_price?: number
          vat_amount?: number | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminder_settings: {
        Row: {
          auto_enabled: boolean | null
          company_id: string
          created_at: string | null
          customer_id: string | null
          days_after_first: number | null
          days_after_second: number | null
          days_after_third: number | null
          email_enabled: boolean | null
          id: string
          is_global: boolean | null
          max_reminders: number | null
          sms_enabled: boolean | null
          template_first: string | null
          template_second: string | null
          template_third: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          auto_enabled?: boolean | null
          company_id: string
          created_at?: string | null
          customer_id?: string | null
          days_after_first?: number | null
          days_after_second?: number | null
          days_after_third?: number | null
          email_enabled?: boolean | null
          id?: string
          is_global?: boolean | null
          max_reminders?: number | null
          sms_enabled?: boolean | null
          template_first?: string | null
          template_second?: string | null
          template_third?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          auto_enabled?: boolean | null
          company_id?: string
          created_at?: string | null
          customer_id?: string | null
          days_after_first?: number | null
          days_after_second?: number | null
          days_after_third?: number | null
          email_enabled?: boolean | null
          id?: string
          is_global?: boolean | null
          max_reminders?: number | null
          sms_enabled?: boolean | null
          template_first?: string | null
          template_second?: string | null
          template_third?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminder_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminder_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminder_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          company_id: string
          created_at: string | null
          footnote: string | null
          id: string
          next_invoice_number: number | null
          number_format: string | null
          number_padding: number | null
          number_prefix: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          footnote?: string | null
          id?: string
          next_invoice_number?: number | null
          number_format?: string | null
          number_padding?: number | null
          number_prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          footnote?: string | null
          id?: string
          next_invoice_number?: number | null
          number_format?: string | null
          number_padding?: number | null
          number_prefix?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_types: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          separate_invoices: boolean | null
          show_destinations: boolean | null
          show_rates: boolean | null
          show_weight: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          separate_invoices?: boolean | null
          show_destinations?: boolean | null
          show_rates?: boolean | null
          show_weight?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          separate_invoices?: boolean | null
          show_destinations?: boolean | null
          show_rates?: boolean | null
          show_weight?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          collection_status: string | null
          company_id: string | null
          created_at: string
          customer_id: string | null
          due_date: string
          email_body: string | null
          email_subject: string | null
          footnote: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string | null
          is_manual: boolean | null
          last_reminder_sent_at: string | null
          mollie_payment_id: string | null
          next_reminder_date: string | null
          notes: string | null
          paid_at: string | null
          payment_link: string | null
          payment_link_expires_at: string | null
          payment_token: string | null
          period_from: string | null
          period_to: string | null
          reminder_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total_amount: number
          ubl_xml: string | null
          updated_at: string
          vat_amount: number
          vat_note: string | null
          vat_percentage: number | null
          vat_type: string | null
        }
        Insert: {
          amount_paid?: number | null
          collection_status?: string | null
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          due_date: string
          email_body?: string | null
          email_subject?: string | null
          footnote?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type?: string | null
          is_manual?: boolean | null
          last_reminder_sent_at?: string | null
          mollie_payment_id?: string | null
          next_reminder_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          payment_token?: string | null
          period_from?: string | null
          period_to?: string | null
          reminder_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_amount?: number
          ubl_xml?: string | null
          updated_at?: string
          vat_amount?: number
          vat_note?: string | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Update: {
          amount_paid?: number | null
          collection_status?: string | null
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string
          email_body?: string | null
          email_subject?: string | null
          footnote?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string | null
          is_manual?: boolean | null
          last_reminder_sent_at?: string | null
          mollie_payment_id?: string | null
          next_reminder_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          payment_token?: string | null
          period_from?: string | null
          period_to?: string | null
          reminder_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_amount?: number
          ubl_xml?: string | null
          updated_at?: string
          vat_amount?: number
          vat_note?: string | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          correlation_id: string | null
          details_json: Json | null
          error_count: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_name: string | null
          job_type: string
          processed_count: number | null
          started_at: string
          status: string
          success_count: number | null
          tenant_id: string | null
          triggered_by: string | null
        }
        Insert: {
          correlation_id?: string | null
          details_json?: Json | null
          error_count?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string | null
          job_type: string
          processed_count?: number | null
          started_at?: string
          status?: string
          success_count?: number | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          correlation_id?: string | null
          details_json?: Json | null
          error_count?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string | null
          job_type?: string
          processed_count?: number | null
          started_at?: string
          status?: string
          success_count?: number | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          active_customers: number | null
          avg_delivery_time_hours: number | null
          company_id: string | null
          cost_total: number | null
          created_at: string | null
          driver_utilization_pct: number | null
          fuel_cost_total: number | null
          id: string
          margin_avg: number | null
          new_customers: number | null
          orders_cancelled: number | null
          orders_completed: number | null
          orders_on_time: number | null
          orders_total: number | null
          period_type: string | null
          profit_total: number | null
          revenue_total: number | null
          snapshot_date: string
          vehicle_utilization_pct: number | null
        }
        Insert: {
          active_customers?: number | null
          avg_delivery_time_hours?: number | null
          company_id?: string | null
          cost_total?: number | null
          created_at?: string | null
          driver_utilization_pct?: number | null
          fuel_cost_total?: number | null
          id?: string
          margin_avg?: number | null
          new_customers?: number | null
          orders_cancelled?: number | null
          orders_completed?: number | null
          orders_on_time?: number | null
          orders_total?: number | null
          period_type?: string | null
          profit_total?: number | null
          revenue_total?: number | null
          snapshot_date: string
          vehicle_utilization_pct?: number | null
        }
        Update: {
          active_customers?: number | null
          avg_delivery_time_hours?: number | null
          company_id?: string | null
          cost_total?: number | null
          created_at?: string | null
          driver_utilization_pct?: number | null
          fuel_cost_total?: number | null
          id?: string
          margin_avg?: number | null
          new_customers?: number | null
          orders_cancelled?: number | null
          orders_completed?: number | null
          orders_on_time?: number | null
          orders_total?: number | null
          period_type?: string | null
          profit_total?: number | null
          revenue_total?: number | null
          snapshot_date?: string
          vehicle_utilization_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lane_pricing: {
        Row: {
          base_rate: number
          created_at: string
          customer_id: string | null
          destination_country: string | null
          destination_region: string | null
          id: string
          is_active: boolean | null
          lane_id: string | null
          minimum_charge: number | null
          origin_country: string | null
          origin_region: string | null
          rate_per_hour: number | null
          rate_per_km: number | null
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          vehicle_rates_json: Json | null
        }
        Insert: {
          base_rate?: number
          created_at?: string
          customer_id?: string | null
          destination_country?: string | null
          destination_region?: string | null
          id?: string
          is_active?: boolean | null
          lane_id?: string | null
          minimum_charge?: number | null
          origin_country?: string | null
          origin_region?: string | null
          rate_per_hour?: number | null
          rate_per_km?: number | null
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_rates_json?: Json | null
        }
        Update: {
          base_rate?: number
          created_at?: string
          customer_id?: string | null
          destination_country?: string | null
          destination_region?: string | null
          id?: string
          is_active?: boolean | null
          lane_id?: string | null
          minimum_charge?: number | null
          origin_country?: string | null
          origin_region?: string | null
          rate_per_hour?: number | null
          rate_per_km?: number | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vehicle_rates_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lane_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_pricing_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lane_rates: {
        Row: {
          created_at: string
          currency: string | null
          customer_id: string | null
          destination_zone: string | null
          id: string
          lane_id: string | null
          notes: string | null
          origin_zone: string | null
          rate: number
          rate_card_id: string | null
          tenant_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          destination_zone?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          origin_zone?: string | null
          rate: number
          rate_card_id?: string | null
          tenant_id: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          destination_zone?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          origin_zone?: string | null
          rate?: number
          rate_card_id?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lane_rates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_rates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_rates_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_rates_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lane_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lanes: {
        Row: {
          created_at: string
          destination_name: string
          destination_zone_id: string | null
          id: string
          is_active: boolean
          name: string | null
          origin_name: string
          origin_zone_id: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_name: string
          destination_zone_id?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          origin_name: string
          origin_zone_id?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_name?: string
          destination_zone_id?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          origin_name?: string
          origin_zone_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_checklist_results: {
        Row: {
          category: string
          check_key: string
          check_name: string
          checked_at: string
          details_json: Json | null
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          category: string
          check_key: string
          check_name: string
          checked_at?: string
          details_json?: Json | null
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          category?: string
          check_key?: string
          check_name?: string
          checked_at?: string
          details_json?: Json | null
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_checklist_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_patterns: {
        Row: {
          conditions: Json
          confidence: number
          created_at: string
          id: string
          is_active: boolean
          occurrences: number
          pattern_type: string
          recommended_action: Json
          success_rate: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          occurrences?: number
          pattern_type: string
          recommended_action?: Json
          success_rate?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          occurrences?: number
          pattern_type?: string
          recommended_action?: Json
          success_rate?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learned_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_events: {
        Row: {
          context: Json
          created_at: string
          decision: Json
          event_type: string
          feedback_score: number | null
          id: string
          outcome: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          decision?: Json
          event_type: string
          feedback_score?: number | null
          id?: string
          outcome?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          decision?: Json
          event_type?: string
          feedback_score?: number | null
          id?: string
          outcome?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_predictions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          based_on_json: Json | null
          confidence_percent: number | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          is_acknowledged: boolean | null
          maintenance_scheduled_id: string | null
          predicted_failure_date: string | null
          prediction_type: string | null
          recommended_action: string | null
          severity: string | null
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          based_on_json?: Json | null
          confidence_percent?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          is_acknowledged?: boolean | null
          maintenance_scheduled_id?: string | null
          predicted_failure_date?: string | null
          prediction_type?: string | null
          recommended_action?: string | null
          severity?: string | null
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          based_on_json?: Json | null
          confidence_percent?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          is_acknowledged?: boolean | null
          maintenance_scheduled_id?: string | null
          predicted_failure_date?: string | null
          prediction_type?: string | null
          recommended_action?: string | null
          severity?: string | null
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_predictions_maintenance_scheduled_id_fkey"
            columns: ["maintenance_scheduled_id"]
            isOneToOne: false
            referencedRelation: "vehicle_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_predictions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          attachments: string[] | null
          completed_date: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          labor_hours: number | null
          maintenance_type: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date: string | null
          next_service_km: number | null
          notes: string | null
          odometer_at_service: number | null
          parts_used: Json | null
          reminder_sent: boolean | null
          scheduled_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          title: string
          updated_at: string
          vehicle_id: string
          vendor_invoice: string | null
          vendor_name: string | null
        }
        Insert: {
          attachments?: string[] | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          labor_hours?: number | null
          maintenance_type: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          odometer_at_service?: number | null
          parts_used?: Json | null
          reminder_sent?: boolean | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          title: string
          updated_at?: string
          vehicle_id: string
          vendor_invoice?: string | null
          vendor_name?: string | null
        }
        Update: {
          attachments?: string[] | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          labor_hours?: number | null
          maintenance_type?: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          odometer_at_service?: number | null
          parts_used?: Json | null
          reminder_sent?: boolean | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          vehicle_id?: string
          vendor_invoice?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          company_id: string | null
          default_interval_km: number | null
          default_interval_months: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          company_id?: string | null
          default_interval_km?: number | null
          default_interval_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          company_id?: string | null
          default_interval_km?: number | null
          default_interval_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      margin_leak_playbooks: {
        Row: {
          actions: Json | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          leak_type: string
          name: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leak_type: string
          name: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leak_type?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "margin_leak_playbooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      market_demand: {
        Row: {
          avg_price_per_km: number | null
          balance_ratio: number | null
          capacity_score: number | null
          demand_score: number | null
          direction: string | null
          id: string
          period_end: string | null
          period_start: string | null
          recorded_at: string
          region: string
          sample_size: number | null
          suggested_multiplier: number | null
          tenant_id: string
        }
        Insert: {
          avg_price_per_km?: number | null
          balance_ratio?: number | null
          capacity_score?: number | null
          demand_score?: number | null
          direction?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          recorded_at?: string
          region: string
          sample_size?: number | null
          suggested_multiplier?: number | null
          tenant_id: string
        }
        Update: {
          avg_price_per_km?: number | null
          balance_ratio?: number | null
          capacity_score?: number | null
          demand_score?: number | null
          direction?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          recorded_at?: string
          region?: string
          sample_size?: number | null
          suggested_multiplier?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_demand_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_batches: {
        Row: {
          batch_type: Database["public"]["Enums"]["migration_batch_type"]
          connector_id: string | null
          correlation_id: string | null
          created_at: string
          created_count: number | null
          error_count: number | null
          finished_at: string | null
          id: string
          profile_id: string | null
          project_id: string
          skipped_count: number | null
          source_artifact_url: string | null
          source_hash: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["migration_batch_status"]
          updated_count: number | null
        }
        Insert: {
          batch_type?: Database["public"]["Enums"]["migration_batch_type"]
          connector_id?: string | null
          correlation_id?: string | null
          created_at?: string
          created_count?: number | null
          error_count?: number | null
          finished_at?: string | null
          id?: string
          profile_id?: string | null
          project_id: string
          skipped_count?: number | null
          source_artifact_url?: string | null
          source_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["migration_batch_status"]
          updated_count?: number | null
        }
        Update: {
          batch_type?: Database["public"]["Enums"]["migration_batch_type"]
          connector_id?: string | null
          correlation_id?: string | null
          created_at?: string
          created_count?: number | null
          error_count?: number | null
          finished_at?: string | null
          id?: string
          profile_id?: string | null
          project_id?: string
          skipped_count?: number | null
          source_artifact_url?: string | null
          source_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["migration_batch_status"]
          updated_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_batches_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "migration_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_batches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "migration_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_connectors: {
        Row: {
          api_credentials_vault_id: string | null
          config_json: Json | null
          created_at: string
          id: string
          last_error: string | null
          last_run_at: string | null
          last_success_at: string | null
          last_sync_count: number | null
          project_id: string
          status: Database["public"]["Enums"]["migration_connector_status"]
          sync_schedule: string | null
          type: Database["public"]["Enums"]["migration_connector_type"]
          updated_at: string
        }
        Insert: {
          api_credentials_vault_id?: string | null
          config_json?: Json | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          last_sync_count?: number | null
          project_id: string
          status?: Database["public"]["Enums"]["migration_connector_status"]
          sync_schedule?: string | null
          type?: Database["public"]["Enums"]["migration_connector_type"]
          updated_at?: string
        }
        Update: {
          api_credentials_vault_id?: string | null
          config_json?: Json | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          last_sync_count?: number | null
          project_id?: string
          status?: Database["public"]["Enums"]["migration_connector_status"]
          sync_schedule?: string | null
          type?: Database["public"]["Enums"]["migration_connector_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_connectors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_data_fingerprints: {
        Row: {
          batch_id: string | null
          created_at: string
          data_hash: string
          entity_type: string | null
          id: string
          record_count: number | null
          tenant_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          data_hash: string
          entity_type?: string | null
          id?: string
          record_count?: number | null
          tenant_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          data_hash?: string
          entity_type?: string | null
          id?: string
          record_count?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_data_fingerprints_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_data_fingerprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          dedupe_rules_json: Json | null
          id: string
          inference_rules_json: Json | null
          mapping_json: Json | null
          name: string
          normalization_rules_json: Json | null
          project_id: string
          status: Database["public"]["Enums"]["migration_profile_status"]
          updated_at: string
          validation_rules_json: Json | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_rules_json?: Json | null
          id?: string
          inference_rules_json?: Json | null
          mapping_json?: Json | null
          name: string
          normalization_rules_json?: Json | null
          project_id: string
          status?: Database["public"]["Enums"]["migration_profile_status"]
          updated_at?: string
          validation_rules_json?: Json | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_rules_json?: Json | null
          id?: string
          inference_rules_json?: Json | null
          mapping_json?: Json | null
          name?: string
          normalization_rules_json?: Json | null
          project_id?: string
          status?: Database["public"]["Enums"]["migration_profile_status"]
          updated_at?: string
          validation_rules_json?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "migration_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_projects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          source_system: Database["public"]["Enums"]["migration_source_system"]
          status: Database["public"]["Enums"]["migration_project_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          source_system?: Database["public"]["Enums"]["migration_source_system"]
          status?: Database["public"]["Enums"]["migration_project_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          source_system?: Database["public"]["Enums"]["migration_source_system"]
          status?: Database["public"]["Enums"]["migration_project_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mollie_payment_events: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          method: string | null
          payment_id: string
          raw_response: Json | null
          status: string
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          payment_id: string
          raw_response?: Json | null
          status: string
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          payment_id?: string
          raw_response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mollie_payment_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mollie_payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_type: string
          created_at: string | null
          credentials_encrypted: Json | null
          default_templates_json: Json | null
          id: string
          is_active: boolean | null
          provider: string | null
          rate_limit_per_hour: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          channel_type: string
          created_at?: string | null
          credentials_encrypted?: Json | null
          default_templates_json?: Json | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          rate_limit_per_hour?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string
          created_at?: string | null
          credentials_encrypted?: Json | null
          default_templates_json?: Json | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          rate_limit_per_hour?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel_id: string | null
          channel_type: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string | null
          read_at: string | null
          recipient_contact: string | null
          recipient_id: string | null
          recipient_type: string | null
          sent_at: string | null
          status: string | null
          template_key: string | null
          tenant_id: string
          variables_json: Json | null
        }
        Insert: {
          channel_id?: string | null
          channel_type: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string | null
          read_at?: string | null
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          tenant_id: string
          variables_json?: Json | null
        }
        Update: {
          channel_id?: string | null
          channel_type?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string | null
          read_at?: string | null
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          tenant_id?: string
          variables_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_daily_digest: boolean | null
          email_driver_assigned: boolean | null
          email_invoice_created: boolean | null
          email_new_order: boolean | null
          email_order_status_change: boolean | null
          email_payment_received: boolean | null
          id: string
          push_enabled: boolean | null
          push_new_order: boolean | null
          push_order_status: boolean | null
          push_urgent_only: boolean | null
          sms_delivery_alerts: boolean | null
          sms_enabled: boolean | null
          sms_phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_daily_digest?: boolean | null
          email_driver_assigned?: boolean | null
          email_invoice_created?: boolean | null
          email_new_order?: boolean | null
          email_order_status_change?: boolean | null
          email_payment_received?: boolean | null
          id?: string
          push_enabled?: boolean | null
          push_new_order?: boolean | null
          push_order_status?: boolean | null
          push_urgent_only?: boolean | null
          sms_delivery_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_daily_digest?: boolean | null
          email_driver_assigned?: boolean | null
          email_invoice_created?: boolean | null
          email_new_order?: boolean | null
          email_order_status_change?: boolean | null
          email_payment_received?: boolean | null
          id?: string
          push_enabled?: boolean | null
          push_new_order?: boolean | null
          push_order_status?: boolean | null
          push_urgent_only?: boolean | null
          sms_delivery_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          channel: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          failed_reason: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          channel: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          failed_reason?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          channel?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          failed_reason?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_results: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          document_type: string | null
          error_message: string | null
          extracted_data_json: Json | null
          id: string
          linked_invoice_id: string | null
          linked_order_id: string | null
          processing_time_ms: number | null
          source_file_url: string | null
          status: string | null
          tenant_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          extracted_data_json?: Json | null
          id?: string
          linked_invoice_id?: string | null
          linked_order_id?: string | null
          processing_time_ms?: number | null
          source_file_url?: string | null
          status?: string | null
          tenant_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          extracted_data_json?: Json | null
          id?: string
          linked_invoice_id?: string | null
          linked_order_id?: string | null
          processing_time_ms?: number | null
          source_file_url?: string | null
          status?: string | null
          tenant_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_results_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_results_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_change_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          requested_by: string
          requested_changes_json: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          requested_by: string
          requested_changes_json: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          requested_by?: string
          requested_changes_json?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_change_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_change_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string
          file_size: number | null
          id: string
          is_public: boolean
          mime_type: string | null
          name: string
          order_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: string
          file_size?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          name: string
          order_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_size?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          name?: string
          order_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      order_goods: {
        Row: {
          created_at: string | null
          delivery_stop_id: string | null
          description: string | null
          height_cm: number | null
          id: string
          length_cm: number | null
          line_number: number
          loading_meters: number | null
          packaging_type: string | null
          pickup_stop_id: string | null
          quantity: number
          total_weight: number | null
          trip_id: string
          volume_m3: number | null
          weight_per_unit: number | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_stop_id?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_number?: number
          loading_meters?: number | null
          packaging_type?: string | null
          pickup_stop_id?: string | null
          quantity?: number
          total_weight?: number | null
          trip_id: string
          volume_m3?: number | null
          weight_per_unit?: number | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_stop_id?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_number?: number
          loading_meters?: number | null
          packaging_type?: string | null
          pickup_stop_id?: string | null
          quantity?: number
          total_weight?: number | null
          trip_id?: string
          volume_m3?: number | null
          weight_per_unit?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_goods_delivery_stop_id_fkey"
            columns: ["delivery_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_goods_pickup_stop_id_fkey"
            columns: ["pickup_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_goods_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      order_product_lines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          order_id: string
          product_id: string
          purchase_rate_override: number | null
          purchase_subtotal: number
          quantity_base: number | null
          sales_rate_override: number | null
          sales_subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          order_id: string
          product_id: string
          purchase_rate_override?: number | null
          purchase_subtotal?: number
          quantity_base?: number | null
          sales_rate_override?: number | null
          sales_subtotal?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          order_id?: string
          product_id?: string
          purchase_rate_override?: number | null
          purchase_subtotal?: number
          quantity_base?: number | null
          sales_rate_override?: number | null
          sales_subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_product_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_product_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stop_events: {
        Row: {
          accuracy: number | null
          actor_company_id: string | null
          actor_user_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["stop_event_type"]
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          payload: Json | null
          stop_id: string
          synced_at: string | null
          synced_to_primary: boolean | null
          timestamp: string
          trip_id: string
        }
        Insert: {
          accuracy?: number | null
          actor_company_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["stop_event_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payload?: Json | null
          stop_id: string
          synced_at?: string | null
          synced_to_primary?: boolean | null
          timestamp?: string
          trip_id: string
        }
        Update: {
          accuracy?: number | null
          actor_company_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["stop_event_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payload?: Json | null
          stop_id?: string
          synced_at?: string | null
          synced_to_primary?: boolean | null
          timestamp?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_stop_events_actor_company_id_fkey"
            columns: ["actor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stop_events_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stop_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      order_substatuses: {
        Row: {
          available_in_driver_app: boolean
          color: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          visible_on_tracking: boolean
        }
        Insert: {
          available_in_driver_app?: boolean
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          visible_on_tracking?: boolean
        }
        Update: {
          available_in_driver_app?: boolean
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          visible_on_tracking?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_substatuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_templates: {
        Row: {
          cargo_description: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_postal_code: string | null
          description: string | null
          goods_type: string | null
          id: string
          is_active: boolean | null
          last_run_date: string | null
          name: string
          next_run_date: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_postal_code: string | null
          preferred_driver_id: string | null
          preferred_vehicle_id: string | null
          purchase_total: number | null
          recurrence_day_of_month: number | null
          recurrence_days: number[] | null
          recurrence_type: string | null
          sales_total: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          cargo_description?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_postal_code?: string | null
          description?: string | null
          goods_type?: string | null
          id?: string
          is_active?: boolean | null
          last_run_date?: string | null
          name: string
          next_run_date?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_postal_code?: string | null
          preferred_driver_id?: string | null
          preferred_vehicle_id?: string | null
          purchase_total?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          sales_total?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          cargo_description?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_postal_code?: string | null
          description?: string | null
          goods_type?: string | null
          id?: string
          is_active?: boolean | null
          last_run_date?: string | null
          name?: string
          next_run_date?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_postal_code?: string | null
          preferred_driver_id?: string | null
          preferred_vehicle_id?: string | null
          purchase_total?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          sales_total?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_templates_preferred_vehicle_id_fkey"
            columns: ["preferred_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_order_lines: {
        Row: {
          allocated_quantity: number | null
          batch_number: string | null
          created_at: string | null
          from_location_id: string | null
          id: string
          lot_number: string | null
          notes: string | null
          outbound_order_id: string
          packed_quantity: number | null
          picked_quantity: number | null
          product_id: string
          requested_quantity: number
          shipped_quantity: number | null
        }
        Insert: {
          allocated_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          outbound_order_id: string
          packed_quantity?: number | null
          picked_quantity?: number | null
          product_id: string
          requested_quantity: number
          shipped_quantity?: number | null
        }
        Update: {
          allocated_quantity?: number | null
          batch_number?: string | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          outbound_order_id?: string
          packed_quantity?: number | null
          picked_quantity?: number | null
          product_id?: string
          requested_quantity?: number
          shipped_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_order_lines_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_order_lines_outbound_order_id_fkey"
            columns: ["outbound_order_id"]
            isOneToOne: false
            referencedRelation: "outbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_reference: string | null
          id: string
          notes: string | null
          order_number: string
          picking_strategy: string | null
          priority: number | null
          required_date: string | null
          shipped_date: string | null
          status: string | null
          tenant_id: string
          trip_id: string | null
          updated_at: string | null
          warehouse_id: string
          wave_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          id?: string
          notes?: string | null
          order_number: string
          picking_strategy?: string | null
          priority?: number | null
          required_date?: string | null
          shipped_date?: string | null
          status?: string | null
          tenant_id: string
          trip_id?: string | null
          updated_at?: string | null
          warehouse_id: string
          wave_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          picking_strategy?: string | null
          priority?: number | null
          required_date?: string | null
          shipped_date?: string | null
          status?: string | null
          tenant_id?: string
          trip_id?: string | null
          updated_at?: string | null
          warehouse_id?: string
          wave_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_orders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          id: string
          invoice_id: string
          metadata: Json | null
          mollie_payment_id: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          mollie_payment_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          mollie_payment_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_tasks: {
        Row: {
          assigned_to: string | null
          batch_number: string | null
          completed_at: string | null
          created_at: string | null
          from_location_id: string
          id: string
          inventory_id: string | null
          lot_number: string | null
          notes: string | null
          outbound_line_id: string | null
          outbound_order_id: string | null
          picked_quantity: number | null
          priority: number | null
          product_id: string
          quantity: number
          sequence_number: number | null
          started_at: string | null
          status: string | null
          tenant_id: string
          warehouse_id: string
          wave_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_number?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_location_id: string
          id?: string
          inventory_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_line_id?: string | null
          outbound_order_id?: string | null
          picked_quantity?: number | null
          priority?: number | null
          product_id: string
          quantity: number
          sequence_number?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          warehouse_id: string
          wave_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_number?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_location_id?: string
          id?: string
          inventory_id?: string | null
          lot_number?: string | null
          notes?: string | null
          outbound_line_id?: string | null
          outbound_order_id?: string | null
          picked_quantity?: number | null
          priority?: number | null
          product_id?: string
          quantity?: number
          sequence_number?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          warehouse_id?: string
          wave_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_tasks_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_outbound_line_id_fkey"
            columns: ["outbound_line_id"]
            isOneToOne: false
            referencedRelation: "outbound_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_outbound_order_id_fkey"
            columns: ["outbound_order_id"]
            isOneToOne: false
            referencedRelation: "outbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_tasks_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "pick_waves"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_waves: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          cut_off_time: string | null
          id: string
          notes: string | null
          priority: number | null
          started_at: string | null
          status: string | null
          tenant_id: string
          total_lines: number | null
          total_orders: number | null
          total_quantity: number | null
          updated_at: string | null
          warehouse_id: string
          wave_number: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          cut_off_time?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          total_lines?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          warehouse_id: string
          wave_number: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          cut_off_time?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          total_lines?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          warehouse_id?: string
          wave_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "pick_waves_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_waves_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_constraints: {
        Row: {
          company_id: string
          constraint_name: string
          constraint_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["compliance_entity_type"]
            | null
          id: string
          is_active: boolean | null
          is_hard_constraint: boolean | null
          rules: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          constraint_name: string
          constraint_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["compliance_entity_type"]
            | null
          id?: string
          is_active?: boolean | null
          is_hard_constraint?: boolean | null
          rules: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          constraint_name?: string
          constraint_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["compliance_entity_type"]
            | null
          id?: string
          is_active?: boolean | null
          is_hard_constraint?: boolean | null
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_constraints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_settings: {
        Row: {
          auto_approve_min_score: number | null
          company_id: string | null
          created_at: string
          default_compensation_type:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          default_show_compensation: boolean | null
          early_cancel_hours: number | null
          early_cancel_penalty: number | null
          enable_auto_approve: boolean | null
          enable_surge_pricing: boolean | null
          id: string
          no_show_penalty: number | null
          require_approval_above_amount: number | null
          require_approval_for_negative_margin: boolean | null
          surge_bonus_percentage: number | null
          surge_hours_threshold: number | null
          updated_at: string
        }
        Insert: {
          auto_approve_min_score?: number | null
          company_id?: string | null
          created_at?: string
          default_compensation_type?:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          default_show_compensation?: boolean | null
          early_cancel_hours?: number | null
          early_cancel_penalty?: number | null
          enable_auto_approve?: boolean | null
          enable_surge_pricing?: boolean | null
          id?: string
          no_show_penalty?: number | null
          require_approval_above_amount?: number | null
          require_approval_for_negative_margin?: boolean | null
          surge_bonus_percentage?: number | null
          surge_hours_threshold?: number | null
          updated_at?: string
        }
        Update: {
          auto_approve_min_score?: number | null
          company_id?: string | null
          created_at?: string
          default_compensation_type?:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          default_show_compensation?: boolean | null
          early_cancel_hours?: number | null
          early_cancel_penalty?: number | null
          enable_auto_approve?: boolean | null
          enable_surge_pricing?: boolean | null
          id?: string
          no_show_penalty?: number | null
          require_approval_above_amount?: number | null
          require_approval_for_negative_margin?: boolean | null
          surge_bonus_percentage?: number | null
          surge_hours_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_metrics_daily: {
        Row: {
          active_tenants: number
          arr_eur: number
          churn_count: number
          created_at: string
          date: string
          id: string
          mrr_eur: number
          new_tenants: number
          total_orders: number
          total_tenants: number
          total_users: number
          trial_tenants: number
        }
        Insert: {
          active_tenants?: number
          arr_eur?: number
          churn_count?: number
          created_at?: string
          date?: string
          id?: string
          mrr_eur?: number
          new_tenants?: number
          total_orders?: number
          total_tenants?: number
          total_users?: number
          trial_tenants?: number
        }
        Update: {
          active_tenants?: number
          arr_eur?: number
          churn_count?: number
          created_at?: string
          date?: string
          id?: string
          mrr_eur?: number
          new_tenants?: number
          total_orders?: number
          total_tenants?: number
          total_users?: number
          trial_tenants?: number
        }
        Relationships: []
      }
      portal_ai_action_drafts: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          context_id: string | null
          context_type: string | null
          correlation_id: string | null
          created_at: string
          evidence_links_json: Json | null
          id: string
          idempotency_key: string | null
          intent_key: string
          portal_type: string
          portal_user_id: string
          proposed_actions_json: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          context_id?: string | null
          context_type?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence_links_json?: Json | null
          id?: string
          idempotency_key?: string | null
          intent_key: string
          portal_type: string
          portal_user_id: string
          proposed_actions_json?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          context_id?: string | null
          context_type?: string | null
          correlation_id?: string | null
          created_at?: string
          evidence_links_json?: Json | null
          id?: string
          idempotency_key?: string | null
          intent_key?: string
          portal_type?: string
          portal_user_id?: string
          proposed_actions_json?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_action_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ai_action_logs: {
        Row: {
          action_key: string
          created_at: string
          draft_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          portal_type: string
          portal_user_id: string
          reason_json: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_key: string
          created_at?: string
          draft_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          portal_type: string
          portal_user_id: string
          reason_json?: Json | null
          status: string
          tenant_id: string
        }
        Update: {
          action_key?: string
          created_at?: string
          draft_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          portal_type?: string
          portal_user_id?: string
          reason_json?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_action_logs_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "portal_ai_action_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_ai_action_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ai_assistant_config: {
        Row: {
          allowed_intents_json: Json | null
          created_at: string
          enabled: boolean
          id: string
          portal_type: string
          safety_rules_json: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_intents_json?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          portal_type: string
          safety_rules_json?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_intents_json?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          portal_type?: string
          safety_rules_json?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_assistant_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ai_conversations: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          portal_type: string
          portal_user_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          portal_type: string
          portal_user_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          portal_type?: string
          portal_user_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ai_messages: {
        Row: {
          action_cards: Json | null
          conversation_id: string
          created_at: string
          evidence_links: Json | null
          id: string
          intent_key: string | null
          role: string
          text: string
        }
        Insert: {
          action_cards?: Json | null
          conversation_id: string
          created_at?: string
          evidence_links?: Json | null
          id?: string
          intent_key?: string | null
          role: string
          text: string
        }
        Update: {
          action_cards?: Json | null
          conversation_id?: string
          created_at?: string
          evidence_links?: Json | null
          id?: string
          intent_key?: string | null
          role?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "portal_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_cost_centers: {
        Row: {
          budget_limit: number | null
          code: string
          created_at: string | null
          current_spend: number | null
          customer_id: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget_limit?: number | null
          code: string
          created_at?: string | null
          current_spend?: number | null
          customer_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget_limit?: number | null
          code?: string
          created_at?: string | null
          current_spend?: number | null
          customer_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_cost_centers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_cost_centers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag_key: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_key: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_key?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notification_preferences: {
        Row: {
          created_at: string | null
          customer_id: string | null
          email_delivery_confirmation: boolean | null
          email_invoices: boolean | null
          email_marketing: boolean | null
          email_shipment_updates: boolean | null
          id: string
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          email_delivery_confirmation?: boolean | null
          email_invoices?: boolean | null
          email_marketing?: boolean | null
          email_shipment_updates?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          email_delivery_confirmation?: boolean | null
          email_invoices?: boolean | null
          email_marketing?: boolean | null
          email_shipment_updates?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          customer_id: string
          email: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          name: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          customer_id: string
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          name?: string | null
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          customer_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          name?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_user_invitations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_user_invitations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_calculations: {
        Row: {
          base_price: number
          calculated_at: string
          calculated_price: number
          calculation_type: string | null
          currency: string | null
          customer_id: string | null
          destination_city: string | null
          discount_adjustment: number | null
          distance_km: number | null
          expires_at: string | null
          id: string
          lane_adjustment: number | null
          listing_id: string | null
          origin_city: string | null
          rules_applied_json: Json | null
          surge_adjustment: number | null
          surge_factors_json: Json | null
          tenant_id: string
          trip_id: string | null
        }
        Insert: {
          base_price: number
          calculated_at?: string
          calculated_price: number
          calculation_type?: string | null
          currency?: string | null
          customer_id?: string | null
          destination_city?: string | null
          discount_adjustment?: number | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          lane_adjustment?: number | null
          listing_id?: string | null
          origin_city?: string | null
          rules_applied_json?: Json | null
          surge_adjustment?: number | null
          surge_factors_json?: Json | null
          tenant_id: string
          trip_id?: string | null
        }
        Update: {
          base_price?: number
          calculated_at?: string
          calculated_price?: number
          calculation_type?: string | null
          currency?: string | null
          customer_id?: string | null
          destination_city?: string | null
          discount_adjustment?: number | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          lane_adjustment?: number | null
          listing_id?: string | null
          origin_city?: string | null
          rules_applied_json?: Json | null
          surge_adjustment?: number | null
          surge_factors_json?: Json | null
          tenant_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "freight_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          conditions_json: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          rule_type: string
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          adjustment_type?: string
          adjustment_value?: number
          conditions_json?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          rule_type?: string
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          conditions_json?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          rule_type?: string
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          customer_description: string | null
          customer_display_name: string | null
          customer_visible: boolean | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          min_price: number | null
          name: string
          purchase_pricing_model: Database["public"]["Enums"]["pricing_model"]
          purchase_rate: number
          sales_pricing_model: Database["public"]["Enums"]["pricing_model"]
          sales_rate: number
          sort_order: number
          tenant_id: string | null
          updated_at: string
          vat_percentage: number
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          customer_description?: string | null
          customer_display_name?: string | null
          customer_visible?: boolean | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          min_price?: number | null
          name: string
          purchase_pricing_model?: Database["public"]["Enums"]["pricing_model"]
          purchase_rate?: number
          sales_pricing_model?: Database["public"]["Enums"]["pricing_model"]
          sales_rate?: number
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
          vat_percentage?: number
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          customer_description?: string | null
          customer_display_name?: string | null
          customer_visible?: boolean | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          min_price?: number | null
          name?: string
          purchase_pricing_model?: Database["public"]["Enums"]["pricing_model"]
          purchase_rate?: number
          sales_pricing_model?: Database["public"]["Enums"]["pricing_model"]
          sales_rate?: number
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
          vat_percentage?: number
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_audit_log: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          is_rectification: boolean | null
          metadata: Json | null
          rectifies_event_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          is_rectification?: boolean | null
          metadata?: Json | null
          rectifies_event_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          is_rectification?: boolean | null
          metadata?: Json | null
          rectifies_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_audit_log_rectifies_event_id_fkey"
            columns: ["rectifies_event_id"]
            isOneToOne: false
            referencedRelation: "program_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      program_shifts: {
        Row: {
          application_deadline: string | null
          assigned_at: string | null
          assigned_driver_id: string | null
          auto_approve_threshold: number | null
          carrier_id: string | null
          compensation_amount: number | null
          compensation_type:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          create_order_on_approval: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_address: string
          delivery_city: string | null
          delivery_company: string | null
          delivery_country: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_postal_code: string | null
          driver_instructions: string | null
          drivers_needed: number | null
          end_time: string | null
          estimated_duration_hours: number | null
          id: string
          linked_trip_id: string | null
          notes: string | null
          pickup_address: string
          pickup_city: string | null
          pickup_company: string | null
          pickup_country: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_postal_code: string | null
          required_vehicle_id: string | null
          requires_adr: boolean | null
          requires_cooling: boolean | null
          requires_tail_lift: boolean | null
          show_compensation_to_driver: boolean | null
          start_time: string
          status: Database["public"]["Enums"]["shift_status"] | null
          surge_bonus: number | null
          title: string | null
          trip_date: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          application_deadline?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          auto_approve_threshold?: number | null
          carrier_id?: string | null
          compensation_amount?: number | null
          compensation_type?:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          create_order_on_approval?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address: string
          delivery_city?: string | null
          delivery_company?: string | null
          delivery_country?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_postal_code?: string | null
          driver_instructions?: string | null
          drivers_needed?: number | null
          end_time?: string | null
          estimated_duration_hours?: number | null
          id?: string
          linked_trip_id?: string | null
          notes?: string | null
          pickup_address: string
          pickup_city?: string | null
          pickup_company?: string | null
          pickup_country?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_postal_code?: string | null
          required_vehicle_id?: string | null
          requires_adr?: boolean | null
          requires_cooling?: boolean | null
          requires_tail_lift?: boolean | null
          show_compensation_to_driver?: boolean | null
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          surge_bonus?: number | null
          title?: string | null
          trip_date: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          application_deadline?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          auto_approve_threshold?: number | null
          carrier_id?: string | null
          compensation_amount?: number | null
          compensation_type?:
            | Database["public"]["Enums"]["compensation_type"]
            | null
          create_order_on_approval?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string
          delivery_city?: string | null
          delivery_company?: string | null
          delivery_country?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_postal_code?: string | null
          driver_instructions?: string | null
          drivers_needed?: number | null
          end_time?: string | null
          estimated_duration_hours?: number | null
          id?: string
          linked_trip_id?: string | null
          notes?: string | null
          pickup_address?: string
          pickup_city?: string | null
          pickup_company?: string | null
          pickup_country?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_postal_code?: string | null
          required_vehicle_id?: string | null
          requires_adr?: boolean | null
          requires_cooling?: boolean | null
          requires_tail_lift?: boolean | null
          show_compensation_to_driver?: boolean | null
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          surge_bonus?: number | null
          title?: string | null
          trip_date?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_shifts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_shifts_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_shifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_shifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_shifts_linked_trip_id_fkey"
            columns: ["linked_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_shifts_required_vehicle_id_fkey"
            columns: ["required_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_of_delivery: {
        Row: {
          captured_at: string
          created_at: string
          created_by_driver_id: string | null
          documents_urls: string[] | null
          geo_lat: number | null
          geo_lng: number | null
          hash: string | null
          id: string
          method: Database["public"]["Enums"]["pod_method"]
          notes: string | null
          order_id: string
          photos_urls: string[] | null
          signature_blob_url: string | null
          signed_name: string | null
          stop_id: string | null
          tenant_id: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          created_by_driver_id?: string | null
          documents_urls?: string[] | null
          geo_lat?: number | null
          geo_lng?: number | null
          hash?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pod_method"]
          notes?: string | null
          order_id: string
          photos_urls?: string[] | null
          signature_blob_url?: string | null
          signed_name?: string | null
          stop_id?: string | null
          tenant_id: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          created_by_driver_id?: string | null
          documents_urls?: string[] | null
          geo_lat?: number | null
          geo_lng?: number | null
          hash?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pod_method"]
          notes?: string | null
          order_id?: string
          photos_urls?: string[] | null
          signature_blob_url?: string | null
          signed_name?: string | null
          stop_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_delivery_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_delivery_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_packs: {
        Row: {
          created_at: string | null
          document_hash: string | null
          generated_pdf_url: string | null
          id: string
          included_items_json: Json
          shipment_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          document_hash?: string | null
          generated_pdf_url?: string | null
          id?: string
          included_items_json?: Json
          shipment_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          document_hash?: string | null
          generated_pdf_url?: string | null
          id?: string
          included_items_json?: Json
          shipment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_packs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_packs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_email_log: {
        Row: {
          attachments_sent: string[] | null
          company_id: string
          created_at: string | null
          delivery_status: string | null
          email_body: string | null
          email_subject: string
          id: string
          purchase_invoice_id: string
          recipient_email: string
          recipient_name: string | null
          resend_message_id: string | null
          sent_at: string | null
        }
        Insert: {
          attachments_sent?: string[] | null
          company_id: string
          created_at?: string | null
          delivery_status?: string | null
          email_body?: string | null
          email_subject: string
          id?: string
          purchase_invoice_id: string
          recipient_email: string
          recipient_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
        }
        Update: {
          attachments_sent?: string[] | null
          company_id?: string
          created_at?: string | null
          delivery_status?: string | null
          email_body?: string | null
          email_subject?: string
          id?: string
          purchase_invoice_id?: string
          recipient_email?: string
          recipient_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_email_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_email_log_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_lines: {
        Row: {
          created_at: string | null
          description: string
          id: string
          line_type: string | null
          purchase_invoice_id: string
          quantity: number | null
          total_price: number | null
          trip_id: string | null
          unit_price: number | null
          vat_amount: number | null
          vat_percentage: number | null
          vat_type: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          line_type?: string | null
          purchase_invoice_id: string
          quantity?: number | null
          total_price?: number | null
          trip_id?: string | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          line_type?: string | null
          purchase_invoice_id?: string
          quantity?: number | null
          total_price?: number | null
          trip_id?: string | null
          unit_price?: number | null
          vat_amount?: number | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_lines_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_lines_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_settings: {
        Row: {
          auto_create_on_delivery: boolean | null
          company_id: string
          created_at: string | null
          default_payment_terms_days: number | null
          id: string
          next_invoice_number: number | null
          number_format: string | null
          number_padding: number | null
          number_prefix: string | null
          updated_at: string | null
        }
        Insert: {
          auto_create_on_delivery?: boolean | null
          company_id: string
          created_at?: string | null
          default_payment_terms_days?: number | null
          id?: string
          next_invoice_number?: number | null
          number_format?: string | null
          number_padding?: number | null
          number_prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_create_on_delivery?: boolean | null
          company_id?: string
          created_at?: string | null
          default_payment_terms_days?: number | null
          id?: string
          next_invoice_number?: number | null
          number_format?: string | null
          number_padding?: number | null
          number_prefix?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          amount_difference: number | null
          carrier_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          email_body: string | null
          email_subject: string | null
          external_invoice_amount: number | null
          external_invoice_date: string | null
          external_invoice_number: string | null
          external_invoice_received_at: string | null
          footnote: string | null
          id: string
          invoice_date: string
          invoice_number: string
          is_manual: boolean | null
          is_self_billing: boolean | null
          paid_amount: number | null
          paid_at: string | null
          payment_reference: string | null
          period_from: string | null
          period_to: string | null
          sent_at: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_note: string | null
          vat_percentage: number | null
          vat_type: string | null
        }
        Insert: {
          amount_difference?: number | null
          carrier_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          email_body?: string | null
          email_subject?: string | null
          external_invoice_amount?: number | null
          external_invoice_date?: string | null
          external_invoice_number?: string | null
          external_invoice_received_at?: string | null
          footnote?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          is_manual?: boolean | null
          is_self_billing?: boolean | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_from?: string | null
          period_to?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_note?: string | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Update: {
          amount_difference?: number | null
          carrier_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          email_body?: string | null
          email_subject?: string | null
          external_invoice_amount?: number | null
          external_invoice_date?: string | null
          external_invoice_number?: string | null
          external_invoice_received_at?: string | null
          footnote?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_manual?: boolean | null
          is_self_billing?: boolean | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_from?: string | null
          period_to?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_note?: string | null
          vat_percentage?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_logs: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          driver_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          driver_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          driver_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_cards: {
        Row: {
          base_rate: number
          created_at: string
          currency: string | null
          customer_id: string | null
          description: string | null
          distance_brackets: Json | null
          fuel_surcharge_percent: number | null
          id: string
          is_active: boolean | null
          min_charge: number | null
          name: string
          rate_type: Database["public"]["Enums"]["rate_type"]
          tenant_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
          vehicle_types: string[] | null
          weight_brackets: Json | null
          zones: Json | null
        }
        Insert: {
          base_rate: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          distance_brackets?: Json | null
          fuel_surcharge_percent?: number | null
          id?: string
          is_active?: boolean | null
          min_charge?: number | null
          name: string
          rate_type: Database["public"]["Enums"]["rate_type"]
          tenant_id: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
          vehicle_types?: string[] | null
          weight_brackets?: Json | null
          zones?: Json | null
        }
        Update: {
          base_rate?: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          distance_brackets?: Json | null
          fuel_surcharge_percent?: number | null
          id?: string
          is_active?: boolean | null
          min_charge?: number | null
          name?: string
          rate_type?: Database["public"]["Enums"]["rate_type"]
          tenant_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          vehicle_types?: string[] | null
          weight_brackets?: Json | null
          zones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_contracts: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          contract_type: Database["public"]["Enums"]["rate_contract_type"]
          counterparty_id: string
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          hash: string | null
          id: string
          name: string
          parent_version_id: string | null
          status: Database["public"]["Enums"]["rate_contract_status"]
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          contract_type: Database["public"]["Enums"]["rate_contract_type"]
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from: string
          effective_to?: string | null
          hash?: string | null
          id?: string
          name: string
          parent_version_id?: string | null
          status?: Database["public"]["Enums"]["rate_contract_status"]
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          contract_type?: Database["public"]["Enums"]["rate_contract_type"]
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          hash?: string | null
          id?: string
          name?: string
          parent_version_id?: string | null
          status?: Database["public"]["Enums"]["rate_contract_status"]
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_contracts_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "rate_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_lanes: {
        Row: {
          base_included_km: number | null
          base_price: number
          contract_id: string
          created_at: string
          destination_zone_id: string | null
          fuel_surcharge_rule_id: string | null
          grace_minutes_waiting: number | null
          id: string
          is_active: boolean | null
          max_transit_time_minutes: number | null
          min_charge: number | null
          night_fee: number | null
          origin_zone_id: string | null
          price_per_km: number | null
          price_per_stop: number | null
          priority: number | null
          rounding_rule: string | null
          service_level: string | null
          time_window_fee: number | null
          toll_rule_id: string | null
          updated_at: string
          vehicle_type: string | null
          waiting_tiers_json: Json | null
          weekend_fee: number | null
        }
        Insert: {
          base_included_km?: number | null
          base_price?: number
          contract_id: string
          created_at?: string
          destination_zone_id?: string | null
          fuel_surcharge_rule_id?: string | null
          grace_minutes_waiting?: number | null
          id?: string
          is_active?: boolean | null
          max_transit_time_minutes?: number | null
          min_charge?: number | null
          night_fee?: number | null
          origin_zone_id?: string | null
          price_per_km?: number | null
          price_per_stop?: number | null
          priority?: number | null
          rounding_rule?: string | null
          service_level?: string | null
          time_window_fee?: number | null
          toll_rule_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
          waiting_tiers_json?: Json | null
          weekend_fee?: number | null
        }
        Update: {
          base_included_km?: number | null
          base_price?: number
          contract_id?: string
          created_at?: string
          destination_zone_id?: string | null
          fuel_surcharge_rule_id?: string | null
          grace_minutes_waiting?: number | null
          id?: string
          is_active?: boolean | null
          max_transit_time_minutes?: number | null
          min_charge?: number | null
          night_fee?: number | null
          origin_zone_id?: string | null
          price_per_km?: number | null
          price_per_stop?: number | null
          priority?: number | null
          rounding_rule?: string | null
          service_level?: string | null
          time_window_fee?: number | null
          toll_rule_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
          waiting_tiers_json?: Json | null
          weekend_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_lanes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rate_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_lanes_destination_zone_id_fkey"
            columns: ["destination_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_lanes_fuel_surcharge_rule_id_fkey"
            columns: ["fuel_surcharge_rule_id"]
            isOneToOne: false
            referencedRelation: "surcharge_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_lanes_origin_zone_id_fkey"
            columns: ["origin_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_lanes_toll_rule_id_fkey"
            columns: ["toll_rule_id"]
            isOneToOne: false
            referencedRelation: "surcharge_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_results: {
        Row: {
          buy_breakdown_json: Json | null
          buy_total_excl: number
          carrier_contract_id: string | null
          carrier_contract_version: number | null
          created_at: string
          created_by: string | null
          customer_contract_id: string | null
          customer_contract_version: number | null
          id: string
          is_locked: boolean | null
          order_id: string
          rerate_required: boolean | null
          sell_breakdown_json: Json | null
          sell_total_excl: number
          snapshot_id: string | null
          tenant_id: string
          warnings_json: Json | null
        }
        Insert: {
          buy_breakdown_json?: Json | null
          buy_total_excl?: number
          carrier_contract_id?: string | null
          carrier_contract_version?: number | null
          created_at?: string
          created_by?: string | null
          customer_contract_id?: string | null
          customer_contract_version?: number | null
          id?: string
          is_locked?: boolean | null
          order_id: string
          rerate_required?: boolean | null
          sell_breakdown_json?: Json | null
          sell_total_excl?: number
          snapshot_id?: string | null
          tenant_id: string
          warnings_json?: Json | null
        }
        Update: {
          buy_breakdown_json?: Json | null
          buy_total_excl?: number
          carrier_contract_id?: string | null
          carrier_contract_version?: number | null
          created_at?: string
          created_by?: string | null
          customer_contract_id?: string | null
          customer_contract_version?: number | null
          id?: string
          is_locked?: boolean | null
          order_id?: string
          rerate_required?: boolean | null
          sell_breakdown_json?: Json | null
          sell_total_excl?: number
          snapshot_id?: string | null
          tenant_id?: string
          warnings_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_results_carrier_contract_id_fkey"
            columns: ["carrier_contract_id"]
            isOneToOne: false
            referencedRelation: "rate_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_results_customer_contract_id_fkey"
            columns: ["customer_contract_id"]
            isOneToOne: false
            referencedRelation: "rate_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_issues: {
        Row: {
          assigned_at: string | null
          assignment_note: string | null
          batch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["staging_entity_type"] | null
          id: string
          message: string
          owner_id: string | null
          owner_user_id: string | null
          project_id: string
          resolved_at: string | null
          severity: string
          staging_record_id: string | null
          status: Database["public"]["Enums"]["reconciliation_issue_status"]
          suggested_fix_action: string | null
          type: string
        }
        Insert: {
          assigned_at?: string | null
          assignment_note?: string | null
          batch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["staging_entity_type"]
            | null
          id?: string
          message: string
          owner_id?: string | null
          owner_user_id?: string | null
          project_id: string
          resolved_at?: string | null
          severity?: string
          staging_record_id?: string | null
          status?: Database["public"]["Enums"]["reconciliation_issue_status"]
          suggested_fix_action?: string | null
          type: string
        }
        Update: {
          assigned_at?: string | null
          assignment_note?: string | null
          batch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["staging_entity_type"]
            | null
          id?: string
          message?: string
          owner_id?: string | null
          owner_user_id?: string | null
          project_id?: string
          resolved_at?: string | null
          severity?: string
          staging_record_id?: string | null
          status?: Database["public"]["Enums"]["reconciliation_issue_status"]
          suggested_fix_action?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_issues_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_issues_staging_record_id_fkey"
            columns: ["staging_record_id"]
            isOneToOne: false
            referencedRelation: "staging_records"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_reports: {
        Row: {
          batch_id: string | null
          generated_at: string
          id: string
          issues_count: number | null
          metrics_json: Json | null
          project_id: string
          report_file_url: string | null
          status: Database["public"]["Enums"]["reconciliation_status"]
        }
        Insert: {
          batch_id?: string | null
          generated_at?: string
          id?: string
          issues_count?: number | null
          metrics_json?: Json | null
          project_id: string
          report_file_url?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
        }
        Update: {
          batch_id?: string | null
          generated_at?: string
          id?: string
          issues_count?: number | null
          metrics_json?: Json | null
          project_id?: string
          report_file_url?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_reports_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bookings: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          name: string
          next_run_at: string | null
          schedule_json: Json
          status: string | null
          template_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          name: string
          next_run_at?: string | null
          schedule_json?: Json
          status?: string | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          name?: string
          next_run_at?: string | null
          schedule_json?: Json
          status?: string | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "booking_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_costs: {
        Row: {
          amount: number
          auto_book: boolean | null
          company_id: string | null
          cost_center: string | null
          created_at: string
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          next_due_date: string | null
          start_date: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at: string
          vat_percentage: number | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          auto_book?: boolean | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          next_due_date?: string | null
          start_date: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
          vat_percentage?: number | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          auto_book?: boolean | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          next_due_date?: string | null
          start_date?: string
          transaction_type?: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
          vat_percentage?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_order_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          scheduled_date: string
          status: string | null
          template_id: string | null
          trip_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          scheduled_date: string
          status?: string | null
          template_id?: string | null
          trip_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          scheduled_date?: string
          status?: string | null
          template_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_order_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "order_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_order_runs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_moments: {
        Row: {
          account_id: string
          created_at: string
          done_at: string | null
          id: string
          status: string
          suggested_actions_json: Json | null
          tenant_id: string
          trigger_entity_id: string | null
          trigger_event_key: string | null
          type: string
        }
        Insert: {
          account_id: string
          created_at?: string
          done_at?: string | null
          id?: string
          status?: string
          suggested_actions_json?: Json | null
          tenant_id: string
          trigger_entity_id?: string | null
          trigger_event_key?: string | null
          type: string
        }
        Update: {
          account_id?: string
          created_at?: string
          done_at?: string | null
          id?: string
          status?: string
          suggested_actions_json?: Json | null
          tenant_id?: string
          trigger_entity_id?: string | null
          trigger_event_key?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_moments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_moments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_moments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_profiles: {
        Row: {
          account_id: string
          created_at: string
          id: string
          key_people_json: Json | null
          preferences_json: Json | null
          relationship_score_0_100: number | null
          tenant_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          key_people_json?: Json | null
          preferences_json?: Json | null
          relationship_score_0_100?: number | null
          tenant_id: string
          tier?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          key_people_json?: Json | null
          preferences_json?: Json | null
          relationship_score_0_100?: number | null
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          action: string
          created_at: string
          entity_type: string
          id: string
          is_active: boolean | null
          retention_days: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          entity_type: string
          id?: string
          is_active?: boolean | null
          retention_days: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean | null
          retention_days?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_conversions: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          rate_proposal_id: string | null
          rfq_message_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          rate_proposal_id?: string | null
          rfq_message_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          rate_proposal_id?: string | null
          rfq_message_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_conversions_rfq_message_id_fkey"
            columns: ["rfq_message_id"]
            isOneToOne: false
            referencedRelation: "rfq_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_conversions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_messages: {
        Row: {
          attachment_urls: string[] | null
          body_text: string | null
          created_at: string
          extracted_json: Json | null
          extraction_confidence: number | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_email: string | null
          sender_name: string | null
          source: string
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          body_text?: string | null
          created_at?: string
          extracted_json?: Json | null
          extraction_confidence?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          body_text?: string | null
          created_at?: string
          extracted_json?: Json | null
          extraction_confidence?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rollback_plans: {
        Row: {
          batch_id: string
          can_rollback: boolean
          created_at: string
          executed_at: string | null
          executed_by: string | null
          id: string
          project_id: string
          rollback_scope_json: Json | null
          status: Database["public"]["Enums"]["rollback_status"]
        }
        Insert: {
          batch_id: string
          can_rollback?: boolean
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          project_id: string
          rollback_scope_json?: Json | null
          status?: Database["public"]["Enums"]["rollback_status"]
        }
        Update: {
          batch_id?: string
          can_rollback?: boolean
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          project_id?: string
          rollback_scope_json?: Json | null
          status?: Database["public"]["Enums"]["rollback_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rollback_plans_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollback_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "migration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      route_optimizations: {
        Row: {
          constraints: Json | null
          cost_saved: number | null
          created_at: string
          created_by: string | null
          distance_saved_km: number | null
          estimated_cost: number | null
          id: string
          input_orders: Json | null
          input_vehicles: Json | null
          name: string
          optimization_date: string
          optimized_routes: Json | null
          orders_count: number
          status: string
          tenant_id: string
          time_saved_minutes: number | null
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string
          vehicles_count: number
        }
        Insert: {
          constraints?: Json | null
          cost_saved?: number | null
          created_at?: string
          created_by?: string | null
          distance_saved_km?: number | null
          estimated_cost?: number | null
          id?: string
          input_orders?: Json | null
          input_vehicles?: Json | null
          name: string
          optimization_date: string
          optimized_routes?: Json | null
          orders_count: number
          status?: string
          tenant_id: string
          time_saved_minutes?: number | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string
          vehicles_count: number
        }
        Update: {
          constraints?: Json | null
          cost_saved?: number | null
          created_at?: string
          created_by?: string | null
          distance_saved_km?: number | null
          estimated_cost?: number | null
          id?: string
          input_orders?: Json | null
          input_vehicles?: Json | null
          name?: string
          optimization_date?: string
          optimized_routes?: Json | null
          orders_count?: number
          status?: string
          tenant_id?: string
          time_saved_minutes?: number | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string
          vehicles_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_optimizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          actual_arrival: string | null
          address: string
          auto_waiting_calculated: boolean | null
          cargo_description: string | null
          city: string | null
          colli_count: number | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          customer_reference: string | null
          dimensions: string | null
          driver_remarks: string | null
          estimated_arrival: string | null
          house_number: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          save_to_address_book: boolean | null
          status: string
          stop_order: number
          stop_type: string
          time_window_end: string | null
          time_window_start: string | null
          trip_id: string
          updated_at: string
          waiting_ended_at: string | null
          waiting_minutes: number | null
          waiting_started_at: string | null
          waybill_number: string | null
          weight_kg: number | null
        }
        Insert: {
          actual_arrival?: string | null
          address: string
          auto_waiting_calculated?: boolean | null
          cargo_description?: string | null
          city?: string | null
          colli_count?: number | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_reference?: string | null
          dimensions?: string | null
          driver_remarks?: string | null
          estimated_arrival?: string | null
          house_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          save_to_address_book?: boolean | null
          status?: string
          stop_order: number
          stop_type?: string
          time_window_end?: string | null
          time_window_start?: string | null
          trip_id: string
          updated_at?: string
          waiting_ended_at?: string | null
          waiting_minutes?: number | null
          waiting_started_at?: string | null
          waybill_number?: string | null
          weight_kg?: number | null
        }
        Update: {
          actual_arrival?: string | null
          address?: string
          auto_waiting_calculated?: boolean | null
          cargo_description?: string | null
          city?: string | null
          colli_count?: number | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          customer_reference?: string | null
          dimensions?: string | null
          driver_remarks?: string | null
          estimated_arrival?: string | null
          house_number?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          save_to_address_book?: boolean | null
          status?: string
          stop_order?: number
          stop_type?: string
          time_window_end?: string | null
          time_window_start?: string | null
          trip_id?: string
          updated_at?: string
          waiting_ended_at?: string | null
          waiting_minutes?: number | null
          waiting_started_at?: string | null
          waybill_number?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_profiles: {
        Row: {
          confidence_threshold_bank: number | null
          confidence_threshold_scan: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          min_cash_buffer: number | null
          name: string
          require_contract_for_payouts: boolean | null
          require_no_holds: boolean | null
          require_pod_if_configured: boolean | null
          tenant_id: string
          two_person_approval_threshold: number | null
          updated_at: string
        }
        Insert: {
          confidence_threshold_bank?: number | null
          confidence_threshold_scan?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_cash_buffer?: number | null
          name: string
          require_contract_for_payouts?: boolean | null
          require_no_holds?: boolean | null
          require_pod_if_configured?: boolean | null
          tenant_id: string
          two_person_approval_threshold?: number | null
          updated_at?: string
        }
        Update: {
          confidence_threshold_bank?: number | null
          confidence_threshold_scan?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_cash_buffer?: number | null
          name?: string
          require_contract_for_payouts?: boolean | null
          require_no_holds?: boolean | null
          require_pod_if_configured?: boolean | null
          tenant_id?: string
          two_person_approval_threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_processes: {
        Row: {
          account_id: string
          created_at: string
          deal_id: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          owner_user_id: string | null
          probability_percent: number | null
          stage: string
          tenant_id: string
          title: string
          updated_at: string
          value_estimate: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          deal_id?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          probability_percent?: number | null
          stage?: string
          tenant_id: string
          title: string
          updated_at?: string
          value_estimate?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          deal_id?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          probability_percent?: number | null
          stage?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          value_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_processes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_processes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_processes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          columns_json: Json | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          default_format: string | null
          description: string | null
          email_recipients: string[] | null
          filters_json: Json | null
          group_by: string[] | null
          id: string
          is_public: boolean | null
          is_scheduled: boolean | null
          last_run_at: string | null
          name: string
          report_type: string
          schedule_day: number | null
          schedule_frequency: string | null
          sort_by: string | null
          sort_direction: string | null
          updated_at: string | null
        }
        Insert: {
          columns_json?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_format?: string | null
          description?: string | null
          email_recipients?: string[] | null
          filters_json?: Json | null
          group_by?: string[] | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          last_run_at?: string | null
          name: string
          report_type: string
          schedule_day?: number | null
          schedule_frequency?: string | null
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
        }
        Update: {
          columns_json?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_format?: string | null
          description?: string | null
          email_recipients?: string[] | null
          filters_json?: Json | null
          group_by?: string[] | null
          id?: string
          is_public?: boolean | null
          is_scheduled?: boolean | null
          last_run_at?: string | null
          name?: string
          report_type?: string
          schedule_day?: number | null
          schedule_frequency?: string | null
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_settings: {
        Row: {
          allowed_services: string[] | null
          can_create_bookings: boolean | null
          can_download_documents: boolean | null
          can_request_quotes: boolean | null
          can_track_shipments: boolean | null
          created_at: string | null
          custom_pricing_rules_json: Json | null
          customer_id: string
          id: string
          max_bookings_per_day: number | null
          requires_approval_above: number | null
          restricted_lanes: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_services?: string[] | null
          can_create_bookings?: boolean | null
          can_download_documents?: boolean | null
          can_request_quotes?: boolean | null
          can_track_shipments?: boolean | null
          created_at?: string | null
          custom_pricing_rules_json?: Json | null
          customer_id: string
          id?: string
          max_bookings_per_day?: number | null
          requires_approval_above?: number | null
          restricted_lanes?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_services?: string[] | null
          can_create_bookings?: boolean | null
          can_download_documents?: boolean | null
          can_request_quotes?: boolean | null
          can_track_shipments?: boolean | null
          created_at?: string | null
          custom_pricing_rules_json?: Json | null
          customer_id?: string
          id?: string
          max_bookings_per_day?: number | null
          requires_approval_above?: number | null
          restricted_lanes?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "self_service_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_service_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_applications: {
        Row: {
          created_at: string
          driver_id: string
          driver_note: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_id: string
          status: Database["public"]["Enums"]["shift_application_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          driver_note?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id: string
          status?:
            | Database["public"]["Enums"]["shift_application_status"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          driver_note?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id?: string
          status?:
            | Database["public"]["Enums"]["shift_application_status"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "program_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          access_token: string | null
          auth_method: Database["public"]["Enums"]["auth_method"]
          contract_id: string
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          last_reminder_at: string | null
          otp_code: string | null
          otp_expires_at: string | null
          otp_hash: string | null
          reminder_count: number | null
          sent_at: string | null
          signature_data: string | null
          signature_ip: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          signer_phone: string | null
          signer_role: string
          signer_user_id: string | null
          signing_order: number
          status: Database["public"]["Enums"]["signature_status"]
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          access_token?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          contract_id: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          last_reminder_at?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_hash?: string | null
          reminder_count?: number | null
          sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          signer_phone?: string | null
          signer_role: string
          signer_user_id?: string | null
          signing_order?: number
          status?: Database["public"]["Enums"]["signature_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          access_token?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          contract_id?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          last_reminder_at?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_hash?: string | null
          reminder_count?: number | null
          sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          signer_phone?: string | null
          signer_role?: string
          signer_user_id?: string | null
          signing_order?: number
          status?: Database["public"]["Enums"]["signature_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_fingerprints: {
        Row: {
          created_at: string
          email_domain: string | null
          fingerprint_hash: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_domain?: string | null
          fingerprint_hash: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_domain?: string | null
          fingerprint_hash?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_fingerprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_scenarios: {
        Row: {
          base_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          parameters_json: Json
          results_json: Json | null
          run_completed_at: string | null
          run_started_at: string | null
          scenario_type: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          base_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parameters_json?: Json
          results_json?: Json | null
          run_completed_at?: string | null
          run_started_at?: string | null
          scenario_type?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          base_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parameters_json?: Json
          results_json?: Json | null
          run_completed_at?: string | null
          run_started_at?: string | null
          scenario_type?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_definitions: {
        Row: {
          bonus_amount: number | null
          bonus_threshold: number | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          measurement_period: string | null
          metric_type: string
          name: string
          penalty_amount: number | null
          penalty_type: string | null
          target_unit: string
          target_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bonus_amount?: number | null
          bonus_threshold?: number | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          measurement_period?: string | null
          metric_type: string
          name: string
          penalty_amount?: number | null
          penalty_type?: string | null
          target_unit: string
          target_value: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bonus_amount?: number | null
          bonus_threshold?: number | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          measurement_period?: string | null
          metric_type?: string
          name?: string
          penalty_amount?: number | null
          penalty_type?: string | null
          target_unit?: string
          target_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_definitions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_definitions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_penalties: {
        Row: {
          actual_value: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          auto_calculated: boolean | null
          created_at: string
          currency: string | null
          customer_id: string
          description: string
          deviation_minutes: number | null
          id: string
          invoice_id: string | null
          penalty_type: string
          sla_target: string | null
          status: string
          tenant_id: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          auto_calculated?: boolean | null
          created_at?: string
          currency?: string | null
          customer_id: string
          description: string
          deviation_minutes?: number | null
          id?: string
          invoice_id?: string | null
          penalty_type: string
          sla_target?: string | null
          status?: string
          tenant_id: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          auto_calculated?: boolean | null
          created_at?: string
          currency?: string | null
          customer_id?: string
          description?: string
          deviation_minutes?: number | null
          id?: string
          invoice_id?: string | null
          penalty_type?: string
          sla_target?: string | null
          status?: string
          tenant_id?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_penalties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_penalties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_penalties_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_penalties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_penalties_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_performance: {
        Row: {
          actual_value: number
          bonus_applied: number | null
          compliance_percent: number | null
          created_at: string
          id: string
          is_met: boolean
          notes: string | null
          penalty_applied: number | null
          period_end: string
          period_start: string
          sla_id: string
          target_value: number
          tenant_id: string
        }
        Insert: {
          actual_value: number
          bonus_applied?: number | null
          compliance_percent?: number | null
          created_at?: string
          id?: string
          is_met: boolean
          notes?: string | null
          penalty_applied?: number | null
          period_end: string
          period_start: string
          sla_id: string
          target_value: number
          tenant_id: string
        }
        Update: {
          actual_value?: number
          bonus_applied?: number | null
          compliance_percent?: number | null
          created_at?: string
          id?: string
          is_met?: boolean
          notes?: string | null
          penalty_applied?: number | null
          period_end?: string
          period_start?: string
          sla_id?: string
          target_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_performance_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_configs: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          metadata_json: Json | null
          provider_name: string | null
          provider_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          metadata_json?: Json | null
          provider_name?: string | null
          provider_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          metadata_json?: Json | null
          provider_name?: string | null
          provider_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_records: {
        Row: {
          batch_id: string
          created_at: string
          dedupe_key: string | null
          entity_type: Database["public"]["Enums"]["staging_entity_type"]
          error_list_json: Json | null
          id: string
          linked_target_id: string | null
          normalized_json: Json | null
          source_row_json: Json
          status: Database["public"]["Enums"]["staging_record_status"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          dedupe_key?: string | null
          entity_type: Database["public"]["Enums"]["staging_entity_type"]
          error_list_json?: Json | null
          id?: string
          linked_target_id?: string | null
          normalized_json?: Json | null
          source_row_json: Json
          status?: Database["public"]["Enums"]["staging_record_status"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          dedupe_key?: string | null
          entity_type?: Database["public"]["Enums"]["staging_entity_type"]
          error_list_json?: Json | null
          id?: string
          linked_target_id?: string | null
          normalized_json?: Json | null
          source_row_json?: Json
          status?: Database["public"]["Enums"]["staging_record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_proofs: {
        Row: {
          accuracy: number | null
          actual_distance_km: number | null
          arrival_time: string | null
          created_at: string
          departure_time: string | null
          driver_id: string
          id: string
          latitude: number | null
          loading_minutes: number | null
          longitude: number | null
          note: string | null
          photo_urls: string[] | null
          receiver_first_name: string | null
          receiver_last_name: string | null
          signature_url: string | null
          stop_id: string
          sub_status: string | null
          trip_id: string
          updated_at: string
          waiting_minutes: number | null
        }
        Insert: {
          accuracy?: number | null
          actual_distance_km?: number | null
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          driver_id: string
          id?: string
          latitude?: number | null
          loading_minutes?: number | null
          longitude?: number | null
          note?: string | null
          photo_urls?: string[] | null
          receiver_first_name?: string | null
          receiver_last_name?: string | null
          signature_url?: string | null
          stop_id: string
          sub_status?: string | null
          trip_id: string
          updated_at?: string
          waiting_minutes?: number | null
        }
        Update: {
          accuracy?: number | null
          actual_distance_km?: number | null
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          driver_id?: string
          id?: string
          latitude?: number | null
          loading_minutes?: number | null
          longitude?: number | null
          note?: string | null
          photo_urls?: string[] | null
          receiver_first_name?: string | null
          receiver_last_name?: string | null
          signature_url?: string | null
          stop_id?: string
          sub_status?: string | null
          trip_id?: string
          updated_at?: string
          waiting_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stop_proofs_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stop_proofs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          aisle: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_pickable: boolean | null
          level: string | null
          location_type: string | null
          max_volume_m3: number | null
          max_weight_kg: number | null
          position: string | null
          rack: string | null
          sort_order: number | null
          warehouse_id: string
          zone_id: string | null
        }
        Insert: {
          aisle?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pickable?: boolean | null
          level?: string | null
          location_type?: string | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          position?: string | null
          rack?: string | null
          sort_order?: number | null
          warehouse_id: string
          zone_id?: string | null
        }
        Update: {
          aisle?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pickable?: boolean | null
          level?: string | null
          location_type?: string | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          position?: string | null
          rack?: string | null
          sort_order?: number | null
          warehouse_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_locations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_provider: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge_text: string | null
          created_at: string
          description: string | null
          features_json: Json
          id: string
          is_active: boolean
          max_orders_month: number
          max_users: number
          max_vehicles: number
          name: string
          price_monthly_eur: number
          price_yearly_eur: number
          slug: string
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          features_json?: Json
          id?: string
          is_active?: boolean
          max_orders_month?: number
          max_users?: number
          max_vehicles?: number
          name: string
          price_monthly_eur?: number
          price_yearly_eur?: number
          slug: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          description?: string | null
          features_json?: Json
          id?: string
          is_active?: boolean
          max_orders_month?: number
          max_users?: number
          max_vehicles?: number
          name?: string
          price_monthly_eur?: number
          price_yearly_eur?: number
          slug?: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      surcharge_rules: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          method: Database["public"]["Enums"]["surcharge_method"]
          name: string
          payload_json: Json | null
          surcharge_type: Database["public"]["Enums"]["surcharge_type"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          method?: Database["public"]["Enums"]["surcharge_method"]
          name: string
          payload_json?: Json | null
          surcharge_type: Database["public"]["Enums"]["surcharge_type"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          method?: Database["public"]["Enums"]["surcharge_method"]
          name?: string
          payload_json?: Json | null
          surcharge_type?: Database["public"]["Enums"]["surcharge_type"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surcharge_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      surge_factors: {
        Row: {
          active_from: string | null
          active_until: string | null
          applies_to_countries: string[] | null
          applies_to_regions: string[] | null
          calculation_source: string | null
          created_at: string
          description: string | null
          factor_type: string
          id: string
          is_active: boolean | null
          is_auto_calculated: boolean | null
          multiplier: number
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          applies_to_countries?: string[] | null
          applies_to_regions?: string[] | null
          calculation_source?: string | null
          created_at?: string
          description?: string | null
          factor_type: string
          id?: string
          is_active?: boolean | null
          is_auto_calculated?: boolean | null
          multiplier?: number
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          applies_to_countries?: string[] | null
          applies_to_regions?: string[] | null
          calculation_source?: string | null
          created_at?: string
          description?: string | null
          factor_type?: string
          id?: string
          is_active?: boolean | null
          is_auto_calculated?: boolean | null
          multiplier?: number
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surge_factors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          check_type: string
          checked_at: string
          details_json: Json | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          details_json?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          details_json?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      telematics_connections: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          provider: string
          status: string
          sync_interval_minutes: number | null
          tenant_id: string
          updated_at: string
          vehicles_linked: number | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          provider: string
          status?: string
          sync_interval_minutes?: number | null
          tenant_id: string
          updated_at?: string
          vehicles_linked?: number | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          status?: string
          sync_interval_minutes?: number | null
          tenant_id?: string
          updated_at?: string
          vehicles_linked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telematics_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_integrations: {
        Row: {
          api_endpoint: string | null
          created_at: string
          credentials_encrypted: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          polling_interval_seconds: number | null
          provider: string
          sync_diagnostics: boolean | null
          sync_fuel: boolean | null
          sync_locations: boolean | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          polling_interval_seconds?: number | null
          provider: string
          sync_diagnostics?: boolean | null
          sync_fuel?: boolean | null
          sync_locations?: boolean | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string
          credentials_encrypted?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          polling_interval_seconds?: number | null
          provider?: string
          sync_diagnostics?: boolean | null
          sync_fuel?: boolean | null
          sync_locations?: boolean | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telematics_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_providers: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          settings_json: Json | null
          sync_interval_minutes: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          settings_json?: Json | null
          sync_interval_minutes?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          settings_json?: Json | null
          sync_interval_minutes?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telematics_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          attach_documents_to_invoice: boolean
          attach_documents_to_purchase_invoice: boolean
          auto_send_pod_email: boolean
          company_address: string | null
          company_bic: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_iban: string | null
          company_id: string | null
          company_kvk_number: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          company_postal_code: string | null
          company_vat_number: string | null
          composite_route_product_id: string | null
          created_at: string
          default_delivery_confirmation_enabled: boolean | null
          default_delivery_confirmation_per_stop: boolean | null
          driver_app_auto_save_distance: boolean
          driver_app_auto_save_loading: boolean
          driver_app_auto_save_waiting: boolean
          driver_app_completed_stops_bottom: boolean
          driver_app_separate_remarks_field: boolean
          driver_app_show_cmr: boolean
          driver_app_show_waybill: boolean
          driver_app_use_arrival_departure_times: boolean
          enable_booking_approval_flow: boolean | null
          enable_booking_templates: boolean | null
          enable_bulk_booking_import: boolean | null
          enable_change_requests: boolean | null
          enable_delivery_options: boolean | null
          enable_invoice_disputes: boolean | null
          enable_location_addressbook: boolean | null
          enable_multi_user_roles: boolean | null
          enable_pricing_transparency: boolean | null
          enable_proof_pack: boolean | null
          enable_recurring_bookings: boolean | null
          enable_savings_widgets: boolean | null
          enable_waiting_transparency: boolean | null
          enable_weekly_reports: boolean | null
          id: string
          onboarding_completed_at: string | null
          pod_email_recipients: string[] | null
          route_end_location: string
          route_eta_margin_after_minutes: number
          route_eta_margin_before_minutes: number
          route_optimization_provider: string
          route_service_time_minutes: number
          route_speed_percentage: number
          route_start_location: string
          route_vehicle_type: string
          show_documents_in_driver_app: boolean
          show_purchase_price_to_driver: boolean
          theme_mode: string | null
          theme_preset: string | null
          updated_at: string
        }
        Insert: {
          attach_documents_to_invoice?: boolean
          attach_documents_to_purchase_invoice?: boolean
          auto_send_pod_email?: boolean
          company_address?: string | null
          company_bic?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_iban?: string | null
          company_id?: string | null
          company_kvk_number?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_vat_number?: string | null
          composite_route_product_id?: string | null
          created_at?: string
          default_delivery_confirmation_enabled?: boolean | null
          default_delivery_confirmation_per_stop?: boolean | null
          driver_app_auto_save_distance?: boolean
          driver_app_auto_save_loading?: boolean
          driver_app_auto_save_waiting?: boolean
          driver_app_completed_stops_bottom?: boolean
          driver_app_separate_remarks_field?: boolean
          driver_app_show_cmr?: boolean
          driver_app_show_waybill?: boolean
          driver_app_use_arrival_departure_times?: boolean
          enable_booking_approval_flow?: boolean | null
          enable_booking_templates?: boolean | null
          enable_bulk_booking_import?: boolean | null
          enable_change_requests?: boolean | null
          enable_delivery_options?: boolean | null
          enable_invoice_disputes?: boolean | null
          enable_location_addressbook?: boolean | null
          enable_multi_user_roles?: boolean | null
          enable_pricing_transparency?: boolean | null
          enable_proof_pack?: boolean | null
          enable_recurring_bookings?: boolean | null
          enable_savings_widgets?: boolean | null
          enable_waiting_transparency?: boolean | null
          enable_weekly_reports?: boolean | null
          id?: string
          onboarding_completed_at?: string | null
          pod_email_recipients?: string[] | null
          route_end_location?: string
          route_eta_margin_after_minutes?: number
          route_eta_margin_before_minutes?: number
          route_optimization_provider?: string
          route_service_time_minutes?: number
          route_speed_percentage?: number
          route_start_location?: string
          route_vehicle_type?: string
          show_documents_in_driver_app?: boolean
          show_purchase_price_to_driver?: boolean
          theme_mode?: string | null
          theme_preset?: string | null
          updated_at?: string
        }
        Update: {
          attach_documents_to_invoice?: boolean
          attach_documents_to_purchase_invoice?: boolean
          auto_send_pod_email?: boolean
          company_address?: string | null
          company_bic?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_iban?: string | null
          company_id?: string | null
          company_kvk_number?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_vat_number?: string | null
          composite_route_product_id?: string | null
          created_at?: string
          default_delivery_confirmation_enabled?: boolean | null
          default_delivery_confirmation_per_stop?: boolean | null
          driver_app_auto_save_distance?: boolean
          driver_app_auto_save_loading?: boolean
          driver_app_auto_save_waiting?: boolean
          driver_app_completed_stops_bottom?: boolean
          driver_app_separate_remarks_field?: boolean
          driver_app_show_cmr?: boolean
          driver_app_show_waybill?: boolean
          driver_app_use_arrival_departure_times?: boolean
          enable_booking_approval_flow?: boolean | null
          enable_booking_templates?: boolean | null
          enable_bulk_booking_import?: boolean | null
          enable_change_requests?: boolean | null
          enable_delivery_options?: boolean | null
          enable_invoice_disputes?: boolean | null
          enable_location_addressbook?: boolean | null
          enable_multi_user_roles?: boolean | null
          enable_pricing_transparency?: boolean | null
          enable_proof_pack?: boolean | null
          enable_recurring_bookings?: boolean | null
          enable_savings_widgets?: boolean | null
          enable_waiting_transparency?: boolean | null
          enable_weekly_reports?: boolean | null
          id?: string
          onboarding_completed_at?: string | null
          pod_email_recipients?: string[] | null
          route_end_location?: string
          route_eta_margin_after_minutes?: number
          route_eta_margin_before_minutes?: number
          route_optimization_provider?: string
          route_service_time_minutes?: number
          route_speed_percentage?: number
          route_start_location?: string
          route_vehicle_type?: string
          show_documents_in_driver_app?: boolean
          show_purchase_price_to_driver?: boolean
          theme_mode?: string | null
          theme_preset?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_composite_route_product_id_fkey"
            columns: ["composite_route_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_provider: string | null
          payment_provider_id: string | null
          plan_id: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_provider?: string | null
          payment_provider_id?: string | null
          plan_id: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_provider?: string | null
          payment_provider_id?: string | null
          plan_id?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_invites: {
        Row: {
          carrier_id: string
          created_at: string
          id: string
          offered_price: number | null
          responded_at: string | null
          response_notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["tender_invite_status"]
          tender_id: string
          viewed_at: string | null
        }
        Insert: {
          carrier_id: string
          created_at?: string
          id?: string
          offered_price?: number | null
          responded_at?: string | null
          response_notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["tender_invite_status"]
          tender_id: string
          viewed_at?: string | null
        }
        Update: {
          carrier_id?: string
          created_at?: string
          id?: string
          offered_price?: number | null
          responded_at?: string | null
          response_notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["tender_invite_status"]
          tender_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_invites_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_invites_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_invites_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_templates: {
        Row: {
          company_id: string
          content_template: Json | null
          created_at: string
          default_deadline_hours: number | null
          default_pool_id: string | null
          default_vehicle_type: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content_template?: Json | null
          created_at?: string
          default_deadline_hours?: number | null
          default_pool_id?: string | null
          default_vehicle_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content_template?: Json | null
          created_at?: string
          default_deadline_hours?: number | null
          default_pool_id?: string | null
          default_vehicle_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_templates_default_pool_id_fkey"
            columns: ["default_pool_id"]
            isOneToOne: false
            referencedRelation: "carrier_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          auto_fallback_enabled: boolean | null
          company_id: string
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          expected_price_max: number | null
          expected_price_min: number | null
          fallback_pool_id: string | null
          id: string
          order_id: string | null
          status: Database["public"]["Enums"]["tender_status"]
          title: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          auto_fallback_enabled?: boolean | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          expected_price_max?: number | null
          expected_price_min?: number | null
          fallback_pool_id?: string | null
          id?: string
          order_id?: string | null
          status?: Database["public"]["Enums"]["tender_status"]
          title: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          auto_fallback_enabled?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          expected_price_max?: number | null
          expected_price_min?: number | null
          fallback_pool_id?: string | null
          id?: string
          order_id?: string | null
          status?: Database["public"]["Enums"]["tender_status"]
          title?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_fallback_pool_fkey"
            columns: ["fallback_pool_id"]
            isOneToOne: false
            referencedRelation: "carrier_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_access_log: {
        Row: {
          accessed_at: string | null
          id: string
          ip_hash: string
          token_attempted: string | null
          was_valid: boolean | null
        }
        Insert: {
          accessed_at?: string | null
          id?: string
          ip_hash: string
          token_attempted?: string | null
          was_valid?: boolean | null
        }
        Update: {
          accessed_at?: string | null
          id?: string
          ip_hash?: string
          token_attempted?: string | null
          was_valid?: boolean | null
        }
        Relationships: []
      }
      tracking_tokens: {
        Row: {
          access_count: number
          created_at: string
          customer_id: string | null
          expires_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          max_access_count: number | null
          token: string
          trip_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_access_count?: number | null
          token?: string
          trip_id: string
        }
        Update: {
          access_count?: number
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_access_count?: number | null
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tokens_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          created_at: string
          id: string
          is_custom: boolean | null
          key: string
          language_code: string
          namespace: string
          tenant_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_custom?: boolean | null
          key: string
          language_code: string
          namespace?: string
          tenant_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_custom?: boolean | null
          key?: string
          language_code?: string
          namespace?: string
          tenant_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          cargo_description: string | null
          carrier_contact_id: string | null
          carrier_hourly_rate: number | null
          carrier_id: string | null
          carrier_km_rate: number | null
          carrier_rate_type: string | null
          carrier_worked_hours: number | null
          checkout_completed_at: string | null
          checkout_completed_by: string | null
          cmr_number: string | null
          company_id: string | null
          confirmation_email: string | null
          created_at: string
          customer_display_status: string | null
          customer_id: string | null
          customer_notified_delivery: boolean | null
          customer_reference: string | null
          customer_status: string | null
          deleted_at: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_city: string | null
          delivery_company_name: string | null
          delivery_confirmation_sent_at: string | null
          delivery_contact_person: string | null
          delivery_country: string | null
          delivery_house_number: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_phone: string | null
          delivery_postal_code: string | null
          delivery_remarks: string | null
          delivery_time_from: string | null
          delivery_time_to: string | null
          dimensions: string | null
          dispatched_to_company_id: string | null
          distance_km: number | null
          driver_id: string | null
          estimated_arrival: string | null
          gross_profit: number | null
          id: string
          invoice_id: string | null
          is_composite: boolean
          is_subcontract_order: boolean | null
          load_unload_minutes: number | null
          notes: string | null
          order_number: string | null
          parent_trip_id: string | null
          pickup_address: string
          pickup_city: string | null
          pickup_company_name: string | null
          pickup_contact_person: string | null
          pickup_country: string | null
          pickup_house_number: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_phone: string | null
          pickup_postal_code: string | null
          pickup_remarks: string | null
          pickup_time_from: string | null
          pickup_time_to: string | null
          pod_available: boolean | null
          pod_available_at: string | null
          price: number | null
          price_locked: boolean | null
          primary_dispatch_id: string | null
          product_id: string | null
          profit_margin_pct: number | null
          purchase_distance_km: number | null
          purchase_invoice_id: string | null
          purchase_other_costs: number | null
          purchase_price_locked: boolean | null
          purchase_subtotal: number | null
          purchase_total: number | null
          remarks_internal: string | null
          remarks_invoice: string | null
          remarks_purchase_invoice: string | null
          remarks_waybill: string | null
          sales_discount_pct: number | null
          sales_distance_km: number | null
          sales_other_costs: number | null
          sales_subtotal: number | null
          sales_total: number | null
          sales_vat: number | null
          save_delivery_to_addressbook: boolean | null
          save_pickup_to_addressbook: boolean | null
          status: Database["public"]["Enums"]["trip_status"]
          sub_status: string | null
          total_weight_kg: number | null
          tracking_token: string | null
          travel_hours: number | null
          trip_date: string
          updated_at: string
          vehicle_id: string | null
          volume_m3: number | null
          wait_time_minutes: number | null
          waybill_number: string | null
          weight_kg: number | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          cargo_description?: string | null
          carrier_contact_id?: string | null
          carrier_hourly_rate?: number | null
          carrier_id?: string | null
          carrier_km_rate?: number | null
          carrier_rate_type?: string | null
          carrier_worked_hours?: number | null
          checkout_completed_at?: string | null
          checkout_completed_by?: string | null
          cmr_number?: string | null
          company_id?: string | null
          confirmation_email?: string | null
          created_at?: string
          customer_display_status?: string | null
          customer_id?: string | null
          customer_notified_delivery?: boolean | null
          customer_reference?: string | null
          customer_status?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_city?: string | null
          delivery_company_name?: string | null
          delivery_confirmation_sent_at?: string | null
          delivery_contact_person?: string | null
          delivery_country?: string | null
          delivery_house_number?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_phone?: string | null
          delivery_postal_code?: string | null
          delivery_remarks?: string | null
          delivery_time_from?: string | null
          delivery_time_to?: string | null
          dimensions?: string | null
          dispatched_to_company_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_arrival?: string | null
          gross_profit?: number | null
          id?: string
          invoice_id?: string | null
          is_composite?: boolean
          is_subcontract_order?: boolean | null
          load_unload_minutes?: number | null
          notes?: string | null
          order_number?: string | null
          parent_trip_id?: string | null
          pickup_address: string
          pickup_city?: string | null
          pickup_company_name?: string | null
          pickup_contact_person?: string | null
          pickup_country?: string | null
          pickup_house_number?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_phone?: string | null
          pickup_postal_code?: string | null
          pickup_remarks?: string | null
          pickup_time_from?: string | null
          pickup_time_to?: string | null
          pod_available?: boolean | null
          pod_available_at?: string | null
          price?: number | null
          price_locked?: boolean | null
          primary_dispatch_id?: string | null
          product_id?: string | null
          profit_margin_pct?: number | null
          purchase_distance_km?: number | null
          purchase_invoice_id?: string | null
          purchase_other_costs?: number | null
          purchase_price_locked?: boolean | null
          purchase_subtotal?: number | null
          purchase_total?: number | null
          remarks_internal?: string | null
          remarks_invoice?: string | null
          remarks_purchase_invoice?: string | null
          remarks_waybill?: string | null
          sales_discount_pct?: number | null
          sales_distance_km?: number | null
          sales_other_costs?: number | null
          sales_subtotal?: number | null
          sales_total?: number | null
          sales_vat?: number | null
          save_delivery_to_addressbook?: boolean | null
          save_pickup_to_addressbook?: boolean | null
          status?: Database["public"]["Enums"]["trip_status"]
          sub_status?: string | null
          total_weight_kg?: number | null
          tracking_token?: string | null
          travel_hours?: number | null
          trip_date: string
          updated_at?: string
          vehicle_id?: string | null
          volume_m3?: number | null
          wait_time_minutes?: number | null
          waybill_number?: string | null
          weight_kg?: number | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          cargo_description?: string | null
          carrier_contact_id?: string | null
          carrier_hourly_rate?: number | null
          carrier_id?: string | null
          carrier_km_rate?: number | null
          carrier_rate_type?: string | null
          carrier_worked_hours?: number | null
          checkout_completed_at?: string | null
          checkout_completed_by?: string | null
          cmr_number?: string | null
          company_id?: string | null
          confirmation_email?: string | null
          created_at?: string
          customer_display_status?: string | null
          customer_id?: string | null
          customer_notified_delivery?: boolean | null
          customer_reference?: string | null
          customer_status?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_city?: string | null
          delivery_company_name?: string | null
          delivery_confirmation_sent_at?: string | null
          delivery_contact_person?: string | null
          delivery_country?: string | null
          delivery_house_number?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_phone?: string | null
          delivery_postal_code?: string | null
          delivery_remarks?: string | null
          delivery_time_from?: string | null
          delivery_time_to?: string | null
          dimensions?: string | null
          dispatched_to_company_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_arrival?: string | null
          gross_profit?: number | null
          id?: string
          invoice_id?: string | null
          is_composite?: boolean
          is_subcontract_order?: boolean | null
          load_unload_minutes?: number | null
          notes?: string | null
          order_number?: string | null
          parent_trip_id?: string | null
          pickup_address?: string
          pickup_city?: string | null
          pickup_company_name?: string | null
          pickup_contact_person?: string | null
          pickup_country?: string | null
          pickup_house_number?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_phone?: string | null
          pickup_postal_code?: string | null
          pickup_remarks?: string | null
          pickup_time_from?: string | null
          pickup_time_to?: string | null
          pod_available?: boolean | null
          pod_available_at?: string | null
          price?: number | null
          price_locked?: boolean | null
          primary_dispatch_id?: string | null
          product_id?: string | null
          profit_margin_pct?: number | null
          purchase_distance_km?: number | null
          purchase_invoice_id?: string | null
          purchase_other_costs?: number | null
          purchase_price_locked?: boolean | null
          purchase_subtotal?: number | null
          purchase_total?: number | null
          remarks_internal?: string | null
          remarks_invoice?: string | null
          remarks_purchase_invoice?: string | null
          remarks_waybill?: string | null
          sales_discount_pct?: number | null
          sales_distance_km?: number | null
          sales_other_costs?: number | null
          sales_subtotal?: number | null
          sales_total?: number | null
          sales_vat?: number | null
          save_delivery_to_addressbook?: boolean | null
          save_pickup_to_addressbook?: boolean | null
          status?: Database["public"]["Enums"]["trip_status"]
          sub_status?: string | null
          total_weight_kg?: number | null
          tracking_token?: string | null
          travel_hours?: number | null
          trip_date?: string
          updated_at?: string
          vehicle_id?: string | null
          volume_m3?: number | null
          wait_time_minutes?: number | null
          waybill_number?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_carrier_contact_id_fkey"
            columns: ["carrier_contact_id"]
            isOneToOne: false
            referencedRelation: "carrier_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_dispatched_to_company_id_fkey"
            columns: ["dispatched_to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_parent_trip_id_fkey"
            columns: ["parent_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_primary_dispatch_id_fkey"
            columns: ["primary_dispatch_id"]
            isOneToOne: false
            referencedRelation: "intercompany_dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_apk_history: {
        Row: {
          apk_date: string
          created_at: string
          defects: Json | null
          expiry_date: string
          id: string
          inspector: string | null
          mileage_at_apk: number | null
          remarks: string | null
          result: string
          station_name: string | null
          vehicle_id: string
        }
        Insert: {
          apk_date: string
          created_at?: string
          defects?: Json | null
          expiry_date: string
          id?: string
          inspector?: string | null
          mileage_at_apk?: number | null
          remarks?: string | null
          result: string
          station_name?: string | null
          vehicle_id: string
        }
        Update: {
          apk_date?: string
          created_at?: string
          defects?: Json | null
          expiry_date?: string
          id?: string
          inspector?: string | null
          mileage_at_apk?: number | null
          remarks?: string | null
          result?: string
          station_name?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_apk_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          inspection_date: string
          items: Json
          overall_notes: string | null
          photo_urls: string[] | null
          status: string
          tenant_id: string
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          inspection_date?: string
          items?: Json
          overall_notes?: string | null
          photo_urls?: string[] | null
          status?: string
          tenant_id: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          inspection_date?: string
          items?: Json
          overall_notes?: string | null
          photo_urls?: string[] | null
          status?: string
          tenant_id?: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          documents: Json | null
          id: string
          maintenance_type: string
          mileage_at_service: number | null
          next_maintenance_date: string | null
          next_maintenance_km: number | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          documents?: Json | null
          id?: string
          maintenance_type: string
          mileage_at_service?: number | null
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          documents?: Json | null
          id?: string
          maintenance_type?: string
          mileage_at_service?: number | null
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          apk_expiry_date: string | null
          brand: string | null
          capacity_kg: number | null
          company_id: string | null
          created_at: string
          fuel_consumption_per_100km: number | null
          fuel_type: string | null
          id: string
          insurance_cost_monthly: number | null
          insurance_expiry_date: string | null
          is_active: boolean | null
          last_apk_date: string | null
          last_service_date: string | null
          lease_cost_monthly: number | null
          license_plate: string
          mileage_km: number | null
          model: string | null
          next_service_date: string | null
          next_service_km: number | null
          notes: string | null
          purchase_price: number | null
          tank_capacity_liters: number | null
          updated_at: string
          vehicle_type: string | null
          year_of_manufacture: number | null
        }
        Insert: {
          apk_expiry_date?: string | null
          brand?: string | null
          capacity_kg?: number | null
          company_id?: string | null
          created_at?: string
          fuel_consumption_per_100km?: number | null
          fuel_type?: string | null
          id?: string
          insurance_cost_monthly?: number | null
          insurance_expiry_date?: string | null
          is_active?: boolean | null
          last_apk_date?: string | null
          last_service_date?: string | null
          lease_cost_monthly?: number | null
          license_plate: string
          mileage_km?: number | null
          model?: string | null
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          purchase_price?: number | null
          tank_capacity_liters?: number | null
          updated_at?: string
          vehicle_type?: string | null
          year_of_manufacture?: number | null
        }
        Update: {
          apk_expiry_date?: string | null
          brand?: string | null
          capacity_kg?: number | null
          company_id?: string | null
          created_at?: string
          fuel_consumption_per_100km?: number | null
          fuel_type?: string | null
          id?: string
          insurance_cost_monthly?: number | null
          insurance_expiry_date?: string | null
          is_active?: boolean | null
          last_apk_date?: string | null
          last_service_date?: string | null
          lease_cost_monthly?: number | null
          license_plate?: string
          mileage_km?: number | null
          model?: string | null
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          purchase_price?: number | null
          tank_capacity_liters?: number | null
          updated_at?: string
          vehicle_type?: string | null
          year_of_manufacture?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transfer_lines: {
        Row: {
          batch_number: string | null
          created_at: string | null
          id: string
          lot_number: string | null
          notes: string | null
          product_id: string
          quantity: number
          received_quantity: number | null
          shipped_quantity: number | null
          transfer_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          product_id: string
          quantity: number
          received_quantity?: number | null
          shipped_quantity?: number | null
          transfer_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          product_id?: string
          quantity?: number
          received_quantity?: number | null
          shipped_quantity?: number | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transfer_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "wms_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "warehouse_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transfers: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          received_date: string | null
          shipped_date: string | null
          status: string | null
          tenant_id: string
          to_warehouse_id: string
          transfer_number: string
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          received_date?: string | null
          shipped_date?: string | null
          status?: string | null
          tenant_id: string
          to_warehouse_id: string
          transfer_number: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          received_date?: string | null
          shipped_date?: string | null
          status?: string | null
          tenant_id?: string
          to_warehouse_id?: string
          transfer_number?: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_zones: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          temperature_max: number | null
          temperature_min: number | null
          warehouse_id: string
          zone_type: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          temperature_max?: number | null
          temperature_min?: number | null
          warehouse_id: string
          zone_type?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          temperature_max?: number | null
          temperature_min?: number | null
          warehouse_id?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          postal_code: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          postal_code?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          postal_code?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          challenge_expires_at: string | null
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_challenge: string | null
          last_used_at: string | null
          public_key: string
          sign_count: number
          user_id: string
        }
        Insert: {
          challenge_expires_at?: string | null
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_challenge?: string | null
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          user_id: string
        }
        Update: {
          challenge_expires_at?: string | null
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_challenge?: string | null
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          user_id?: string
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          event_types: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_types: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_types?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_report_subscriptions: {
        Row: {
          created_at: string | null
          customer_id: string
          enabled: boolean | null
          id: string
          last_sent_at: string | null
          recipients_json: Json
          schedule_day: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          enabled?: boolean | null
          id?: string
          last_sent_at?: string | null
          recipients_json?: Json
          schedule_day?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          enabled?: boolean | null
          id?: string
          last_sent_at?: string | null
          recipients_json?: Json
          schedule_day?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_report_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_report_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_report_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wms_products: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string | null
          description: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          is_batch_tracked: boolean | null
          is_serialized: boolean | null
          length_cm: number | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          reorder_point: number | null
          reorder_quantity: number | null
          shelf_life_days: number | null
          sku: string
          storage_requirements: string | null
          tenant_id: string
          unit_of_measure: string | null
          updated_at: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_batch_tracked?: boolean | null
          is_serialized?: boolean | null
          length_cm?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          shelf_life_days?: number | null
          sku: string
          storage_requirements?: string | null
          tenant_id: string
          unit_of_measure?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_batch_tracked?: boolean | null
          is_serialized?: boolean | null
          length_cm?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          shelf_life_days?: number | null
          sku?: string
          storage_requirements?: string | null
          tenant_id?: string
          unit_of_measure?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wms_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action_config: Json | null
          action_type: string
          condition_expression: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          sequence_order: number | null
          workflow_id: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          condition_expression?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          sequence_order?: number | null
          workflow_id?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          condition_expression?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          sequence_order?: number | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_automations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          actions_executed: Json | null
          completed_at: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string | null
          trigger_event: Json | null
          workflow_id: string | null
        }
        Insert: {
          actions_executed?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          trigger_event?: Json | null
          workflow_id?: string | null
        }
        Update: {
          actions_executed?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          trigger_event?: Json | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          match_rules_json: Json | null
          match_type: Database["public"]["Enums"]["zone_match_type"]
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          match_rules_json?: Json | null
          match_type?: Database["public"]["Enums"]["zone_match_type"]
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          match_rules_json?: Json | null
          match_type?: Database["public"]["Enums"]["zone_match_type"]
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bank_transactions_masked: {
        Row: {
          amount: number | null
          bank_account: string | null
          company_id: string | null
          counterparty_iban_masked: string | null
          counterparty_name_masked: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          is_matched: boolean | null
          match_confidence: number | null
          matched_invoice_id: string | null
          matched_transaction_id: string | null
          needs_review: boolean | null
          reference: string | null
          status: string | null
          transaction_date: string | null
          updated_at: string | null
          value_date: string | null
        }
        Insert: {
          amount?: number | null
          bank_account?: string | null
          company_id?: string | null
          counterparty_iban_masked?: never
          counterparty_name_masked?: never
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          is_matched?: boolean | null
          match_confidence?: number | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          needs_review?: boolean | null
          reference?: string | null
          status?: string | null
          transaction_date?: string | null
          updated_at?: string | null
          value_date?: string | null
        }
        Update: {
          amount?: number | null
          bank_account?: string | null
          company_id?: string | null
          counterparty_iban_masked?: never
          counterparty_name_masked?: never
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          is_matched?: boolean | null
          match_confidence?: number | null
          matched_invoice_id?: string | null
          matched_transaction_id?: string | null
          needs_review?: boolean | null
          reference?: string | null
          status?: string | null
          transaction_date?: string | null
          updated_at?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers_masked: {
        Row: {
          address: string | null
          bic: string | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          iban: string | null
          id: string | null
          is_active: boolean | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          tenant_id: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bic?: never
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          iban?: never
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          phone?: never
          postal_code?: string | null
          rating?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bic?: never
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          iban?: never
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          phone?: never
          postal_code?: string | null
          rating?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carriers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers_secure: {
        Row: {
          address: string | null
          auto_invoice_enabled: boolean | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          credit_blocked: boolean | null
          credit_blocked_reason: string | null
          credit_limit: number | null
          email: string | null
          feature_overrides: Json | null
          first_login_at: string | null
          id: string | null
          is_active: boolean | null
          notes: string | null
          onboarding_completed: boolean | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          settings_json: Json | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          vat_number: string | null
        }
        Insert: {
          address?: never
          auto_invoice_enabled?: boolean | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_blocked?: boolean | null
          credit_blocked_reason?: string | null
          credit_limit?: number | null
          email?: never
          feature_overrides?: Json | null
          first_login_at?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          onboarding_completed?: boolean | null
          payment_terms_days?: number | null
          phone?: never
          postal_code?: never
          settings_json?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: never
        }
        Update: {
          address?: never
          auto_invoice_enabled?: boolean | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_blocked?: boolean | null
          credit_blocked_reason?: string | null
          credit_limit?: number | null
          email?: never
          feature_overrides?: Json | null
          first_login_at?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          onboarding_completed?: boolean | null
          payment_terms_days?: number | null
          phone?: never
          postal_code?: never
          settings_json?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: never
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_masked: {
        Row: {
          adr_expiry: string | null
          cpc_expiry: string | null
          created_at: string | null
          current_city: string | null
          date_of_birth: string | null
          driver_category: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string | null
          is_zzp: boolean | null
          license_expiry: string | null
          license_number: string | null
          name: string | null
          notes: string | null
          on_time_percentage: number | null
          onboarding_completed_at: string | null
          phone: string | null
          profile_photo_url: string | null
          rating: number | null
          status: string | null
          tenant_id: string | null
          total_trips: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          adr_expiry?: never
          cpc_expiry?: never
          created_at?: string | null
          current_city?: string | null
          date_of_birth?: never
          driver_category?: string | null
          email?: never
          emergency_contact_name?: never
          emergency_contact_phone?: never
          emergency_contact_relationship?: never
          id?: string | null
          is_zzp?: boolean | null
          license_expiry?: never
          license_number?: never
          name?: string | null
          notes?: string | null
          on_time_percentage?: number | null
          onboarding_completed_at?: string | null
          phone?: never
          profile_photo_url?: string | null
          rating?: number | null
          status?: string | null
          tenant_id?: string | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          adr_expiry?: never
          cpc_expiry?: never
          created_at?: string | null
          current_city?: string | null
          date_of_birth?: never
          driver_category?: string | null
          email?: never
          emergency_contact_name?: never
          emergency_contact_phone?: never
          emergency_contact_relationship?: never
          id?: string | null
          is_zzp?: boolean | null
          license_expiry?: never
          license_number?: never
          name?: string | null
          notes?: string | null
          on_time_percentage?: number | null
          onboarding_completed_at?: string | null
          phone?: never
          profile_photo_url?: string | null
          rating?: number | null
          status?: string | null
          tenant_id?: string | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_cards_masked: {
        Row: {
          card_name: string | null
          card_number_masked: string | null
          company_id: string | null
          connection_id: string | null
          created_at: string | null
          driver_id: string | null
          id: string | null
          is_active: boolean | null
          monthly_limit: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          card_name?: string | null
          card_number_masked?: never
          company_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string | null
          is_active?: boolean | null
          monthly_limit?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          card_name?: string | null
          card_number_masked?: never
          company_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string | null
          is_active?: boolean | null
          monthly_limit?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_cards_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "fuel_card_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots_operational: {
        Row: {
          active_customers: number | null
          avg_delivery_time_hours: number | null
          company_id: string | null
          cost_total: number | null
          created_at: string | null
          driver_utilization_pct: number | null
          fuel_cost_total: number | null
          id: string | null
          margin_avg: number | null
          new_customers: number | null
          orders_cancelled: number | null
          orders_completed: number | null
          orders_on_time: number | null
          orders_total: number | null
          period_type: string | null
          profit_total: number | null
          revenue_total: number | null
          snapshot_date: string | null
          vehicle_utilization_pct: number | null
        }
        Insert: {
          active_customers?: number | null
          avg_delivery_time_hours?: number | null
          company_id?: string | null
          cost_total?: number | null
          created_at?: string | null
          driver_utilization_pct?: number | null
          fuel_cost_total?: number | null
          id?: string | null
          margin_avg?: number | null
          new_customers?: number | null
          orders_cancelled?: number | null
          orders_completed?: number | null
          orders_on_time?: number | null
          orders_total?: number | null
          period_type?: string | null
          profit_total?: number | null
          revenue_total?: number | null
          snapshot_date?: string | null
          vehicle_utilization_pct?: number | null
        }
        Update: {
          active_customers?: number | null
          avg_delivery_time_hours?: number | null
          company_id?: string | null
          cost_total?: number | null
          created_at?: string | null
          driver_utilization_pct?: number | null
          fuel_cost_total?: number | null
          id?: string | null
          margin_avg?: number | null
          new_customers?: number | null
          orders_cancelled?: number | null
          orders_completed?: number | null
          orders_on_time?: number | null
          orders_total?: number | null
          period_type?: string | null
          profit_total?: number | null
          revenue_total?: number | null
          snapshot_date?: string | null
          vehicle_utilization_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_directory: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_companies_connected: {
        Args: { company_a: string; company_b: string }
        Returns: boolean
      }
      calculate_driver_score: { Args: { p_driver_id: string }; Returns: number }
      calculate_stop_waiting_time: {
        Args: { p_stop_id: string }
        Returns: number
      }
      can_view_customer_contact_details: { Args: never; Returns: boolean }
      check_plan_limit: {
        Args: { p_resource: string; p_tenant_id: string }
        Returns: boolean
      }
      deduct_ai_credits: {
        Args: {
          p_action_type?: string
          p_complexity?: string
          p_conversation_id?: string
          p_credits: number
          p_metadata?: Json
          p_model?: string
          p_tenant_id: string
          p_tokens?: number
          p_user_id: string
        }
        Returns: Json
      }
      delete_accounting_credentials: {
        Args: { p_integration_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      driver_belongs_to_user_tenant: {
        Args: { p_driver_id: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_subscriptions: { Args: never; Returns: undefined }
      generate_credit_note_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_secure_tracking_token: {
        Args: { p_expires_hours?: number; p_trip_id: string }
        Returns: string
      }
      get_accounting_credentials: {
        Args: { p_integration_id: string }
        Returns: Json
      }
      get_api_connector_credentials_masked: {
        Args: { p_connector_id: string }
        Returns: Json
      }
      get_carrier_id_for_user: { Args: { p_user_id: string }; Returns: string }
      get_carrier_tenant_id: { Args: { p_user_id: string }; Returns: string }
      get_customer_display_status: {
        Args: { internal_status: string }
        Returns: string
      }
      get_customer_for_user: { Args: { p_user_id: string }; Returns: string }
      get_customer_full_details: {
        Args: { p_customer_id: string }
        Returns: {
          address: string
          city: string
          company_name: string
          contact_name: string
          country: string
          email: string
          id: string
          phone: string
          postal_code: string
          vat_number: string
        }[]
      }
      get_customers_for_staff: {
        Args: never
        Returns: {
          address: string
          city: string
          company_name: string
          contact_name: string
          country: string
          credit_blocked: boolean
          credit_limit: number
          email: string
          id: string
          is_active: boolean
          notes: string
          payment_terms_days: number
          phone: string
          postal_code: string
          vat_number: string
        }[]
      }
      get_dashboard_counts: { Args: { p_month_start: string }; Returns: Json }
      get_dashboard_ops: {
        Args: {
          p_company_id: string
          p_month_start: string
          p_six_months_ago: string
        }
        Returns: Json
      }
      get_driver_location_by_token: {
        Args: { p_token: string }
        Returns: {
          heading: number
          latitude: number
          longitude: number
          recorded_at: string
          speed: number
        }[]
      }
      get_driver_locations_with_names: {
        Args: { p_max_age_minutes?: number }
        Returns: Json
      }
      get_fuel_card_credentials: {
        Args: { p_connection_id: string }
        Returns: Json
      }
      get_fuel_card_full_number: {
        Args: { p_card_id: string }
        Returns: string
      }
      get_invoice_stats: { Args: { p_company_id: string }; Returns: Json }
      get_latest_driver_location: {
        Args: { p_trip_id: string }
        Returns: {
          heading: number
          latitude: number
          longitude: number
          recorded_at: string
          speed: number
        }[]
      }
      get_next_invoice_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_next_purchase_invoice_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_rls_status: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      get_tracking_by_token: { Args: { p_token: string }; Returns: Json }
      get_user_company: { Args: { p_user_id: string }; Returns: string }
      get_user_company_cached: { Args: { p_user_id: string }; Returns: string }
      get_user_company_ids: {
        Args: { check_user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_cached: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_trip_cumulative: {
        Args: {
          p_load_minutes?: number
          p_trip_id: string
          p_wait_minutes?: number
        }
        Returns: undefined
      }
      is_driver_within_radius: {
        Args: {
          p_delivery_lat: number
          p_delivery_lng: number
          p_driver_lat: number
          p_driver_lng: number
          p_radius_km?: number
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_queue: string
          message: Json
          message_id: number
          source_queue: string
        }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_ai_usage_daily_rollup: { Args: never; Returns: undefined }
      save_order_with_stops: {
        Args: {
          p_order_data: Json
          p_order_id: string
          p_product_lines: Json
          p_stops: Json
        }
        Returns: Json
      }
      set_signature_otp: {
        Args: { p_otp: string; p_request_id: string }
        Returns: boolean
      }
      store_accounting_credentials: {
        Args: { p_credentials: Json; p_integration_id: string }
        Returns: string
      }
      store_api_connector_credentials: {
        Args: { p_connector_id: string; p_credentials: Json }
        Returns: string
      }
      store_fuel_card_credentials: {
        Args: { p_connection_id: string; p_credentials: Json }
        Returns: string
      }
      tenant_has_active_subscription: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { check_company_id: string; check_user_id: string }
        Returns: boolean
      }
      user_in_same_tenant: { Args: { p_user_id: string }; Returns: boolean }
      validate_tracking_token: { Args: { p_token: string }; Returns: boolean }
      verify_signature_otp: {
        Args: { p_otp: string; p_request_id: string }
        Returns: boolean
      }
    }
    Enums: {
      accessorial_applies_to: "customer" | "carrier" | "both"
      accessorial_calc_type:
        | "fixed"
        | "per_km"
        | "per_stop"
        | "per_min"
        | "percent"
      ai_action_status:
        | "draft"
        | "approval_pending"
        | "ready"
        | "executed"
        | "cancelled"
      app_role: "admin" | "medewerker" | "chauffeur" | "klant"
      audit_case_severity: "low" | "medium" | "high" | "critical"
      audit_case_status:
        | "open"
        | "in_review"
        | "approved"
        | "rejected"
        | "resolved"
        | "escalated"
      audit_case_type:
        | "price_discrepancy"
        | "distance_discrepancy"
        | "waiting_time_discrepancy"
        | "toll_discrepancy"
        | "fuel_surcharge"
        | "missing_documentation"
        | "unauthorized_charge"
        | "other"
      auth_method: "email_link" | "sms_otp" | "idin" | "qes"
      claim_liability: "undecided" | "carrier" | "customer" | "charter"
      claim_status:
        | "open"
        | "in_review"
        | "awaiting_info"
        | "approved"
        | "rejected"
        | "settled"
      claim_type: "damage" | "shortage" | "delay" | "no_show" | "other"
      collection_status:
        | "open"
        | "contacted"
        | "promised"
        | "disputed"
        | "paid"
        | "escalated"
        | "closed"
      compensation_type: "fixed" | "hourly" | "per_trip" | "per_km"
      compliance_doc_status:
        | "valid"
        | "expiring_soon"
        | "expired"
        | "pending_review"
        | "rejected"
      compliance_doc_type:
        | "drivers_license"
        | "adr_certificate"
        | "health_certificate"
        | "contract"
        | "vehicle_inspection"
        | "vehicle_insurance"
        | "vehicle_lease"
        | "tailgate_certificate"
        | "other"
      compliance_entity_type: "driver" | "vehicle" | "carrier"
      connection_status: "pending" | "accepted" | "declined" | "blocked"
      contract_event_type:
        | "created"
        | "edited"
        | "sent"
        | "viewed"
        | "signed"
        | "declined"
        | "completed"
        | "downloaded"
        | "shared"
        | "expired"
        | "reminder_sent"
      contract_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partially_signed"
        | "completed"
        | "declined"
        | "expired"
      copilot_assistant_type:
        | "dispatch_planner"
        | "control_tower"
        | "finance_autopilot"
        | "knowledge_search"
      counterparty_type: "customer" | "driver" | "carrier" | "subcontractor"
      custody_event_type:
        | "received"
        | "loaded"
        | "departed"
        | "arrived"
        | "delivered"
        | "pod_collected"
        | "exception"
      dispatch_plan_status: "draft" | "active" | "superseded"
      dispatch_status:
        | "pending"
        | "accepted"
        | "declined"
        | "in_progress"
        | "completed"
        | "cancelled"
      dispatch_type: "subcontract" | "handoff"
      dispute_status:
        | "open"
        | "in_review"
        | "accepted"
        | "rejected"
        | "resolved"
      document_verification_status:
        | "pending"
        | "verified"
        | "rejected"
        | "expired"
      driver_document_type:
        | "drivers_license_front"
        | "drivers_license_back"
        | "cpc_card"
        | "adr_certificate"
        | "identity_document"
        | "profile_photo"
        | "insurance_certificate"
        | "liability_insurance"
      driving_log_type: "driving" | "break" | "rest" | "available"
      dual_run_status: "ACTIVE" | "PAUSED"
      exception_severity: "info" | "warning" | "critical"
      exception_status:
        | "open"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "escalated"
        | "auto_resolved"
      exception_type:
        | "late_pickup"
        | "late_delivery"
        | "no_signal"
        | "off_route"
        | "unplanned_stop"
        | "missing_driver"
        | "missing_vehicle"
        | "excessive_waiting"
        | "sla_breach_risk"
        | "geofence_violation"
        | "other"
      expense_category: "fuel" | "toll" | "parking" | "meal" | "other"
      finance_transaction_status:
        | "pending"
        | "matched"
        | "unmatched"
        | "disputed"
        | "approved"
        | "rejected"
      finance_transaction_type:
        | "fuel"
        | "toll"
        | "parking"
        | "maintenance"
        | "insurance"
        | "lease"
        | "subscription"
        | "other_cost"
        | "revenue"
        | "subcontract"
      fuel_card_provider:
        | "shell"
        | "dkv"
        | "travelcard"
        | "multitankcard"
        | "bp"
        | "esso"
        | "total"
        | "avia"
        | "other"
      import_method: "api" | "csv" | "pdf" | "manual"
      invoice_status:
        | "concept"
        | "verzonden"
        | "betaald"
        | "vervallen"
        | "gedeeltelijk_betaald"
      maintenance_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "overdue"
      maintenance_type_enum:
        | "preventive"
        | "corrective"
        | "inspection"
        | "apk"
        | "tire"
        | "oil_change"
        | "brake"
        | "other"
      migration_batch_status:
        | "QUEUED"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "ROLLED_BACK"
      migration_batch_type: "FULL" | "DELTA"
      migration_connector_status: "ACTIVE" | "PAUSED"
      migration_connector_type: "CSV_UPLOAD" | "API_PULL" | "EMAIL_INGEST"
      migration_profile_status: "DRAFT" | "PUBLISHED"
      migration_project_status:
        | "DRAFT"
        | "RUNNING"
        | "DUAL_RUN"
        | "CUTOVER_READY"
        | "CUTOVER_DONE"
        | "ROLLED_BACK"
      migration_source_system:
        | "EASYTRANS"
        | "CUSTOM"
        | "OTHER"
        | "TRANSPOREON"
        | "WICS"
        | "BOLTRICS"
        | "CARGON"
        | "KOOPMAN"
        | "PRINCETON_TMX"
        | "GOCOMET"
        | "ORACLE_TMS"
        | "SAP_TM"
        | "BLUEROCK"
        | "CARGOWISE"
        | "DESCARTES"
        | "TRIMBLE"
        | "MERCURIUS"
        | "YELLOWSTAR"
      payment_status:
        | "open"
        | "pending"
        | "paid"
        | "failed"
        | "expired"
        | "canceled"
      plan_revision_status: "proposed" | "applied" | "rejected"
      pod_method: "signature" | "photo" | "scan" | "multi"
      pricing_model:
        | "per_km"
        | "per_ride"
        | "per_stop"
        | "per_hour"
        | "per_wait_minute"
        | "percentage"
        | "fixed"
      rate_contract_status: "draft" | "active" | "expired" | "archived"
      rate_contract_type: "customer" | "carrier"
      rate_type:
        | "per_km"
        | "per_hour"
        | "fixed"
        | "zone"
        | "weight_based"
        | "pallet_based"
      reconciliation_issue_status: "OPEN" | "RESOLVED"
      reconciliation_status: "RED" | "AMBER" | "GREEN"
      risk_level: "low" | "medium" | "high"
      rollback_status: "PENDING" | "EXECUTED" | "FAILED"
      shift_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "reserve"
        | "cancelled"
      shift_status:
        | "draft"
        | "published"
        | "paused"
        | "filled"
        | "in_progress"
        | "completed"
        | "cancelled"
      signature_status: "pending" | "sent" | "viewed" | "signed" | "declined"
      staging_entity_type:
        | "CUSTOMER"
        | "ADDRESS"
        | "CARRIER"
        | "DRIVER"
        | "VEHICLE"
        | "PRODUCT"
        | "ORDER"
        | "INVOICE"
        | "DOC"
        | "TRANSACTION"
      staging_record_status:
        | "READY"
        | "ERROR"
        | "DUPLICATE"
        | "IGNORED"
        | "IMPORTED"
      stop_event_type:
        | "arrival"
        | "departure"
        | "waiting_start"
        | "waiting_end"
        | "pickup_complete"
        | "delivery_complete"
        | "photo_added"
        | "signature_added"
        | "note_added"
        | "issue_reported"
      surcharge_method: "fixed" | "percent" | "table"
      surcharge_type: "fuel" | "toll" | "other"
      tender_invite_status:
        | "pending"
        | "viewed"
        | "accepted"
        | "declined"
        | "expired"
      tender_status:
        | "draft"
        | "open"
        | "pending_response"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      trip_status:
        | "aanvraag"
        | "gepland"
        | "onderweg"
        | "afgerond"
        | "geannuleerd"
        | "offerte"
        | "draft"
        | "geladen"
        | "afgeleverd"
        | "gecontroleerd"
        | "gefactureerd"
      zone_match_type: "postcode_range" | "city" | "country" | "geo_polygon"
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
    Enums: {
      accessorial_applies_to: ["customer", "carrier", "both"],
      accessorial_calc_type: [
        "fixed",
        "per_km",
        "per_stop",
        "per_min",
        "percent",
      ],
      ai_action_status: [
        "draft",
        "approval_pending",
        "ready",
        "executed",
        "cancelled",
      ],
      app_role: ["admin", "medewerker", "chauffeur", "klant"],
      audit_case_severity: ["low", "medium", "high", "critical"],
      audit_case_status: [
        "open",
        "in_review",
        "approved",
        "rejected",
        "resolved",
        "escalated",
      ],
      audit_case_type: [
        "price_discrepancy",
        "distance_discrepancy",
        "waiting_time_discrepancy",
        "toll_discrepancy",
        "fuel_surcharge",
        "missing_documentation",
        "unauthorized_charge",
        "other",
      ],
      auth_method: ["email_link", "sms_otp", "idin", "qes"],
      claim_liability: ["undecided", "carrier", "customer", "charter"],
      claim_status: [
        "open",
        "in_review",
        "awaiting_info",
        "approved",
        "rejected",
        "settled",
      ],
      claim_type: ["damage", "shortage", "delay", "no_show", "other"],
      collection_status: [
        "open",
        "contacted",
        "promised",
        "disputed",
        "paid",
        "escalated",
        "closed",
      ],
      compensation_type: ["fixed", "hourly", "per_trip", "per_km"],
      compliance_doc_status: [
        "valid",
        "expiring_soon",
        "expired",
        "pending_review",
        "rejected",
      ],
      compliance_doc_type: [
        "drivers_license",
        "adr_certificate",
        "health_certificate",
        "contract",
        "vehicle_inspection",
        "vehicle_insurance",
        "vehicle_lease",
        "tailgate_certificate",
        "other",
      ],
      compliance_entity_type: ["driver", "vehicle", "carrier"],
      connection_status: ["pending", "accepted", "declined", "blocked"],
      contract_event_type: [
        "created",
        "edited",
        "sent",
        "viewed",
        "signed",
        "declined",
        "completed",
        "downloaded",
        "shared",
        "expired",
        "reminder_sent",
      ],
      contract_status: [
        "draft",
        "sent",
        "viewed",
        "partially_signed",
        "completed",
        "declined",
        "expired",
      ],
      copilot_assistant_type: [
        "dispatch_planner",
        "control_tower",
        "finance_autopilot",
        "knowledge_search",
      ],
      counterparty_type: ["customer", "driver", "carrier", "subcontractor"],
      custody_event_type: [
        "received",
        "loaded",
        "departed",
        "arrived",
        "delivered",
        "pod_collected",
        "exception",
      ],
      dispatch_plan_status: ["draft", "active", "superseded"],
      dispatch_status: [
        "pending",
        "accepted",
        "declined",
        "in_progress",
        "completed",
        "cancelled",
      ],
      dispatch_type: ["subcontract", "handoff"],
      dispute_status: ["open", "in_review", "accepted", "rejected", "resolved"],
      document_verification_status: [
        "pending",
        "verified",
        "rejected",
        "expired",
      ],
      driver_document_type: [
        "drivers_license_front",
        "drivers_license_back",
        "cpc_card",
        "adr_certificate",
        "identity_document",
        "profile_photo",
        "insurance_certificate",
        "liability_insurance",
      ],
      driving_log_type: ["driving", "break", "rest", "available"],
      dual_run_status: ["ACTIVE", "PAUSED"],
      exception_severity: ["info", "warning", "critical"],
      exception_status: [
        "open",
        "acknowledged",
        "in_progress",
        "resolved",
        "escalated",
        "auto_resolved",
      ],
      exception_type: [
        "late_pickup",
        "late_delivery",
        "no_signal",
        "off_route",
        "unplanned_stop",
        "missing_driver",
        "missing_vehicle",
        "excessive_waiting",
        "sla_breach_risk",
        "geofence_violation",
        "other",
      ],
      expense_category: ["fuel", "toll", "parking", "meal", "other"],
      finance_transaction_status: [
        "pending",
        "matched",
        "unmatched",
        "disputed",
        "approved",
        "rejected",
      ],
      finance_transaction_type: [
        "fuel",
        "toll",
        "parking",
        "maintenance",
        "insurance",
        "lease",
        "subscription",
        "other_cost",
        "revenue",
        "subcontract",
      ],
      fuel_card_provider: [
        "shell",
        "dkv",
        "travelcard",
        "multitankcard",
        "bp",
        "esso",
        "total",
        "avia",
        "other",
      ],
      import_method: ["api", "csv", "pdf", "manual"],
      invoice_status: [
        "concept",
        "verzonden",
        "betaald",
        "vervallen",
        "gedeeltelijk_betaald",
      ],
      maintenance_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "overdue",
      ],
      maintenance_type_enum: [
        "preventive",
        "corrective",
        "inspection",
        "apk",
        "tire",
        "oil_change",
        "brake",
        "other",
      ],
      migration_batch_status: [
        "QUEUED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "ROLLED_BACK",
      ],
      migration_batch_type: ["FULL", "DELTA"],
      migration_connector_status: ["ACTIVE", "PAUSED"],
      migration_connector_type: ["CSV_UPLOAD", "API_PULL", "EMAIL_INGEST"],
      migration_profile_status: ["DRAFT", "PUBLISHED"],
      migration_project_status: [
        "DRAFT",
        "RUNNING",
        "DUAL_RUN",
        "CUTOVER_READY",
        "CUTOVER_DONE",
        "ROLLED_BACK",
      ],
      migration_source_system: [
        "EASYTRANS",
        "CUSTOM",
        "OTHER",
        "TRANSPOREON",
        "WICS",
        "BOLTRICS",
        "CARGON",
        "KOOPMAN",
        "PRINCETON_TMX",
        "GOCOMET",
        "ORACLE_TMS",
        "SAP_TM",
        "BLUEROCK",
        "CARGOWISE",
        "DESCARTES",
        "TRIMBLE",
        "MERCURIUS",
        "YELLOWSTAR",
      ],
      payment_status: [
        "open",
        "pending",
        "paid",
        "failed",
        "expired",
        "canceled",
      ],
      plan_revision_status: ["proposed", "applied", "rejected"],
      pod_method: ["signature", "photo", "scan", "multi"],
      pricing_model: [
        "per_km",
        "per_ride",
        "per_stop",
        "per_hour",
        "per_wait_minute",
        "percentage",
        "fixed",
      ],
      rate_contract_status: ["draft", "active", "expired", "archived"],
      rate_contract_type: ["customer", "carrier"],
      rate_type: [
        "per_km",
        "per_hour",
        "fixed",
        "zone",
        "weight_based",
        "pallet_based",
      ],
      reconciliation_issue_status: ["OPEN", "RESOLVED"],
      reconciliation_status: ["RED", "AMBER", "GREEN"],
      risk_level: ["low", "medium", "high"],
      rollback_status: ["PENDING", "EXECUTED", "FAILED"],
      shift_application_status: [
        "pending",
        "approved",
        "rejected",
        "reserve",
        "cancelled",
      ],
      shift_status: [
        "draft",
        "published",
        "paused",
        "filled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      signature_status: ["pending", "sent", "viewed", "signed", "declined"],
      staging_entity_type: [
        "CUSTOMER",
        "ADDRESS",
        "CARRIER",
        "DRIVER",
        "VEHICLE",
        "PRODUCT",
        "ORDER",
        "INVOICE",
        "DOC",
        "TRANSACTION",
      ],
      staging_record_status: [
        "READY",
        "ERROR",
        "DUPLICATE",
        "IGNORED",
        "IMPORTED",
      ],
      stop_event_type: [
        "arrival",
        "departure",
        "waiting_start",
        "waiting_end",
        "pickup_complete",
        "delivery_complete",
        "photo_added",
        "signature_added",
        "note_added",
        "issue_reported",
      ],
      surcharge_method: ["fixed", "percent", "table"],
      surcharge_type: ["fuel", "toll", "other"],
      tender_invite_status: [
        "pending",
        "viewed",
        "accepted",
        "declined",
        "expired",
      ],
      tender_status: [
        "draft",
        "open",
        "pending_response",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      trip_status: [
        "aanvraag",
        "gepland",
        "onderweg",
        "afgerond",
        "geannuleerd",
        "offerte",
        "draft",
        "geladen",
        "afgeleverd",
        "gecontroleerd",
        "gefactureerd",
      ],
      zone_match_type: ["postcode_range", "city", "country", "geo_polygon"],
    },
  },
} as const
