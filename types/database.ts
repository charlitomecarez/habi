export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      budget_alerts: {
        Row: {
          budget_id: string;
          level: number;
          month: string;
          sent_at: string;
        };
        Insert: {
          budget_id: string;
          level: number;
          month: string;
          sent_at?: string;
        };
        Update: {
          budget_id?: string;
          level?: number;
          month?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "money_budgets";
            referencedColumns: ["id"];
          },
        ];
      };
      content_videos: {
        Row: {
          created_at: string;
          done_steps: string[];
          format: Database["public"]["Enums"]["content_format"];
          hook: string;
          id: string;
          notes: string;
          platforms: string[];
          posts: Json;
          priority: number;
          project_slug: string;
          publish_on: string | null;
          stage: Database["public"]["Enums"]["content_stage"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          done_steps?: string[];
          format?: Database["public"]["Enums"]["content_format"];
          hook?: string;
          id?: string;
          notes?: string;
          platforms?: string[];
          posts?: Json;
          priority?: number;
          project_slug?: string;
          publish_on?: string | null;
          stage?: Database["public"]["Enums"]["content_stage"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          done_steps?: string[];
          format?: Database["public"]["Enums"]["content_format"];
          hook?: string;
          id?: string;
          notes?: string;
          platforms?: string[];
          posts?: Json;
          priority?: number;
          project_slug?: string;
          publish_on?: string | null;
          stage?: Database["public"]["Enums"]["content_stage"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_tips: {
        Row: {
          created_at: string;
          id: string;
          on_date: string;
          tip: string;
          topic: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          on_date: string;
          tip: string;
          topic: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          on_date?: string;
          tip?: string;
          topic?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      debt_payments: {
        Row: {
          account_id: string | null;
          amount: number;
          created_at: string;
          debt_id: string;
          id: string;
          paid_on: string;
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          created_at?: string;
          debt_id: string;
          id?: string;
          paid_on?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          created_at?: string;
          debt_id?: string;
          id?: string;
          paid_on?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debt_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "debt_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey";
            columns: ["debt_id"];
            isOneToOne: false;
            referencedRelation: "debt_balances";
            referencedColumns: ["debt_id"];
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey";
            columns: ["debt_id"];
            isOneToOne: false;
            referencedRelation: "debts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      debts: {
        Row: {
          amount: number;
          created_at: string;
          direction: Database["public"]["Enums"]["debt_direction"];
          due_on: string | null;
          id: string;
          note: string | null;
          occurred_on: string;
          person_id: string | null;
          person_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          direction: Database["public"]["Enums"]["debt_direction"];
          due_on?: string | null;
          id?: string;
          note?: string | null;
          occurred_on?: string;
          person_id?: string | null;
          person_name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          direction?: Database["public"]["Enums"]["debt_direction"];
          due_on?: string | null;
          id?: string;
          note?: string | null;
          occurred_on?: string;
          person_id?: string | null;
          person_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debts_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          expires_on: string | null;
          id: string;
          issued_on: string | null;
          name: string;
          note: string | null;
          number: string | null;
          photo_paths: string[];
          remind_days_before: number;
          type: Database["public"]["Enums"]["document_type"];
          updated_at: string;
          user_id: string;
          vehicle_id: string | null;
        };
        Insert: {
          created_at?: string;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          name: string;
          note?: string | null;
          number?: string | null;
          photo_paths?: string[];
          remind_days_before?: number;
          type?: Database["public"]["Enums"]["document_type"];
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string | null;
        };
        Update: {
          created_at?: string;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          name?: string;
          note?: string | null;
          number?: string | null;
          photo_paths?: string[];
          remind_days_before?: number;
          type?: Database["public"]["Enums"]["document_type"];
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          currency: string;
          rate_to_php: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          currency: string;
          rate_to_php: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          currency?: string;
          rate_to_php?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fuel_logs: {
        Row: {
          created_at: string;
          filled_on: string;
          full_tank: boolean;
          id: string;
          litres: number;
          odometer_km: number;
          odometer_log_id: string | null;
          price_per_litre: number;
          station: string | null;
          total: number;
          transaction_id: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          filled_on?: string;
          full_tank?: boolean;
          id?: string;
          litres: number;
          odometer_km: number;
          odometer_log_id?: string | null;
          price_per_litre: number;
          station?: string | null;
          total: number;
          transaction_id?: string | null;
          user_id?: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          filled_on?: string;
          full_tank?: boolean;
          id?: string;
          litres?: number;
          odometer_km?: number;
          odometer_log_id?: string | null;
          price_per_litre?: number;
          station?: string | null;
          total?: number;
          transaction_id?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fuel_logs_odometer_log_id_fkey";
            columns: ["odometer_log_id"];
            isOneToOne: false;
            referencedRelation: "odometer_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fuel_logs_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_ideas: {
        Row: {
          bought_at: string | null;
          created_at: string;
          id: string;
          person_id: string;
          price: number | null;
          title: string;
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          bought_at?: string | null;
          created_at?: string;
          id?: string;
          person_id: string;
          price?: number | null;
          title: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Update: {
          bought_at?: string | null;
          created_at?: string;
          id?: string;
          person_id?: string;
          price?: number | null;
          title?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_ideas_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_ideas_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      habit_checks: {
        Row: {
          created_at: string;
          habit_id: string;
          id: string;
          on_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          habit_id: string;
          id?: string;
          on_date: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          habit_id?: string;
          id?: string;
          on_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_checks_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id"];
          },
        ];
      };
      habits: {
        Row: {
          archived: boolean;
          created_at: string;
          id: string;
          name: string;
          remind_time: string | null;
          schedule: Database["public"]["Enums"]["habit_schedule"];
          times_per_week: number | null;
          updated_at: string;
          user_id: string;
          weekdays: number[];
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          remind_time?: string | null;
          schedule?: Database["public"]["Enums"]["habit_schedule"];
          times_per_week?: number | null;
          updated_at?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          remind_time?: string | null;
          schedule?: Database["public"]["Enums"]["habit_schedule"];
          times_per_week?: number | null;
          updated_at?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Relationships: [];
      };
      health_visits: {
        Row: {
          created_at: string;
          doctor: string;
          id: string;
          notes: string | null;
          photo_paths: string[];
          reason: string;
          updated_at: string;
          user_id: string;
          visited_on: string;
        };
        Insert: {
          created_at?: string;
          doctor?: string;
          id?: string;
          notes?: string | null;
          photo_paths?: string[];
          reason?: string;
          updated_at?: string;
          user_id?: string;
          visited_on?: string;
        };
        Update: {
          created_at?: string;
          doctor?: string;
          id?: string;
          notes?: string | null;
          photo_paths?: string[];
          reason?: string;
          updated_at?: string;
          user_id?: string;
          visited_on?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          acquired_on: string | null;
          category: string | null;
          created_at: string;
          id: string;
          location_id: string | null;
          name: string;
          notes: string | null;
          photo_path: string | null;
          price: number | null;
          quantity: number;
          receipt_path: string | null;
          updated_at: string;
          user_id: string;
          warranty_ends_on: string | null;
        };
        Insert: {
          acquired_on?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          name: string;
          notes?: string | null;
          photo_path?: string | null;
          price?: number | null;
          quantity?: number;
          receipt_path?: string | null;
          updated_at?: string;
          user_id?: string;
          warranty_ends_on?: string | null;
        };
        Update: {
          acquired_on?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          name?: string;
          notes?: string | null;
          photo_path?: string | null;
          price?: number | null;
          quantity?: number;
          receipt_path?: string | null;
          updated_at?: string;
          user_id?: string;
          warranty_ends_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_locations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          parent_id: string | null;
          qr_code: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          parent_id?: string | null;
          qr_code?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          parent_id?: string | null;
          qr_code?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_locations_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_entries: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          mood: Database["public"]["Enums"]["journal_mood"] | null;
          on_date: string;
          photo_path: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          mood?: Database["public"]["Enums"]["journal_mood"] | null;
          on_date: string;
          photo_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          mood?: Database["public"]["Enums"]["journal_mood"] | null;
          on_date?: string;
          photo_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      medicine_doses: {
        Row: {
          created_at: string;
          dose: string;
          id: string;
          marked_at: string | null;
          medicine_id: string;
          medicine_name: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["dose_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dose?: string;
          id?: string;
          marked_at?: string | null;
          medicine_id: string;
          medicine_name: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["dose_status"];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          dose?: string;
          id?: string;
          marked_at?: string | null;
          medicine_id?: string;
          medicine_name?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["dose_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medicine_doses_medicine_id_fkey";
            columns: ["medicine_id"];
            isOneToOne: false;
            referencedRelation: "medicines";
            referencedColumns: ["id"];
          },
        ];
      };
      medicines: {
        Row: {
          created_at: string;
          dose: string;
          end_on: string | null;
          id: string;
          name: string;
          note: string | null;
          start_on: string;
          times: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dose?: string;
          end_on?: string | null;
          id?: string;
          name: string;
          note?: string | null;
          start_on?: string;
          times?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          dose?: string;
          end_on?: string | null;
          id?: string;
          name?: string;
          note?: string | null;
          start_on?: string;
          times?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      money_accounts: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          is_archived: boolean;
          kind: Database["public"]["Enums"]["money_account_kind"];
          name: string;
          opening_balance: number;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          is_archived?: boolean;
          kind?: Database["public"]["Enums"]["money_account_kind"];
          name: string;
          opening_balance?: number;
          sort_order?: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          is_archived?: boolean;
          kind?: Database["public"]["Enums"]["money_account_kind"];
          name?: string;
          opening_balance?: number;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      money_budgets: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          monthly_limit: number;
          starts_on: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          monthly_limit: number;
          starts_on?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          monthly_limit?: number;
          starts_on?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "money_budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "money_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      money_categories: {
        Row: {
          icon: string | null;
          id: string;
          kind: Database["public"]["Enums"]["money_category_kind"];
          name: string;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          icon?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["money_category_kind"];
          name: string;
          sort_order?: number;
          user_id?: string;
        };
        Update: {
          icon?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["money_category_kind"];
          name?: string;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      odometer_logs: {
        Row: {
          id: string;
          logged_at: string;
          note: string | null;
          odometer_km: number;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          id?: string;
          logged_at?: string;
          note?: string | null;
          odometer_km: number;
          user_id?: string;
          vehicle_id: string;
        };
        Update: {
          id?: string;
          logged_at?: string;
          note?: string | null;
          odometer_km?: number;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "odometer_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          note: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          note?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          note?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      person_dates: {
        Row: {
          created_at: string;
          day: number;
          id: string;
          kind: Database["public"]["Enums"]["person_date_kind"];
          label: string | null;
          month: number;
          person_id: string;
          user_id: string;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          day: number;
          id?: string;
          kind?: Database["public"]["Enums"]["person_date_kind"];
          label?: string | null;
          month: number;
          person_id: string;
          user_id?: string;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          day?: number;
          id?: string;
          kind?: Database["public"]["Enums"]["person_date_kind"];
          label?: string | null;
          month?: number;
          person_id?: string;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "person_dates_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          token: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          remind_at: string;
          sent_at: string | null;
          source_id: string | null;
          source_type: Database["public"]["Enums"]["reminder_source"];
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          remind_at: string;
          sent_at?: string | null;
          source_id?: string | null;
          source_type?: Database["public"]["Enums"]["reminder_source"];
          title: string;
          user_id?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          remind_at?: string;
          sent_at?: string | null;
          source_id?: string | null;
          source_type?: Database["public"]["Enums"]["reminder_source"];
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      savings_contributions: {
        Row: {
          amount: number;
          created_at: string;
          goal_id: string;
          id: string;
          note: string | null;
          on_date: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          goal_id: string;
          id?: string;
          note?: string | null;
          on_date?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          goal_id?: string;
          id?: string;
          note?: string | null;
          on_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_contributions_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "savings_goals";
            referencedColumns: ["id"];
          },
        ];
      };
      savings_goals: {
        Row: {
          account_id: string | null;
          created_at: string;
          id: string;
          name: string;
          target_amount: number;
          target_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          target_amount: number;
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          target_amount?: number;
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      service_logs: {
        Row: {
          cost: number | null;
          created_at: string;
          id: string;
          notes: string | null;
          odometer_km: number;
          receipt_path: string | null;
          serviced_on: string;
          shop: string | null;
          user_id: string;
          vehicle_id: string;
          vehicle_service_id: string | null;
        };
        Insert: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          odometer_km: number;
          receipt_path?: string | null;
          serviced_on?: string;
          shop?: string | null;
          user_id?: string;
          vehicle_id: string;
          vehicle_service_id?: string | null;
        };
        Update: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          odometer_km?: number;
          receipt_path?: string | null;
          serviced_on?: string;
          shop?: string | null;
          user_id?: string;
          vehicle_id?: string;
          vehicle_service_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_logs_vehicle_service_id_fkey";
            columns: ["vehicle_service_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_service_due";
            referencedColumns: ["vehicle_service_id"];
          },
          {
            foreignKeyName: "service_logs_vehicle_service_id_fkey";
            columns: ["vehicle_service_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_services";
            referencedColumns: ["id"];
          },
        ];
      };
      service_templates: {
        Row: {
          id: string;
          interval_km: number | null;
          interval_months: number | null;
          item: string;
          model_id: string;
          notes: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          item: string;
          model_id: string;
          notes?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          item?: string;
          model_id?: string;
          notes?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_templates_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_history: {
        Row: {
          id: string;
          last_bought_at: string;
          last_price: number | null;
          name: string;
          times: number;
          user_id: string;
        };
        Insert: {
          id?: string;
          last_bought_at?: string;
          last_price?: number | null;
          name: string;
          times?: number;
          user_id?: string;
        };
        Update: {
          id?: string;
          last_bought_at?: string;
          last_price?: number | null;
          name?: string;
          times?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      shopping_items: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          price: number | null;
          quantity: string;
          ticked: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          price?: number | null;
          quantity?: string;
          ticked?: boolean;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          price?: number | null;
          quantity?: string;
          ticked?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          account_id: string | null;
          amount: number | null;
          auto_add: boolean;
          billing_cycle: Database["public"]["Enums"]["billing_cycle"];
          category_id: string | null;
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["subscription_kind"];
          name: string;
          next_billing_on: string;
          notes: string | null;
          remind_days_before: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount?: number | null;
          auto_add?: boolean;
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"];
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["subscription_kind"];
          name: string;
          next_billing_on: string;
          notes?: string | null;
          remind_days_before?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number | null;
          auto_add?: boolean;
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"];
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["subscription_kind"];
          name?: string;
          next_billing_on?: string;
          notes?: string | null;
          remind_days_before?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "money_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      todos: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_at: string | null;
          id: string;
          notes: string | null;
          priority: number;
          remind_at: string | null;
          repeat: Database["public"]["Enums"]["todo_repeat"];
          title: string;
          updated_at: string;
          user_id: string;
          video_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          priority?: number;
          remind_at?: string | null;
          repeat?: Database["public"]["Enums"]["todo_repeat"];
          title: string;
          updated_at?: string;
          user_id?: string;
          video_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          priority?: number;
          remind_at?: string | null;
          repeat?: Database["public"]["Enums"]["todo_repeat"];
          title?: string;
          updated_at?: string;
          user_id?: string;
          video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "todos_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "content_videos";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string;
          amount: number;
          category_id: string | null;
          created_at: string;
          external_ref: string | null;
          id: string;
          kind: Database["public"]["Enums"]["transaction_kind"];
          merchant: string | null;
          note: string | null;
          occurred_on: string;
          source: Database["public"]["Enums"]["transaction_source"];
          subscription_id: string | null;
          to_account_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          category_id?: string | null;
          created_at?: string;
          external_ref?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["transaction_kind"];
          merchant?: string | null;
          note?: string | null;
          occurred_on?: string;
          source?: Database["public"]["Enums"]["transaction_source"];
          subscription_id?: string | null;
          to_account_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          external_ref?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["transaction_kind"];
          merchant?: string | null;
          note?: string | null;
          occurred_on?: string;
          source?: Database["public"]["Enums"]["transaction_source"];
          subscription_id?: string | null;
          to_account_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "money_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscription_costs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          created_at: string;
          digest_enabled: boolean;
          digest_hour: number;
          digest_last_sent_on: string | null;
          timezone: string;
          updated_at: string;
          user_id: string;
          weekly_review_last_sent_on: string | null;
        };
        Insert: {
          created_at?: string;
          digest_enabled?: boolean;
          digest_hour?: number;
          digest_last_sent_on?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          weekly_review_last_sent_on?: string | null;
        };
        Update: {
          created_at?: string;
          digest_enabled?: boolean;
          digest_hour?: number;
          digest_last_sent_on?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          weekly_review_last_sent_on?: string | null;
        };
        Relationships: [];
      };
      vault_entries: {
        Row: {
          ciphertext: string;
          created_at: string;
          id: string;
          nonce: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          ciphertext: string;
          created_at?: string;
          id?: string;
          nonce: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Update: {
          ciphertext?: string;
          created_at?: string;
          id?: string;
          nonce?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [];
      };
      vault_settings: {
        Row: {
          created_at: string;
          kdf: string;
          kdf_mem_limit: number;
          kdf_ops_limit: number;
          kdf_salt: string;
          key_check: string;
          key_check_nonce: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          kdf?: string;
          kdf_mem_limit: number;
          kdf_ops_limit: number;
          kdf_salt: string;
          key_check: string;
          key_check_nonce: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          kdf?: string;
          kdf_mem_limit?: number;
          kdf_ops_limit?: number;
          kdf_salt?: string;
          key_check?: string;
          key_check_nonce?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_models: {
        Row: {
          id: string;
          is_default: boolean;
          make: string;
          model: string;
        };
        Insert: {
          id?: string;
          is_default?: boolean;
          make: string;
          model: string;
        };
        Update: {
          id?: string;
          is_default?: boolean;
          make?: string;
          model?: string;
        };
        Relationships: [];
      };
      vehicle_services: {
        Row: {
          created_at: string;
          id: string;
          interval_km: number | null;
          interval_months: number | null;
          is_active: boolean;
          item: string;
          sort_order: number;
          template_id: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          is_active?: boolean;
          item: string;
          sort_order?: number;
          template_id?: string | null;
          user_id?: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          is_active?: boolean;
          item?: string;
          sort_order?: number;
          template_id?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_services_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "service_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_services_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          created_at: string;
          current_odometer_km: number;
          id: string;
          is_primary: boolean;
          make: string;
          model: string;
          model_id: string | null;
          nickname: string | null;
          plate_number: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_odometer_km?: number;
          id?: string;
          is_primary?: boolean;
          make: string;
          model: string;
          model_id?: string | null;
          nickname?: string | null;
          plate_number?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          current_odometer_km?: number;
          id?: string;
          is_primary?: boolean;
          make?: string;
          model?: string;
          model_id?: string | null;
          nickname?: string | null;
          plate_number?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      weight_logs: {
        Row: {
          created_at: string;
          id: string;
          on_date: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          on_date?: string;
          user_id?: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          on_date?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          plan_id: string;
          reps: number;
          sets: number;
          sort_order: number;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          plan_id: string;
          reps?: number;
          sets?: number;
          sort_order?: number;
          user_id?: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          plan_id?: string;
          reps?: number;
          sets?: number;
          sort_order?: number;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_exercises_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          archived: boolean;
          created_at: string;
          id: string;
          name: string;
          remind_time: string | null;
          sort_order: number;
          updated_at: string;
          user_id: string;
          weekdays: number[];
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          remind_time?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          remind_time?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          created_at: string;
          id: string;
          on_date: string;
          plan_id: string | null;
          plan_name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          on_date: string;
          plan_id?: string | null;
          plan_name: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          on_date?: string;
          plan_id?: string | null;
          plan_name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          created_at: string;
          exercise_id: string | null;
          exercise_name: string;
          id: string;
          reps: number;
          session_id: string;
          set_number: number;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          exercise_id?: string | null;
          exercise_name: string;
          id?: string;
          reps: number;
          session_id: string;
          set_number: number;
          user_id?: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          id?: string;
          reps?: number;
          session_id?: string;
          set_number?: number;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      debt_balances: {
        Row: {
          amount: number | null;
          balance: number | null;
          debt_id: string | null;
          paid: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      money_account_balances: {
        Row: {
          account_id: string | null;
          balance: number | null;
          currency: string | null;
          is_archived: boolean | null;
          kind: Database["public"]["Enums"]["money_account_kind"] | null;
          name: string | null;
          sort_order: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      subscription_costs: {
        Row: {
          account_id: string | null;
          amount: number | null;
          auto_add: boolean | null;
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null;
          category_id: string | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          is_active: boolean | null;
          kind: Database["public"]["Enums"]["subscription_kind"] | null;
          monthly_php: number | null;
          name: string | null;
          next_billing_on: string | null;
          notes: string | null;
          rate_to_php: number | null;
          remind_days_before: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "money_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "money_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_service_due: {
        Row: {
          current_odometer_km: number | null;
          days_remaining: number | null;
          interval_km: number | null;
          interval_months: number | null;
          item: string | null;
          km_remaining: number | null;
          last_service_km: number | null;
          last_serviced_on: string | null;
          make: string | null;
          model: string | null;
          next_due_km: number | null;
          next_due_on: string | null;
          nickname: string | null;
          sort_order: number | null;
          status: string | null;
          user_id: string | null;
          vehicle_id: string | null;
          vehicle_service_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_services_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_due_subscription_expenses: { Args: never; Returns: number };
      apply_owner_rls: { Args: { tbl: unknown }; Returns: undefined };
      import_transactions: { Args: { p_rows: Json }; Returns: number };
      budget_month: {
        Args: { p_budget_id: string; p_month: string };
        Returns: {
          available: number;
          carried: number;
          spent: number;
        }[];
      };
      buy_gift: {
        Args: { p_account_id: string; p_amount: number; p_gift_id: string };
        Returns: undefined;
      };
      fill_all_medicine_doses: { Args: never; Returns: undefined };
      fill_medicine_doses: {
        Args: { p_medicine_id: string };
        Returns: undefined;
      };
      log_fuel: {
        Args: {
          p_account_id: string;
          p_category_id: string;
          p_filled_on: string;
          p_full_tank: boolean;
          p_litres: number;
          p_odometer_km: number;
          p_price_per_litre: number;
          p_station: string;
          p_vehicle_id: string;
        };
        Returns: string;
      };
      next_person_date: {
        Args: { from_date: string; p_day: number; p_month: number };
        Returns: string;
      };
      record_debt_payment: {
        Args: {
          p_account_id?: string;
          p_amount: number;
          p_debt_id: string;
          p_paid_on: string;
        };
        Returns: string;
      };
      seed_money_defaults: { Args: never; Returns: undefined };
      shopping_checkout: {
        Args: { p_account_id: string; p_category_id: string; p_store: string };
        Returns: number;
      };
      sync_debt_reminder_for: {
        Args: { p_debt_id: string };
        Returns: undefined;
      };
      sync_habit_reminder_for: {
        Args: { p_habit_id: string };
        Returns: undefined;
      };
      sync_person_date_reminder_for: {
        Args: { from_date?: string; p_id: string };
        Returns: undefined;
      };
      sync_workout_reminder_for: {
        Args: { p_plan_id: string };
        Returns: undefined;
      };
      weekly_review: { Args: { p_week_start?: string }; Returns: Json };
      weekly_review_for: {
        Args: { p_user_id: string; p_week_start: string };
        Returns: Json;
      };
    };
    Enums: {
      billing_cycle: "weekly" | "monthly" | "quarterly" | "yearly";
      content_format: "long" | "short";
      content_stage: "idea" | "script" | "record" | "edit" | "polish" | "publish" | "published";
      debt_direction: "owed_to_me" | "i_owe";
      document_type: "lto_registration" | "drivers_license" | "passport" | "insurance" | "philhealth" | "other";
      dose_status: "pending" | "taken" | "skipped";
      habit_schedule: "daily" | "weekdays" | "times_per_week";
      journal_mood: "great" | "good" | "okay" | "low" | "bad";
      money_account_kind: "cash" | "ewallet" | "bank" | "credit_card" | "other";
      money_category_kind: "expense" | "income";
      person_date_kind: "birthday" | "anniversary" | "other";
      reminder_source:
        | "todo"
        | "vehicle_service"
        | "custom"
        | "subscription"
        | "content"
        | "debt"
        | "person_date"
        | "document"
        | "habit"
        | "workout"
        | "medicine"
        | "budget"
        | "inventory";
      subscription_kind: "subscription" | "bill";
      todo_repeat: "none" | "daily" | "weekly" | "monthly";
      transaction_kind: "expense" | "income" | "transfer";
      transaction_source: "manual" | "import";
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
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_cycle: ["weekly", "monthly", "quarterly", "yearly"],
      content_format: ["long", "short"],
      content_stage: ["idea", "script", "record", "edit", "polish", "publish", "published"],
      debt_direction: ["owed_to_me", "i_owe"],
      document_type: ["lto_registration", "drivers_license", "passport", "insurance", "philhealth", "other"],
      dose_status: ["pending", "taken", "skipped"],
      habit_schedule: ["daily", "weekdays", "times_per_week"],
      journal_mood: ["great", "good", "okay", "low", "bad"],
      money_account_kind: ["cash", "ewallet", "bank", "credit_card", "other"],
      money_category_kind: ["expense", "income"],
      person_date_kind: ["birthday", "anniversary", "other"],
      reminder_source: [
        "todo",
        "vehicle_service",
        "custom",
        "subscription",
        "content",
        "debt",
        "person_date",
        "document",
        "habit",
        "workout",
        "medicine",
        "budget",
        "inventory",
      ],
      subscription_kind: ["subscription", "bill"],
      todo_repeat: ["none", "daily", "weekly", "monthly"],
      transaction_kind: ["expense", "income", "transfer"],
      transaction_source: ["manual", "import"],
    },
  },
} as const;
