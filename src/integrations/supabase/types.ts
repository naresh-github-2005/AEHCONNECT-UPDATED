export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          id: string
          name: string
          email: string | null
          designation: string | null
          phone: string | null
          user_id: string | null
          joining_date: string | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
          specialization: string | null
          pg_year: number | null
          fellow_year: number | null
          experience_years: number | null
          can_do_ot: boolean | null
          can_do_icu: boolean | null
          can_do_ward: boolean | null
          can_do_echo: boolean | null
          can_do_tmt: boolean | null
          can_do_opd: boolean | null
          can_do_procedure: boolean | null
          can_do_cath_lab: boolean | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          designation?: string | null
          phone?: string | null
          user_id?: string | null
          joining_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
          specialization?: string | null
          pg_year?: number | null
          fellow_year?: number | null
          experience_years?: number | null
          can_do_ot?: boolean | null
          can_do_icu?: boolean | null
          can_do_ward?: boolean | null
          can_do_echo?: boolean | null
          can_do_tmt?: boolean | null
          can_do_opd?: boolean | null
          can_do_procedure?: boolean | null
          can_do_cath_lab?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          designation?: string | null
          phone?: string | null
          user_id?: string | null
          joining_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
          specialization?: string | null
          pg_year?: number | null
          fellow_year?: number | null
          experience_years?: number | null
          can_do_ot?: boolean | null
          can_do_icu?: boolean | null
          can_do_ward?: boolean | null
          can_do_echo?: boolean | null
          can_do_tmt?: boolean | null
          can_do_opd?: boolean | null
          can_do_procedure?: boolean | null
          can_do_cath_lab?: boolean | null
        }
        Relationships: []
      }
      rosters: {
        Row: {
          id: string
          month: string
          status: string
          generated_by: string | null
          published_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          status?: string
          generated_by?: string | null
          published_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          status?: string
          generated_by?: string | null
          published_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roster_assignments: {
        Row: {
          id: string
          roster_id: string
          doctor_id: string
          department_id: string
          duty_date: string
          shift_type: string
          is_manual_override: boolean
          override_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          roster_id: string
          doctor_id: string
          department_id: string
          duty_date: string
          shift_type?: string
          is_manual_override?: boolean
          override_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          roster_id?: string
          doctor_id?: string
          department_id?: string
          duty_date?: string
          shift_type?: string
          is_manual_override?: boolean
          override_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          code: string
          category: string
          min_doctors: number
          max_doctors: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          category?: string
          min_doctors?: number
          max_doctors?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          category?: string
          min_doctors?: number
          max_doctors?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaves: {
        Row: {
          id: string
          doctor_id: string
          leave_type: string
          start_date: string
          end_date: string
          status: string
          reason: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          leave_type?: string
          start_date: string
          end_date: string
          status?: string
          reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          status?: string
          reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      duty_assignments: {
        Row: {
          id: string
          doctor_id: string
          duty_type: string
          duty_date: string
          shift: string | null
          location: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          doctor_id: string
          duty_type: string
          duty_date: string
          shift?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          doctor_id?: string
          duty_type?: string
          duty_date?: string
          shift?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
