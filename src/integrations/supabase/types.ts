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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_scheduling_suggestions: {
        Row: {
          applied: boolean | null
          created_at: string | null
          id: string
          reasoning: string | null
          suggestion_date: string
          suggestions: Json
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          suggestion_date: string
          suggestions: Json
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          suggestion_date?: string
          suggestions?: Json
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          doctor_id: string
          id: string
          notes: string | null
          punch_in: string | null
          punch_out: string | null
          status: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          doctor_id: string
          id?: string
          notes?: string | null
          punch_in?: string | null
          punch_out?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          punch_in?: string | null
          punch_out?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          camp_id: string
          doctor_id: string
          id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          camp_id: string
          doctor_id: string
          id?: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          camp_id?: string
          doctor_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_assignments_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          camp_date: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          location: string
          name: string
          notes: string | null
          required_doctors: number
          specialty_required:
            | Database["public"]["Enums"]["medical_specialty"]
            | null
          start_time: string
        }
        Insert: {
          camp_date: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location: string
          name: string
          notes?: string | null
          required_doctors?: number
          specialty_required?:
            | Database["public"]["Enums"]["medical_specialty"]
            | null
          start_time?: string
        }
        Update: {
          camp_date?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location?: string
          name?: string
          notes?: string | null
          required_doctors?: number
          specialty_required?:
            | Database["public"]["Enums"]["medical_specialty"]
            | null
          start_time?: string
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          channel_id: string
          doctor_id: string | null
          id: string
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id: string
          doctor_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string
          doctor_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string | null
          description: string | null
          duty_date: string | null
          duty_type: Database["public"]["Enums"]["duty_type"] | null
          id: string
          is_auto_generated: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duty_date?: string | null
          duty_type?: Database["public"]["Enums"]["duty_type"] | null
          id?: string
          is_auto_generated?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duty_date?: string | null
          duty_type?: Database["public"]["Enums"]["duty_type"] | null
          id?: string
          is_auto_generated?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          message_type: string | null
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          sender_id?: string | null
          sender_name?: string
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
      class_attendees: {
        Row: {
          attended: boolean | null
          class_id: string
          created_at: string
          doctor_id: string | null
          doctor_name: string | null
          id: string
          role: string
        }
        Insert: {
          attended?: boolean | null
          class_id: string
          created_at?: string
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          role?: string
        }
        Update: {
          attended?: boolean | null
          class_id?: string
          created_at?: string
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendees_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          batch: string | null
          class_date: string
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          location: string | null
          moderator_id: string | null
          moderator_name: string | null
          notes: string | null
          start_time: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          batch?: string | null
          class_date: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location?: string | null
          moderator_id?: string | null
          moderator_name?: string | null
          notes?: string | null
          start_time?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          batch?: string | null
          class_date?: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          location?: string | null
          moderator_id?: string | null
          moderator_name?: string | null
          notes?: string | null
          start_time?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_duty_stats: {
        Row: {
          camp_count: number
          doctor_id: string
          id: string
          month: number
          night_duty_count: number
          opd_sessions: number
          ot_sessions: number
          total_hours: number
          updated_at: string
          weekend_duty_count: number
          year: number
        }
        Insert: {
          camp_count?: number
          doctor_id: string
          id?: string
          month: number
          night_duty_count?: number
          opd_sessions?: number
          ot_sessions?: number
          total_hours?: number
          updated_at?: string
          weekend_duty_count?: number
          year: number
        }
        Update: {
          camp_count?: number
          doctor_id?: string
          id?: string
          month?: number
          night_duty_count?: number
          opd_sessions?: number
          ot_sessions?: number
          total_hours?: number
          updated_at?: string
          weekend_duty_count?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_duty_stats_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          can_do_camp: boolean
          can_do_night: boolean
          can_do_opd: boolean
          can_do_ot: boolean
          can_do_ward: boolean
          created_at: string | null
          department: string
          designation: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties: string[] | null
          fixed_off_days: string[] | null
          health_constraints: string | null
          id: string
          is_active: boolean | null
          max_hours_per_week: number
          max_night_duties_per_month: number
          max_casual_leaves: number
          max_medical_leaves: number
          max_emergency_leaves: number
          max_annual_leaves: number
          name: string
          performance_score: number | null
          phone: string
          seniority: Database["public"]["Enums"]["seniority_level"]
          specialization: string | null
          specialty: Database["public"]["Enums"]["medical_specialty"]
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_do_camp?: boolean
          can_do_night?: boolean
          can_do_opd?: boolean
          can_do_ot?: boolean
          can_do_ward?: boolean
          created_at?: string | null
          department: string
          designation?: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties?: string[] | null
          fixed_off_days?: string[] | null
          health_constraints?: string | null
          id?: string
          is_active?: boolean | null
          max_hours_per_week?: number
          max_night_duties_per_month?: number
          max_casual_leaves?: number
          max_medical_leaves?: number
          max_emergency_leaves?: number
          max_annual_leaves?: number
          name: string
          performance_score?: number | null
          phone: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          specialization?: string | null
          specialty?: Database["public"]["Enums"]["medical_specialty"]
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_do_camp?: boolean
          can_do_night?: boolean
          can_do_opd?: boolean
          can_do_ot?: boolean
          can_do_ward?: boolean
          created_at?: string | null
          department?: string
          designation?: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties?: string[] | null
          fixed_off_days?: string[] | null
          health_constraints?: string | null
          id?: string
          is_active?: boolean | null
          max_hours_per_week?: number
          max_night_duties_per_month?: number
          max_casual_leaves?: number
          max_medical_leaves?: number
          max_emergency_leaves?: number
          max_annual_leaves?: number
          name?: string
          performance_score?: number | null
          phone?: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          specialization?: string | null
          specialty?: Database["public"]["Enums"]["medical_specialty"]
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      duty_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          doctor_id: string
          duty_date: string
          duty_type: Database["public"]["Enums"]["duty_type"]
          end_time: string
          id: string
          start_time: string
          unit: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          duty_date: string
          duty_type: Database["public"]["Enums"]["duty_type"]
          end_time: string
          id?: string
          start_time: string
          unit: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          duty_date?: string
          duty_type?: Database["public"]["Enums"]["duty_type"]
          end_time?: string
          id?: string
          start_time?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          doctor_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requester_assignment_id: string
          requester_doctor_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_assignment_id: string
          target_doctor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_assignment_id: string
          requester_doctor_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_assignment_id: string
          target_doctor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_assignment_id?: string
          requester_doctor_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_assignment_id?: string
          target_doctor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_requester_assignment_id_fkey"
            columns: ["requester_assignment_id"]
            isOneToOne: false
            referencedRelation: "duty_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_requester_doctor_id_fkey"
            columns: ["requester_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_target_assignment_id_fkey"
            columns: ["target_assignment_id"]
            isOneToOne: false
            referencedRelation: "duty_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_target_doctor_id_fkey"
            columns: ["target_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor"
      class_type:
        | "lecture"
        | "grand_rounds"
        | "case_presentation"
        | "journal_club"
        | "complication_meeting"
        | "nbems_class"
        | "pharma_quiz"
        | "exam"
        | "other"
      designation_level: "pg" | "fellow" | "mo" | "consultant"
      duty_type:
        | "OPD"
        | "OT"
        | "Ward"
        | "Night Duty"
        | "Camp"
        | "Emergency"
        | "Cataract OT"
        | "Retina OT"
        | "Glaucoma OT"
        | "Cornea OT"
        | "Today Doctor"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "Casual" | "Emergency" | "Medical" | "Annual"
      medical_specialty:
        | "general"
        | "cornea"
        | "retina"
        | "glaucoma"
        | "oculoplasty"
        | "pediatric"
        | "neuro"
        | "cataract"
      seniority_level:
        | "intern"
        | "resident"
        | "fellow"
        | "consultant"
        | "senior_consultant"
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
      app_role: ["admin", "doctor"],
      class_type: [
        "lecture",
        "grand_rounds",
        "case_presentation",
        "journal_club",
        "complication_meeting",
        "nbems_class",
        "pharma_quiz",
        "exam",
        "other",
      ],
      designation_level: ["pg", "fellow", "mo", "consultant"],
      duty_type: [
        "OPD",
        "OT",
        "Ward",
        "Night Duty",
        "Camp",
        "Emergency",
        "Cataract OT",
        "Retina OT",
        "Glaucoma OT",
        "Cornea OT",
        "Today Doctor",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["Casual", "Emergency", "Medical", "Annual"],
      medical_specialty: [
        "general",
        "cornea",
        "retina",
        "glaucoma",
        "oculoplasty",
        "pediatric",
        "neuro",
        "cataract",
      ],
      seniority_level: [
        "intern",
        "resident",
        "fellow",
        "consultant",
        "senior_consultant",
      ],
    },
  },
} as const
