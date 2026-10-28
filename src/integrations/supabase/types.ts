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
      ai_settings: {
        Row: {
          embedding_dimensions: number
          embedding_provider: string
          id: string
          updated_at: string
        }
        Insert: {
          embedding_dimensions?: number
          embedding_provider?: string
          id?: string
          updated_at?: string
        }
        Update: {
          embedding_dimensions?: number
          embedding_provider?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          app_name: string
          footer_text: string | null
          id: string
          logo_url: string | null
          primary_color: string
          updated_at: string
          widget_script_url: string
        }
        Insert: {
          app_name?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string
          widget_script_url?: string
        }
        Update: {
          app_name?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          updated_at?: string
          widget_script_url?: string
        }
        Relationships: []
      }
      channel_secrets: {
        Row: {
          access_token: string
          bot_id: string
          channel: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          bot_id: string
          channel: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          bot_id?: string
          channel?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_secrets_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          bot_id: string | null
          client_id: string
          ended_at: string | null
          id: string
          language: string | null
          last_message_at: string
          lead_captured: boolean
          messages: Json | null
          session_token: string
          source_url: string | null
          started_at: string
          summary: string | null
        }
        Insert: {
          bot_id?: string | null
          client_id: string
          ended_at?: string | null
          id?: string
          language?: string | null
          last_message_at?: string
          lead_captured?: boolean
          messages?: Json | null
          session_token?: string
          source_url?: string | null
          started_at?: string
          summary?: string | null
        }
        Update: {
          bot_id?: string | null
          client_id?: string
          ended_at?: string | null
          id?: string
          language?: string | null
          last_message_at?: string
          lead_captured?: boolean
          messages?: Json | null
          session_token?: string
          source_url?: string | null
          started_at?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_configs: {
        Row: {
          avatar: string | null
          background_color: string | null
          booking_button_label: string | null
          business_vertical: string
          calendly_url: string | null
          circle_color: string | null
          client_id: string
          created_at: string
          email_notifications_enabled: boolean | null
          embed_token: string
          fallback_message: string | null
          fallback_msg_en: string | null
          fallback_msg_it: string | null
          hotel_profile: Json
          id: string
          inactivity_timeout_minutes: number
          instagram_access_token: string | null
          instagram_connected: boolean
          instagram_connected_at: string | null
          instagram_page_id: string | null
          instagram_username: string | null
          is_active: boolean | null
          is_platform_bot: boolean
          knowledge_base: string | null
          knowledge_base_documents: Json | null
          knowledge_base_products: string | null
          knowledge_base_scraped: string | null
          knowledge_base_sections: Json | null
          launcher_position: string | null
          lead_form_message_count: number
          lead_form_mode: string
          messages_i18n: Json | null
          name: string
          notification_email: string | null
          notify_new_chat_enabled: boolean
          primary_color: string | null
          site_url: string | null
          text_color: string | null
          tone_of_voice: string | null
          tone_preset_id: string | null
          updated_at: string
          vertical: string | null
          welcome_message: string | null
          welcome_msg_en: string | null
          welcome_msg_it: string | null
        }
        Insert: {
          avatar?: string | null
          background_color?: string | null
          booking_button_label?: string | null
          business_vertical?: string
          calendly_url?: string | null
          circle_color?: string | null
          client_id: string
          created_at?: string
          email_notifications_enabled?: boolean | null
          embed_token?: string
          fallback_message?: string | null
          fallback_msg_en?: string | null
          fallback_msg_it?: string | null
          hotel_profile?: Json
          id?: string
          inactivity_timeout_minutes?: number
          instagram_access_token?: string | null
          instagram_connected?: boolean
          instagram_connected_at?: string | null
          instagram_page_id?: string | null
          instagram_username?: string | null
          is_active?: boolean | null
          is_platform_bot?: boolean
          knowledge_base?: string | null
          knowledge_base_documents?: Json | null
          knowledge_base_products?: string | null
          knowledge_base_scraped?: string | null
          knowledge_base_sections?: Json | null
          launcher_position?: string | null
          lead_form_message_count?: number
          lead_form_mode?: string
          messages_i18n?: Json | null
          name?: string
          notification_email?: string | null
          notify_new_chat_enabled?: boolean
          primary_color?: string | null
          site_url?: string | null
          text_color?: string | null
          tone_of_voice?: string | null
          tone_preset_id?: string | null
          updated_at?: string
          vertical?: string | null
          welcome_message?: string | null
          welcome_msg_en?: string | null
          welcome_msg_it?: string | null
        }
        Update: {
          avatar?: string | null
          background_color?: string | null
          booking_button_label?: string | null
          business_vertical?: string
          calendly_url?: string | null
          circle_color?: string | null
          client_id?: string
          created_at?: string
          email_notifications_enabled?: boolean | null
          embed_token?: string
          fallback_message?: string | null
          fallback_msg_en?: string | null
          fallback_msg_it?: string | null
          hotel_profile?: Json
          id?: string
          inactivity_timeout_minutes?: number
          instagram_access_token?: string | null
          instagram_connected?: boolean
          instagram_connected_at?: string | null
          instagram_page_id?: string | null
          instagram_username?: string | null
          is_active?: boolean | null
          is_platform_bot?: boolean
          knowledge_base?: string | null
          knowledge_base_documents?: Json | null
          knowledge_base_products?: string | null
          knowledge_base_scraped?: string | null
          knowledge_base_sections?: Json | null
          launcher_position?: string | null
          lead_form_message_count?: number
          lead_form_mode?: string
          messages_i18n?: Json | null
          name?: string
          notification_email?: string | null
          notify_new_chat_enabled?: boolean
          primary_color?: string | null
          site_url?: string | null
          text_color?: string | null
          tone_of_voice?: string | null
          tone_preset_id?: string | null
          updated_at?: string
          vertical?: string | null
          welcome_message?: string | null
          welcome_msg_en?: string | null
          welcome_msg_it?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          plan: string
          plan_expires_at: string | null
          plan_interval: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          plan?: string
          plan_expires_at?: string | null
          plan_interval?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          plan?: string
          plan_expires_at?: string | null
          plan_interval?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ecommerce_configs: {
        Row: {
          api_key: string | null
          api_secret: string | null
          client_id: string
          created_at: string
          feed_format: string | null
          feed_url: string | null
          id: string
          last_sync_at: string | null
          platform: string
          store_url: string
          storefront_access_token: string | null
          sync_enabled: boolean
          sync_error: string | null
          sync_status: string
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          client_id: string
          created_at?: string
          feed_format?: string | null
          feed_url?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: string
          store_url?: string
          storefront_access_token?: string | null
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          client_id?: string
          created_at?: string
          feed_format?: string | null
          feed_url?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: string
          store_url?: string
          storefront_access_token?: string | null
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_logs: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_html_body: string | null
          new_subject: string | null
          old_html_body: string | null
          old_subject: string | null
          template_id: string
          template_type: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_html_body?: string | null
          new_subject?: string | null
          old_html_body?: string | null
          old_subject?: string | null
          template_id: string
          template_type: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_html_body?: string | null
          new_subject?: string | null
          old_html_body?: string | null
          old_subject?: string | null
          template_id?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          html_body: string
          id: string
          locale: string
          subject: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          html_body?: string
          id?: string
          locale?: string
          subject?: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          html_body?: string
          id?: string
          locale?: string
          subject?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          chatbot_id: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          chatbot_id: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          chatbot_id?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs_history: {
        Row: {
          action: string | null
          answer: string | null
          changed_at: string
          chatbot_id: string | null
          faq_id: string | null
          id: string
          question: string | null
        }
        Insert: {
          action?: string | null
          answer?: string | null
          changed_at?: string
          chatbot_id?: string | null
          faq_id?: string | null
          id?: string
          question?: string | null
        }
        Update: {
          action?: string | null
          answer?: string | null
          changed_at?: string
          chatbot_id?: string | null
          faq_id?: string | null
          id?: string
          question?: string | null
        }
        Relationships: []
      }
      instagram_messages: {
        Row: {
          bot_id: string | null
          client_id: string
          created_at: string
          direction: string
          id: string
          instagram_sender_id: string | null
          instagram_sender_username: string | null
          message: string
        }
        Insert: {
          bot_id?: string | null
          client_id: string
          created_at?: string
          direction: string
          id?: string
          instagram_sender_id?: string | null
          instagram_sender_username?: string | null
          message?: string
        }
        Update: {
          bot_id?: string | null
          client_id?: string
          created_at?: string
          direction?: string
          id?: string
          instagram_sender_id?: string | null
          instagram_sender_username?: string | null
          message?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          chatbot_id: string
          chunk_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          file_path: string | null
          id: string
          name: string
          page_url: string | null
          priority: number
          source_url: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          chatbot_id: string
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          name: string
          page_url?: string | null
          priority?: number
          source_url?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          chatbot_id?: string
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          name?: string
          page_url?: string | null
          priority?: number
          source_url?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chatbot_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          knowledge_base_id: string
          metadata: Json | null
          token_count: number
        }
        Insert: {
          chatbot_id: string
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json | null
          token_count?: number
        }
        Update: {
          chatbot_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json | null
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          booking: Json | null
          bot_id: string | null
          client_id: string
          created_at: string
          email: string
          id: string
          language: string | null
          message: string | null
          name: string
          phone: string | null
          session_id: string | null
          source: string | null
          source_url: string | null
          status: string
          transcript: Json | null
          updated_at: string
        }
        Insert: {
          booking?: Json | null
          bot_id?: string | null
          client_id: string
          created_at?: string
          email: string
          id?: string
          language?: string | null
          message?: string | null
          name: string
          phone?: string | null
          session_id?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          transcript?: Json | null
          updated_at?: string
        }
        Update: {
          booking?: Json | null
          bot_id?: string | null
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          language?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          session_id?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          transcript?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_configs: {
        Row: {
          advanced_analytics: boolean
          calendly_integration: boolean
          chat_model: string
          concierge_requests: boolean
          doc_upload: boolean
          ecommerce_integration: boolean
          id: string
          instagram_integration: boolean
          knowledge_base_wizard: boolean
          max_chatbots: number
          max_conversations_month: number
          max_documents: number
          max_faqs: number
          max_leads_month: number
          max_products: number
          plan_name: string
          price_monthly: number
          price_yearly: number
          priority_support: boolean
          remove_branding: boolean
          sector_templates: boolean
          stripe_price_month: string | null
          stripe_price_year: string | null
          updated_at: string
        }
        Insert: {
          advanced_analytics?: boolean
          calendly_integration?: boolean
          chat_model?: string
          concierge_requests?: boolean
          doc_upload?: boolean
          ecommerce_integration?: boolean
          id?: string
          instagram_integration?: boolean
          knowledge_base_wizard?: boolean
          max_chatbots?: number
          max_conversations_month?: number
          max_documents?: number
          max_faqs?: number
          max_leads_month?: number
          max_products?: number
          plan_name: string
          price_monthly?: number
          price_yearly?: number
          priority_support?: boolean
          remove_branding?: boolean
          sector_templates?: boolean
          stripe_price_month?: string | null
          stripe_price_year?: string | null
          updated_at?: string
        }
        Update: {
          advanced_analytics?: boolean
          calendly_integration?: boolean
          chat_model?: string
          concierge_requests?: boolean
          doc_upload?: boolean
          ecommerce_integration?: boolean
          id?: string
          instagram_integration?: boolean
          knowledge_base_wizard?: boolean
          max_chatbots?: number
          max_conversations_month?: number
          max_documents?: number
          max_faqs?: number
          max_leads_month?: number
          max_products?: number
          plan_name?: string
          price_monthly?: number
          price_yearly?: number
          priority_support?: boolean
          remove_branding?: boolean
          sector_templates?: boolean
          stripe_price_month?: string | null
          stripe_price_year?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          categories: string[] | null
          client_id: string
          currency: string
          description: string
          external_id: string
          id: string
          image_url: string | null
          in_stock: boolean
          is_active: boolean
          last_updated: string
          name: string
          price: number
          product_url: string | null
          raw_data: Json | null
          sale_price: number | null
          stock_quantity: number | null
          tags: string[] | null
          variants: Json | null
        }
        Insert: {
          categories?: string[] | null
          client_id: string
          currency?: string
          description?: string
          external_id?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          last_updated?: string
          name?: string
          price?: number
          product_url?: string | null
          raw_data?: Json | null
          sale_price?: number | null
          stock_quantity?: number | null
          tags?: string[] | null
          variants?: Json | null
        }
        Update: {
          categories?: string[] | null
          client_id?: string
          currency?: string
          description?: string
          external_id?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          last_updated?: string
          name?: string
          price?: number
          product_url?: string | null
          raw_data?: Json | null
          sale_price?: number | null
          stock_quantity?: number | null
          tags?: string[] | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          language: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_query_logs: {
        Row: {
          chatbot_id: string
          chunks_retrieved: Json | null
          conversation_id: string | null
          created_at: string
          id: string
          query: string
          relevance_score: number | null
          response_generated: string | null
          response_time_ms: number | null
        }
        Insert: {
          chatbot_id: string
          chunks_retrieved?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          query: string
          relevance_score?: number | null
          response_generated?: string | null
          response_time_ms?: number | null
        }
        Update: {
          chatbot_id?: string
          chunks_retrieved?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          query?: string
          relevance_score?: number | null
          response_generated?: string | null
          response_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_query_logs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_messages: {
        Row: {
          author: string
          body: string
          bot_id: string
          client_id: string
          closes_request: boolean
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author: string
          body: string
          bot_id: string
          client_id: string
          closes_request?: boolean
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author?: string
          body?: string
          bot_id?: string
          client_id?: string
          closes_request?: boolean
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_messages_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          bot_id: string
          category: string
          client_id: string
          created_at: string
          guest_name: string | null
          id: string
          last_guest_message_at: string | null
          message: string | null
          replied_at: string | null
          resolved_at: string | null
          room: string
          staff_reply: string | null
          status: string
        }
        Insert: {
          bot_id: string
          category: string
          client_id: string
          created_at?: string
          guest_name?: string | null
          id?: string
          last_guest_message_at?: string | null
          message?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          room: string
          staff_reply?: string | null
          status?: string
        }
        Update: {
          bot_id?: string
          category?: string
          client_id?: string
          created_at?: string
          guest_name?: string | null
          id?: string
          last_guest_message_at?: string | null
          message?: string | null
          replied_at?: string | null
          resolved_at?: string | null
          room?: string
          staff_reply?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          phone: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents?: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          phone: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          phone?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          client_id: string
          ended_at: string | null
          errors: Json | null
          id: string
          products_added: number
          products_removed: number
          products_synced: number | null
          products_updated: number
          started_at: string
          status: string
        }
        Insert: {
          client_id: string
          ended_at?: string | null
          errors?: Json | null
          id?: string
          products_added?: number
          products_removed?: number
          products_synced?: number | null
          products_updated?: number
          started_at?: string
          status?: string
        }
        Update: {
          client_id?: string
          ended_at?: string | null
          errors?: Json | null
          id?: string
          products_added?: number
          products_removed?: number
          products_synced?: number | null
          products_updated?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      widget_events: {
        Row: {
          bot_id: string
          client_id: string
          created_at: string
          event: string
          id: string
          lead_id: string | null
          meta: Json
          session_id: string
        }
        Insert: {
          bot_id: string
          client_id: string
          created_at?: string
          event: string
          id?: string
          lead_id?: string | null
          meta?: Json
          session_id: string
        }
        Update: {
          bot_id?: string
          client_id?: string
          created_at?: string
          event?: string
          id?: string
          lead_id?: string | null
          meta?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_events_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "chatbot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      get_widget_config: {
        Args: { _embed_token: string }
        Returns: {
          avatar: string
          background_color: string
          calendly_url: string
          circle_color: string
          id: string
          launcher_position: string
          lead_form_message_count: number
          lead_form_mode: string
          name: string
          primary_color: string
          text_color: string
          welcome_message: string
          welcome_msg_en: string
          welcome_msg_it: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_chunks: {
        Args: {
          _chatbot_id: string
          _match_count?: number
          _match_threshold?: number
          _query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          priority: number
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "client"
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
      app_role: ["super_admin", "client"],
    },
  },
} as const
