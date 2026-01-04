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
      academic_targets: {
        Row: {
          cds_target: number | null
          classes_target: number | null
          conferences_target: number | null
          created_at: string | null
          doctor_id: string
          id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          cds_target?: number | null
          classes_target?: number | null
          conferences_target?: number | null
          created_at?: string | null
          doctor_id: string
          id?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          cds_target?: number | null
          classes_target?: number | null
          conferences_target?: number | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_targets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
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
          category: string | null
          channel_type: string
          created_at: string
          created_by: string | null
          description: string | null
          duty_date: string | null
          duty_type: Database["public"]["Enums"]["duty_type"] | null
          eligible_duties: string[] | null
          id: string
          is_auto_generated: boolean | null
          name: string
          parent_channel_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duty_date?: string | null
          duty_type?: Database["public"]["Enums"]["duty_type"] | null
          eligible_duties?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          name: string
          parent_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duty_date?: string | null
          duty_type?: Database["public"]["Enums"]["duty_type"] | null
          eligible_duties?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          name?: string
          parent_channel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_parent_channel_id_fkey"
            columns: ["parent_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
            foreignKeyName: "class_attendees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "doctors_at_conference_today"
            referencedColumns: ["class_id"]
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
          application_deadline: string | null
          batch: string | null
          class_date: string
          class_type: Database["public"]["Enums"]["class_type"]
          created_at: string
          created_by: string | null
          department: string | null
          end_date: string | null
          end_time: string
          id: string
          is_multi_day: boolean | null
          location: string | null
          material_urls: string[] | null
          max_attendees: number | null
          moderator_id: string | null
          moderator_name: string | null
          notes: string | null
          requires_approval: boolean | null
          speaker_name: string | null
          start_time: string
          study_material: string | null
          title: string
          topic: string | null
          updated_at: string
          url_display_texts: string[] | null
        }
        Insert: {
          application_deadline?: string | null
          batch?: string | null
          class_date: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_multi_day?: boolean | null
          location?: string | null
          material_urls?: string[] | null
          max_attendees?: number | null
          moderator_id?: string | null
          moderator_name?: string | null
          notes?: string | null
          requires_approval?: boolean | null
          speaker_name?: string | null
          start_time?: string
          study_material?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          url_display_texts?: string[] | null
        }
        Update: {
          application_deadline?: string | null
          batch?: string | null
          class_date?: string
          class_type?: Database["public"]["Enums"]["class_type"]
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_multi_day?: boolean | null
          location?: string | null
          material_urls?: string[] | null
          max_attendees?: number | null
          moderator_id?: string | null
          moderator_name?: string | null
          notes?: string | null
          requires_approval?: boolean | null
          speaker_name?: string | null
          start_time?: string
          study_material?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          url_display_texts?: string[] | null
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
      conference_applications: {
        Row: {
          admin_notes: string | null
          applied_at: string
          class_id: string
          created_at: string
          doctor_id: string
          doctor_notes: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["conference_application_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          applied_at?: string
          class_id: string
          created_at?: string
          doctor_id: string
          doctor_notes?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["conference_application_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          applied_at?: string
          class_id?: string
          created_at?: string
          doctor_id?: string
          doctor_notes?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["conference_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conference_applications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_applications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "doctors_at_conference_today"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "conference_applications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      conference_duty_exclusions: {
        Row: {
          application_id: string
          class_id: string
          created_at: string
          doctor_id: string
          exclusion_end_date: string
          exclusion_start_date: string
          id: string
          reason: string | null
        }
        Insert: {
          application_id: string
          class_id: string
          created_at?: string
          doctor_id: string
          exclusion_end_date: string
          exclusion_start_date: string
          id?: string
          reason?: string | null
        }
        Update: {
          application_id?: string
          class_id?: string
          created_at?: string
          doctor_id?: string
          exclusion_end_date?: string
          exclusion_start_date?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conference_duty_exclusions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "conference_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_duty_exclusions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_duty_exclusions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "doctors_at_conference_today"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "conference_duty_exclusions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_daily_stats: {
        Row: {
          created_at: string | null
          date: string
          doctor_id: string
          duty_type: string | null
          hours_worked: number | null
          id: string
          patients_seen: number | null
          surgeries_performed: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          doctor_id: string
          duty_type?: string | null
          hours_worked?: number | null
          id?: string
          patients_seen?: number | null
          surgeries_performed?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          doctor_id?: string
          duty_type?: string | null
          hours_worked?: number | null
          id?: string
          patients_seen?: number | null
          surgeries_performed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_daily_stats_doctor_id_fkey"
            columns: ["doctor_id"]
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
          created_at: string | null
          department: string
          designation: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties: string[] | null
          email: string | null
          festival_leaves_taken: number | null
          id: string
          is_active: boolean | null
          max_hours_per_week: number
          max_night_duties_per_month: number
          monthly_permission_hours: number | null
          name: string
          phone: string
          seniority: Database["public"]["Enums"]["seniority_level"]
          specialization: string | null
          specialty: Database["public"]["Enums"]["medical_specialty"]
          total_annual_leave_limit: number | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department: string
          designation?: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties?: string[] | null
          email?: string | null
          festival_leaves_taken?: number | null
          id?: string
          is_active?: boolean | null
          max_hours_per_week?: number
          max_night_duties_per_month?: number
          monthly_permission_hours?: number | null
          name: string
          phone: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          specialization?: string | null
          specialty?: Database["public"]["Enums"]["medical_specialty"]
          total_annual_leave_limit?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          designation?: Database["public"]["Enums"]["designation_level"] | null
          eligible_duties?: string[] | null
          email?: string | null
          festival_leaves_taken?: number | null
          id?: string
          is_active?: boolean | null
          max_hours_per_week?: number
          max_night_duties_per_month?: number
          monthly_permission_hours?: number | null
          name?: string
          phone?: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          specialization?: string | null
          specialty?: Database["public"]["Enums"]["medical_specialty"]
          total_annual_leave_limit?: number | null
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
      note_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string | null
          description: string | null
          drive_links: string[] | null
          folder_id: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          drive_links?: string[] | null
          folder_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          drive_links?: string[] | null
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          created_at: string | null
          doctor_id: string
          end_time: string
          hours_requested: number
          id: string
          permission_date: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string
          status: Database["public"]["Enums"]["leave_status"] | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          end_time: string
          hours_requested: number
          id?: string
          permission_date: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["leave_status"] | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          end_time?: string
          hours_requested?: number
          id?: string
          permission_date?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          doctor_name: string
          id: string
          link: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          doctor_name: string
          id?: string
          link?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          doctor_name?: string
          id?: string
          link?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      surgery_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          doctor_id: string
          feedback: string | null
          feedback_given_at: string | null
          feedback_given_by: string | null
          id: string
          is_viewed: boolean | null
          notes: string | null
          patient_mrn: string | null
          rating: number | null
          surgery_date: string
          surgery_type: string
          updated_at: string | null
          video_title: string | null
          video_url: string
          viewed_at: string | null
          viewed_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          feedback?: string | null
          feedback_given_at?: string | null
          feedback_given_by?: string | null
          id?: string
          is_viewed?: boolean | null
          notes?: string | null
          patient_mrn?: string | null
          rating?: number | null
          surgery_date: string
          surgery_type: string
          updated_at?: string | null
          video_title?: string | null
          video_url: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          feedback?: string | null
          feedback_given_at?: string | null
          feedback_given_by?: string | null
          id?: string
          is_viewed?: boolean | null
          notes?: string | null
          patient_mrn?: string | null
          rating?: number | null
          surgery_date?: string
          surgery_type?: string
          updated_at?: string | null
          video_title?: string | null
          video_url?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgery_logs_doctor_id_fkey"
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
      test_marks: {
        Row: {
          created_at: string | null
          created_by: string | null
          doctor_id: string
          id: string
          marks_obtained: number
          month: number
          remarks: string | null
          test_date: string
          test_name: string
          total_marks: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          id?: string
          marks_obtained: number
          month: number
          remarks?: string | null
          test_date: string
          test_name: string
          total_marks: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          id?: string
          marks_obtained?: number
          month?: number
          remarks?: string | null
          test_date?: string
          test_name?: string
          total_marks?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_marks_doctor_id_fkey"
            columns: ["doctor_id"]
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
      doctors_at_conference_today: {
        Row: {
          class_id: string | null
          class_type: Database["public"]["Enums"]["class_type"] | null
          conference_title: string | null
          department: string | null
          designation: Database["public"]["Enums"]["designation_level"] | null
          doctor_id: string | null
          doctor_name: string | null
          end_date: string | null
          exclusion_end_date: string | null
          exclusion_id: string | null
          exclusion_start_date: string | null
          location: string | null
          reason: string | null
          specialty: Database["public"]["Enums"]["medical_specialty"] | null
          start_date: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conference_duty_exclusions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors_on_leave_today: {
        Row: {
          department: string | null
          designation: Database["public"]["Enums"]["designation_level"] | null
          doctor_id: string | null
          doctor_name: string | null
          end_date: string | null
          leave_request_id: string | null
          leave_type: Database["public"]["Enums"]["leave_type"] | null
          reason: string | null
          specialty: Database["public"]["Enums"]["medical_specialty"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["leave_status"] | null
          total_days: number | null
          unit: string | null
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
      doctors_with_permissions_today: {
        Row: {
          department: string | null
          designation: Database["public"]["Enums"]["designation_level"] | null
          doctor_id: string | null
          doctor_name: string | null
          end_time: string | null
          hours_requested: number | null
          permission_date: string | null
          permission_request_id: string | null
          reason: string | null
          specialty: Database["public"]["Enums"]["medical_specialty"] | null
          start_time: string | null
          status: Database["public"]["Enums"]["leave_status"] | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_for_conference: {
        Args: { p_class_id: string; p_doctor_id: string; p_notes?: string }
        Returns: string
      }
      approve_conference_application: {
        Args: { p_admin_id: string; p_application_id: string; p_notes?: string }
        Returns: boolean
      }
      cancel_conference_application: {
        Args: { p_application_id: string; p_doctor_id: string }
        Returns: boolean
      }
      get_available_doctors: {
        Args: { p_date?: string }
        Returns: {
          availability_status: string
          conference_title: string
          department: string
          designation: Database["public"]["Enums"]["designation_level"]
          doctor_id: string
          doctor_name: string
          eligible_duties: string[]
          permission_end_time: string
          permission_hours: number
          permission_start_time: string
          seniority: Database["public"]["Enums"]["seniority_level"]
          specialty: Database["public"]["Enums"]["medical_specialty"]
          unit: string
        }[]
      }
      get_conference_applications: {
        Args: { p_class_id: string }
        Returns: {
          admin_notes: string
          application_id: string
          applied_at: string
          department: string
          designation: Database["public"]["Enums"]["designation_level"]
          doctor_id: string
          doctor_name: string
          doctor_notes: string
          reviewed_at: string
          reviewed_by_name: string
          specialty: Database["public"]["Enums"]["medical_specialty"]
          status: Database["public"]["Enums"]["conference_application_status"]
          unit: string
        }[]
      }
      get_conference_applications_summary: {
        Args: never
        Returns: {
          application_deadline: string
          approved_applications: number
          class_id: string
          class_type: string
          conference_title: string
          end_date: string
          is_deadline_passed: boolean
          location: string
          pending_applications: number
          rejected_applications: number
          start_date: string
          total_applications: number
        }[]
      }
      get_doctor_availability_for_date: {
        Args: { p_date?: string; p_doctor_id: string }
        Returns: {
          availability_status: string
          can_do_afternoon_duty: boolean
          can_do_morning_duty: boolean
          can_do_night_duty: boolean
          doctor_id: string
          doctor_name: string
          leave_end_date: string
          leave_start_date: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          permission_date: string
          permission_end_time: string
          permission_hours: number
          permission_start_time: string
        }[]
      }
      get_doctors_at_conferences: {
        Args: { p_date?: string }
        Returns: {
          conference_end_date: string
          conference_start_date: string
          conference_title: string
          department: string
          designation: Database["public"]["Enums"]["designation_level"]
          doctor_id: string
          doctor_name: string
          location: string
          specialty: Database["public"]["Enums"]["medical_specialty"]
          unit: string
        }[]
      }
      get_doctors_on_leave: {
        Args: { p_date?: string }
        Returns: {
          days_remaining: number
          department: string
          designation: Database["public"]["Enums"]["designation_level"]
          doctor_id: string
          doctor_name: string
          end_date: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          specialty: Database["public"]["Enums"]["medical_specialty"]
          start_date: string
          unit: string
        }[]
      }
      get_doctors_with_permissions: {
        Args: { p_date?: string }
        Returns: {
          department: string
          designation: Database["public"]["Enums"]["designation_level"]
          doctor_id: string
          doctor_name: string
          end_time: string
          hours_requested: number
          is_afternoon_permission: boolean
          is_morning_permission: boolean
          permission_date: string
          reason: string
          specialty: Database["public"]["Enums"]["medical_specialty"]
          start_time: string
          unit: string
        }[]
      }
      get_leaves_by_type: {
        Args: { p_doctor_id: string; p_year?: number }
        Returns: {
          days_taken: number
          leave_type: string
        }[]
      }
      get_my_conference_applications: {
        Args: { p_doctor_id: string }
        Returns: {
          admin_notes: string
          application_deadline: string
          application_id: string
          applied_at: string
          can_cancel: boolean
          class_id: string
          class_type: string
          conference_title: string
          end_date: string
          location: string
          reviewed_at: string
          start_date: string
          status: Database["public"]["Enums"]["conference_application_status"]
        }[]
      }
      get_permission_hours_used: {
        Args: { p_doctor_id: string; p_month?: number; p_year?: number }
        Returns: number
      }
      get_roster_availability_summary: {
        Args: { p_date?: string }
        Returns: {
          available_doctors_list: Json
          doctors_at_conferences: number
          doctors_at_conferences_list: Json
          doctors_on_leave: number
          doctors_on_leave_list: Json
          doctors_with_permissions: number
          doctors_with_permissions_list: Json
          fully_available_doctors: number
          summary_date: string
          total_doctors: number
        }[]
      }
      get_total_leaves_taken: {
        Args: { p_doctor_id: string; p_year?: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_conference_application: {
        Args: { p_admin_id: string; p_application_id: string; p_notes?: string }
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
        | "conference"
        | "seminar"
        | "workshop"
      conference_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
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
        | "Neuro OT"
        | "ORBIT OT"
        | "Pediatrics OT"
        | "IOL OT"
        | "Daycare"
        | "Physician"
        | "Block Room"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "Casual" | "Emergency" | "Medical" | "Annual" | "Festival"
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
        "conference",
        "seminar",
        "workshop",
      ],
      conference_application_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
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
        "Neuro OT",
        "ORBIT OT",
        "Pediatrics OT",
        "IOL OT",
        "Daycare",
        "Physician",
        "Block Room",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["Casual", "Emergency", "Medical", "Annual", "Festival"],
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
