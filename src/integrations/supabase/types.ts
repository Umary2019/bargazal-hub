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
          business_name: string;
          created_at: string;
          currency: string;
          email: string | null;
          id: string;
          invoice_prefix: string;
          logo_url: string | null;
          signature_url: string | null;
          phone: string | null;
          tax_rate: number;
          updated_at: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          business_name?: string;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          signature_url?: string | null;
          phone?: string | null;
          tax_rate?: number;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          business_name?: string;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          invoice_prefix?: string;
          logo_url?: string | null;
          signature_url?: string | null;
          phone?: string | null;
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
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          institution?: string | null;
          notes?: string | null;
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          institution?: string | null;
          notes?: string | null;
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string;
          expense_date: string;
          expense_number: string;
          id: string;
          notes: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          description: string;
          expense_date?: string;
          expense_number: string;
          id?: string;
          notes?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string;
          expense_date?: string;
          expense_number?: string;
          id?: string;
          notes?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
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
          project_id: string | null;
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
          project_id?: string | null;
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
          project_id?: string | null;
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
        ];
      };
      payments: {
        Row: {
          amount: number;
          client_id: string;
          created_at: string;
          id: string;
          invoice_id: string | null;
          notes: string | null;
          payment_date: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_number: string;
          project_id: string | null;
          reference: string | null;
        };
        Insert: {
          amount: number;
          client_id: string;
          created_at?: string;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          payment_date?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_number: string;
          project_id?: string | null;
          reference?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string;
          created_at?: string;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          payment_date?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_number?: string;
          project_id?: string | null;
          reference?: string | null;
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
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      projects: {
        Row: {
          amount_paid: number;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "staff";
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
      app_role: ["admin", "staff"],
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
      service_status: ["Active", "Inactive"],
    },
  },
} as const;
