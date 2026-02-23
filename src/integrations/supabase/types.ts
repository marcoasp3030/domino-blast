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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ab_test_enabled: boolean
          ab_test_sample_percent: number
          ab_test_sent_at: string | null
          ab_test_status: string | null
          ab_test_wait_hours: number
          ab_test_winner: string | null
          ab_test_winner_sent_at: string | null
          batch_delay_seconds: number | null
          batch_size: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          list_id: string | null
          name: string
          preheader: string | null
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string | null
          subject_b: string | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ab_test_enabled?: boolean
          ab_test_sample_percent?: number
          ab_test_sent_at?: string | null
          ab_test_status?: string | null
          ab_test_wait_hours?: number
          ab_test_winner?: string | null
          ab_test_winner_sent_at?: string | null
          batch_delay_seconds?: number | null
          batch_size?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          list_id?: string | null
          name: string
          preheader?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          subject_b?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ab_test_enabled?: boolean
          ab_test_sample_percent?: number
          ab_test_sent_at?: string | null
          ab_test_status?: string | null
          ab_test_wait_hours?: number
          ab_test_winner?: string | null
          ab_test_winner_sent_at?: string | null
          batch_delay_seconds?: number | null
          batch_size?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          list_id?: string | null
          name?: string
          preheader?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          subject_b?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          contact_id: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          email: string
          engagement_score: number
          id: string
          lgpd_consent: boolean | null
          lgpd_consent_date: string | null
          name: string | null
          origin: string | null
          phone: string | null
          score_updated_at: string | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          email: string
          engagement_score?: number
          id?: string
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          name?: string | null
          origin?: string | null
          phone?: string | null
          score_updated_at?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          email?: string
          engagement_score?: number
          id?: string
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          name?: string | null
          origin?: string | null
          phone?: string | null
          score_updated_at?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          company_id: string
          created_at: string
          dkim_status: Database["public"]["Enums"]["domain_status"]
          dmarc_status: Database["public"]["Enums"]["domain_status"]
          domain: string
          id: string
          overall_status: Database["public"]["Enums"]["domain_status"]
          spf_status: Database["public"]["Enums"]["domain_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dkim_status?: Database["public"]["Enums"]["domain_status"]
          dmarc_status?: Database["public"]["Enums"]["domain_status"]
          domain: string
          id?: string
          overall_status?: Database["public"]["Enums"]["domain_status"]
          spf_status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dkim_status?: Database["public"]["Enums"]["domain_status"]
          dmarc_status?: Database["public"]["Enums"]["domain_status"]
          domain?: string
          id?: string
          overall_status?: Database["public"]["Enums"]["domain_status"]
          spf_status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          design_json: Json | null
          html_content: string | null
          id: string
          name: string
          preview_url: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          design_json?: Json | null
          html_content?: string | null
          id?: string
          name: string
          preview_url?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          design_json?: Json | null
          html_content?: string | null
          id?: string
          name?: string
          preview_url?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          campaign_id: string | null
          company_id: string
          contact_id: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          ip_address: string | null
          send_id: string | null
          sendgrid_message_id: string | null
          timestamp: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          contact_id?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          ip_address?: string | null
          send_id?: string | null
          sendgrid_message_id?: string | null
          timestamp?: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          contact_id?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          ip_address?: string | null
          send_id?: string | null
          sendgrid_message_id?: string | null
          timestamp?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "sends"
            referencedColumns: ["id"]
          },
        ]
      }
      list_members: {
        Row: {
          added_at: string
          contact_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          filter_criteria: Json | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          filter_criteria?: Json | null
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          filter_criteria?: Json | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      senders: {
        Row: {
          company_id: string
          created_at: string
          domain_id: string | null
          from_email: string
          from_name: string
          id: string
          is_default: boolean | null
          reply_to: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          domain_id?: string | null
          from_email: string
          from_name: string
          id?: string
          is_default?: boolean | null
          reply_to?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          domain_id?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_default?: boolean | null
          reply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "senders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senders_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      sends: {
        Row: {
          ab_variant: string | null
          campaign_id: string
          contact_id: string
          created_at: string
          error_message: string | null
          id: string
          retry_count: number | null
          sendgrid_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["send_status"]
        }
        Insert: {
          ab_variant?: string | null
          campaign_id: string
          contact_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          sendgrid_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
        }
        Update: {
          ab_variant?: string | null
          campaign_id?: string
          contact_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          sendgrid_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressions: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppressions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          company_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
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
      workflow_edges: {
        Row: {
          created_at: string
          id: string
          source_handle: string | null
          source_step_id: string
          target_step_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_step_id: string
          target_step_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_handle?: string | null
          source_step_id?: string
          target_step_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_steps: {
        Row: {
          created_at: string
          executed_at: string | null
          execution_id: string
          id: string
          result: Json | null
          scheduled_at: string | null
          status: string
          step_id: string
        }
        Insert: {
          created_at?: string
          executed_at?: string | null
          execution_id: string
          id?: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string
          step_id: string
        }
        Update: {
          created_at?: string
          executed_at?: string | null
          execution_id?: string
          id?: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_step_id: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          position_x: number | null
          position_y: number | null
          step_type: string
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          step_type: string
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_engagement_score: {
        Args: { _contact_id: string }
        Returns: number
      }
      get_campaign_performance: {
        Args: { _company_id: string }
        Returns: {
          bounces: number
          campaign_id: string
          campaign_name: string
          clicks: number
          delivered: number
          opens: number
          sent_at: string
          spam: number
          total_recipients: number
          unsubscribes: number
        }[]
      }
      get_event_counts: {
        Args: { _company_id: string }
        Returns: {
          count: number
          event_type: string
        }[]
      }
      get_event_timeline: {
        Args: { _company_id: string; _days?: number }
        Returns: {
          count: number
          day: string
          event_type: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_company_scores: {
        Args: { _company_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "marketing" | "readonly"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "completed"
        | "paused"
        | "error"
      contact_status: "active" | "inactive" | "unsubscribed" | "bounced"
      domain_status: "pending" | "validating" | "validated" | "error"
      event_type:
        | "delivered"
        | "open"
        | "click"
        | "bounce"
        | "spam"
        | "unsubscribe"
        | "dropped"
      send_status: "queued" | "sent" | "delivered" | "failed"
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
      app_role: ["admin", "marketing", "readonly"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "completed",
        "paused",
        "error",
      ],
      contact_status: ["active", "inactive", "unsubscribed", "bounced"],
      domain_status: ["pending", "validating", "validated", "error"],
      event_type: [
        "delivered",
        "open",
        "click",
        "bounce",
        "spam",
        "unsubscribe",
        "dropped",
      ],
      send_status: ["queued", "sent", "delivered", "failed"],
    },
  },
} as const
