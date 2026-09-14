export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          detail: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          address: string | null;
          bank_account_name: string | null;
          bank_account_number: string | null;
          bank_name: string | null;
          business_name: string;
          created_at: string;
          currency: string;
          email: string | null;
          id: string;
          invoice_prefix: string;
          logo_url: string | null;
          payment_instructions: string | null;
          phone: string | null;
          signature_url: string | null;
          tax_rate: number;
          updated_at: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          business_name?: string;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          payment_instructions?: string | null;
          phone?: string | null;
          signature_url?: string | null;
          tax_rate?: number;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          business_name?: string;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          payment_instructions?: string | null;
          phone?: string | null;
          signature_url?: string | null;
          tax_rate?: number;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          address: string | null;
          approval_status: string;
          auth_user_id: string | null;
          city: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          institution: string | null;
          notes: string | null;
          phone: string | null;
          state: string | null;
          status: string;
          tags: string[] | null;
          acquisition_source: string | null;
          archived_at: string | null;
          updated_at: string;
          user_id: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          approval_status?: string;
          auth_user_id?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          institution?: string | null;
          notes?: string | null;
          phone?: string | null;
          state?: string | null;
          status?: string;
          tags?: string[] | null;
          acquisition_source?: string | null;
          archived_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          approval_status?: string;
          auth_user_id?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          institution?: string | null;
          notes?: string | null;
          phone?: string | null;
          state?: string | null;
          status?: string;
          tags?: string[] | null;
          acquisition_source?: string | null;
          archived_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          created_by: string | null;
          description: string;
          expense_date: string;
          expense_number: string;
          id: string;
          notes: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          approval_status: string;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          receipt_url: string | null;
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          expense_date?: string;
          expense_number: string;
          id?: string;
          notes?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          approval_status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          receipt_url?: string | null;
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          expense_date?: string;
          expense_number?: string;
          id?: string;
          notes?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          approval_status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          receipt_url?: string | null;
          updated_at?: string;
          vendor?: string | null;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          quantity: number;
          service_id: string | null;
          total: number | null;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          quantity?: number;
          service_id?: string | null;
          total?: number | null;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          quantity?: number;
          service_id?: string | null;
          total?: number | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_public_tokens: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          invoice_id: string;
          revoked_at: string | null;
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          invoice_id: string;
          revoked_at?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          invoice_id?: string;
          revoked_at?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_public_tokens_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_paid: number;
          balance: number | null;
          client_id: string;
          created_at: string;
          discount: number;
          due_date: string | null;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string | null;
          client_notes: string | null;
          payment_terms: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          project_id: string | null;
          service_request_id: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          tax: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          amount_paid?: number;
          balance?: number | null;
          client_id: string;
          created_at?: string;
          discount?: number;
          due_date?: string | null;
          id?: string;
          invoice_number: string;
          issue_date?: string;
          notes?: string | null;
          client_notes?: string | null;
          payment_terms?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          project_id?: string | null;
          service_request_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          balance?: number | null;
          client_id?: string;
          created_at?: string;
          discount?: number;
          due_date?: string | null;
          id?: string;
          invoice_number?: string;
          issue_date?: string;
          notes?: string | null;
          client_notes?: string | null;
          payment_terms?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          project_id?: string | null;
          service_request_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_service_request_id_fkey";
            columns: ["service_request_id"];
            isOneToOne: false;
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          channel: string;
          created_at: string;
          created_by: string | null;
          error_message: string | null;
          id: string;
          invoice_id: string | null;
          provider_message_id: string | null;
          recipient: string;
          status: string;
        };
        Insert: {
          channel: string;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          id?: string;
          invoice_id?: string | null;
          provider_message_id?: string | null;
          recipient: string;
          status: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          id?: string;
          invoice_id?: string | null;
          provider_message_id?: string | null;
          recipient?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          channel: string | null;
          client_id: string;
          created_at: string;
          currency: string;
          id: string;
          invoice_id: string | null;
          notes: string | null;
          payment_date: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_number: string;
          project_id: string | null;
          provider_reference: string | null;
          reference: string | null;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount: number;
          channel?: string | null;
          client_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          payment_date?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_number: string;
          project_id?: string | null;
          provider_reference?: string | null;
          reference?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount?: number;
          channel?: string | null;
          client_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          payment_date?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_number?: string;
          project_id?: string | null;
          provider_reference?: string | null;
          reference?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      paystack_transactions: {
        Row: {
          amount: number;
          authorization_url: string | null;
          channel: string | null;
          client_id: string | null;
          created_at: string;
          email: string;
          id: string;
          invoice_id: string;
          paid_at: string | null;
          payment_id: string | null;
          raw: Json | null;
          reference: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          authorization_url?: string | null;
          channel?: string | null;
          client_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invoice_id: string;
          paid_at?: string | null;
          payment_id?: string | null;
          raw?: Json | null;
          reference: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          authorization_url?: string | null;
          channel?: string | null;
          client_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invoice_id?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          raw?: Json | null;
          reference?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paystack_transactions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paystack_transactions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paystack_transactions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approval_status: string;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          job_title: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          approval_status?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          approval_status?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_files: {
        Row: {
          content_type: string | null;
          created_at: string;
          id: string;
          milestone_id: string | null;
          name: string;
          project_id: string;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          content_type?: string | null;
          created_at?: string;
          id?: string;
          milestone_id?: string | null;
          name: string;
          project_id: string;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          content_type?: string | null;
          created_at?: string;
          id?: string;
          milestone_id?: string | null;
          name?: string;
          project_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "project_milestones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_milestones: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          project_id: string;
          sort_order: number;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          project_id: string;
          sort_order?: number;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          project_id?: string;
          sort_order?: number;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_services: {
        Row: {
          created_at: string;
          id: string;
          price: number;
          project_id: string;
          quantity: number;
          service_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          price?: number;
          project_id: string;
          quantity?: number;
          service_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          price?: number;
          project_id?: string;
          quantity?: number;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_services_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          milestone_id: string | null;
          project_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          milestone_id?: string | null;
          project_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          milestone_id?: string | null;
          project_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_tasks_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "project_milestones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          amount_paid: number;
          assigned_staff_id: string | null;
          balance: number | null;
          budget: number;
          client_id: string;
          created_at: string;
          deadline: string | null;
          demo_url: string | null;
          department: string | null;
          description: string | null;
          github_url: string | null;
          id: string;
          institution: string | null;
          is_final_year: boolean;
          notes: string | null;
          priority: Database["public"]["Enums"]["project_priority"];
          programme: string | null;
          progress: number;
          project_number: string;
          requirements: string | null;
          service_id: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          supervisor: string | null;
          tech_stack: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          amount_paid?: number;
          assigned_staff_id?: string | null;
          balance?: number | null;
          budget?: number;
          client_id: string;
          created_at?: string;
          deadline?: string | null;
          demo_url?: string | null;
          department?: string | null;
          description?: string | null;
          github_url?: string | null;
          id?: string;
          institution?: string | null;
          is_final_year?: boolean;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["project_priority"];
          programme?: string | null;
          progress?: number;
          project_number: string;
          requirements?: string | null;
          service_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          supervisor?: string | null;
          tech_stack?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          assigned_staff_id?: string | null;
          balance?: number | null;
          budget?: number;
          client_id?: string;
          created_at?: string;
          deadline?: string | null;
          demo_url?: string | null;
          department?: string | null;
          description?: string | null;
          github_url?: string | null;
          id?: string;
          institution?: string | null;
          is_final_year?: boolean;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["project_priority"];
          programme?: string | null;
          progress?: number;
          project_number?: string;
          requirements?: string | null;
          service_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          supervisor?: string | null;
          tech_stack?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          quantity: number;
          quote_id: string;
          service_id: string | null;
          total: number | null;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          quantity?: number;
          quote_id: string;
          service_id?: string | null;
          total?: number | null;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          quantity?: number;
          quote_id?: string;
          service_id?: string | null;
          total?: number | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["quote_status"] | null;
          id: string;
          quote_id: string;
          to_status: Database["public"]["Enums"]["quote_status"];
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["quote_status"] | null;
          id?: string;
          quote_id: string;
          to_status: Database["public"]["Enums"]["quote_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["quote_status"] | null;
          id?: string;
          quote_id?: string;
          to_status?: Database["public"]["Enums"]["quote_status"];
        };
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          client_id: string;
          created_at: string;
          discount: number;
          expiry_date: string | null;
          id: string;
          issue_date: string;
          notes: string | null;
          project_id: string | null;
          quote_number: string;
          status: Database["public"]["Enums"]["quote_status"];
          subtotal: number;
          tax: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          discount?: number;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string;
          notes?: string | null;
          project_id?: string | null;
          quote_number: string;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal?: number;
          tax?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          discount?: number;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string;
          notes?: string | null;
          project_id?: string | null;
          quote_number?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal?: number;
          tax?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      service_requests: {
        Row: {
          admin_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          budget: number;
          client_id: string;
          created_at: string;
          details: string | null;
          id: string;
          institution: string | null;
          preferred_deadline: string | null;
          processed_at: string | null;
          processed_by: string | null;
          project_id: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          service_id: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          admin_note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          budget?: number;
          client_id: string;
          created_at?: string;
          details?: string | null;
          id?: string;
          institution?: string | null;
          preferred_deadline?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          project_id?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          service_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          admin_note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          budget?: number;
          client_id?: string;
          created_at?: string;
          details?: string | null;
          id?: string;
          institution?: string | null;
          preferred_deadline?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          project_id?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          service_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          duration: string | null;
          id: string;
          is_chapter: boolean;
          name: string;
          price: number;
          pricing_type: Database["public"]["Enums"]["pricing_type"];
          sort_order: number;
          status: Database["public"]["Enums"]["service_status"];
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          duration?: string | null;
          id?: string;
          is_chapter?: boolean;
          name: string;
          price?: number;
          pricing_type?: Database["public"]["Enums"]["pricing_type"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["service_status"];
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          duration?: string | null;
          id?: string;
          is_chapter?: boolean;
          name?: string;
          price?: number;
          pricing_type?: Database["public"]["Enums"]["pricing_type"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["service_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      invoice_installments: {
        Row: {
          id: string;
          invoice_id: string;
          installment_number: number;
          amount: number;
          due_date: string | null;
          status: string;
          paid_at: string | null;
          payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          installment_number: number;
          amount: number;
          due_date?: string | null;
          status?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          installment_number?: number;
          amount?: number;
          due_date?: string | null;
          status?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          invoice_id: string;
          amount: number;
          reason: string;
          status: string;
          gateway_refund_id: string | null;
          processed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          invoice_id: string;
          amount: number;
          reason: string;
          status?: string;
          gateway_refund_id?: string | null;
          processed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          invoice_id?: string;
          amount?: number;
          reason?: string;
          status?: string;
          gateway_refund_id?: string | null;
          processed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      invoice_reminder_logs: {
        Row: {
          id: string;
          invoice_id: string;
          reminder_type: string;
          channel: string;
          status: string;
          recipient: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          reminder_type: string;
          channel?: string;
          status?: string;
          recipient: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          reminder_type?: string;
          channel?: string;
          status?: string;
          recipient?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          recipient: string;
          subject: string;
          template: string;
          status: string;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient: string;
          subject: string;
          template: string;
          status?: string;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient?: string;
          subject?: string;
          template?: string;
          status?: string;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      project_revisions: {
        Row: {
          id: string;
          project_id: string;
          client_id: string;
          requested_by: string;
          reason: string;
          status: string;
          admin_notes: string | null;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          client_id: string;
          requested_by: string;
          reason: string;
          status?: string;
          admin_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          client_id?: string;
          requested_by?: string;
          reason?: string;
          status?: string;
          admin_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [];
      };
      project_messages: {
        Row: {
          id: string;
          project_id: string;
          sender_id: string;
          sender_name: string | null;
          sender_role: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          sender_id: string;
          sender_name?: string | null;
          sender_role: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          sender_id?: string;
          sender_name?: string | null;
          sender_role?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link: string | null;
          priority: string | null;
          related_entity: string | null;
          related_entity_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          link?: string | null;
          priority?: string | null;
          related_entity?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          link?: string | null;
          priority?: string | null;
          related_entity?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_client: {
        Args: { _approved: boolean; _client_id: string };
        Returns: undefined;
      };
      approve_service_request: {
        Args: {
          _admin_note?: string | null;
          _assigned_staff_id?: string | null;
          _invoice_amount?: number | null;
          _invoice_due_date?: string | null;
          _request_id: string;
        };
        Returns: Json;
      };
      approve_staff: {
        Args: { _approved: boolean; _user_id: string };
        Returns: undefined;
      };
      convert_quote_to_invoice: { Args: { _quote_id: string }; Returns: string };
      create_invoice_public_token: {
        Args: { _invoice_id: string };
        Returns: string;
      };
      current_client_id: { Args: never; Returns: string };
      get_or_create_invoice_token: {
        Args: { _invoice_id: string };
        Returns: string;
      };
      finalize_client_registration: {
        Args: {
          _address: string;
          _city: string;
          _full_name: string;
          _phone: string;
          _state: string;
        };
        Returns: string;
      };
      finalize_staff_registration: {
        Args: { _full_name: string; _job_title: string; _phone: string };
        Returns: string;
      };
      get_my_client: {
        Args: never;
        Returns: {
          address: string | null;
          approval_status: string;
          auth_user_id: string | null;
          city: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          institution: string | null;
          notes: string | null;
          phone: string | null;
          state: string | null;
          updated_at: string;
          user_id: string | null;
          whatsapp: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "clients";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_public_invoice: { Args: { _token: string }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      init_paystack_transaction: {
        Args: {
          _amount: number;
          _authorization_url?: string | null;
          _email: string;
          _invoice_id: string;
          _reference: string;
        };
        Returns: Json;
      };
      is_admin: { Args: { _user_id?: string }; Returns: boolean };
      is_approved_client: { Args: never; Returns: boolean };
      is_staff_or_admin: { Args: { _user_id?: string }; Returns: boolean };
      mark_paystack_failed: {
        Args: { _raw: Json; _reference: string; _status: string };
        Returns: undefined;
      };
      promote_client_to_staff: {
        Args: { _client_id: string; _job_title?: string };
        Returns: string;
      };
      record_paystack_success: {
        Args: {
          _amount: number;
          _channel: string;
          _paid_at: string;
          _raw: Json;
          _reference: string;
        };
        Returns: Json;
      };
      settle_paystack_payment: {
        Args: {
          _amount: number;
          _channel: string;
          _paid_at: string;
          _raw: Json;
          _reference: string;
        };
        Returns: Json;
      };
      reject_service_request: {
        Args: {
          _admin_note?: string | null;
          _rejection_reason: string;
          _request_id: string;
        };
        Returns: Json;
      };
      save_invoice: {
        Args: {
          _client_id: string;
          _discount: number;
          _due_date: string;
          _id: string;
          _issue_date: string;
          _items: Json;
          _notes: string;
          _project_id: string;
          _status: Database["public"]["Enums"]["invoice_status"];
          _tax: number;
        };
        Returns: {
          amount_paid: number;
          balance: number | null;
          client_id: string;
          created_at: string;
          discount: number;
          due_date: string | null;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string | null;
          project_id: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          tax: number;
          total: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "invoices";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_staff_active: {
        Args: { _active: boolean; _user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "staff" | "client";
      invoice_status: "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
      payment_method: "Cash" | "Bank Transfer" | "POS" | "Online Payment" | "Other";
      pricing_type: "Fixed" | "Starting From" | "Hourly" | "Custom";
      project_priority: "Low" | "Medium" | "High" | "Urgent";
      project_status:
        | "Pending"
        | "Planning"
        | "Requirements"
        | "Design"
        | "Development"
        | "Testing"
        | "Client Review"
        | "Completed"
        | "Cancelled";
      quote_status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired" | "Converted";
      service_status: "Active" | "Inactive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "client"],
      invoice_status: ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"],
      payment_method: ["Cash", "Bank Transfer", "POS", "Online Payment", "Other"],
      pricing_type: ["Fixed", "Starting From", "Hourly", "Custom"],
      project_priority: ["Low", "Medium", "High", "Urgent"],
      project_status: [
        "Pending",
        "Planning",
        "Requirements",
        "Design",
        "Development",
        "Testing",
        "Client Review",
        "Completed",
        "Cancelled",
      ],
      quote_status: ["Draft", "Sent", "Accepted", "Rejected", "Expired", "Converted"],
      service_status: ["Active", "Inactive"],
    },
  },
} as const;
