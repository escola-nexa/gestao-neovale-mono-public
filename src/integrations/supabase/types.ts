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
      academic_bimesters: {
        Row: {
          calendar_id: string
          created_at: string
          end_date: string
          id: string
          number: number
          start_date: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          end_date: string
          id?: string
          number: number
          start_date: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          end_date?: string
          id?: string
          number?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_bimesters_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "academic_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_calendars: {
        Row: {
          academic_year: number
          created_at: string
          end_date: string
          id: string
          organization_id: string
          start_date: string
          status: Database["public"]["Enums"]["calendar_status"]
          updated_at: string
        }
        Insert: {
          academic_year: number
          created_at?: string
          end_date: string
          id?: string
          organization_id: string
          start_date: string
          status?: Database["public"]["Enums"]["calendar_status"]
          updated_at?: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          end_date?: string
          id?: string
          organization_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["calendar_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_class_occurrences: {
        Row: {
          created_at: string
          end_time: string
          id: string
          observation: string | null
          occurrence_date: string
          organization_id: string
          start_time: string
          status: Database["public"]["Enums"]["occurrence_status"]
          updated_at: string
          weekly_model_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          observation?: string | null
          occurrence_date: string
          organization_id: string
          start_time: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          weekly_model_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          observation?: string | null
          occurrence_date?: string
          organization_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
          weekly_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_class_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_class_occurrences_weekly_model_id_fkey"
            columns: ["weekly_model_id"]
            isOneToOne: false
            referencedRelation: "weekly_teaching_models"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          call_created_by: string | null
          call_started_at: string | null
          call_submitted_at: string | null
          class_group_id: string
          created_at: string
          id: string
          occurrence_date: string
          organization_id: string
          professor_id: string
          start_time: string | null
          status: string
          student_id: string
          subject_id: string
          teacher_attendance_entry_id: string | null
          updated_at: string
        }
        Insert: {
          call_created_by?: string | null
          call_started_at?: string | null
          call_submitted_at?: string | null
          class_group_id: string
          created_at?: string
          id?: string
          occurrence_date: string
          organization_id: string
          professor_id: string
          start_time?: string | null
          status: string
          student_id: string
          subject_id: string
          teacher_attendance_entry_id?: string | null
          updated_at?: string
        }
        Update: {
          call_created_by?: string | null
          call_started_at?: string | null
          call_submitted_at?: string | null
          class_group_id?: string
          created_at?: string
          id?: string
          occurrence_date?: string
          organization_id?: string
          professor_id?: string
          start_time?: string | null
          status?: string
          student_id?: string
          subject_id?: string
          teacher_attendance_entry_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_call_created_by_fkey"
            columns: ["call_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_records_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_teacher_attendance_entry_id_fkey"
            columns: ["teacher_attendance_entry_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          action_result: string | null
          created_at: string
          details: Json | null
          device_type: string | null
          id: string
          ip_address: string | null
          module: string
          organization_id: string
          school_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          action_result?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          module: string
          organization_id: string
          school_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          action_result?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          organization_id?: string
          school_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_metric_snapshots: {
        Row: {
          academic_year: number | null
          avg_attendance_score: number | null
          avg_compliance_score: number | null
          avg_grades_score: number | null
          avg_planning_score: number | null
          avg_risk_score: number | null
          bimester_number: number | null
          created_at: string | null
          id: string
          organization_id: string
          scope_id: string | null
          scope_name: string | null
          scope_type: string
          snapshot_date: string
          teachers_attention: number | null
          teachers_critical: number | null
          teachers_excellent: number | null
          total_pending: number | null
          total_teachers: number | null
        }
        Insert: {
          academic_year?: number | null
          avg_attendance_score?: number | null
          avg_compliance_score?: number | null
          avg_grades_score?: number | null
          avg_planning_score?: number | null
          avg_risk_score?: number | null
          bimester_number?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          scope_id?: string | null
          scope_name?: string | null
          scope_type?: string
          snapshot_date?: string
          teachers_attention?: number | null
          teachers_critical?: number | null
          teachers_excellent?: number | null
          total_pending?: number | null
          total_teachers?: number | null
        }
        Update: {
          academic_year?: number | null
          avg_attendance_score?: number | null
          avg_compliance_score?: number | null
          avg_grades_score?: number | null
          avg_planning_score?: number | null
          avg_risk_score?: number | null
          bimester_number?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          scope_id?: string | null
          scope_name?: string | null
          scope_type?: string
          snapshot_date?: string
          teachers_attention?: number | null
          teachers_critical?: number | null
          teachers_excellent?: number | null
          total_pending?: number | null
          total_teachers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bi_metric_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_quality_audit_results: {
        Row: {
          audit_type: string
          checked_at: string | null
          id: string
          issue_description: string | null
          organization_id: string
          route: string
          screen_name: string
          severity: string | null
          status: string
        }
        Insert: {
          audit_type: string
          checked_at?: string | null
          id?: string
          issue_description?: string | null
          organization_id: string
          route: string
          screen_name: string
          severity?: string | null
          status?: string
        }
        Update: {
          audit_type?: string
          checked_at?: string | null
          id?: string
          issue_description?: string | null
          organization_id?: string
          route?: string
          screen_name?: string
          severity?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_quality_audit_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_deliveries: {
        Row: {
          action_name: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          end_datetime: string | null
          form_pdf_url: string | null
          id: string
          logistics_notes: string | null
          objective: string | null
          organization_id: string
          priority: string
          responsible_user_id: string
          start_datetime: string
          status: string
          updated_at: string
        }
        Insert: {
          action_name: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          end_datetime?: string | null
          form_pdf_url?: string | null
          id?: string
          logistics_notes?: string | null
          objective?: string | null
          organization_id: string
          priority?: string
          responsible_user_id: string
          start_datetime: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_name?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          end_datetime?: string | null
          form_pdf_url?: string | null
          id?: string
          logistics_notes?: string | null
          objective?: string | null
          organization_id?: string
          priority?: string
          responsible_user_id?: string
          start_datetime?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklet_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_delivery_attachments: {
        Row: {
          created_at: string
          delivery_id: string | null
          delivery_school_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          organization_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          delivery_school_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          organization_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          delivery_school_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          organization_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklet_delivery_attachments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "booklet_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booklet_delivery_attachments_delivery_school_id_fkey"
            columns: ["delivery_school_id"]
            isOneToOne: false
            referencedRelation: "booklet_delivery_schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booklet_delivery_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_delivery_items: {
        Row: {
          booklet_name: string
          created_at: string
          delivery_school_id: string
          id: string
          notes: string | null
          quantity_delivered: number
          quantity_expected: number
          unit: string | null
        }
        Insert: {
          booklet_name: string
          created_at?: string
          delivery_school_id: string
          id?: string
          notes?: string | null
          quantity_delivered?: number
          quantity_expected?: number
          unit?: string | null
        }
        Update: {
          booklet_name?: string
          created_at?: string
          delivery_school_id?: string
          id?: string
          notes?: string | null
          quantity_delivered?: number
          quantity_expected?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booklet_delivery_items_delivery_school_id_fkey"
            columns: ["delivery_school_id"]
            isOneToOne: false
            referencedRelation: "booklet_delivery_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_delivery_schools: {
        Row: {
          city: string | null
          created_at: string
          delivery_id: string
          delivery_notes: string | null
          delivery_status: string
          id: string
          received_at: string | null
          receiver_name: string | null
          receiver_role: string | null
          route_order: number | null
          school_id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          delivery_id: string
          delivery_notes?: string | null
          delivery_status?: string
          id?: string
          received_at?: string | null
          receiver_name?: string | null
          receiver_role?: string | null
          route_order?: number | null
          school_id: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          delivery_id?: string
          delivery_notes?: string | null
          delivery_status?: string
          id?: string
          received_at?: string | null
          receiver_name?: string | null
          receiver_role?: string | null
          route_order?: number | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklet_delivery_schools_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "booklet_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booklet_delivery_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_delivery_users: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booklet_delivery_users_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "booklet_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          created_at: string
          display_name: string
          icon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          subtitle: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          icon_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          subtitle?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          icon_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          subtitle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_id: string
          city: string | null
          created_at: string
          description: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          city?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          city?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "academic_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_label_assignments: {
        Row: {
          channel_id: string
          created_at: string
          label_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          label_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_label_assignments_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "chat_channel_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          archived_at: string | null
          can_post: boolean
          channel_id: string
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          pinned_at: string | null
          role: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          can_post?: boolean
          channel_id: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Update: {
          archived_at?: string | null
          can_post?: boolean
          channel_id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          archived_at: string | null
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          organization_id: string
          school_id: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          organization_id: string
          school_id?: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          organization_id?: string
          school_id?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: Database["public"]["Enums"]["chat_attachment_kind"]
          message_id: string
          mime_type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind: Database["public"]["Enums"]["chat_attachment_kind"]
          message_id: string
          mime_type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["chat_attachment_kind"]
          message_id?: string
          mime_type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_label_assignments: {
        Row: {
          applied_by: string | null
          created_at: string
          label_id: string
          message_id: string
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          label_id: string
          message_id: string
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          label_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "chat_message_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_label_assignments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_mentions: {
        Row: {
          author_id: string
          channel_id: string
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          author_id: string
          channel_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          author_id?: string
          channel_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_mentions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_tickets: {
        Row: {
          created_at: string
          created_by: string | null
          message_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          message_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          message_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_tickets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string
          body: string | null
          channel_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          is_announcement: boolean
          is_pinned: boolean
          reply_to_id: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          channel_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_announcement?: boolean
          is_pinned?: boolean
          reply_to_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          channel_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_announcement?: boolean
          is_pinned?: boolean
          reply_to_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_saved_messages: {
        Row: {
          id: string
          message_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_saved_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_user_inbox_state: {
        Row: {
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          nome: string
          organization_id: string
          state_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          organization_id: string
          state_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string
          state_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      class_groups: {
        Row: {
          ano_letivo: string
          course_id: string
          created_at: string
          id: string
          nome: string
          organization_id: string
          school_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          ano_letivo: string
          course_id: string
          created_at?: string
          id?: string
          nome: string
          organization_id: string
          school_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          ano_letivo?: string
          course_id?: string
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subject_modality: {
        Row: {
          ch_anp: number
          ch_presencial: number
          class_group_id: string
          created_at: string
          id: string
          organization_id: string
          semester: Database["public"]["Enums"]["subject_semester"]
          subject_id: string
          updated_at: string
        }
        Insert: {
          ch_anp?: number
          ch_presencial?: number
          class_group_id: string
          created_at?: string
          id?: string
          organization_id: string
          semester: Database["public"]["Enums"]["subject_semester"]
          subject_id: string
          updated_at?: string
        }
        Update: {
          ch_anp?: number
          ch_presencial?: number
          class_group_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          semester?: Database["public"]["Enums"]["subject_semester"]
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subject_modality_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subject_modality_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schools: {
        Row: {
          course_id: string
          created_at: string
          id: string
          school_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          school_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schools_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          formative_track_id: string | null
          id: string
          nivel_ensino: Database["public"]["Enums"]["nivel_ensino"]
          nome: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          formative_track_id?: string | null
          id?: string
          nivel_ensino: Database["public"]["Enums"]["nivel_ensino"]
          nome: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          formative_track_id?: string | null
          id?: string
          nivel_ensino?: Database["public"]["Enums"]["nivel_ensino"]
          nome?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_formative_track_id_fkey"
            columns: ["formative_track_id"]
            isOneToOne: false
            referencedRelation: "formative_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          id: string
          ip_address: string | null
          latitude: number
          longitude: number
          photo_url: string
          planning_id: string
          signature_type: Database["public"]["Enums"]["signature_type"]
          signed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          latitude: number
          longitude: number
          photo_url: string
          planning_id: string
          signature_type: Database["public"]["Enums"]["signature_type"]
          signed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          latitude?: number
          longitude?: number
          photo_url?: string
          planning_id?: string
          signature_type?: Database["public"]["Enums"]["signature_type"]
          signed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "teacher_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          ano_letivo: string
          class_group_id: string
          course_id: string
          created_at: string
          data_encerramento: string | null
          data_matricula: string
          id: string
          observacoes: string | null
          organization_id: string
          school_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          ano_letivo: string
          class_group_id: string
          course_id: string
          created_at?: string
          data_encerramento?: string | null
          data_matricula?: string
          id?: string
          observacoes?: string | null
          organization_id: string
          school_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: string
          class_group_id?: string
          course_id?: string
          created_at?: string
          data_encerramento?: string | null
          data_matricula?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      external_access_logs: {
        Row: {
          access_status: string
          access_type: string
          accessed_at: string
          action_performed: string | null
          city_name: string | null
          content_type: string | null
          device_type: string | null
          document_origin_id: string | null
          document_origin_type: string | null
          document_status_at_access: string | null
          external_link_id: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          keyword_valid: boolean | null
          latitude: number | null
          longitude: number | null
          organization_id: string
          pdf_downloaded: boolean | null
          pdf_viewed: boolean | null
          school_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_status: string
          access_type: string
          accessed_at?: string
          action_performed?: string | null
          city_name?: string | null
          content_type?: string | null
          device_type?: string | null
          document_origin_id?: string | null
          document_origin_type?: string | null
          document_status_at_access?: string | null
          external_link_id?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          keyword_valid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          pdf_downloaded?: boolean | null
          pdf_viewed?: boolean | null
          school_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_status?: string
          access_type?: string
          accessed_at?: string
          action_performed?: string | null
          city_name?: string | null
          content_type?: string | null
          device_type?: string | null
          document_origin_id?: string | null
          document_origin_type?: string | null
          document_status_at_access?: string | null
          external_link_id?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          keyword_valid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          pdf_downloaded?: boolean | null
          pdf_viewed?: boolean | null
          school_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_access_logs_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      external_links: {
        Row: {
          content_type: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          materialized_ano_letivo: string | null
          materialized_at: string | null
          materialized_by: string | null
          organization_id: string
          school_id: string
          scope_json: Json
          starts_at: string
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          materialized_ano_letivo?: string | null
          materialized_at?: string | null
          materialized_by?: string | null
          organization_id: string
          school_id: string
          scope_json?: Json
          starts_at?: string
          submitted_at?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          materialized_ano_letivo?: string | null
          materialized_at?: string | null
          materialized_by?: string | null
          organization_id?: string
          school_id?: string
          scope_json?: Json
          starts_at?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_digit: string | null
          account_number: string | null
          account_subtype: string | null
          account_type: string
          active: boolean
          agency: string | null
          allows_negative_balance: boolean
          bank_code: string | null
          bank_name: string | null
          branch: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_balance: number
          id: string
          initial_balance: number
          initial_balance_date: string | null
          is_default: boolean
          is_reconcilable: boolean
          name: string
          notes: string | null
          organization_id: string
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
        }
        Insert: {
          account_digit?: string | null
          account_number?: string | null
          account_subtype?: string | null
          account_type: string
          active?: boolean
          agency?: string | null
          allows_negative_balance?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          is_default?: boolean
          is_reconcilable?: boolean
          name: string
          notes?: string | null
          organization_id: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Update: {
          account_digit?: string | null
          account_number?: string | null
          account_subtype?: string | null
          account_type?: string
          active?: boolean
          agency?: string | null
          allows_negative_balance?: boolean
          bank_code?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          is_default?: boolean
          is_reconcilable?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_approval_limits: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          currency: string
          delegate_until: string | null
          delegate_user_id: string | null
          id: string
          max_amount: number
          notes: string | null
          organization_id: string
          permission_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          delegate_until?: string | null
          delegate_user_id?: string | null
          id?: string
          max_amount: number
          notes?: string | null
          organization_id: string
          permission_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          delegate_until?: string | null
          delegate_user_id?: string | null
          id?: string
          max_amount?: number
          notes?: string | null
          organization_id?: string
          permission_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_approval_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_limits_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "financial_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_approval_policies: {
        Row: {
          account_id: string | null
          active: boolean
          category_id: string | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          dual_approver_threshold: number | null
          enforce_segregation: boolean
          id: string
          max_amount: number | null
          min_amount: number
          mode: string
          name: string
          notes: string | null
          operation_type: string
          organization_id: string
          priority: number
          project_id: string | null
          require_dual_approver: boolean
          school_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          dual_approver_threshold?: number | null
          enforce_segregation?: boolean
          id?: string
          max_amount?: number | null
          min_amount?: number
          mode?: string
          name: string
          notes?: string | null
          operation_type: string
          organization_id: string
          priority?: number
          project_id?: string | null
          require_dual_approver?: boolean
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          dual_approver_threshold?: number | null
          enforce_segregation?: boolean
          id?: string
          max_amount?: number | null
          min_amount?: number
          mode?: string
          name?: string
          notes?: string | null
          operation_type?: string
          organization_id?: string
          priority?: number
          project_id?: string | null
          require_dual_approver?: boolean
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_approval_policies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_policies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_policies_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_policies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_policies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_approval_steps: {
        Row: {
          active: boolean
          approver_permission: string | null
          approver_role: Database["public"]["Enums"]["app_role"] | null
          approver_type: string
          approver_user_id: string | null
          created_at: string
          id: string
          is_required: boolean
          min_amount: number
          name: string
          organization_id: string
          policy_id: string
          step_order: number
          substitute_until: string | null
          substitute_user_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          approver_permission?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          approver_type: string
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          min_amount?: number
          name: string
          organization_id: string
          policy_id: string
          step_order?: number
          substitute_until?: string | null
          substitute_user_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          approver_permission?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          approver_type?: string
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          min_amount?: number
          name?: string
          organization_id?: string
          policy_id?: string
          step_order?: number
          substitute_until?: string | null
          substitute_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_approval_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_approval_steps_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "financial_approval_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_approvals: {
        Row: {
          action: Database["public"]["Enums"]["financial_approval_action"]
          actor_id: string
          created_at: string
          entry_id: string
          id: string
          metadata: Json | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["financial_approval_action"]
          actor_id: string
          created_at?: string
          entry_id: string
          id?: string
          metadata?: Json | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["financial_approval_action"]
          actor_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_approvals_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_attachments: {
        Row: {
          created_at: string
          entry_id: string | null
          file_name: string
          file_path: string
          id: string
          installment_id: string | null
          kind: string
          mime_type: string | null
          organization_id: string
          payment_id: string | null
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          file_name: string
          file_path: string
          id?: string
          installment_id?: string | null
          kind?: string
          mime_type?: string | null
          organization_id: string
          payment_id?: string | null
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          file_name?: string
          file_path?: string
          id?: string
          installment_id?: string | null
          kind?: string
          mime_type?: string | null
          organization_id?: string
          payment_id?: string | null
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_attachments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_attachments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_attachments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_bank_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          dedupe_hash: string
          description: string | null
          direction: Database["public"]["Enums"]["bank_transaction_direction"]
          document_number: string | null
          fitid: string | null
          id: string
          import_batch_id: string | null
          memo: string | null
          organization_id: string
          payer_payee_document: string | null
          payer_payee_name: string | null
          posted_at: string | null
          raw_data: Json | null
          reconciled_amount: number
          reference: string | null
          status: Database["public"]["Enums"]["bank_transaction_status"]
          transaction_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          dedupe_hash: string
          description?: string | null
          direction: Database["public"]["Enums"]["bank_transaction_direction"]
          document_number?: string | null
          fitid?: string | null
          id?: string
          import_batch_id?: string | null
          memo?: string | null
          organization_id: string
          payer_payee_document?: string | null
          payer_payee_name?: string | null
          posted_at?: string | null
          raw_data?: Json | null
          reconciled_amount?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["bank_transaction_status"]
          transaction_date: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          dedupe_hash?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["bank_transaction_direction"]
          document_number?: string | null
          fitid?: string | null
          id?: string
          import_batch_id?: string | null
          memo?: string | null
          organization_id?: string
          payer_payee_document?: string | null
          payer_payee_name?: string | null
          posted_at?: string | null
          raw_data?: Json | null
          reconciled_amount?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["bank_transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_bank_transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "financial_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_bank_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_budget_lines: {
        Row: {
          budget_id: string
          category_id: string
          cost_center_id: string
          created_at: string
          id: string
          month: number | null
          notes: string | null
          organization_id: string
          planned_amount: number
          project_id: string | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          budget_id: string
          category_id: string
          cost_center_id: string
          created_at?: string
          id?: string
          month?: number | null
          notes?: string | null
          organization_id: string
          planned_amount?: number
          project_id?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_id?: string
          category_id?: string
          cost_center_id?: string
          created_at?: string
          id?: string
          month?: number | null
          notes?: string | null
          organization_id?: string
          planned_amount?: number
          project_id?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "financial_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_budgets: {
        Row: {
          alert_threshold_percent: number
          created_at: string
          created_by: string | null
          id: string
          month: number | null
          name: string
          notes: string | null
          organization_id: string
          overrun_mode: Database["public"]["Enums"]["financial_budget_overrun_mode"]
          status: Database["public"]["Enums"]["financial_budget_status"]
          total_planned: number
          updated_at: string
          year: number
        }
        Insert: {
          alert_threshold_percent?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number | null
          name: string
          notes?: string | null
          organization_id: string
          overrun_mode?: Database["public"]["Enums"]["financial_budget_overrun_mode"]
          status?: Database["public"]["Enums"]["financial_budget_status"]
          total_planned?: number
          updated_at?: string
          year: number
        }
        Update: {
          alert_threshold_percent?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          overrun_mode?: Database["public"]["Enums"]["financial_budget_overrun_mode"]
          status?: Database["public"]["Enums"]["financial_budget_status"]
          total_planned?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          accepts_entries: boolean
          active: boolean
          category_nature: string
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_type: string
          id: string
          is_system: boolean
          level: number
          name: string
          nature: string
          notes: string | null
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          accepts_entries?: boolean
          active?: boolean
          category_nature?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type: string
          id?: string
          is_system?: boolean
          level?: number
          name: string
          nature: string
          notes?: string | null
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          accepts_entries?: boolean
          active?: boolean
          category_nature?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          is_system?: boolean
          level?: number
          name?: string
          nature?: string
          notes?: string | null
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_charge_rules: {
        Row: {
          active: boolean
          calculation_basis: string
          created_at: string
          direction: string
          discount_type: string
          discount_until_days: number
          discount_value: number
          fine_type: string
          fine_value: number
          grace_period_days: number
          id: string
          interest_type: string
          interest_value: number
          is_default: boolean
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          calculation_basis?: string
          created_at?: string
          direction?: string
          discount_type?: string
          discount_until_days?: number
          discount_value?: number
          fine_type?: string
          fine_value?: number
          grace_period_days?: number
          id?: string
          interest_type?: string
          interest_value?: number
          is_default?: boolean
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          calculation_basis?: string
          created_at?: string
          direction?: string
          discount_type?: string
          discount_until_days?: number
          discount_value?: number
          fine_type?: string
          fine_value?: number
          grace_period_days?: number
          id?: string
          interest_type?: string
          interest_value?: number
          is_default?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_charge_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_closure_audit: {
        Row: {
          acted_by: string | null
          action: string
          closure_id: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          acted_by?: string | null
          action: string
          closure_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          acted_by?: string | null
          action?: string
          closure_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_closure_audit_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "financial_period_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_closure_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cost_centers: {
        Row: {
          active: boolean
          allows_allocations: boolean
          city_id: string | null
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          level: number
          name: string
          notes: string | null
          organization_id: string
          parent_id: string | null
          project_id: string | null
          responsible_user_id: string | null
          school_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          allows_allocations?: boolean
          city_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level?: number
          name: string
          notes?: string | null
          organization_id: string
          parent_id?: string | null
          project_id?: string | null
          responsible_user_id?: string | null
          school_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          allows_allocations?: boolean
          city_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level?: number
          name?: string
          notes?: string | null
          organization_id?: string
          parent_id?: string | null
          project_id?: string | null
          responsible_user_id?: string | null
          school_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_cost_centers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_document_types: {
        Row: {
          active: boolean
          allows_duplicate_number: boolean
          code: string | null
          created_at: string
          direction: string
          id: string
          is_system: boolean
          name: string
          notes: string | null
          organization_id: string
          requires_attachment: boolean
          requires_issue_date: boolean
          requires_number: boolean
          retention_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allows_duplicate_number?: boolean
          code?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_system?: boolean
          name: string
          notes?: string | null
          organization_id: string
          requires_attachment?: boolean
          requires_issue_date?: boolean
          requires_number?: boolean
          retention_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allows_duplicate_number?: boolean
          code?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_system?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          requires_attachment?: boolean
          requires_issue_date?: boolean
          requires_number?: boolean
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_document_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          account_id: string | null
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category_id: string | null
          competence_date: string
          created_at: string
          created_by: string
          daily_interest_percent: number | null
          description: string
          document_number: string | null
          due_date: string
          early_discount_days: number | null
          early_discount_percent: number | null
          id: string
          installments_count: number
          issue_date: string
          kind: Database["public"]["Enums"]["financial_entry_kind"]
          late_fee_percent: number | null
          notes: string | null
          organization_id: string
          party_id: string | null
          payment_method_id: string | null
          recurrence: Json | null
          renegotiated_at: string | null
          renegotiated_by: string | null
          renegotiated_from_id: string | null
          renegotiation_reason: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_id: string | null
          source_kind: string | null
          status: Database["public"]["Enums"]["financial_entry_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          competence_date: string
          created_at?: string
          created_by: string
          daily_interest_percent?: number | null
          description: string
          document_number?: string | null
          due_date: string
          early_discount_days?: number | null
          early_discount_percent?: number | null
          id?: string
          installments_count?: number
          issue_date?: string
          kind?: Database["public"]["Enums"]["financial_entry_kind"]
          late_fee_percent?: number | null
          notes?: string | null
          organization_id: string
          party_id?: string | null
          payment_method_id?: string | null
          recurrence?: Json | null
          renegotiated_at?: string | null
          renegotiated_by?: string | null
          renegotiated_from_id?: string | null
          renegotiation_reason?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          competence_date?: string
          created_at?: string
          created_by?: string
          daily_interest_percent?: number | null
          description?: string
          document_number?: string | null
          due_date?: string
          early_discount_days?: number | null
          early_discount_percent?: number | null
          id?: string
          installments_count?: number
          issue_date?: string
          kind?: Database["public"]["Enums"]["financial_entry_kind"]
          late_fee_percent?: number | null
          notes?: string | null
          organization_id?: string
          party_id?: string | null
          payment_method_id?: string | null
          recurrence?: Json | null
          renegotiated_at?: string | null
          renegotiated_by?: string | null
          renegotiated_from_id?: string | null
          renegotiation_reason?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "financial_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_renegotiated_from_id_fkey"
            columns: ["renegotiated_from_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entry_allocations: {
        Row: {
          amount: number
          cost_center_id: string | null
          created_at: string
          entry_id: string
          id: string
          notes: string | null
          organization_id: string
          percentage: number | null
          project_id: string | null
          school_id: string | null
        }
        Insert: {
          amount: number
          cost_center_id?: string | null
          created_at?: string
          entry_id: string
          id?: string
          notes?: string | null
          organization_id: string
          percentage?: number | null
          project_id?: string | null
          school_id?: string | null
        }
        Update: {
          amount?: number
          cost_center_id?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          percentage?: number | null
          project_id?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entry_allocations_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entry_allocations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entry_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "financial_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entry_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_import_batches: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          duplicate_rows: number | null
          error_details: Json | null
          failed_rows: number | null
          file_format: string
          file_name: string
          id: string
          imported_rows: number | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["import_batch_status"]
          storage_path: string | null
          total_rows: number | null
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number | null
          error_details?: Json | null
          failed_rows?: number | null
          file_format: string
          file_name: string
          id?: string
          imported_rows?: number | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          storage_path?: string | null
          total_rows?: number | null
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number | null
          error_details?: Json | null
          failed_rows?: number | null
          file_format?: string
          file_name?: string
          id?: string
          imported_rows?: number | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          storage_path?: string | null
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_installments: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          discount_amount: number
          due_date: string
          entry_id: string
          id: string
          installment_number: number
          interest_amount: number
          late_fee_amount: number
          notes: string | null
          organization_id: string
          paid_amount: number
          paid_at: string | null
          payment_method_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["financial_installment_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          discount_amount?: number
          due_date: string
          entry_id: string
          id?: string
          installment_number: number
          interest_amount?: number
          late_fee_amount?: number
          notes?: string | null
          organization_id: string
          paid_amount?: number
          paid_at?: string | null
          payment_method_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["financial_installment_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          discount_amount?: number
          due_date?: string
          entry_id?: string
          id?: string
          installment_number?: number
          interest_amount?: number
          late_fee_amount?: number
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          paid_at?: string | null
          payment_method_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["financial_installment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_installments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_installments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_parties: {
        Row: {
          active: boolean
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          created_by: string | null
          default_category_id: string | null
          default_cost_center_id: string | null
          default_payment_method_id: string | null
          document: string | null
          document_type: string | null
          email: string | null
          id: string
          is_blocked: boolean
          legal_name: string | null
          name: string
          notes: string | null
          organization_id: string
          party_type: string
          party_types: string[]
          person_type: string
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          professor_id: string | null
          profile_id: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          created_by?: string | null
          default_category_id?: string | null
          default_cost_center_id?: string | null
          default_payment_method_id?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          legal_name?: string | null
          name: string
          notes?: string | null
          organization_id: string
          party_type: string
          party_types?: string[]
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          professor_id?: string | null
          profile_id?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          created_by?: string | null
          default_category_id?: string | null
          default_cost_center_id?: string | null
          default_payment_method_id?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          legal_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          party_type?: string
          party_types?: string[]
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          professor_id?: string | null
          profile_id?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_parties_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_parties_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_parties_default_payment_method_id_fkey"
            columns: ["default_payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_parties_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_parties_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_party_bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string | null
          active: boolean
          agency: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          label: string | null
          notes: string | null
          organization_id: string
          party_id: string
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
        }
        Insert: {
          account_digit?: string | null
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          notes?: string | null
          organization_id: string
          party_id: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Update: {
          account_digit?: string | null
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          notes?: string | null
          organization_id?: string
          party_id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_party_bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_party_bank_accounts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "financial_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_party_bank_history: {
        Row: {
          bank_account_id: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          organization_id: string
          party_id: string
        }
        Insert: {
          bank_account_id?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          organization_id: string
          party_id: string
        }
        Update: {
          bank_account_id?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          organization_id?: string
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_party_bank_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_batch_items: {
        Row: {
          amount: number
          batch_id: string
          created_at: string
          entry_id: string
          error_message: string | null
          id: string
          installment_id: string
          organization_id: string
          party_id: string | null
          payment_id: string | null
          pix_key: string | null
          pix_key_override: boolean
          pix_key_type: string | null
          status: Database["public"]["Enums"]["financial_batch_item_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string
          entry_id: string
          error_message?: string | null
          id?: string
          installment_id: string
          organization_id: string
          party_id?: string | null
          payment_id?: string | null
          pix_key?: string | null
          pix_key_override?: boolean
          pix_key_type?: string | null
          status?: Database["public"]["Enums"]["financial_batch_item_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string
          entry_id?: string
          error_message?: string | null
          id?: string
          installment_id?: string
          organization_id?: string
          party_id?: string | null
          payment_id?: string | null
          pix_key?: string | null
          pix_key_override?: boolean
          pix_key_type?: string | null
          status?: Database["public"]["Enums"]["financial_batch_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payment_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_batch_items_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_batch_items_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_batch_items_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "financial_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_batch_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_batches: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string
          id: string
          method_type: string
          name: string
          notes: string | null
          organization_id: string
          processed_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["financial_batch_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          method_type?: string
          name: string
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["financial_batch_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          method_type?: string
          name?: string
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["financial_batch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payment_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_methods: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          created_by: string | null
          default_account_id: string | null
          direction: string
          id: string
          method_type: string
          name: string
          notes: string | null
          organization_id: string
          requires_bank_account: boolean
          requires_proof: boolean
          requires_reference: boolean
          settlement_days: number
          supports_batch: boolean
          supports_installments: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_account_id?: string | null
          direction?: string
          id?: string
          method_type: string
          name: string
          notes?: string | null
          organization_id: string
          requires_bank_account?: boolean
          requires_proof?: boolean
          requires_reference?: boolean
          settlement_days?: number
          supports_batch?: boolean
          supports_installments?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          default_account_id?: string | null
          direction?: string
          id?: string
          method_type?: string
          name?: string
          notes?: string | null
          organization_id?: string
          requires_bank_account?: boolean
          requires_proof?: boolean
          requires_reference?: boolean
          settlement_days?: number
          supports_batch?: boolean
          supports_installments?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payment_methods_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payment_terms: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          created_by: string | null
          first_due_days: number
          id: string
          installment_count: number
          interval_days: number
          name: string
          notes: string | null
          organization_id: string
          percentage_distribution: number[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          first_due_days?: number
          id?: string
          installment_count?: number
          interval_days?: number
          name: string
          notes?: string | null
          organization_id: string
          percentage_distribution?: number[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          first_due_days?: number
          id?: string
          installment_count?: number
          interval_days?: number
          name?: string
          notes?: string | null
          organization_id?: string
          percentage_distribution?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payment_terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          account_id: string | null
          amount: number
          batch_item_id: string | null
          created_at: string
          created_by: string
          discount_amount: number
          entry_id: string
          id: string
          installment_id: string
          interest_amount: number
          kind: Database["public"]["Enums"]["financial_payment_kind"]
          late_fee_amount: number
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method_id: string | null
          reference: string | null
          reversal_of_id: string | null
          reversal_reason: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          batch_item_id?: string | null
          created_at?: string
          created_by: string
          discount_amount?: number
          entry_id: string
          id?: string
          installment_id: string
          interest_amount?: number
          kind?: Database["public"]["Enums"]["financial_payment_kind"]
          late_fee_amount?: number
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method_id?: string | null
          reference?: string | null
          reversal_of_id?: string | null
          reversal_reason?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          batch_item_id?: string | null
          created_at?: string
          created_by?: string
          discount_amount?: number
          entry_id?: string
          id?: string
          installment_id?: string
          interest_amount?: number
          kind?: Database["public"]["Enums"]["financial_payment_kind"]
          late_fee_amount?: number
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method_id?: string | null
          reference?: string | null
          reversal_of_id?: string | null
          reversal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_batch_item_fk"
            columns: ["batch_item_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_batch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_period_closures: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          month: number
          notes: string | null
          organization_id: string
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          school_id: string | null
          scope: Database["public"]["Enums"]["financial_closure_scope"]
          status: Database["public"]["Enums"]["financial_closure_status"]
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          organization_id: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          school_id?: string | null
          scope?: Database["public"]["Enums"]["financial_closure_scope"]
          status?: Database["public"]["Enums"]["financial_closure_status"]
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          organization_id?: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          school_id?: string | null
          scope?: Database["public"]["Enums"]["financial_closure_scope"]
          status?: Database["public"]["Enums"]["financial_closure_status"]
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_period_closures_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_period_closures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_period_closures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_permission_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["financial_permission_audit_action"]
          actor_user_id: string | null
          amount: number | null
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          permission_key: string | null
          reason: string | null
          scope_type: Database["public"]["Enums"]["financial_scope_type"] | null
          scope_value: string | null
          target_user_id: string | null
          template_code: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["financial_permission_audit_action"]
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id: string
          permission_key?: string | null
          reason?: string | null
          scope_type?:
            | Database["public"]["Enums"]["financial_scope_type"]
            | null
          scope_value?: string | null
          target_user_id?: string | null
          template_code?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["financial_permission_audit_action"]
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string
          permission_key?: string | null
          reason?: string | null
          scope_type?:
            | Database["public"]["Enums"]["financial_scope_type"]
            | null
          scope_value?: string | null
          target_user_id?: string | null
          template_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_permission_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_permissions: {
        Row: {
          action: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          key: string
          name: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          key: string
          name: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      financial_projects: {
        Row: {
          active: boolean
          budget: number | null
          code: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          responsible_user_id: string | null
          school_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["financial_project_status"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          budget?: number | null
          code?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          responsible_user_id?: string | null
          school_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["financial_project_status"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          budget?: number | null
          code?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          responsible_user_id?: string | null
          school_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["financial_project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_projects_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "financial_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_projects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reconciliations: {
        Row: {
          amount: number
          bank_transaction_id: string
          id: string
          installment_id: string | null
          match_method: string
          match_score: number | null
          notes: string | null
          organization_id: string
          payment_id: string | null
          reconciled_at: string
          reconciled_by: string | null
          undo_reason: string | null
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          amount: number
          bank_transaction_id: string
          id?: string
          installment_id?: string | null
          match_method: string
          match_score?: number | null
          notes?: string | null
          organization_id: string
          payment_id?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          undo_reason?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          amount?: number
          bank_transaction_id?: string
          id?: string
          installment_id?: string | null
          match_method?: string
          match_score?: number | null
          notes?: string | null
          organization_id?: string
          payment_id?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          undo_reason?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_reconciliations_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reconciliations_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reconciliations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reconciliations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_role_template_permissions: {
        Row: {
          permission_id: string
          template_id: string
        }
        Insert: {
          permission_id: string
          template_id: string
        }
        Update: {
          permission_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_role_template_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "financial_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_role_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "financial_role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_role_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_role_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          accounting_basis: string
          allow_negative_bank_balance: boolean
          allow_partial_payment: boolean
          allow_physical_delete: boolean
          allowed_import_formats: string[]
          approval_required_above: number | null
          auto_number_entries: boolean
          batch_prefix: string
          budget_exceed_action: string
          created_at: string
          default_account_id: string | null
          default_cost_center_id: string | null
          default_currency: string
          default_daily_interest_percent: number
          default_early_discount_days: number
          default_early_discount_percent: number
          default_late_fee_percent: number
          default_payment_method_id: string | null
          default_route_category_id: string | null
          default_substitution_category_id: string | null
          enable_budget_control: boolean
          enforce_segregation: boolean
          entry_prefix: string
          fiscal_year_start_day: number
          fiscal_year_start_month: number
          id: string
          notes: string | null
          organization_id: string
          overdue_grace_days: number
          require_document_for_approval: boolean
          require_monthly_closure: boolean
          require_receipt_for_payment: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          accounting_basis?: string
          allow_negative_bank_balance?: boolean
          allow_partial_payment?: boolean
          allow_physical_delete?: boolean
          allowed_import_formats?: string[]
          approval_required_above?: number | null
          auto_number_entries?: boolean
          batch_prefix?: string
          budget_exceed_action?: string
          created_at?: string
          default_account_id?: string | null
          default_cost_center_id?: string | null
          default_currency?: string
          default_daily_interest_percent?: number
          default_early_discount_days?: number
          default_early_discount_percent?: number
          default_late_fee_percent?: number
          default_payment_method_id?: string | null
          default_route_category_id?: string | null
          default_substitution_category_id?: string | null
          enable_budget_control?: boolean
          enforce_segregation?: boolean
          entry_prefix?: string
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          notes?: string | null
          organization_id: string
          overdue_grace_days?: number
          require_document_for_approval?: boolean
          require_monthly_closure?: boolean
          require_receipt_for_payment?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          accounting_basis?: string
          allow_negative_bank_balance?: boolean
          allow_partial_payment?: boolean
          allow_physical_delete?: boolean
          allowed_import_formats?: string[]
          approval_required_above?: number | null
          auto_number_entries?: boolean
          batch_prefix?: string
          budget_exceed_action?: string
          created_at?: string
          default_account_id?: string | null
          default_cost_center_id?: string | null
          default_currency?: string
          default_daily_interest_percent?: number
          default_early_discount_days?: number
          default_early_discount_percent?: number
          default_late_fee_percent?: number
          default_payment_method_id?: string | null
          default_route_category_id?: string | null
          default_substitution_category_id?: string | null
          enable_budget_control?: boolean
          enforce_segregation?: boolean
          entry_prefix?: string
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          notes?: string | null
          organization_id?: string
          overdue_grace_days?: number
          require_document_for_approval?: boolean
          require_monthly_closure?: boolean
          require_receipt_for_payment?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_default_payment_method_id_fkey"
            columns: ["default_payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_default_route_category_id_fkey"
            columns: ["default_route_category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_default_substitution_category_id_fkey"
            columns: ["default_substitution_category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          diff: Json
          id: string
          justification: string | null
          organization_id: string
          settings_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json
          id?: string
          justification?: string | null
          organization_id: string
          settings_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          diff?: Json
          id?: string
          justification?: string | null
          organization_id?: string
          settings_id?: string | null
        }
        Relationships: []
      }
      financial_source_links: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          metadata: Json | null
          organization_id: string
          source_id: string
          source_kind: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          metadata?: Json | null
          organization_id: string
          source_id: string
          source_kind: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          source_id?: string
          source_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_source_links_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transfers: {
        Row: {
          amount: number
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          destination_account_id: string
          destination_payment_id: string | null
          id: string
          organization_id: string
          reference: string | null
          source_account_id: string
          source_payment_id: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_date: string
        }
        Insert: {
          amount: number
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_account_id: string
          destination_payment_id?: string | null
          id?: string
          organization_id: string
          reference?: string | null
          source_account_id: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_date?: string
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_account_id?: string
          destination_payment_id?: string | null
          id?: string
          organization_id?: string
          reference?: string | null
          source_account_id?: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transfers_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_destination_payment_id_fkey"
            columns: ["destination_payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_user_permissions: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          organization_id: string
          permission_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_template: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          permission_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_template?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          permission_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_template?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_user_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "financial_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_user_permissions_source_template_fkey"
            columns: ["source_template"]
            isOneToOne: false
            referencedRelation: "financial_role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_user_scopes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          scope_type: Database["public"]["Enums"]["financial_scope_type"]
          scope_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          scope_type: Database["public"]["Enums"]["financial_scope_type"]
          scope_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          scope_type?: Database["public"]["Enums"]["financial_scope_type"]
          scope_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_user_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_ponto_generated_log: {
        Row: {
          generated_at: string
          generated_by: string | null
          id: string
          month: number
          organization_id: string
          professor_id: string
          school_id: string
          signature: string
          turno: string
          year: number
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          month: number
          organization_id: string
          professor_id: string
          school_id: string
          signature: string
          turno: string
          year: number
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          id?: string
          month?: number
          organization_id?: string
          professor_id?: string
          school_id?: string
          signature?: string
          turno?: string
          year?: number
        }
        Relationships: []
      }
      formative_tracks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formative_tracks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_activities: {
        Row: {
          created_at: string
          display_order: number
          grade_config_id: string
          id: string
          max_score: number
          name: string
        }
        Insert: {
          created_at?: string
          display_order: number
          grade_config_id: string
          id?: string
          max_score?: number
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          grade_config_id?: string
          id?: string
          max_score?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_activities_grade_config_id_fkey"
            columns: ["grade_config_id"]
            isOneToOne: false
            referencedRelation: "grade_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_configurations: {
        Row: {
          average_type: string
          bimester_number: number
          class_group_id: string
          course_id: string
          created_at: string
          id: string
          organization_id: string
          professor_id: string
          school_id: string
          status: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          average_type: string
          bimester_number: number
          class_group_id: string
          course_id: string
          created_at?: string
          id?: string
          organization_id: string
          professor_id: string
          school_id: string
          status?: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          average_type?: string
          bimester_number?: number
          class_group_id?: string
          course_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          professor_id?: string
          school_id?: string
          status?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_configurations_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_configurations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_configurations_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_configurations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_configurations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      help_tutorial_views: {
        Row: {
          completed: boolean
          first_viewed_at: string
          id: string
          last_viewed_at: string
          organization_id: string
          progress_seconds: number
          tutorial_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          organization_id: string
          progress_seconds?: number
          tutorial_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          organization_id?: string
          progress_seconds?: number
          tutorial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_tutorial_views_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "help_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      help_tutorials: {
        Row: {
          audience: Database["public"]["Enums"]["help_audience"]
          category: Database["public"]["Enums"]["help_category"]
          content_type: Database["public"]["Enums"]["help_content_type"]
          content_url: string | null
          cover_color: string
          cover_icon: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          duration_seconds: number | null
          feature_name: string
          file_mime: string | null
          file_size: number | null
          id: string
          is_featured: boolean
          organization_id: string
          search_tsv: unknown
          storage_path: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["help_audience"]
          category: Database["public"]["Enums"]["help_category"]
          content_type: Database["public"]["Enums"]["help_content_type"]
          content_url?: string | null
          cover_color?: string
          cover_icon?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration_seconds?: number | null
          feature_name?: string
          file_mime?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean
          organization_id: string
          search_tsv?: unknown
          storage_path?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["help_audience"]
          category?: Database["public"]["Enums"]["help_category"]
          content_type?: Database["public"]["Enums"]["help_content_type"]
          content_url?: string | null
          cover_color?: string
          cover_icon?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration_seconds?: number | null
          feature_name?: string
          file_mime?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean
          organization_id?: string
          search_tsv?: unknown
          storage_path?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      hr_allocation_items: {
        Row: {
          aulas: number
          class_group_id: string
          created_at: string
          id: string
          indicado_por_external_link_id: string | null
          indicado_por_nome: string | null
          motivo_recusa: string | null
          organization_id: string
          origem: Database["public"]["Enums"]["hr_item_origin"]
          plan_id: string
          professor_id: string | null
          school_time_slot_id: string | null
          status: Database["public"]["Enums"]["hr_item_status"]
          subject_id: string
          ucp_type: Database["public"]["Enums"]["ucp_type"]
          updated_at: string
          vaga_label: string | null
          weekday: string | null
          weekly_teaching_model_id: string | null
        }
        Insert: {
          aulas?: number
          class_group_id: string
          created_at?: string
          id?: string
          indicado_por_external_link_id?: string | null
          indicado_por_nome?: string | null
          motivo_recusa?: string | null
          organization_id: string
          origem?: Database["public"]["Enums"]["hr_item_origin"]
          plan_id: string
          professor_id?: string | null
          school_time_slot_id?: string | null
          status?: Database["public"]["Enums"]["hr_item_status"]
          subject_id: string
          ucp_type?: Database["public"]["Enums"]["ucp_type"]
          updated_at?: string
          vaga_label?: string | null
          weekday?: string | null
          weekly_teaching_model_id?: string | null
        }
        Update: {
          aulas?: number
          class_group_id?: string
          created_at?: string
          id?: string
          indicado_por_external_link_id?: string | null
          indicado_por_nome?: string | null
          motivo_recusa?: string | null
          organization_id?: string
          origem?: Database["public"]["Enums"]["hr_item_origin"]
          plan_id?: string
          professor_id?: string | null
          school_time_slot_id?: string | null
          status?: Database["public"]["Enums"]["hr_item_status"]
          subject_id?: string
          ucp_type?: Database["public"]["Enums"]["ucp_type"]
          updated_at?: string
          vaga_label?: string | null
          weekday?: string | null
          weekly_teaching_model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_allocation_items_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_indicado_por_external_link_id_fkey"
            columns: ["indicado_por_external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hr_allocation_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_school_time_slot_id_fkey"
            columns: ["school_time_slot_id"]
            isOneToOne: false
            referencedRelation: "school_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_items_weekly_teaching_model_id_fkey"
            columns: ["weekly_teaching_model_id"]
            isOneToOne: false
            referencedRelation: "weekly_teaching_models"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_allocation_plans: {
        Row: {
          ano_letivo: string
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          periodo: Database["public"]["Enums"]["hr_period"]
          published_at: string | null
          published_by: string | null
          qtd_turmas: number
          school_id: string
          status: Database["public"]["Enums"]["hr_plan_status"]
          teto_ch_semanal: number
          updated_at: string
        }
        Insert: {
          ano_letivo: string
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          periodo: Database["public"]["Enums"]["hr_period"]
          published_at?: string | null
          published_by?: string | null
          qtd_turmas: number
          school_id: string
          status?: Database["public"]["Enums"]["hr_plan_status"]
          teto_ch_semanal?: number
          updated_at?: string
        }
        Update: {
          ano_letivo?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          periodo?: Database["public"]["Enums"]["hr_period"]
          published_at?: string | null
          published_by?: string | null
          qtd_turmas?: number
          school_id?: string
          status?: Database["public"]["Enums"]["hr_plan_status"]
          teto_ch_semanal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_allocation_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_allocation_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_hiring_audit_logs: {
        Row: {
          actor_label: string | null
          actor_user_id: string | null
          candidate_id: string | null
          created_at: string
          event: Database["public"]["Enums"]["hr_hiring_audit_event"]
          id: string
          organization_id: string
          payload: Json
          professor_id: string | null
        }
        Insert: {
          actor_label?: string | null
          actor_user_id?: string | null
          candidate_id?: string | null
          created_at?: string
          event: Database["public"]["Enums"]["hr_hiring_audit_event"]
          id?: string
          organization_id: string
          payload?: Json
          professor_id?: string | null
        }
        Update: {
          actor_label?: string | null
          actor_user_id?: string | null
          candidate_id?: string | null
          created_at?: string
          event?: Database["public"]["Enums"]["hr_hiring_audit_event"]
          id?: string
          organization_id?: string
          payload?: Json
          professor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_hiring_audit_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_hiring_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_audit_logs_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_hiring_candidates: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          professor_id: string
          sent_at: string
          sent_by: string | null
          status: Database["public"]["Enums"]["hr_hiring_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          professor_id: string
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["hr_hiring_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          professor_id?: string
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["hr_hiring_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_hiring_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_candidates_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_hiring_documents: {
        Row: {
          candidate_id: string
          deleted_at: string | null
          doc_kind: Database["public"]["Enums"]["hr_hiring_doc_kind"]
          external_geo: string | null
          external_ip: string | null
          external_link_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          kind: Database["public"]["Enums"]["hr_hiring_doc_version_kind"]
          mime_type: string | null
          organization_id: string
          parent_document_id: string | null
          professor_id: string
          title: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          candidate_id: string
          deleted_at?: string | null
          doc_kind?: Database["public"]["Enums"]["hr_hiring_doc_kind"]
          external_geo?: string | null
          external_ip?: string | null
          external_link_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_hiring_doc_version_kind"]
          mime_type?: string | null
          organization_id: string
          parent_document_id?: string | null
          professor_id: string
          title: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          candidate_id?: string
          deleted_at?: string | null
          doc_kind?: Database["public"]["Enums"]["hr_hiring_doc_kind"]
          external_geo?: string | null
          external_ip?: string | null
          external_link_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_hiring_doc_version_kind"]
          mime_type?: string | null
          organization_id?: string
          parent_document_id?: string | null
          professor_id?: string
          title?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_hiring_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "hr_hiring_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_documents_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "hr_hiring_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_hiring_documents_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_indication_classes: {
        Row: {
          course_id: string
          created_at: string
          external_link_id: string | null
          id: string
          nome: string
          organization_id: string
          qtd_professores_indicados: number
          school_id: string
          turno: string
        }
        Insert: {
          course_id: string
          created_at?: string
          external_link_id?: string | null
          id?: string
          nome: string
          organization_id: string
          qtd_professores_indicados?: number
          school_id: string
          turno: string
        }
        Update: {
          course_id?: string
          created_at?: string
          external_link_id?: string | null
          id?: string
          nome?: string
          organization_id?: string
          qtd_professores_indicados?: number
          school_id?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_indication_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_indication_classes_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_indication_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_indication_drafts: {
        Row: {
          created_at: string
          diretor_nome: string | null
          external_link_id: string
          id: string
          organization_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          diretor_nome?: string | null
          external_link_id: string
          id?: string
          organization_id: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          diretor_nome?: string | null
          external_link_id?: string
          id?: string
          organization_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_indication_drafts_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: true
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_link_subject_bimester_filter: {
        Row: {
          bimester: number
          created_at: string
          enabled: boolean
          external_link_id: string
          id: string
          organization_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          bimester: number
          created_at?: string
          enabled?: boolean
          external_link_id: string
          id?: string
          organization_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          bimester?: number
          created_at?: string
          enabled?: boolean
          external_link_id?: string
          id?: string
          organization_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_link_subject_bimester_filter_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_link_subject_bimester_filter_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_school_indications: {
        Row: {
          allocated_at: string | null
          allocated_by: string | null
          candidato_disciplinas: Json | null
          candidato_email: string | null
          candidato_formacao: string | null
          candidato_grade: Json | null
          candidato_nome: string
          candidato_telefone: string | null
          class_group_id: string | null
          course_id: string | null
          created_at: string
          external_link_id: string | null
          id: string
          indicado_por_cargo: string | null
          indicado_por_email: string | null
          indicado_por_nome: string
          indication_class_id: string | null
          motivo_recusa: string | null
          observacoes: string | null
          organization_id: string
          origem: string
          periodo: Database["public"]["Enums"]["hr_period"] | null
          professor_id: string | null
          qtd_turmas: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["hr_indication_status"]
          talent_pool_candidate_id: string | null
          updated_at: string
          weekly_teaching_model_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          allocated_by?: string | null
          candidato_disciplinas?: Json | null
          candidato_email?: string | null
          candidato_formacao?: string | null
          candidato_grade?: Json | null
          candidato_nome: string
          candidato_telefone?: string | null
          class_group_id?: string | null
          course_id?: string | null
          created_at?: string
          external_link_id?: string | null
          id?: string
          indicado_por_cargo?: string | null
          indicado_por_email?: string | null
          indicado_por_nome: string
          indication_class_id?: string | null
          motivo_recusa?: string | null
          observacoes?: string | null
          organization_id: string
          origem?: string
          periodo?: Database["public"]["Enums"]["hr_period"] | null
          professor_id?: string | null
          qtd_turmas?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["hr_indication_status"]
          talent_pool_candidate_id?: string | null
          updated_at?: string
          weekly_teaching_model_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          allocated_by?: string | null
          candidato_disciplinas?: Json | null
          candidato_email?: string | null
          candidato_formacao?: string | null
          candidato_grade?: Json | null
          candidato_nome?: string
          candidato_telefone?: string | null
          class_group_id?: string | null
          course_id?: string | null
          created_at?: string
          external_link_id?: string | null
          id?: string
          indicado_por_cargo?: string | null
          indicado_por_email?: string | null
          indicado_por_nome?: string
          indication_class_id?: string | null
          motivo_recusa?: string | null
          observacoes?: string | null
          organization_id?: string
          origem?: string
          periodo?: Database["public"]["Enums"]["hr_period"] | null
          professor_id?: string | null
          qtd_turmas?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["hr_indication_status"]
          talent_pool_candidate_id?: string | null
          updated_at?: string
          weekly_teaching_model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_school_indications_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_external_link_id_fkey"
            columns: ["external_link_id"]
            isOneToOne: false
            referencedRelation: "external_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_indication_class_id_fkey"
            columns: ["indication_class_id"]
            isOneToOne: false
            referencedRelation: "hr_indication_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_school_indications_weekly_teaching_model_id_fkey"
            columns: ["weekly_teaching_model_id"]
            isOneToOne: false
            referencedRelation: "weekly_teaching_models"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          created_at: string
          default_pedagogica_aulas: number
          default_ucp1_aulas: number
          default_ucp2_aulas: number
          default_ucp3_aulas: number
          id: string
          max_planning_per_professor: number
          organization_id: string
          regra_horas_pem: number
          regra_horas_uci: number
          regra_horas_ucii: number
          regra_horas_uciii: number
          shift_afternoon_end: string
          shift_morning_end: string
          teto_ch_semanal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_pedagogica_aulas?: number
          default_ucp1_aulas?: number
          default_ucp2_aulas?: number
          default_ucp3_aulas?: number
          id?: string
          max_planning_per_professor?: number
          organization_id: string
          regra_horas_pem?: number
          regra_horas_uci?: number
          regra_horas_ucii?: number
          regra_horas_uciii?: number
          shift_afternoon_end?: string
          shift_morning_end?: string
          teto_ch_semanal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_pedagogica_aulas?: number
          default_ucp1_aulas?: number
          default_ucp2_aulas?: number
          default_ucp3_aulas?: number
          id?: string
          max_planning_per_professor?: number
          organization_id?: string
          regra_horas_pem?: number
          regra_horas_uci?: number
          regra_horas_ucii?: number
          regra_horas_uciii?: number
          shift_afternoon_end?: string
          shift_morning_end?: string
          teto_ch_semanal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_subject_ucp_overrides: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          subject_id: string
          ucp_type: Database["public"]["Enums"]["ucp_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          subject_id: string
          ucp_type: Database["public"]["Enums"]["ucp_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          subject_id?: string
          ucp_type?: Database["public"]["Enums"]["ucp_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_subject_ucp_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_subject_ucp_overrides_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch_rows: {
        Row: {
          batch_id: string
          codigo_matricula: string | null
          created_at: string
          error_message: string | null
          id: string
          row_number: number
          status: string
          student_id: string | null
          student_name: string | null
        }
        Insert: {
          batch_id: string
          codigo_matricula?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          row_number: number
          status?: string
          student_id?: string | null
          student_name?: string | null
        }
        Update: {
          batch_id?: string
          codigo_matricula?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          row_number?: number
          status?: string
          student_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_rows_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          ano_letivo: string | null
          class_group_id: string | null
          course_id: string | null
          created_at: string
          dry_run_errors: Json | null
          error_count: number
          file_name: string
          id: string
          organization_id: string
          school_id: string | null
          status: string
          success_count: number
          total_rows: number
          user_id: string
        }
        Insert: {
          ano_letivo?: string | null
          class_group_id?: string | null
          course_id?: string | null
          created_at?: string
          dry_run_errors?: Json | null
          error_count?: number
          file_name: string
          id?: string
          organization_id: string
          school_id?: string | null
          status?: string
          success_count?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          ano_letivo?: string | null
          class_group_id?: string | null
          course_id?: string | null
          created_at?: string
          dry_run_errors?: Json | null
          error_count?: number
          file_name?: string
          id?: string
          organization_id?: string
          school_id?: string | null
          status?: string
          success_count?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_lists: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          mapped_status: string | null
          name: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          mapped_status?: string | null
          name: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          mapped_status?: string | null
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          bimester_number: number | null
          created_at: string
          description: string | null
          display_order: number
          file_url: string | null
          id: string
          material_type: string
          organization_id: string
          subject_id: string
          text_content: string | null
          title: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          bimester_number?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_url?: string | null
          id?: string
          material_type: string
          organization_id: string
          subject_id: string
          text_content?: string | null
          title: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          bimester_number?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_url?: string | null
          id?: string
          material_type?: string
          organization_id?: string
          subject_id?: string
          text_content?: string | null
          title?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_content_folders: {
        Row: {
          content_id: string
          created_at: string
          folder_id: string
          sort_order: number
        }
        Insert: {
          content_id: string
          created_at?: string
          folder_id: string
          sort_order?: number
        }
        Update: {
          content_id?: string
          created_at?: string
          folder_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_content_folders_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_content_folders_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      library_contents: {
        Row: {
          category_id: string
          content_type: string
          content_url: string | null
          course_id: string | null
          cover_color: string
          cover_icon: string
          created_at: string
          created_by: string | null
          description: string
          file_mime: string | null
          file_size: number | null
          formative_track_id: string | null
          id: string
          lesson_number: number | null
          organization_id: string
          parent_id: string | null
          published_at: string | null
          published_by: string | null
          sort_order: number
          storage_path: string | null
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          content_type?: string
          content_url?: string | null
          course_id?: string | null
          cover_color?: string
          cover_icon?: string
          created_at?: string
          created_by?: string | null
          description: string
          file_mime?: string | null
          file_size?: number | null
          formative_track_id?: string | null
          id?: string
          lesson_number?: number | null
          organization_id: string
          parent_id?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          storage_path?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          content_type?: string
          content_url?: string | null
          course_id?: string | null
          cover_color?: string
          cover_icon?: string
          created_at?: string
          created_by?: string | null
          description?: string
          file_mime?: string | null
          file_size?: number | null
          formative_track_id?: string | null
          id?: string
          lesson_number?: number | null
          organization_id?: string
          parent_id?: string | null
          published_at?: string | null
          published_by?: string | null
          sort_order?: number
          storage_path?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_formative_track_id_fkey"
            columns: ["formative_track_id"]
            isOneToOne: false
            referencedRelation: "formative_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_folders: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onesignal_send_log: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          external_ids: string[] | null
          id: string
          message: string | null
          onesignal_id: string | null
          organization_id: string
          payload: Json | null
          recipients_count: number | null
          status: string
          subject: string | null
          target_emails: string[] | null
          target_user_ids: string[] | null
          template: string | null
          triggered_by: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          external_ids?: string[] | null
          id?: string
          message?: string | null
          onesignal_id?: string | null
          organization_id: string
          payload?: Json | null
          recipients_count?: number | null
          status?: string
          subject?: string | null
          target_emails?: string[] | null
          target_user_ids?: string[] | null
          template?: string | null
          triggered_by?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          external_ids?: string[] | null
          id?: string
          message?: string | null
          onesignal_id?: string | null
          organization_id?: string
          payload?: Json | null
          recipients_count?: number | null
          status?: string
          subject?: string | null
          target_emails?: string[] | null
          target_user_ids?: string[] | null
          template?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onesignal_send_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onesignal_settings: {
        Row: {
          app_id: string | null
          created_at: string
          email_enabled: boolean
          email_from_address: string | null
          email_from_name: string | null
          id: string
          organization_id: string
          push_enabled: boolean
          rest_api_key: string | null
          safari_web_id: string | null
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          email_enabled?: boolean
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          organization_id: string
          push_enabled?: boolean
          rest_api_key?: string | null
          safari_web_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          email_enabled?: boolean
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          organization_id?: string
          push_enabled?: boolean
          rest_api_key?: string | null
          safari_web_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onesignal_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orientations: {
        Row: {
          cancellation_reason: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          evidence_urls: string[] | null
          id: string
          occurrence_id: string | null
          organization_id: string
          orientation_type: string
          planning_slot_id: string | null
          professor_id: string
          scheduled_date: string | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          scheduling_notes: string | null
          school_id: string | null
          signature_photo_url: string | null
          signed_at: string | null
          signed_by: string | null
          status: string | null
          subject_id: string | null
          updated_at: string | null
          video_call_link: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          occurrence_id?: string | null
          organization_id: string
          orientation_type: string
          planning_slot_id?: string | null
          professor_id: string
          scheduled_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          scheduling_notes?: string | null
          school_id?: string | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          subject_id?: string | null
          updated_at?: string | null
          video_call_link?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          occurrence_id?: string | null
          organization_id?: string
          orientation_type?: string
          planning_slot_id?: string | null
          professor_id?: string
          scheduled_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          scheduling_notes?: string | null
          school_id?: string | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          subject_id?: string | null
          updated_at?: string | null
          video_call_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orientations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "annual_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_planning_slot_id_fkey"
            columns: ["planning_slot_id"]
            isOneToOne: false
            referencedRelation: "weekly_teaching_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orientations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          pre_planning_id: string | null
          teacher_planning_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          pre_planning_id?: string | null
          teacher_planning_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          pre_planning_id?: string | null
          teacher_planning_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_audit_log_pre_planning_id_fkey"
            columns: ["pre_planning_id"]
            isOneToOne: false
            referencedRelation: "pre_plannings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_audit_log_teacher_planning_id_fkey"
            columns: ["teacher_planning_id"]
            isOneToOne: false
            referencedRelation: "teacher_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_feedback_history: {
        Row: {
          action: string
          coordinator_id: string
          coordinator_name: string
          created_at: string
          feedback: string
          id: string
          organization_id: string
          teacher_planning_id: string
        }
        Insert: {
          action?: string
          coordinator_id: string
          coordinator_name: string
          created_at?: string
          feedback: string
          id?: string
          organization_id: string
          teacher_planning_id: string
        }
        Update: {
          action?: string
          coordinator_id?: string
          coordinator_name?: string
          created_at?: string
          feedback?: string
          id?: string
          organization_id?: string
          teacher_planning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_feedback_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_feedback_history_teacher_planning_id_fkey"
            columns: ["teacher_planning_id"]
            isOneToOne: false
            referencedRelation: "teacher_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_templates: {
        Row: {
          bimester_number: number
          competencies: string
          contents: string
          created_at: string
          created_by: string
          evaluation: string
          id: string
          methodology: string
          next_steps: string
          objective: string
          organization_id: string
          product: string
          resources: string
          subject_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          bimester_number: number
          competencies?: string
          contents?: string
          created_at?: string
          created_by: string
          evaluation?: string
          id?: string
          methodology?: string
          next_steps?: string
          objective?: string
          organization_id: string
          product?: string
          resources?: string
          subject_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          bimester_number?: number
          competencies?: string
          contents?: string
          created_at?: string
          created_by?: string
          evaluation?: string
          id?: string
          methodology?: string
          next_steps?: string
          objective?: string
          organization_id?: string
          product?: string
          resources?: string
          subject_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "planning_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_templates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_planning_materials: {
        Row: {
          created_at: string
          display_order: number
          id: string
          lesson_material_id: string
          pre_planning_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          lesson_material_id: string
          pre_planning_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          lesson_material_id?: string
          pre_planning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_planning_materials_lesson_material_id_fkey"
            columns: ["lesson_material_id"]
            isOneToOne: false
            referencedRelation: "lesson_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_planning_materials_pre_planning_id_fkey"
            columns: ["pre_planning_id"]
            isOneToOne: false
            referencedRelation: "pre_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_plannings: {
        Row: {
          bimester_number: number | null
          calculated_total_classes: number | null
          calculated_total_hours: number | null
          class_date: string | null
          class_days_count: number | null
          class_days_detail: Json | null
          class_group_id: string | null
          competencies: string
          contents: string
          course_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          end_time: string | null
          evaluation: string
          id: string
          methodology: string
          next_steps: string
          objective: string
          occurrence_id: string | null
          organization_id: string
          planning_type: Database["public"]["Enums"]["pre_planning_type"]
          product: string
          professor_id: string | null
          reference_month: number | null
          reference_year: number
          resources: string
          school_id: string | null
          start_time: string | null
          status: string | null
          subject_id: string
          updated_at: string
          week_end_date: string | null
          week_number: number | null
          week_start_date: string | null
        }
        Insert: {
          bimester_number?: number | null
          calculated_total_classes?: number | null
          calculated_total_hours?: number | null
          class_date?: string | null
          class_days_count?: number | null
          class_days_detail?: Json | null
          class_group_id?: string | null
          competencies?: string
          contents?: string
          course_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          end_time?: string | null
          evaluation?: string
          id?: string
          methodology?: string
          next_steps?: string
          objective?: string
          occurrence_id?: string | null
          organization_id: string
          planning_type: Database["public"]["Enums"]["pre_planning_type"]
          product?: string
          professor_id?: string | null
          reference_month?: number | null
          reference_year: number
          resources?: string
          school_id?: string | null
          start_time?: string | null
          status?: string | null
          subject_id: string
          updated_at?: string
          week_end_date?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Update: {
          bimester_number?: number | null
          calculated_total_classes?: number | null
          calculated_total_hours?: number | null
          class_date?: string | null
          class_days_count?: number | null
          class_days_detail?: Json | null
          class_group_id?: string | null
          competencies?: string
          contents?: string
          course_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          end_time?: string | null
          evaluation?: string
          id?: string
          methodology?: string
          next_steps?: string
          objective?: string
          occurrence_id?: string | null
          organization_id?: string
          planning_type?: Database["public"]["Enums"]["pre_planning_type"]
          product?: string
          professor_id?: string | null
          reference_month?: number | null
          reference_year?: number
          resources?: string
          school_id?: string | null
          start_time?: string | null
          status?: string | null
          subject_id?: string
          updated_at?: string
          week_end_date?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_plannings_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_plannings_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "annual_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_plannings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_plannings_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_plannings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_children: {
        Row: {
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          professor_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          professor_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          professor_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_children_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_contact_logs: {
        Row: {
          contact_type: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string
          id: string
          organization_id: string
          professor_id: string
          updated_at: string
        }
        Insert: {
          contact_type?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description: string
          id?: string
          organization_id: string
          professor_id: string
          updated_at?: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string
          id?: string
          organization_id?: string
          professor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_contact_logs_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_document_files: {
        Row: {
          category: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          professor_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          professor_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          professor_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professor_document_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_document_files_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_documents: {
        Row: {
          address: string | null
          address_city: string | null
          address_complement: string | null
          address_state: string | null
          admission_date: string | null
          admission_status: string
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          birth_city: string | null
          birth_date: string | null
          birth_state: string | null
          blood_type: string | null
          cnh_category: string | null
          cnh_expiry: string | null
          cnh_issue_date: string | null
          cnh_number: string | null
          cnh_state: string | null
          cpf: string | null
          created_at: string
          education_level: string | null
          email: string | null
          eye_color: string | null
          father_name: string | null
          first_license_date: string | null
          full_name: string | null
          function_title: string | null
          gender: string | null
          hair_color: string | null
          has_sicredi_account: boolean | null
          height: number | null
          id: string
          marital_status: string | null
          military_cert: string | null
          mother_name: string | null
          nationality: string | null
          neighborhood: string | null
          organization_id: string
          phone: string | null
          pis_nit: string | null
          pix_key: string | null
          pix_type: string | null
          professor_id: string
          race: string | null
          registration_code: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          rg_number: string | null
          rg_state: string | null
          shirt_size: string | null
          social_name: string | null
          specialization: string | null
          spouse_birth_city: string | null
          spouse_birth_date: string | null
          spouse_birth_state: string | null
          spouse_name: string | null
          spouse_nationality: string | null
          termination_date: string | null
          updated_at: string
          voter_id: string | null
          voter_section: string | null
          voter_zone: string | null
          weight: number | null
          work_card_number: string | null
          work_card_series: string | null
          work_card_state: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_state?: string | null
          admission_date?: string | null
          admission_status?: string
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          birth_city?: string | null
          birth_date?: string | null
          birth_state?: string | null
          blood_type?: string | null
          cnh_category?: string | null
          cnh_expiry?: string | null
          cnh_issue_date?: string | null
          cnh_number?: string | null
          cnh_state?: string | null
          cpf?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          eye_color?: string | null
          father_name?: string | null
          first_license_date?: string | null
          full_name?: string | null
          function_title?: string | null
          gender?: string | null
          hair_color?: string | null
          has_sicredi_account?: boolean | null
          height?: number | null
          id?: string
          marital_status?: string | null
          military_cert?: string | null
          mother_name?: string | null
          nationality?: string | null
          neighborhood?: string | null
          organization_id: string
          phone?: string | null
          pis_nit?: string | null
          pix_key?: string | null
          pix_type?: string | null
          professor_id: string
          race?: string | null
          registration_code?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          rg_number?: string | null
          rg_state?: string | null
          shirt_size?: string | null
          social_name?: string | null
          specialization?: string | null
          spouse_birth_city?: string | null
          spouse_birth_date?: string | null
          spouse_birth_state?: string | null
          spouse_name?: string | null
          spouse_nationality?: string | null
          termination_date?: string | null
          updated_at?: string
          voter_id?: string | null
          voter_section?: string | null
          voter_zone?: string | null
          weight?: number | null
          work_card_number?: string | null
          work_card_series?: string | null
          work_card_state?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_state?: string | null
          admission_date?: string | null
          admission_status?: string
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          birth_city?: string | null
          birth_date?: string | null
          birth_state?: string | null
          blood_type?: string | null
          cnh_category?: string | null
          cnh_expiry?: string | null
          cnh_issue_date?: string | null
          cnh_number?: string | null
          cnh_state?: string | null
          cpf?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          eye_color?: string | null
          father_name?: string | null
          first_license_date?: string | null
          full_name?: string | null
          function_title?: string | null
          gender?: string | null
          hair_color?: string | null
          has_sicredi_account?: boolean | null
          height?: number | null
          id?: string
          marital_status?: string | null
          military_cert?: string | null
          mother_name?: string | null
          nationality?: string | null
          neighborhood?: string | null
          organization_id?: string
          phone?: string | null
          pis_nit?: string | null
          pix_key?: string | null
          pix_type?: string | null
          professor_id?: string
          race?: string | null
          registration_code?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          rg_number?: string | null
          rg_state?: string | null
          shirt_size?: string | null
          social_name?: string | null
          specialization?: string | null
          spouse_birth_city?: string | null
          spouse_birth_date?: string | null
          spouse_birth_state?: string | null
          spouse_name?: string | null
          spouse_nationality?: string | null
          termination_date?: string | null
          updated_at?: string
          voter_id?: string | null
          voter_section?: string | null
          voter_zone?: string | null
          weight?: number | null
          work_card_number?: string | null
          work_card_series?: string | null
          work_card_state?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professor_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_documents_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: true
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_kanban_labels: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      professor_kanban_state: {
        Row: {
          created_at: string
          description: string | null
          id: string
          labels: Json
          last_moved_at: string | null
          last_moved_by: string | null
          manual_column: string | null
          organization_id: string
          professor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          labels?: Json
          last_moved_at?: string | null
          last_moved_by?: string | null
          manual_column?: string | null
          organization_id: string
          professor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          labels?: Json
          last_moved_at?: string | null
          last_moved_by?: string | null
          manual_column?: string | null
          organization_id?: string
          professor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_kanban_state_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: true
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_medical_reports: {
        Row: {
          cid_code: string
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          professor_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          cid_code: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          professor_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          cid_code?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          professor_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professor_medical_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_medical_reports_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_school_courses: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          is_coordinator: boolean
          organization_id: string
          professor_id: string
          school_id: string
          status: Database["public"]["Enums"]["binding_status"]
          unbind_reason: string | null
          unbound_at: string | null
          unbound_by: string | null
          updated_at: string
          workload_afternoon_hours: number
          workload_filled_at: string | null
          workload_morning_hours: number
          workload_night_hours: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_coordinator?: boolean
          organization_id: string
          professor_id: string
          school_id: string
          status?: Database["public"]["Enums"]["binding_status"]
          unbind_reason?: string | null
          unbound_at?: string | null
          unbound_by?: string | null
          updated_at?: string
          workload_afternoon_hours?: number
          workload_filled_at?: string | null
          workload_morning_hours?: number
          workload_night_hours?: number
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_coordinator?: boolean
          organization_id?: string
          professor_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["binding_status"]
          unbind_reason?: string | null
          unbound_at?: string | null
          unbound_by?: string | null
          updated_at?: string
          workload_afternoon_hours?: number
          workload_filled_at?: string | null
          workload_morning_hours?: number
          workload_night_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "professor_school_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_school_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_school_courses_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_school_courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_status_history: {
        Row: {
          changed_by_user_email: string | null
          changed_by_user_id: string | null
          changed_by_user_name: string | null
          created_at: string
          id: string
          new_status: string
          organization_id: string
          previous_status: string | null
          professor_id: string
          reason: string
        }
        Insert: {
          changed_by_user_email?: string | null
          changed_by_user_id?: string | null
          changed_by_user_name?: string | null
          created_at?: string
          id?: string
          new_status: string
          organization_id: string
          previous_status?: string | null
          professor_id: string
          reason: string
        }
        Update: {
          changed_by_user_email?: string | null
          changed_by_user_id?: string | null
          changed_by_user_name?: string | null
          created_at?: string
          id?: string
          new_status?: string
          organization_id?: string
          previous_status?: string | null
          professor_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_status_history_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_unbinding_history: {
        Row: {
          binding_id: string | null
          course_id: string | null
          created_at: string
          id: string
          organization_id: string
          professor_id: string
          reason: string
          school_id: string
          unbound_at: string
          unbound_by: string | null
          workload_afternoon_hours: number | null
          workload_morning_hours: number | null
          workload_night_hours: number | null
        }
        Insert: {
          binding_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          professor_id: string
          reason: string
          school_id: string
          unbound_at?: string
          unbound_by?: string | null
          workload_afternoon_hours?: number | null
          workload_morning_hours?: number | null
          workload_night_hours?: number | null
        }
        Update: {
          binding_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          professor_id?: string
          reason?: string
          school_id?: string
          unbound_at?: string
          unbound_by?: string | null
          workload_afternoon_hours?: number | null
          workload_morning_hours?: number | null
          workload_night_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professor_unbinding_history_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_unbinding_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_unbinding_history_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_unbinding_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      professors: {
        Row: {
          cpf: string | null
          created_at: string
          deleted_at: string | null
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          registration_code: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["professor_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name: string
          id?: string
          organization_id: string
          phone?: string | null
          registration_code?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["professor_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          registration_code?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["professor_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string | null
          password_changed_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          password_changed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          password_changed_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_pushed_notifications: {
        Row: {
          notification_id: string
          pushed_at: string
        }
        Insert: {
          notification_id: string
          pushed_at?: string
        }
        Update: {
          notification_id?: string
          pushed_at?: string
        }
        Relationships: []
      }
      pwa_settings: {
        Row: {
          background_color: string
          created_at: string
          description: string
          display: string
          hidden_menu_items_by_role: Json
          hidden_menu_items_mobile: Json
          icon_url: string | null
          icons: Json | null
          id: string
          manifest_id: string
          name: string
          orientation: string
          screenshots: Json
          short_name: string
          shortcuts: Json
          singleton: boolean
          start_url_by_role: Json
          start_url_default: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          description?: string
          display?: string
          hidden_menu_items_by_role?: Json
          hidden_menu_items_mobile?: Json
          icon_url?: string | null
          icons?: Json | null
          id?: string
          manifest_id?: string
          name?: string
          orientation?: string
          screenshots?: Json
          short_name?: string
          shortcuts?: Json
          singleton?: boolean
          start_url_by_role?: Json
          start_url_default?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          description?: string
          display?: string
          hidden_menu_items_by_role?: Json
          hidden_menu_items_mobile?: Json
          icon_url?: string | null
          icons?: Json | null
          id?: string
          manifest_id?: string
          name?: string
          orientation?: string
          screenshots?: Json
          short_name?: string
          shortcuts?: Json
          singleton?: boolean
          start_url_by_role?: Json
          start_url_default?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      quarterly_keywords: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          keyword_hash: string
          organization_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_active?: boolean
          keyword_hash: string
          organization_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          keyword_hash?: string
          organization_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_keywords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_time_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          organization_id: string
          school_id: string
          slot_label: string
          slot_number: number
          start_time: string
          status: string
          updated_at: string
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          organization_id: string
          school_id: string
          slot_label?: string
          slot_number: number
          start_time: string
          status?: string
          updated_at?: string
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          organization_id?: string
          school_id?: string
          slot_label?: string
          slot_number?: number
          start_time?: string
          status?: string
          updated_at?: string
          weekday?: Database["public"]["Enums"]["weekday"]
        }
        Relationships: [
          {
            foreignKeyName: "school_time_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_time_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visit_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          organization_id: string
          uploaded_by: string
          visit_id: string | null
          visit_record_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          organization_id: string
          uploaded_by: string
          visit_id?: string | null
          visit_record_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          organization_id?: string
          uploaded_by?: string
          visit_id?: string | null
          visit_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_visit_attachments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "school_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_visit_attachments_visit_record_id_fkey"
            columns: ["visit_record_id"]
            isOneToOne: false
            referencedRelation: "school_visit_records"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visit_participants: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          role: string | null
          school_link: string | null
          visit_record_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          school_link?: string | null
          visit_record_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          school_link?: string | null
          visit_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_participants_visit_record_id_fkey"
            columns: ["visit_record_id"]
            isOneToOne: false
            referencedRelation: "school_visit_records"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visit_records: {
        Row: {
          created_at: string
          description: string | null
          executive_summary: string | null
          final_notes: string | null
          id: string
          next_steps: string | null
          objective: string | null
          organization_id: string
          pending_items: string | null
          recorded_by: string
          referrals: string | null
          title: string
          updated_at: string
          visit_school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          executive_summary?: string | null
          final_notes?: string | null
          id?: string
          next_steps?: string | null
          objective?: string | null
          organization_id: string
          pending_items?: string | null
          recorded_by: string
          referrals?: string | null
          title?: string
          updated_at?: string
          visit_school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          executive_summary?: string | null
          final_notes?: string | null
          id?: string
          next_steps?: string | null
          objective?: string | null
          organization_id?: string
          pending_items?: string | null
          recorded_by?: string
          referrals?: string | null
          title?: string
          updated_at?: string
          visit_school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_visit_records_visit_school_id_fkey"
            columns: ["visit_school_id"]
            isOneToOne: false
            referencedRelation: "school_visit_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visit_schools: {
        Row: {
          arrival_at: string | null
          city: string | null
          created_at: string
          day_order: number | null
          departure_at: string | null
          id: string
          planned_arrival: string | null
          planned_date: string | null
          planned_departure: string | null
          route_order: number | null
          school_id: string
          updated_at: string
          visit_id: string
          visit_status: string
        }
        Insert: {
          arrival_at?: string | null
          city?: string | null
          created_at?: string
          day_order?: number | null
          departure_at?: string | null
          id?: string
          planned_arrival?: string | null
          planned_date?: string | null
          planned_departure?: string | null
          route_order?: number | null
          school_id: string
          updated_at?: string
          visit_id: string
          visit_status?: string
        }
        Update: {
          arrival_at?: string | null
          city?: string | null
          created_at?: string
          day_order?: number | null
          departure_at?: string | null
          id?: string
          planned_arrival?: string | null
          planned_date?: string | null
          planned_departure?: string | null
          route_order?: number | null
          school_id?: string
          updated_at?: string
          visit_id?: string
          visit_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_visit_schools_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "school_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visit_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
          user_name: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          user_name?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          user_name?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_users_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "school_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      school_visits: {
        Row: {
          action_name: string
          created_at: string
          created_by: string
          daily_end_time: string | null
          daily_start_time: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          departure_point: string | null
          description: string | null
          end_datetime: string | null
          form_pdf_url: string | null
          id: string
          interval_minutes: number | null
          logistics_notes: string | null
          objective: string | null
          organization_id: string
          priority: string
          responsible_user_id: string
          start_datetime: string
          status: string
          travel_time_minutes: number | null
          updated_at: string
          visit_duration_minutes: number | null
          visit_type: string
          weekly_schedule: Json | null
        }
        Insert: {
          action_name: string
          created_at?: string
          created_by: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          departure_point?: string | null
          description?: string | null
          end_datetime?: string | null
          form_pdf_url?: string | null
          id?: string
          interval_minutes?: number | null
          logistics_notes?: string | null
          objective?: string | null
          organization_id: string
          priority?: string
          responsible_user_id: string
          start_datetime: string
          status?: string
          travel_time_minutes?: number | null
          updated_at?: string
          visit_duration_minutes?: number | null
          visit_type?: string
          weekly_schedule?: Json | null
        }
        Update: {
          action_name?: string
          created_at?: string
          created_by?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          departure_point?: string | null
          description?: string | null
          end_datetime?: string | null
          form_pdf_url?: string | null
          id?: string
          interval_minutes?: number | null
          logistics_notes?: string | null
          objective?: string | null
          organization_id?: string
          priority?: string
          responsible_user_id?: string
          start_datetime?: string
          status?: string
          travel_time_minutes?: number | null
          updated_at?: string
          visit_duration_minutes?: number | null
          visit_type?: string
          weekly_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "school_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          cidade: string
          codigo: string
          coordenador_pedagogico: string | null
          coordenador_pedagogico_email: string | null
          coordenador_pedagogico_telefone: string | null
          coordenador_pedagogico_turno: string | null
          cre: string | null
          created_at: string
          diretor: string
          diretor_adjunto: string | null
          diretor_adjunto_email: string | null
          diretor_adjunto_telefone: string | null
          diretor_email: string | null
          diretor_telefone: string | null
          email: string
          endereco: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          geocoded_at: string | null
          id: string
          lat: number | null
          lng: number | null
          nome: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
          supervisor_tecnico_1: string | null
          supervisor_tecnico_1_email: string | null
          supervisor_tecnico_1_telefone: string | null
          supervisor_tecnico_1_turno: string | null
          supervisor_tecnico_2: string | null
          supervisor_tecnico_2_email: string | null
          supervisor_tecnico_2_telefone: string | null
          supervisor_tecnico_2_turno: string | null
          supervisor_tecnico_3: string | null
          supervisor_tecnico_3_email: string | null
          supervisor_tecnico_3_telefone: string | null
          supervisor_tecnico_3_turno: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          cidade: string
          codigo: string
          coordenador_pedagogico?: string | null
          coordenador_pedagogico_email?: string | null
          coordenador_pedagogico_telefone?: string | null
          coordenador_pedagogico_turno?: string | null
          cre?: string | null
          created_at?: string
          diretor: string
          diretor_adjunto?: string | null
          diretor_adjunto_email?: string | null
          diretor_adjunto_telefone?: string | null
          diretor_email?: string | null
          diretor_telefone?: string | null
          email: string
          endereco: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          supervisor_tecnico_1?: string | null
          supervisor_tecnico_1_email?: string | null
          supervisor_tecnico_1_telefone?: string | null
          supervisor_tecnico_1_turno?: string | null
          supervisor_tecnico_2?: string | null
          supervisor_tecnico_2_email?: string | null
          supervisor_tecnico_2_telefone?: string | null
          supervisor_tecnico_2_turno?: string | null
          supervisor_tecnico_3?: string | null
          supervisor_tecnico_3_email?: string | null
          supervisor_tecnico_3_telefone?: string | null
          supervisor_tecnico_3_turno?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          codigo?: string
          coordenador_pedagogico?: string | null
          coordenador_pedagogico_email?: string | null
          coordenador_pedagogico_telefone?: string | null
          coordenador_pedagogico_turno?: string | null
          cre?: string | null
          created_at?: string
          diretor?: string
          diretor_adjunto?: string | null
          diretor_adjunto_email?: string | null
          diretor_adjunto_telefone?: string | null
          diretor_email?: string | null
          diretor_telefone?: string | null
          email?: string
          endereco?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          supervisor_tecnico_1?: string | null
          supervisor_tecnico_1_email?: string | null
          supervisor_tecnico_1_telefone?: string | null
          supervisor_tecnico_1_turno?: string | null
          supervisor_tecnico_2?: string | null
          supervisor_tecnico_2_email?: string | null
          supervisor_tecnico_2_telefone?: string | null
          supervisor_tecnico_2_turno?: string | null
          supervisor_tecnico_3?: string | null
          supervisor_tecnico_3_email?: string | null
          supervisor_tecnico_3_telefone?: string | null
          supervisor_tecnico_3_turno?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          created_at: string
          id: string
          nome: string
          organization_id: string
          sigla: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          organization_id: string
          sigla: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          created_at: string
          grade_activity_id: string
          id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_activity_id: string
          id?: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_activity_id?: string
          id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_grade_activity_id_fkey"
            columns: ["grade_activity_id"]
            isOneToOne: false
            referencedRelation: "grade_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          codigo_matricula: string
          contato_responsavel: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          educacao_especial: boolean
          educacao_especial_descricao: string | null
          email: string | null
          email_responsavel: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_estado: string | null
          endereco_municipio: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          id: string
          nacionalidade: string
          nome_completo: string
          nome_mae: string | null
          nome_pai: string | null
          organization_id: string
          orgao_expedidor: string | null
          rg: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          codigo_matricula: string
          contato_responsavel?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          educacao_especial?: boolean
          educacao_especial_descricao?: string | null
          email?: string | null
          email_responsavel?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_estado?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          id?: string
          nacionalidade?: string
          nome_completo: string
          nome_mae?: string | null
          nome_pai?: string | null
          organization_id: string
          orgao_expedidor?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          codigo_matricula?: string
          contato_responsavel?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          educacao_especial?: boolean
          educacao_especial_descricao?: string | null
          email?: string | null
          email_responsavel?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_estado?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          id?: string
          nacionalidade?: string
          nome_completo?: string
          nome_mae?: string | null
          nome_pai?: string | null
          organization_id?: string
          orgao_expedidor?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          carga_horaria_semanal: number
          codigo: string
          course_id: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          nome_boletim: string | null
          organization_id: string
          semester: Database["public"]["Enums"]["subject_semester"]
          status: Database["public"]["Enums"]["entity_status"]
          total_classes: number
          updated_at: string
        }
        Insert: {
          carga_horaria_semanal?: number
          codigo: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          nome_boletim?: string | null
          organization_id: string
          semester?: Database["public"]["Enums"]["subject_semester"]
          status?: Database["public"]["Enums"]["entity_status"]
          total_classes?: number
          updated_at?: string
        }
        Update: {
          carga_horaria_semanal?: number
          codigo?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          nome_boletim?: string | null
          organization_id?: string
          semester?: Database["public"]["Enums"]["subject_semester"]
          status?: Database["public"]["Enums"]["entity_status"]
          total_classes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["substitution_doc_type"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          substitution_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["substitution_doc_type"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          substitution_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["substitution_doc_type"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          substitution_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_documents_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          proof_document_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["substitution_payment_status"]
          substitution_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          proof_document_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["substitution_payment_status"]
          substitution_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          proof_document_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["substitution_payment_status"]
          substitution_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_payments_proof_document_id_fkey"
            columns: ["proof_document_id"]
            isOneToOne: false
            referencedRelation: "substitution_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_payments_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_requests: {
        Row: {
          absence_date: string
          absent_professor_id: string
          approved_at: string | null
          approved_by: string | null
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          class_group_id: string | null
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          course_id: string | null
          created_at: string
          doc_state: Database["public"]["Enums"]["substitution_doc_state"]
          hourly_rate: number
          id: string
          notes: string | null
          organization_id: string
          payment_state: Database["public"]["Enums"]["substitution_payment_state"]
          phase: number
          reason: string | null
          requested_by: string
          school_id: string
          status: Database["public"]["Enums"]["substitution_status"]
          subject_id: string | null
          substitute_professor_id: string | null
          ticket_id: string | null
          total_amount: number | null
          total_class_hours: number
          updated_at: string
        }
        Insert: {
          absence_date: string
          absent_professor_id: string
          approved_at?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          class_group_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          course_id?: string | null
          created_at?: string
          doc_state?: Database["public"]["Enums"]["substitution_doc_state"]
          hourly_rate?: number
          id?: string
          notes?: string | null
          organization_id: string
          payment_state?: Database["public"]["Enums"]["substitution_payment_state"]
          phase?: number
          reason?: string | null
          requested_by: string
          school_id: string
          status?: Database["public"]["Enums"]["substitution_status"]
          subject_id?: string | null
          substitute_professor_id?: string | null
          ticket_id?: string | null
          total_amount?: number | null
          total_class_hours?: number
          updated_at?: string
        }
        Update: {
          absence_date?: string
          absent_professor_id?: string
          approved_at?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          class_group_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          course_id?: string | null
          created_at?: string
          doc_state?: Database["public"]["Enums"]["substitution_doc_state"]
          hourly_rate?: number
          id?: string
          notes?: string | null
          organization_id?: string
          payment_state?: Database["public"]["Enums"]["substitution_payment_state"]
          phase?: number
          reason?: string | null
          requested_by?: string
          school_id?: string
          status?: Database["public"]["Enums"]["substitution_status"]
          subject_id?: string | null
          substitute_professor_id?: string | null
          ticket_id?: string | null
          total_amount?: number | null
          total_class_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      substitution_settings: {
        Row: {
          auto_create_ticket: boolean
          default_hourly_rate: number
          organization_id: string
          require_rh_approval: boolean
          require_signed_report: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_create_ticket?: boolean
          default_hourly_rate?: number
          organization_id: string
          require_rh_approval?: boolean
          require_signed_report?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_create_ticket?: boolean
          default_hourly_rate?: number
          organization_id?: string
          require_rh_approval?: boolean
          require_signed_report?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      substitution_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["substitution_status"] | null
          id: string
          note: string | null
          organization_id: string
          substitution_id: string
          to_status: Database["public"]["Enums"]["substitution_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["substitution_status"]
            | null
          id?: string
          note?: string | null
          organization_id: string
          substitution_id: string
          to_status: Database["public"]["Enums"]["substitution_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["substitution_status"]
            | null
          id?: string
          note?: string | null
          organization_id?: string
          substitution_id?: string
          to_status?: Database["public"]["Enums"]["substitution_status"]
        }
        Relationships: [
          {
            foreignKeyName: "substitution_status_history_substitution_id_fkey"
            columns: ["substitution_id"]
            isOneToOne: false
            referencedRelation: "substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_candidates: {
        Row: {
          city_id: string | null
          classification: string | null
          classifications: string[]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          formation_area: string | null
          free_periods: Database["public"]["Enums"]["talent_period"][]
          free_weekdays: Database["public"]["Enums"]["talent_weekday"][]
          full_name: string
          graduate_path: string | null
          has_licentiate: boolean
          id: string
          notes: string | null
          organization_id: string
          phone: string
          phone_is_whatsapp: boolean
          pix: string | null
          resume_path: string | null
          schooling_path: string | null
          state_id: string | null
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          classification?: string | null
          classifications?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          formation_area?: string | null
          free_periods?: Database["public"]["Enums"]["talent_period"][]
          free_weekdays?: Database["public"]["Enums"]["talent_weekday"][]
          full_name: string
          graduate_path?: string | null
          has_licentiate?: boolean
          id?: string
          notes?: string | null
          organization_id: string
          phone: string
          phone_is_whatsapp?: boolean
          pix?: string | null
          resume_path?: string | null
          schooling_path?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          classification?: string | null
          classifications?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          formation_area?: string | null
          free_periods?: Database["public"]["Enums"]["talent_period"][]
          free_weekdays?: Database["public"]["Enums"]["talent_weekday"][]
          full_name?: string
          graduate_path?: string | null
          has_licentiate?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          phone_is_whatsapp?: boolean
          pix?: string | null
          resume_path?: string | null
          schooling_path?: string | null
          state_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_candidates_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_candidates_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_adjustments: {
        Row: {
          created_at: string
          entry_id: string
          evidence_url: string | null
          id: string
          monthly_sheet_id: string
          organization_id: string
          previous_status: string | null
          reason: string
          request_type: string
          requested_by: string
          requested_by_role: string
          requested_status: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          evidence_url?: string | null
          id?: string
          monthly_sheet_id: string
          organization_id: string
          previous_status?: string | null
          reason: string
          request_type: string
          requested_by: string
          requested_by_role: string
          requested_status: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          evidence_url?: string | null
          id?: string
          monthly_sheet_id?: string
          organization_id?: string
          previous_status?: string | null
          reason?: string
          request_type?: string
          requested_by?: string
          requested_by_role?: string
          requested_status?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_adjustments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_adjustments_monthly_sheet_id_fkey"
            columns: ["monthly_sheet_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_monthly_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_adjustments_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_adjustments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          entry_id: string | null
          id: string
          monthly_sheet_id: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          monthly_sheet_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          monthly_sheet_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_audit_logs_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_audit_logs_monthly_sheet_id_fkey"
            columns: ["monthly_sheet_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_monthly_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_closure_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          monthly_sheet_id: string
          notes: string | null
          organization_id: string
          signature_status: string
          signature_type: string
          signed_at: string
          signed_by: string
          signed_by_role: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          monthly_sheet_id: string
          notes?: string | null
          organization_id: string
          signature_status?: string
          signature_type: string
          signed_at?: string
          signed_by: string
          signed_by_role: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          monthly_sheet_id?: string
          notes?: string | null
          organization_id?: string
          signature_status?: string
          signature_type?: string
          signed_at?: string
          signed_by?: string
          signed_by_role?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_closure_signatures_monthly_sheet_id_fkey"
            columns: ["monthly_sheet_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_monthly_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_closure_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_entries: {
        Row: {
          actual_call_started_at: string | null
          actual_call_submitted_at: string | null
          adjusted_at: string | null
          adjusted_by: string | null
          adjustment_reason: string | null
          annual_class_occurrence_id: string | null
          attendance_record_id: string | null
          class_group_id: string | null
          computed_status: string
          confirmed_workload_minutes: number
          course_id: string | null
          created_at: string
          divergence_reason: string | null
          early_minutes: number
          final_status: string
          id: string
          is_auto_computed: boolean
          is_manual_adjusted: boolean
          late_minutes: number
          manual_status: string | null
          metadata: Json
          monthly_sheet_id: string
          organization_id: string
          professor_id: string
          scheduled_date: string
          scheduled_end_at: string
          scheduled_start_at: string
          school_id: string
          slot_type: string
          subject_id: string | null
          updated_at: string
          weekly_teaching_model_id: string | null
          workload_minutes: number
        }
        Insert: {
          actual_call_started_at?: string | null
          actual_call_submitted_at?: string | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_reason?: string | null
          annual_class_occurrence_id?: string | null
          attendance_record_id?: string | null
          class_group_id?: string | null
          computed_status?: string
          confirmed_workload_minutes?: number
          course_id?: string | null
          created_at?: string
          divergence_reason?: string | null
          early_minutes?: number
          final_status?: string
          id?: string
          is_auto_computed?: boolean
          is_manual_adjusted?: boolean
          late_minutes?: number
          manual_status?: string | null
          metadata?: Json
          monthly_sheet_id: string
          organization_id: string
          professor_id: string
          scheduled_date: string
          scheduled_end_at: string
          scheduled_start_at: string
          school_id: string
          slot_type?: string
          subject_id?: string | null
          updated_at?: string
          weekly_teaching_model_id?: string | null
          workload_minutes?: number
        }
        Update: {
          actual_call_started_at?: string | null
          actual_call_submitted_at?: string | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_reason?: string | null
          annual_class_occurrence_id?: string | null
          attendance_record_id?: string | null
          class_group_id?: string | null
          computed_status?: string
          confirmed_workload_minutes?: number
          course_id?: string | null
          created_at?: string
          divergence_reason?: string | null
          early_minutes?: number
          final_status?: string
          id?: string
          is_auto_computed?: boolean
          is_manual_adjusted?: boolean
          late_minutes?: number
          manual_status?: string | null
          metadata?: Json
          monthly_sheet_id?: string
          organization_id?: string
          professor_id?: string
          scheduled_date?: string
          scheduled_end_at?: string
          scheduled_start_at?: string
          school_id?: string
          slot_type?: string
          subject_id?: string | null
          updated_at?: string
          weekly_teaching_model_id?: string | null
          workload_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_entries_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_annual_class_occurrence_id_fkey"
            columns: ["annual_class_occurrence_id"]
            isOneToOne: false
            referencedRelation: "annual_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_monthly_sheet_id_fkey"
            columns: ["monthly_sheet_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_monthly_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_entries_weekly_teaching_model_id_fkey"
            columns: ["weekly_teaching_model_id"]
            isOneToOne: false
            referencedRelation: "weekly_teaching_models"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_monthly_sheets: {
        Row: {
          absence_workload_minutes: number
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          confirmed_class_minutes: number
          confirmed_planning_minutes: number
          confirmed_workload_minutes: number
          created_at: string
          expected_class_minutes: number
          expected_planning_minutes: number
          expected_workload_minutes: number
          generated_at: string
          id: string
          last_recalculated_at: string | null
          late_minutes_total: number
          organization_id: string
          professor_acknowledged_at: string | null
          professor_acknowledged_by: string | null
          professor_id: string
          reference_month: number
          reference_year: number
          reopened_at: string | null
          reopened_by: string | null
          status: string
          submitted_for_review_at: string | null
          total_absent_entries: number
          total_class_entries: number
          total_divergent_entries: number
          total_expected_entries: number
          total_late_entries: number
          total_pending_entries: number
          total_planning_entries: number
          total_present_entries: number
          updated_at: string
        }
        Insert: {
          absence_workload_minutes?: number
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          confirmed_class_minutes?: number
          confirmed_planning_minutes?: number
          confirmed_workload_minutes?: number
          created_at?: string
          expected_class_minutes?: number
          expected_planning_minutes?: number
          expected_workload_minutes?: number
          generated_at?: string
          id?: string
          last_recalculated_at?: string | null
          late_minutes_total?: number
          organization_id: string
          professor_acknowledged_at?: string | null
          professor_acknowledged_by?: string | null
          professor_id: string
          reference_month: number
          reference_year: number
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          submitted_for_review_at?: string | null
          total_absent_entries?: number
          total_class_entries?: number
          total_divergent_entries?: number
          total_expected_entries?: number
          total_late_entries?: number
          total_pending_entries?: number
          total_planning_entries?: number
          total_present_entries?: number
          updated_at?: string
        }
        Update: {
          absence_workload_minutes?: number
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          confirmed_class_minutes?: number
          confirmed_planning_minutes?: number
          confirmed_workload_minutes?: number
          created_at?: string
          expected_class_minutes?: number
          expected_planning_minutes?: number
          expected_workload_minutes?: number
          generated_at?: string
          id?: string
          last_recalculated_at?: string | null
          late_minutes_total?: number
          organization_id?: string
          professor_acknowledged_at?: string | null
          professor_acknowledged_by?: string | null
          professor_id?: string
          reference_month?: number
          reference_year?: number
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          submitted_for_review_at?: string | null
          total_absent_entries?: number
          total_class_entries?: number
          total_divergent_entries?: number
          total_expected_entries?: number
          total_late_entries?: number
          total_pending_entries?: number
          total_planning_entries?: number
          total_present_entries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_monthly_sheets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_monthly_sheets_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance_settings: {
        Row: {
          allow_professor_request_adjustment: boolean
          allow_professor_view_own_sheet: boolean
          allowed_early_minutes: number
          allowed_late_minutes: number
          auto_compute_on_student_call: boolean
          auto_generate_enabled: boolean
          closure_day_limit: number
          created_at: string
          id: string
          max_call_after_class_minutes: number
          organization_id: string
          require_adjustment_reason: boolean
          require_professor_acknowledgement: boolean
          require_rh_final_closure: boolean
          updated_at: string
        }
        Insert: {
          allow_professor_request_adjustment?: boolean
          allow_professor_view_own_sheet?: boolean
          allowed_early_minutes?: number
          allowed_late_minutes?: number
          auto_compute_on_student_call?: boolean
          auto_generate_enabled?: boolean
          closure_day_limit?: number
          created_at?: string
          id?: string
          max_call_after_class_minutes?: number
          organization_id: string
          require_adjustment_reason?: boolean
          require_professor_acknowledgement?: boolean
          require_rh_final_closure?: boolean
          updated_at?: string
        }
        Update: {
          allow_professor_request_adjustment?: boolean
          allow_professor_view_own_sheet?: boolean
          allowed_early_minutes?: number
          allowed_late_minutes?: number
          auto_compute_on_student_call?: boolean
          auto_generate_enabled?: boolean
          closure_day_limit?: number
          created_at?: string
          id?: string
          max_call_after_class_minutes?: number
          organization_id?: string
          require_adjustment_reason?: boolean
          require_professor_acknowledgement?: boolean
          require_rh_final_closure?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_plannings: {
        Row: {
          bimester_number: number | null
          class_date: string | null
          class_group_id: string | null
          competencies: string
          contents: string
          coordinator_feedback: string | null
          coordinator_signed: boolean
          course_id: string | null
          created_at: string
          end_time: string | null
          evaluation: string
          finalization_justification: string | null
          finalized_at: string | null
          id: string
          methodology: string
          next_steps: string
          objective: string
          occurrence_id: string | null
          organization_id: string
          pre_planning_id: string | null
          product: string
          professor_id: string
          professor_signed: boolean
          rejection_reason: string | null
          resources: string
          school_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["teacher_planning_status"]
          subject_id: string | null
          updated_at: string
          week_end_date: string | null
          week_number: number | null
          week_start_date: string | null
        }
        Insert: {
          bimester_number?: number | null
          class_date?: string | null
          class_group_id?: string | null
          competencies: string
          contents: string
          coordinator_feedback?: string | null
          coordinator_signed?: boolean
          course_id?: string | null
          created_at?: string
          end_time?: string | null
          evaluation: string
          finalization_justification?: string | null
          finalized_at?: string | null
          id?: string
          methodology: string
          next_steps: string
          objective: string
          occurrence_id?: string | null
          organization_id: string
          pre_planning_id?: string | null
          product: string
          professor_id: string
          professor_signed?: boolean
          rejection_reason?: string | null
          resources: string
          school_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["teacher_planning_status"]
          subject_id?: string | null
          updated_at?: string
          week_end_date?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Update: {
          bimester_number?: number | null
          class_date?: string | null
          class_group_id?: string | null
          competencies?: string
          contents?: string
          coordinator_feedback?: string | null
          coordinator_signed?: boolean
          course_id?: string | null
          created_at?: string
          end_time?: string | null
          evaluation?: string
          finalization_justification?: string | null
          finalized_at?: string | null
          id?: string
          methodology?: string
          next_steps?: string
          objective?: string
          occurrence_id?: string | null
          organization_id?: string
          pre_planning_id?: string | null
          product?: string
          professor_id?: string
          professor_signed?: boolean
          rejection_reason?: string | null
          resources?: string
          school_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["teacher_planning_status"]
          subject_id?: string | null
          updated_at?: string
          week_end_date?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_plannings_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "annual_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_pre_planning_id_fkey"
            columns: ["pre_planning_id"]
            isOneToOne: false
            referencedRelation: "pre_plannings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_plannings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          reason: string | null
          substitution_request_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          reason?: string | null
          substitution_request_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          reason?: string | null
          substitution_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_audit_logs_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_candidates: {
        Row: {
          candidate_cpf: string | null
          candidate_email: string | null
          candidate_name: string
          candidate_phone: string | null
          candidate_rg: string | null
          confirmation_status: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          professor_id: string | null
          source: string
          substitution_request_id: string
          suggested_at: string
          suggested_by: string | null
          updated_at: string
        }
        Insert: {
          candidate_cpf?: string | null
          candidate_email?: string | null
          candidate_name: string
          candidate_phone?: string | null
          candidate_rg?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          professor_id?: string | null
          source?: string
          substitution_request_id: string
          suggested_at?: string
          suggested_by?: string | null
          updated_at?: string
        }
        Update: {
          candidate_cpf?: string | null
          candidate_email?: string | null
          candidate_name?: string
          candidate_phone?: string | null
          candidate_rg?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          professor_id?: string | null
          source?: string
          substitution_request_id?: string
          suggested_at?: string
          suggested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_candidates_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_candidates_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_candidates_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_candidates_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_documents: {
        Row: {
          created_at: string
          document_status: string
          document_type: string
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          generated_by: string | null
          id: string
          mime_type: string | null
          notes: string | null
          organization_id: string
          signed_at: string | null
          signed_by: string | null
          storage_path: string | null
          substitution_request_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_status?: string
          document_type: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          signed_at?: string | null
          signed_by?: string | null
          storage_path?: string | null
          substitution_request_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_status?: string
          document_type?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          signed_at?: string | null
          signed_by?: string | null
          storage_path?: string | null
          substitution_request_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_documents_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_documents_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_financial_access: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_financial_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_occurrences: {
        Row: {
          amount: number | null
          annual_class_occurrence_id: string | null
          attendance_record_id: string | null
          class_group_id: string | null
          class_hours: number
          course_id: string | null
          created_at: string
          evidence_notes: string | null
          evidence_type: string | null
          execution_status: string
          hour_class_value: number
          id: string
          organization_id: string
          scheduled_date: string
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          school_id: string | null
          subject_id: string | null
          substitute_professor_id: string | null
          substituted_professor_id: string | null
          substitution_request_id: string
          teacher_attendance_entry_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          annual_class_occurrence_id?: string | null
          attendance_record_id?: string | null
          class_group_id?: string | null
          class_hours?: number
          course_id?: string | null
          created_at?: string
          evidence_notes?: string | null
          evidence_type?: string | null
          execution_status?: string
          hour_class_value?: number
          id?: string
          organization_id: string
          scheduled_date: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          school_id?: string | null
          subject_id?: string | null
          substitute_professor_id?: string | null
          substituted_professor_id?: string | null
          substitution_request_id: string
          teacher_attendance_entry_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          annual_class_occurrence_id?: string | null
          attendance_record_id?: string | null
          class_group_id?: string | null
          class_hours?: number
          course_id?: string | null
          created_at?: string
          evidence_notes?: string | null
          evidence_type?: string | null
          execution_status?: string
          hour_class_value?: number
          id?: string
          organization_id?: string
          scheduled_date?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          school_id?: string | null
          subject_id?: string | null
          substitute_professor_id?: string | null
          substituted_professor_id?: string | null
          substitution_request_id?: string
          teacher_attendance_entry_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_occurrenc_teacher_attendance_entry_id_fkey"
            columns: ["teacher_attendance_entry_id"]
            isOneToOne: false
            referencedRelation: "teacher_attendance_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrence_annual_class_occurrence_id_fkey"
            columns: ["annual_class_occurrence_id"]
            isOneToOne: false
            referencedRelation: "annual_class_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_substitute_professor_id_fkey"
            columns: ["substitute_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_substituted_professor_id_fkey"
            columns: ["substituted_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_occurrences_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_payments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bank_data: Json
          created_at: string
          discount_amount: number
          financial_entry_id: string | null
          gross_amount: number
          hour_class_value: number
          id: string
          net_amount: number
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          payee_cpf: string | null
          payee_name: string
          payment_method: string | null
          payment_proof_document_id: string | null
          payment_reference: string | null
          payment_status: string
          scheduled_for: string | null
          substitute_professor_id: string | null
          substitution_request_id: string
          total_class_hours: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bank_data?: Json
          created_at?: string
          discount_amount?: number
          financial_entry_id?: string | null
          gross_amount?: number
          hour_class_value?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          payee_cpf?: string | null
          payee_name: string
          payment_method?: string | null
          payment_proof_document_id?: string | null
          payment_reference?: string | null
          payment_status?: string
          scheduled_for?: string | null
          substitute_professor_id?: string | null
          substitution_request_id: string
          total_class_hours?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bank_data?: Json
          created_at?: string
          discount_amount?: number
          financial_entry_id?: string | null
          gross_amount?: number
          hour_class_value?: number
          id?: string
          net_amount?: number
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payee_cpf?: string | null
          payee_name?: string
          payment_method?: string | null
          payment_proof_document_id?: string | null
          payment_reference?: string | null
          payment_status?: string
          scheduled_for?: string | null
          substitute_professor_id?: string | null
          substitution_request_id?: string
          total_class_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_payment_proof_document_id_fkey"
            columns: ["payment_proof_document_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_substitute_professor_id_fkey"
            columns: ["substitute_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_payments_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_requests: {
        Row: {
          absence_attachments: Json
          absence_date: string | null
          absence_dates: string[]
          absence_end_at: string | null
          absence_reason: string
          absence_start_at: string | null
          adjunct_director_name: string | null
          attended_at: string | null
          attended_by: string | null
          bank_data: Json
          batch_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          chat_channel_id: string | null
          class_group_id: string | null
          class_group_name_snapshot: string | null
          coordinator_name: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          director_name: string | null
          documentation_status: string
          finalized_at: string | null
          hour_class_value: number
          id: string
          internal_link: string | null
          municipality: string | null
          notes: string | null
          organization_id: string
          payment_method: string | null
          payment_status: string
          performed_by_name: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          requested_by: string
          requested_by_role: string | null
          return_attachment_url: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          school_id: string | null
          school_name_snapshot: string | null
          school_notification_channel: string | null
          school_notification_message: string | null
          school_notification_proof_url: string | null
          school_notification_recipient: string | null
          school_notified_at: string | null
          school_notified_by: string | null
          source_type: string
          state: string | null
          status: string
          subject_id: string | null
          subject_name_snapshot: string | null
          substitute_confirmed_at: string | null
          substitute_confirmed_by: string | null
          substitute_email: string | null
          substitute_pix: string | null
          substitute_professor_cpf: string | null
          substitute_professor_id: string | null
          substitute_professor_name: string | null
          substitute_professor_phone: string | null
          substitute_professor_rg: string | null
          substitute_talent_pool_candidate_id: string | null
          substituted_professor_cpf: string | null
          substituted_professor_id: string | null
          substituted_professor_name: string
          substituted_professor_registration: string | null
          substituted_professor_rg: string | null
          substitution_code: string
          ticket_id: string | null
          total_amount: number | null
          total_class_hours: number
          updated_at: string
          workflow_phase: string
        }
        Insert: {
          absence_attachments?: Json
          absence_date?: string | null
          absence_dates?: string[]
          absence_end_at?: string | null
          absence_reason: string
          absence_start_at?: string | null
          adjunct_director_name?: string | null
          attended_at?: string | null
          attended_by?: string | null
          bank_data?: Json
          batch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          chat_channel_id?: string | null
          class_group_id?: string | null
          class_group_name_snapshot?: string | null
          coordinator_name?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          director_name?: string | null
          documentation_status?: string
          finalized_at?: string | null
          hour_class_value?: number
          id?: string
          internal_link?: string | null
          municipality?: string | null
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          payment_status?: string
          performed_by_name?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          requested_by: string
          requested_by_role?: string | null
          return_attachment_url?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          school_id?: string | null
          school_name_snapshot?: string | null
          school_notification_channel?: string | null
          school_notification_message?: string | null
          school_notification_proof_url?: string | null
          school_notification_recipient?: string | null
          school_notified_at?: string | null
          school_notified_by?: string | null
          source_type?: string
          state?: string | null
          status?: string
          subject_id?: string | null
          subject_name_snapshot?: string | null
          substitute_confirmed_at?: string | null
          substitute_confirmed_by?: string | null
          substitute_email?: string | null
          substitute_pix?: string | null
          substitute_professor_cpf?: string | null
          substitute_professor_id?: string | null
          substitute_professor_name?: string | null
          substitute_professor_phone?: string | null
          substitute_professor_rg?: string | null
          substitute_talent_pool_candidate_id?: string | null
          substituted_professor_cpf?: string | null
          substituted_professor_id?: string | null
          substituted_professor_name: string
          substituted_professor_registration?: string | null
          substituted_professor_rg?: string | null
          substitution_code: string
          ticket_id?: string | null
          total_amount?: number | null
          total_class_hours?: number
          updated_at?: string
          workflow_phase?: string
        }
        Update: {
          absence_attachments?: Json
          absence_date?: string | null
          absence_dates?: string[]
          absence_end_at?: string | null
          absence_reason?: string
          absence_start_at?: string | null
          adjunct_director_name?: string | null
          attended_at?: string | null
          attended_by?: string | null
          bank_data?: Json
          batch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          chat_channel_id?: string | null
          class_group_id?: string | null
          class_group_name_snapshot?: string | null
          coordinator_name?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          director_name?: string | null
          documentation_status?: string
          finalized_at?: string | null
          hour_class_value?: number
          id?: string
          internal_link?: string | null
          municipality?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          payment_status?: string
          performed_by_name?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          requested_by?: string
          requested_by_role?: string | null
          return_attachment_url?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          school_id?: string | null
          school_name_snapshot?: string | null
          school_notification_channel?: string | null
          school_notification_message?: string | null
          school_notification_proof_url?: string | null
          school_notification_recipient?: string | null
          school_notified_at?: string | null
          school_notified_by?: string | null
          source_type?: string
          state?: string | null
          status?: string
          subject_id?: string | null
          subject_name_snapshot?: string | null
          substitute_confirmed_at?: string | null
          substitute_confirmed_by?: string | null
          substitute_email?: string | null
          substitute_pix?: string | null
          substitute_professor_cpf?: string | null
          substitute_professor_id?: string | null
          substitute_professor_name?: string | null
          substitute_professor_phone?: string | null
          substitute_professor_rg?: string | null
          substitute_talent_pool_candidate_id?: string | null
          substituted_professor_cpf?: string | null
          substituted_professor_id?: string | null
          substituted_professor_name?: string
          substituted_professor_registration?: string | null
          substituted_professor_rg?: string | null
          substitution_code?: string
          ticket_id?: string | null
          total_amount?: number | null
          total_class_hours?: number
          updated_at?: string
          workflow_phase?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_chat_channel_id_fkey"
            columns: ["chat_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_substitute_confirmed_by_fkey"
            columns: ["substitute_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_substitute_professor_id_fkey"
            columns: ["substitute_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_substitute_talent_pool_candi_fkey"
            columns: ["substitute_talent_pool_candidate_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_substituted_professor_id_fkey"
            columns: ["substituted_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_settings: {
        Row: {
          allow_external_substitute: boolean
          allow_professor_upload_report: boolean
          created_at: string
          default_financial_account_id: string | null
          default_financial_category_id: string | null
          default_financial_cost_center_id: string | null
          default_financial_payment_method_id: string | null
          default_hour_class_value: number
          enabled: boolean
          id: string
          organization_id: string
          payment_approval_required: boolean
          require_channel_notification: boolean
          require_receipt_for_payment: boolean
          require_signed_report_for_payment: boolean
          require_ticket_creation: boolean
          substitution_channel_name: string
          updated_at: string
          use_financial_module: boolean
        }
        Insert: {
          allow_external_substitute?: boolean
          allow_professor_upload_report?: boolean
          created_at?: string
          default_financial_account_id?: string | null
          default_financial_category_id?: string | null
          default_financial_cost_center_id?: string | null
          default_financial_payment_method_id?: string | null
          default_hour_class_value?: number
          enabled?: boolean
          id?: string
          organization_id: string
          payment_approval_required?: boolean
          require_channel_notification?: boolean
          require_receipt_for_payment?: boolean
          require_signed_report_for_payment?: boolean
          require_ticket_creation?: boolean
          substitution_channel_name?: string
          updated_at?: string
          use_financial_module?: boolean
        }
        Update: {
          allow_external_substitute?: boolean
          allow_professor_upload_report?: boolean
          created_at?: string
          default_financial_account_id?: string | null
          default_financial_category_id?: string | null
          default_financial_cost_center_id?: string | null
          default_financial_payment_method_id?: string | null
          default_hour_class_value?: number
          enabled?: boolean
          id?: string
          organization_id?: string
          payment_approval_required?: boolean
          require_channel_notification?: boolean
          require_receipt_for_payment?: boolean
          require_signed_report_for_payment?: boolean
          require_ticket_creation?: boolean
          substitution_channel_name?: string
          updated_at?: string
          use_financial_module?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_settings_default_financial_account_id_fkey"
            columns: ["default_financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_settings_default_financial_category_i_fkey"
            columns: ["default_financial_category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_settings_default_financial_cost_cente_fkey"
            columns: ["default_financial_cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_settings_default_financial_payment_me_fkey"
            columns: ["default_financial_payment_method_id"]
            isOneToOne: false
            referencedRelation: "financial_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_substitution_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          id: string
          metadata: Json
          new_payment_status: string | null
          new_status: string
          old_payment_status: string | null
          old_status: string | null
          organization_id: string
          reason: string | null
          substitution_request_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_payment_status?: string | null
          new_status: string
          old_payment_status?: string | null
          old_status?: string | null
          organization_id: string
          reason?: string | null
          substitution_request_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_payment_status?: string | null
          new_status?: string
          old_payment_status?: string | null
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          substitution_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_substitution_status_histor_substitution_request_id_fkey"
            columns: ["substitution_request_id"]
            isOneToOne: false
            referencedRelation: "teacher_substitution_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_substitution_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignees: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          priority_default: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          priority_default?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          priority_default?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_checklist_items: {
        Row: {
          assignee_id: string | null
          checklist_id: string
          content: string
          created_at: string
          created_by: string | null
          done_at: string | null
          done_by: string | null
          due_date: string | null
          id: string
          is_done: boolean
          position: number
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          checklist_id: string
          content: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          position?: number
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          checklist_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "ticket_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          position: number
          ticket_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          ticket_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          ticket_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_checklists_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_label_assignments: {
        Row: {
          created_at: string
          label_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          label_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          label_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "ticket_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_label_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          author_id: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_internal_note: boolean
          message: string
          parent_message_id: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_internal_note?: boolean
          message: string
          parent_message_id?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_internal_note?: boolean
          message?: string
          parent_message_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_watchers: {
        Row: {
          created_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          archived_at: string | null
          category_id: string | null
          closed_at: string | null
          cover_color: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          external_author_name: string | null
          external_token: string | null
          id: string
          kanban_list_id: string | null
          kanban_position: number
          nexa_responsible_id: string | null
          opened_by_id: string | null
          organization_id: string
          priority: string
          school_id: string | null
          school_responsible_id: string | null
          status: string
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          closed_at?: string | null
          cover_color?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_author_name?: string | null
          external_token?: string | null
          id?: string
          kanban_list_id?: string | null
          kanban_position?: number
          nexa_responsible_id?: string | null
          opened_by_id?: string | null
          organization_id: string
          priority?: string
          school_id?: string | null
          school_responsible_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          closed_at?: string | null
          cover_color?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_author_name?: string | null
          external_token?: string | null
          id?: string
          kanban_list_id?: string | null
          kanban_position?: number
          nexa_responsible_id?: string | null
          opened_by_id?: string | null
          organization_id?: string
          priority?: string
          school_id?: string | null
          school_responsible_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_kanban_list_id_fkey"
            columns: ["kanban_list_id"]
            isOneToOne: false
            referencedRelation: "kanban_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_summary: {
        Row: {
          access_today: boolean | null
          created_at: string
          first_access_at: string | null
          id: string
          last_30_days_count: number | null
          last_7_days_count: number | null
          last_access_at: string | null
          organization_id: string
          total_access_count: number | null
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          access_today?: boolean | null
          created_at?: string
          first_access_at?: string | null
          id?: string
          last_30_days_count?: number | null
          last_7_days_count?: number | null
          last_access_at?: string | null
          organization_id: string
          total_access_count?: number | null
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          access_today?: boolean | null
          created_at?: string
          first_access_at?: string | null
          id?: string
          last_30_days_count?: number | null
          last_7_days_count?: number | null
          last_access_at?: string | null
          organization_id?: string
          total_access_count?: number | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          email_enabled: boolean
          id: string
          onesignal_subscription_id: string | null
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          onesignal_subscription_id?: string | null
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          id?: string
          onesignal_subscription_id?: string | null
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_route_ai_recommendations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          organization_id: string
          payload: Json | null
          route_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          organization_id: string
          payload?: Json | null
          route_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          organization_id?: string
          payload?: Json | null
          route_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_route_ai_recommendations_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "visit_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_route_cities: {
        Row: {
          city: string
          cluster_label: string | null
          created_at: string
          id: string
          organization_id: string
          route_id: string
          school_count: number
          uf: string | null
        }
        Insert: {
          city: string
          cluster_label?: string | null
          created_at?: string
          id?: string
          organization_id: string
          route_id: string
          school_count?: number
          uf?: string | null
        }
        Update: {
          city?: string
          cluster_label?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          route_id?: string
          school_count?: number
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_route_cities_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "visit_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_route_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          route_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          route_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_route_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "visit_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_route_schools: {
        Row: {
          check_in_accuracy_m: number | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out_accuracy_m: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          city: string | null
          created_at: string
          day_order: number | null
          distance_from_previous_km: number
          executed_by: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          occurrence_description: string | null
          occurrence_type: string | null
          organization_id: string
          planned_arrival: string | null
          planned_date: string | null
          planned_departure: string | null
          route_id: string
          route_order: number
          school_id: string
          status: string
          travel_from_previous_minutes: number
          uf: string | null
          updated_at: string
          visit_minutes: number | null
        }
        Insert: {
          check_in_accuracy_m?: number | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out_accuracy_m?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          city?: string | null
          created_at?: string
          day_order?: number | null
          distance_from_previous_km?: number
          executed_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          occurrence_description?: string | null
          occurrence_type?: string | null
          organization_id: string
          planned_arrival?: string | null
          planned_date?: string | null
          planned_departure?: string | null
          route_id: string
          route_order?: number
          school_id: string
          status?: string
          travel_from_previous_minutes?: number
          uf?: string | null
          updated_at?: string
          visit_minutes?: number | null
        }
        Update: {
          check_in_accuracy_m?: number | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out_accuracy_m?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          city?: string | null
          created_at?: string
          day_order?: number | null
          distance_from_previous_km?: number
          executed_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          occurrence_description?: string | null
          occurrence_type?: string | null
          organization_id?: string
          planned_arrival?: string | null
          planned_date?: string | null
          planned_departure?: string | null
          route_id?: string
          route_order?: number
          school_id?: string
          status?: string
          travel_from_previous_minutes?: number
          uf?: string | null
          updated_at?: string
          visit_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_route_schools_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "visit_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_routes: {
        Row: {
          break_end: string | null
          break_start: string | null
          code: string | null
          created_at: string
          created_by: string
          default_visit_minutes: number
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          departure_point: string | null
          efficiency_score: string | null
          end_date: string
          fuel_cost_per_km: number
          fuel_price_per_liter: number
          id: string
          kml_per_liter: number
          legacy_visit_id: string | null
          name: string
          notes: string | null
          optimization_payload: Json | null
          organization_id: string
          shift_end: string
          shift_start: string
          start_date: string
          status: Database["public"]["Enums"]["visit_route_status"]
          supervisor_id: string
          toll_estimated: number
          total_estimated_cost: number
          total_km: number
          total_travel_minutes: number
          total_visit_minutes: number
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          code?: string | null
          created_at?: string
          created_by: string
          default_visit_minutes?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          departure_point?: string | null
          efficiency_score?: string | null
          end_date: string
          fuel_cost_per_km?: number
          fuel_price_per_liter?: number
          id?: string
          kml_per_liter?: number
          legacy_visit_id?: string | null
          name: string
          notes?: string | null
          optimization_payload?: Json | null
          organization_id: string
          shift_end?: string
          shift_start?: string
          start_date: string
          status?: Database["public"]["Enums"]["visit_route_status"]
          supervisor_id: string
          toll_estimated?: number
          total_estimated_cost?: number
          total_km?: number
          total_travel_minutes?: number
          total_visit_minutes?: number
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          code?: string | null
          created_at?: string
          created_by?: string
          default_visit_minutes?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          departure_point?: string | null
          efficiency_score?: string | null
          end_date?: string
          fuel_cost_per_km?: number
          fuel_price_per_liter?: number
          id?: string
          kml_per_liter?: number
          legacy_visit_id?: string | null
          name?: string
          notes?: string | null
          optimization_payload?: Json | null
          organization_id?: string
          shift_end?: string
          shift_start?: string
          start_date?: string
          status?: Database["public"]["Enums"]["visit_route_status"]
          supervisor_id?: string
          toll_estimated?: number
          total_estimated_cost?: number
          total_km?: number
          total_travel_minutes?: number
          total_visit_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          duration_ms: number | null
          error: string | null
          event_id: string
          id: string
          next_retry_at: string | null
          request_body: Json | null
          response_body: string | null
          response_status: number | null
          status: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event_id: string
          id?: string
          next_retry_at?: string | null
          request_body?: Json | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          error?: string | null
          event_id?: string
          id?: string
          next_retry_at?: string | null
          request_body?: Json | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
          processed_at: string | null
          source_id: string | null
          source_table: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          processed_at?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_types: string[]
          failure_count: number
          headers: Json
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret: string
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_types?: string[]
          failure_count?: number
          headers?: Json
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret: string
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_types?: string[]
          failure_count?: number
          headers?: Json
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_teaching_models: {
        Row: {
          class_group_id: string | null
          class_mode: string
          course_id: string
          created_at: string
          end_time: string
          id: string
          observation: string | null
          organization_id: string
          professor_id: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          school_id: string
          school_time_slot_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["calendar_status"]
          subject_id: string | null
          updated_at: string
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Insert: {
          class_group_id?: string | null
          class_mode?: string
          course_id: string
          created_at?: string
          end_time: string
          id?: string
          observation?: string | null
          organization_id: string
          professor_id?: string | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          school_id: string
          school_time_slot_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["calendar_status"]
          subject_id?: string | null
          updated_at?: string
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Update: {
          class_group_id?: string | null
          class_mode?: string
          course_id?: string
          created_at?: string
          end_time?: string
          id?: string
          observation?: string | null
          organization_id?: string
          professor_id?: string | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          school_id?: string
          school_time_slot_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["calendar_status"]
          subject_id?: string | null
          updated_at?: string
          weekday?: Database["public"]["Enums"]["weekday"]
        }
        Relationships: [
          {
            foreignKeyName: "weekly_teaching_models_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_school_time_slot_id_fkey"
            columns: ["school_time_slot_id"]
            isOneToOne: false
            referencedRelation: "school_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_teaching_models_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _digits_only: { Args: { p: string }; Returns: string }
      _emit_teacher_attendance_notifications: {
        Args: {
          p_audience: string[]
          p_message: string
          p_sheet_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      _fin_caller_org: { Args: never; Returns: string }
      _fin_is_admin: { Args: never; Returns: boolean }
      _recalc_installment_and_entry: {
        Args: { p_installment: string }
        Returns: undefined
      }
      _resolve_class_group_id_for_indication: {
        Args: {
          p_ano_letivo: string
          p_class_nome: string
          p_course: string
          p_org: string
          p_school: string
          p_turno: string
        }
        Returns: string
      }
      _tap_assert_sheet_open: {
        Args: { p_sheet_id: string }
        Returns: {
          absence_workload_minutes: number
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          confirmed_class_minutes: number
          confirmed_planning_minutes: number
          confirmed_workload_minutes: number
          created_at: string
          expected_class_minutes: number
          expected_planning_minutes: number
          expected_workload_minutes: number
          generated_at: string
          id: string
          last_recalculated_at: string | null
          late_minutes_total: number
          organization_id: string
          professor_acknowledged_at: string | null
          professor_acknowledged_by: string | null
          professor_id: string
          reference_month: number
          reference_year: number
          reopened_at: string | null
          reopened_by: string | null
          status: string
          submitted_for_review_at: string | null
          total_absent_entries: number
          total_class_entries: number
          total_divergent_entries: number
          total_expected_entries: number
          total_late_entries: number
          total_pending_entries: number
          total_planning_entries: number
          total_present_entries: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "teacher_attendance_monthly_sheets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _tsr_assert_manager: {
        Args: { _org: string; _user: string }
        Returns: undefined
      }
      _tsr_create_document: {
        Args: {
          _file_name: string
          _file_url: string
          _mime: string
          _notes: string
          _request_id: string
          _size: number
          _status: string
          _storage_path: string
          _type: string
        }
        Returns: string
      }
      _tsr_is_substitute_professor: {
        Args: { _request_id: string; _user: string }
        Returns: boolean
      }
      _tsr_log_status: {
        Args: {
          p_actor: string
          p_from: string
          p_id: string
          p_notes?: string
          p_to: string
        }
        Returns: undefined
      }
      _tsr_profile_id: { Args: { _user: string }; Returns: string }
      _tsr_user_role: { Args: { _user: string }; Returns: string }
      acknowledge_teacher_attendance_monthly_sheet: {
        Args: { p_monthly_sheet_id: string }
        Returns: Json
      }
      admin_cleanup_garbage: { Args: never; Returns: Json }
      apply_financial_role_template: {
        Args: { _template_id: string; _user_id: string }
        Returns: number
      }
      approve_financial_entry: {
        Args: { _entry_id: string; _notes?: string }
        Returns: undefined
      }
      approve_teacher_attendance_sheet_coordination: {
        Args: { p_monthly_sheet_id: string; p_notes?: string }
        Returns: Json
      }
      approve_teacher_attendance_sheet_rh: {
        Args: { p_monthly_sheet_id: string; p_notes?: string }
        Returns: Json
      }
      approve_teacher_substitution_for_payment: {
        Args: { p_notes?: string; p_substitution_request_id: string }
        Returns: undefined
      }
      assign_indication_to_vaga: {
        Args: {
          p_indication_id: string
          p_professor_id: string
          p_weekly_teaching_model_id: string
        }
        Returns: Json
      }
      auto_reconcile_bank_transactions: {
        Args: { _account_id: string; _date_from?: string; _date_to?: string }
        Returns: Json
      }
      bulk_soft_delete_pre_plannings: {
        Args: { p_ids: string[] }
        Returns: {
          deleted_count: number
          skipped_count: number
        }[]
      }
      calc_financial_charges: {
        Args: {
          _due_date: string
          _principal: number
          _reference_date?: string
          _rule_id: string
        }
        Returns: Json
      }
      calculate_bimester_classes: {
        Args: { p_bimester_number: number; p_subject_id: string }
        Returns: {
          bimester_end: string
          bimester_start: string
          letivo_days: number
          total_classes: number
          total_hours: number
        }[]
      }
      calculate_receivable_charges: {
        Args: { p_installment_id: string; p_payment_date?: string }
        Returns: {
          base_amount: number
          days_overdue: number
          discount: number
          interest: number
          late_fee: number
          total_due: number
        }[]
      }
      calculate_subject_total_classes: {
        Args: { p_subject_id: string }
        Returns: number
      }
      can_access_teacher_substitution_financial: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      can_edit_pre_planning: {
        Args: { p_pre_planning_id: string }
        Returns: {
          can_edit: boolean
          reason: string
        }[]
      }
      can_manage_financial_registers: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_post_in_channel: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_approve_amount: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      can_view_financial_budget: { Args: { _uid: string }; Returns: boolean }
      can_view_financial_registers: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_financial_entry: {
        Args: { _entry_id: string; _reason: string }
        Returns: undefined
      }
      cancel_financial_transfer: {
        Args: { _reason: string; _transfer_id: string }
        Returns: undefined
      }
      cancel_hiring_candidate: {
        Args: { _candidate_id: string; _reason: string }
        Returns: undefined
      }
      cancel_teacher_substitution_request: {
        Args: {
          p_force?: boolean
          p_reason: string
          p_substitution_request_id: string
        }
        Returns: undefined
      }
      capture_bi_snapshot: {
        Args: { p_bimester?: number; p_org_id: string }
        Returns: undefined
      }
      check_budget_overrun: {
        Args: {
          _amount: number
          _category_id: string
          _competence_date: string
          _cost_center_id: string
          _org: string
        }
        Returns: Json
      }
      check_city_route_conflict: {
        Args: {
          p_city: string
          p_end: string
          p_ignore_route?: string
          p_org: string
          p_start: string
        }
        Returns: {
          end_date: string
          route_id: string
          route_name: string
          start_date: string
          status: Database["public"]["Enums"]["visit_route_status"]
        }[]
      }
      check_course_school_dependencies: {
        Args: { _course_id: string; _school_id: string }
        Returns: {
          professors: number
          students: number
        }[]
      }
      check_link_grade_completeness: {
        Args: { p_link_id: string }
        Returns: Json
      }
      check_professor_binding_dependencies: {
        Args: { _binding_ids: string[] }
        Returns: {
          binding_id: string
          course_id: string
          plannings: number
          professor_id: string
          school_id: string
          weekly_slots: number
        }[]
      }
      check_teacher_external_conflicts: {
        Args: { p_candidates: Json; p_keyword: string; p_token: string }
        Returns: Json
      }
      classify_ucp: { Args: { p_name: string }; Returns: string }
      cleanup_old_cron_history: { Args: never; Returns: undefined }
      cleanup_old_external_access_logs: { Args: never; Returns: undefined }
      cleanup_old_net_responses: { Args: never; Returns: undefined }
      close_financial_period: {
        Args: {
          _cost_center_id?: string
          _month: number
          _notes?: string
          _org: string
          _school_id?: string
          _scope?: Database["public"]["Enums"]["financial_closure_scope"]
          _year: number
        }
        Returns: string
      }
      close_teacher_attendance_monthly_sheet: {
        Args: { p_closure_notes?: string; p_monthly_sheet_id: string }
        Returns: Json
      }
      compute_hiring_status: {
        Args: { _candidate_id: string }
        Returns: Database["public"]["Enums"]["hr_hiring_status"]
      }
      compute_teacher_attendance_from_student_call: {
        Args: { p_attendance_record_id: string }
        Returns: Json
      }
      confirm_teacher_substitute: {
        Args: { p_candidate_id: string; p_substitution_request_id: string }
        Returns: string
      }
      confirm_teacher_substitution_execution: {
        Args: { p_substitution_request_id: string }
        Returns: undefined
      }
      create_financial_payment_batch: {
        Args: {
          p_account_id?: string
          p_installment_ids: string[]
          p_method_type: string
          p_name: string
          p_notes?: string
          p_scheduled_for?: string
        }
        Returns: string
      }
      create_financial_transfer: {
        Args: {
          _amount: number
          _description?: string
          _destination_account_id: string
          _reference?: string
          _source_account_id: string
          _transfer_date: string
        }
        Returns: string
      }
      create_payable_for_substitution_payment: {
        Args: { p_payment_id: string }
        Returns: string
      }
      create_teacher_substitution_request: {
        Args: {
          p_absence_date: string
          p_absence_reason: string
          p_class_group_id: string
          p_context?: Json
          p_course_id: string
          p_hour_class_value: number
          p_organization_id: string
          p_school_id: string
          p_subject_id: string
          p_substituted_professor_data: Json
          p_substituted_professor_id: string
          p_total_class_hours: number
        }
        Returns: string
      }
      create_teacher_substitution_ticket: {
        Args: { p_substitution_request_id: string }
        Returns: string
      }
      delete_school_cascade:
        | { Args: { p_reason: string; p_school_id: string }; Returns: Json }
        | {
            Args: { p_force?: boolean; p_reason: string; p_school_id: string }
            Returns: Json
          }
      delete_school_indication_link: {
        Args: { p_link_id: string; p_motivo?: string }
        Returns: Json
      }
      enqueue_webhook_event: {
        Args: {
          p_event_type: string
          p_organization_id: string
          p_payload: Json
          p_source_id?: string
          p_source_table?: string
        }
        Returns: string
      }
      escalate_ticket_sla: { Args: never; Returns: number }
      find_schedule_duplicates: {
        Args: { _school_id?: string }
        Returns: {
          class_group_id: string
          end_time: string
          ids: string[]
          kind: string
          professor_id: string
          school_id: string
          start_time: string
          total: number
          weekday: string
        }[]
      }
      generate_annual_occurrences: {
        Args: { p_end_date: string; p_model_id: string; p_start_date: string }
        Returns: number
      }
      generate_entry_installments: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      generate_school_indication_links: {
        Args: { p_expires_at?: string; p_school_ids: string[] }
        Returns: {
          out_created: boolean
          out_keyword: string
          out_link_id: string
          out_school_id: string
          out_token: string
        }[]
      }
      generate_teacher_attendance_monthly_sheet: {
        Args: {
          p_organization_id: string
          p_professor_id: string
          p_reference_month: number
          p_reference_year: number
        }
        Returns: string
      }
      generate_teacher_attendance_monthly_sheets_batch: {
        Args: {
          p_organization_id: string
          p_professor_ids?: string[]
          p_reference_month: number
          p_reference_year: number
          p_school_id?: string
        }
        Returns: Json
      }
      generate_teacher_attendance_sheet: {
        Args: {
          p_month: number
          p_org_id: string
          p_professor_id: string
          p_year: number
        }
        Returns: string
      }
      generate_teacher_substitution_declaration: {
        Args: {
          p_file_name?: string
          p_file_url?: string
          p_storage_path?: string
          p_substitution_request_id: string
        }
        Returns: string
      }
      generate_teacher_substitution_receipt: {
        Args: {
          p_file_name?: string
          p_file_url?: string
          p_storage_path?: string
          p_substitution_request_id: string
        }
        Returns: string
      }
      get_account_balances: {
        Args: { _horizon_days?: number }
        Returns: {
          account_id: string
          account_name: string
          current_balance: number
          pending_in: number
          pending_out: number
          projected_balance: number
          reconciled_balance: number
        }[]
      }
      get_audit_dashboard_kpis: {
        Args: { p_org_id: string }
        Returns: {
          active_30_days: number
          active_7_days: number
          active_today: number
          inactive_users: number
          never_accessed: number
          total_users: number
        }[]
      }
      get_bi_action_recommendations: {
        Args: {
          p_bimester_number?: number
          p_limit?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          action_text: string
          deadline_days: number
          impact_score: number
          impact_text: string
          reason_text: string
          rec_category: string
          rec_priority: string
          target_id: string
          target_name: string
          target_type: string
        }[]
      }
      get_bi_attendance_metrics: {
        Args: { p_org_id: string; p_school_id?: string }
        Returns: {
          attendance_rate: number
          total_expected_classes: number
          total_with_attendance: number
          total_without_attendance: number
        }[]
      }
      get_bi_grades_learning: {
        Args: {
          p_bimester_number?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          bimester: number
          city_name: string
          class_group_name: string
          grade_avg: number
          missing_grades_count: number
          school_name: string
          students_above_avg_pct: number
          students_at_risk_pct: number
          subject_name: string
          teacher_id: string
          teacher_name: string
          total_students: number
        }[]
      }
      get_bi_planning_metrics: {
        Args: {
          p_bimester_number?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          late_count: number
          on_time_count: number
          total_approved: number
          total_completed: number
          total_draft: number
          total_expected: number
          total_returned: number
          total_signed: number
          total_submitted: number
        }[]
      }
      get_bi_rankings: {
        Args: {
          p_bimester_number?: number
          p_dimension?: string
          p_limit?: number
          p_org_id: string
          p_view_mode?: string
        }
        Returns: {
          entity_detail: string
          entity_id: string
          entity_name: string
          rank_position: number
          score: number
          secondary_score: number
        }[]
      }
      get_bi_summary_kpis: {
        Args: {
          p_bimester_number?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          avg_compliance_score: number
          avg_risk_score: number
          teachers_attention: number
          teachers_critical: number
          teachers_full_compliance: number
          teachers_with_attendance_pending: number
          teachers_with_grades_pending: number
          teachers_with_open_orientations: number
          teachers_with_planning_delay: number
          total_active_teachers: number
          total_pending: number
        }[]
      }
      get_bi_temporal_trends: {
        Args: { p_months_back?: number; p_org_id: string }
        Returns: {
          avg_attendance: number
          avg_compliance: number
          avg_grades: number
          avg_planning: number
          avg_risk: number
          compliance_change: number
          risk_change: number
          snapshot_month: string
          teachers_critical: number
          total_teachers: number
        }[]
      }
      get_budget_consumption: {
        Args: { _budget_id: string }
        Returns: {
          available: number
          category_id: string
          category_name: string
          committed: number
          consumption_percent: number
          cost_center_id: string
          cost_center_name: string
          line_id: string
          month: number
          planned: number
          project_id: string
          realized: number
          school_id: string
        }[]
      }
      get_chat_channel_org: { Args: { _channel_id: string }; Returns: string }
      get_city_bi_summary: {
        Args: { p_bimester_number?: number; p_org_id: string }
        Returns: {
          city_name: string
          compliance_avg: number
          critical_teachers: number
          learning_avg: number
          risk_avg: number
          total_pending: number
          total_schools: number
          total_teachers: number
        }[]
      }
      get_class_modality_config: {
        Args: { p_class_group_id: string }
        Returns: {
          carga_horaria_semanal: number
          ch_anp: number
          ch_presencial: number
          modality_id: string
          semester: Database["public"]["Enums"]["subject_semester"]
          subject_codigo: string
          subject_id: string
          subject_nome: string
          subject_semester: Database["public"]["Enums"]["subject_semester"]
        }[]
      }
      get_course_subject_boletim_options: {
        Args: { p_link_id: string }
        Returns: {
          annual_subject_id: string
          boletim_key: string
          boletim_nome: string
          carga_horaria_semanal: number
          course_id: string
          course_nome: string
          first_subject_id: string
          has_annual: boolean
          has_first: boolean
          has_second: boolean
          second_subject_id: string
        }[]
      }
      get_course_subjects_grouped: {
        Args: { p_course_id: string }
        Returns: {
          carga_horaria_semanal: number
          display_name: string
          first_subject_id: string
          group_key: string
          second_subject_id: string
          semester_type: string
        }[]
      }
      get_current_bimester: {
        Args: { p_date?: string; p_org_id: string }
        Returns: number
      }
      get_current_semester: {
        Args: { p_date?: string; p_org_id: string }
        Returns: Database["public"]["Enums"]["subject_semester"]
      }
      get_eligible_occurrences_for_pre_planning: {
        Args: {
          p_class_group_id: string
          p_course_id: string
          p_end_date?: string
          p_org_id: string
          p_school_id: string
          p_start_date?: string
        }
        Returns: {
          already_has_pre_planning: boolean
          end_time: string
          occurrence_date: string
          occurrence_id: string
          professor_id: string
          professor_name: string
          start_time: string
          subject_id: string
          subject_name: string
          weekday: string
        }[]
      }
      get_eligible_professors_subjects_for_pre_planning: {
        Args: {
          p_bimester_number: number
          p_class_group_id: string
          p_course_id: string
          p_org_id: string
          p_school_id: string
        }
        Returns: {
          already_exists: boolean
          professor_id: string
          professor_name: string
          semester: string
          subject_code: string
          subject_id: string
          subject_name: string
          weekly_hours: number
        }[]
      }
      get_eligible_subjects_for_pre_planning: {
        Args: {
          p_bimester_number: number
          p_class_group_id: string
          p_course_id: string
          p_org_id: string
          p_school_id: string
        }
        Returns: {
          already_exists: boolean
          professors_count: number
          semester: string
          subject_code: string
          subject_id: string
          subject_name: string
          weekly_hours: number
        }[]
      }
      get_financial_dashboard: {
        Args: {
          _cost_center_id?: string
          _end?: string
          _org: string
          _project_id?: string
          _school_id?: string
          _start?: string
        }
        Returns: Json
      }
      get_financial_project_summary: {
        Args: { _organization_id: string }
        Returns: {
          balance: number
          budget: number
          committed: number
          project_id: string
          realized: number
        }[]
      }
      get_financial_setup_status: {
        Args: { _organization_id?: string }
        Returns: Json
      }
      get_hiring_candidate_doc_counts: {
        Args: { _organization_id: string }
        Returns: {
          candidate_id: string
          originals: number
          signed: number
        }[]
      }
      get_indication_link_info: { Args: { p_token: string }; Returns: Json }
      get_indication_school_context: {
        Args: { p_token: string }
        Returns: Json
      }
      get_my_financial_permissions: {
        Args: never
        Returns: {
          action: string
          category: string
          max_amount: number
          name: string
          permission_key: string
          source_template: string
        }[]
      }
      get_my_professor_id: { Args: never; Returns: string }
      get_my_teacher_substitution_financial_access: {
        Args: never
        Returns: {
          can_access: boolean
          reason: string
        }[]
      }
      get_professor_courses: {
        Args: { _professor_id: string; _school_id: string }
        Returns: string[]
      }
      get_professor_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_professor_rankings: {
        Args: {
          p_bimester_number?: number
          p_city?: string
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          attendance_score: number
          attendance_total: number
          avatar_url: string
          city: string
          grades_closed: number
          grades_score: number
          grades_total: number
          orientations_score: number
          orientations_signed: number
          orientations_total: number
          planning_approved: number
          planning_returned: number
          planning_score: number
          planning_signed: number
          planning_total: number
          professor_id: string
          professor_name: string
          regularity_score: number
          school_id: string
          school_name: string
          total_score: number
        }[]
      }
      get_professor_schools: {
        Args: { _professor_id: string }
        Returns: string[]
      }
      get_professor_weekly_schedule_for_subject: {
        Args: {
          p_class_group_id: string
          p_course_id: string
          p_org_id: string
          p_professor_id: string
          p_school_id: string
          p_subject_id: string
        }
        Returns: {
          end_time: string
          start_time: string
          weekday: string
        }[]
      }
      get_professors_with_authorized_doc_access: {
        Args: { _organization_id: string }
        Returns: {
          professor_id: string
        }[]
      }
      get_school_bi_summary: {
        Args: { p_bimester_number?: number; p_org_id: string }
        Returns: {
          city_name: string
          compliance_avg: number
          learning_avg: number
          open_orientations: number
          pending_attendance: number
          pending_grades: number
          pending_plannings: number
          risk_avg: number
          school_id: string
          school_name: string
          total_teachers: number
        }[]
      }
      get_school_indication_link_info: {
        Args: { p_keyword: string; p_token: string }
        Returns: Json
      }
      get_school_indication_teachers: {
        Args: { p_course_id: string; p_keyword: string; p_token: string }
        Returns: {
          cursos_vinculados: string[]
          email: string
          formacao: string
          id: string
          nome_completo: string
          telefone: string
          vinculado_ao_curso: boolean
        }[]
      }
      get_semester_for_month: {
        Args: { p_month: number; p_org_id: string; p_year: number }
        Returns: string
      }
      get_student_duplicates: {
        Args: { p_org_id: string }
        Returns: {
          codigo_matricula: string
          cpf: string
          created_at: string
          group_count: number
          nome_completo: string
          schools: Json
          status: string
          student_id: string
          tipo: string
          valor_normalizado: string
        }[]
      }
      get_student_import_conflicts: {
        Args: { p_org_id: string }
        Returns: {
          attempted_at: string
          attempted_matricula: string
          attempted_name: string
          batch_id: string
          error_message: string
          existing_cpf: string
          existing_matricula: string
          existing_name: string
          existing_schools: Json
          existing_status: string
          existing_student_id: string
          row_number: number
        }[]
      }
      get_student_risk_predictions: {
        Args: {
          p_absence_threshold?: number
          p_bimester_number?: number
          p_min_weak_subjects?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          absence_rate: number
          class_group_id: string
          class_group_name: string
          course_name: string
          risk_factors: string[]
          risk_level: string
          school_id: string
          school_name: string
          student_id: string
          student_name: string
          subjects_below_average: number
          total_absences: number
          total_classes: number
          weak_subject_names: string[]
        }[]
      }
      get_teacher_attendance_bi_report: {
        Args: {
          p_course_id?: string
          p_organization_id: string
          p_professor_id?: string
          p_reference_month: number
          p_reference_year: number
          p_school_id?: string
          p_status?: string
          p_subject_id?: string
        }
        Returns: Json
      }
      get_teacher_attendance_daily_series: {
        Args: {
          p_course_id?: string
          p_organization_id: string
          p_professor_id?: string
          p_reference_month: number
          p_reference_year: number
          p_school_id?: string
          p_status?: string
          p_subject_id?: string
        }
        Returns: Json
      }
      get_teacher_attendance_dashboard_kpis: {
        Args: {
          p_organization_id: string
          p_reference_month: number
          p_reference_year: number
          p_school_id?: string
        }
        Returns: Json
      }
      get_teacher_attendance_monthly_sheet_details: {
        Args: { p_monthly_sheet_id: string }
        Returns: Json
      }
      get_teacher_attendance_sheet_school_breakdown: {
        Args: { p_sheet_id: string }
        Returns: {
          absent_entries: number
          class_entries: number
          confirmed_class_minutes: number
          confirmed_planning_minutes: number
          confirmed_total_minutes: number
          divergent_entries: number
          expected_class_minutes: number
          expected_planning_minutes: number
          expected_total_minutes: number
          late_entries: number
          pending_entries: number
          planning_entries: number
          present_entries: number
          school_id: string
          school_name: string
          total_entries: number
        }[]
      }
      get_teacher_bi_summary: {
        Args: {
          p_bimester_number?: number
          p_course_id?: string
          p_limit?: number
          p_offset?: number
          p_org_id: string
          p_school_id?: string
        }
        Returns: {
          attendance_score: number
          city_names: string[]
          compliance_score: number
          grades_score: number
          orientation_score: number
          planning_score: number
          risk_score: number
          school_ids: string[]
          school_names: string[]
          teacher_id: string
          teacher_name: string
          total_approved_plannings: number
          total_completed_grades: number
          total_count: number
          total_draft_plannings: number
          total_expected_attendance: number
          total_expected_grades: number
          total_expected_plannings: number
          total_open_orientations: number
          total_orientations: number
          total_recorded_attendance: number
          total_returned_plannings: number
          total_signed_plannings: number
          total_submitted_plannings: number
        }[]
      }
      get_teacher_substitution_bi_report: {
        Args: { p_from?: string; p_school_id?: string; p_to?: string }
        Returns: {
          absence_date: string
          class_group_name: string
          course_name: string
          created_at: string
          documentation_status: string
          hour_class_value: number
          hours_to_confirmation: number
          hours_to_payment: number
          paid_at: string
          payment_status: string
          request_id: string
          school_id: string
          school_name: string
          status: string
          subject_name: string
          substitute_professor_name: string
          substituted_professor_name: string
          substitution_code: string
          total_amount: number
          total_class_hours: number
          workflow_phase: string
        }[]
      }
      get_teacher_substitution_dashboard_kpis: {
        Args: { p_month?: number; p_school_id?: string; p_year?: number }
        Returns: Json
      }
      get_teacher_substitution_financial_dashboard_kpis: {
        Args: { p_month?: number; p_year?: number }
        Returns: Json
      }
      get_teacher_substitution_financial_details: {
        Args: { p_substitution_request_id: string }
        Returns: Json
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_role_in_org: {
        Args: { _org: string; _user: string }
        Returns: string
      }
      grant_financial_permission: {
        Args: { _permission_key: string; _scope?: Json; _user_id: string }
        Returns: string
      }
      grant_teacher_substitution_financial_access: {
        Args: { p_notes?: string; p_user_id: string }
        Returns: string
      }
      has_financial_permission: {
        Args: { _context?: Json; _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_organization_access: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_bank_transactions: {
        Args: {
          _account_id: string
          _file_format: string
          _file_name: string
          _transactions: Json
        }
        Returns: Json
      }
      increment_help_view: {
        Args: { _completed?: boolean; _progress?: number; _tutorial_id: string }
        Returns: undefined
      }
      initialize_kanban_lists: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      is_active_quarterly_keyword: {
        Args: { p_keyword: string; p_org_id: string }
        Returns: boolean
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_admin_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_coordinator: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_date_in_subject_semester: {
        Args: { p_date?: string; p_subject_id: string }
        Returns: boolean
      }
      is_financial_period_closed: {
        Args: {
          _cost_center_id?: string
          _date: string
          _org: string
          _school_id?: string
        }
        Returns: boolean
      }
      is_financial_ready: {
        Args: { _organization_id?: string }
        Returns: boolean
      }
      is_hr_admin: { Args: { _org_id: string }; Returns: boolean }
      is_hr_manager: { Args: { _org_id: string }; Returns: boolean }
      is_professor: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_rh: { Args: { org_uuid: string; user_uuid: string }; Returns: boolean }
      is_valid_cnpj: { Args: { _doc: string }; Returns: boolean }
      is_valid_cpf: { Args: { _doc: string }; Returns: boolean }
      library_content_set_folders: {
        Args: { _content_id: string; _folder_ids: string[] }
        Returns: undefined
      }
      library_folder_create: {
        Args: { _category_id: string; _name: string; _parent_id: string }
        Returns: string
      }
      library_folder_delete: { Args: { _id: string }; Returns: undefined }
      library_folder_move: {
        Args: { _id: string; _new_parent_id: string }
        Returns: undefined
      }
      library_folder_rename: {
        Args: { _id: string; _name: string }
        Returns: undefined
      }
      library_folder_reorder: { Args: { _ids: string[] }; Returns: undefined }
      library_reorder_contents: { Args: { _ids: string[] }; Returns: undefined }
      link_teacher_substitution_to_attendance_entry: {
        Args: {
          p_annual_class_occurrence_id?: string
          p_mark_as_justified?: boolean
          p_substitution_request_id: string
          p_teacher_attendance_entry_id: string
        }
        Returns: string
      }
      list_eligible_substituted_professors: {
        Args: { p_organization_id: string }
        Returns: {
          cpf: string
          full_name: string
          id: string
          registration_code: string
        }[]
      }
      list_financial_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: string
          category: string
          granted_at: string
          granted_by: string
          max_amount: number
          name: string
          permission_key: string
          source_template: string
        }[]
      }
      list_school_indication_links: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          is_active: boolean
          keyword: string
          link_id: string
          materialized_ano_letivo: string
          materialized_at: string
          qtd_aprovadas: number
          qtd_aulas: number
          qtd_cursos: number
          qtd_indicacoes: number
          qtd_pendentes: number
          qtd_professores: number
          qtd_recusadas: number
          qtd_turmas: number
          school_id: string
          school_nome: string
          submitted_at: string
          token: string
        }[]
      }
      list_teacher_substitution_financial_access_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          granted_at: string
          granted_by: string
          granted_by_name: string
          is_active: boolean
          notes: string
          revoked_at: string
          revoked_by: string
          role: string
          user_id: string
        }[]
      }
      list_teacher_substitution_payments_paged: {
        Args: {
          p_cpf?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_month?: number
          p_offset?: number
          p_payee_search?: string
          p_school_id?: string
          p_status?: string
          p_year?: number
        }
        Returns: Json
      }
      load_indication_draft: {
        Args: { p_keyword: string; p_token: string }
        Returns: Json
      }
      log_planning_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_org_id: string
          p_pre_planning_id: string
          p_teacher_planning_id: string
        }
        Returns: string
      }
      log_teacher_attendance_pdf_generated: {
        Args: { p_monthly_sheet_id: string }
        Returns: Json
      }
      mark_financial_payment_batch_sent: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      mark_teacher_substitution_paid:
        | {
            Args: {
              p_notes?: string
              p_payment_proof_document_id?: string
              p_payment_reference?: string
              p_substitution_request_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_notes?: string
              p_paid_at?: string
              p_payment_method?: string
              p_payment_proof_document_id?: string
              p_payment_reference?: string
              p_substitution_request_id: string
            }
            Returns: undefined
          }
      mark_teacher_substitution_payment_scheduled:
        | {
            Args: {
              p_payment_method?: string
              p_payment_reference?: string
              p_substitution_request_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_notes?: string
              p_payment_method?: string
              p_payment_reference?: string
              p_scheduled_for?: string
              p_substitution_request_id: string
            }
            Returns: undefined
          }
      materialize_grade_from_indications:
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
              p_subject_bimester_filter?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
              p_semester_scope?: string
              p_subject_bimester_filter?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
              p_planning_filter?: Json
              p_semester_scope?: string
              p_subject_bimester_filter?: Json
            }
            Returns: Json
          }
      materialize_grade_from_indications_internal:
        | {
            Args: {
              p_ano_letivo: number
              p_generate_occurrences?: boolean
              p_link_id: string
              p_planning_filter?: Json
              p_semester_scope?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
              p_semester_scope?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_ano_letivo: string
              p_generate_occurrences?: boolean
              p_link_id: string
              p_planning_filter?: Json
              p_semester_scope?: string
            }
            Returns: Json
          }
      normalize_pt_name: { Args: { p_name: string }; Returns: string }
      populate_letivo_days: { Args: { p_calendar_id: string }; Returns: number }
      preview_grade_from_indications: {
        Args: { p_link_id: string }
        Returns: Json
      }
      process_financial_payment_batch_item: {
        Args: {
          p_error_message?: string
          p_item_id: string
          p_payment_date?: string
          p_reference?: string
          p_success: boolean
        }
        Returns: string
      }
      professor_has_active_grade: {
        Args: {
          p_month: number
          p_org_id: string
          p_professor_id: string
          p_year: number
        }
        Returns: boolean
      }
      recalc_teacher_attendance_sheet: {
        Args: { p_sheet_id: string }
        Returns: undefined
      }
      recalculate_overdue_installments: {
        Args: { p_organization?: string }
        Returns: number
      }
      recalculate_teacher_attendance_monthly_sheet: {
        Args: { p_monthly_sheet_id: string }
        Returns: Json
      }
      recompute_bank_transaction_status: {
        Args: { _bt_id: string }
        Returns: undefined
      }
      recompute_hiring_status: {
        Args: { _candidate_id: string }
        Returns: Database["public"]["Enums"]["hr_hiring_status"]
      }
      recompute_teacher_attendance_for_sheet: {
        Args: { p_sheet_id: string }
        Returns: undefined
      }
      reconcile_bank_transaction: {
        Args: {
          _bank_transaction_id: string
          _matches: Json
          _method?: string
          _notes?: string
        }
        Returns: Json
      }
      record_user_login: {
        Args: {
          p_email: string
          p_ip?: string
          p_name: string
          p_org_id: string
          p_role: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      register_financial_payment: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_installment_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method_id?: string
          p_reference?: string
        }
        Returns: string
      }
      register_financial_receipt: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_discount?: number
          p_installment_id: string
          p_interest?: number
          p_late_fee?: number
          p_notes?: string
          p_payment_date?: string
          p_payment_method_id?: string
          p_reference?: string
        }
        Returns: string
      }
      renegotiate_receivable_entry: {
        Args: {
          p_entry_id: string
          p_first_due_date: string
          p_installments_count?: number
          p_notes?: string
          p_reason: string
          p_total_amount: number
        }
        Returns: string
      }
      reopen_financial_period: {
        Args: { _closure_id: string; _reason: string }
        Returns: boolean
      }
      reopen_school_indication: {
        Args: { p_link_id: string; p_motivo: string }
        Returns: Json
      }
      reopen_teacher_attendance_monthly_sheet: {
        Args: { p_monthly_sheet_id: string; p_reason: string }
        Returns: Json
      }
      reorder_kanban_card: {
        Args: {
          p_new_list_id: string
          p_next_position?: number
          p_prev_position?: number
          p_ticket_id: string
        }
        Returns: Json
      }
      request_teacher_attendance_adjustment: {
        Args: {
          p_entry_id: string
          p_evidence_url?: string
          p_reason: string
          p_request_type: string
          p_requested_status: string
        }
        Returns: Json
      }
      resolve_financial_approval_flow: {
        Args: {
          _account_id?: string
          _amount: number
          _category_id?: string
          _cost_center_id?: string
          _operation_type: string
          _organization_id: string
          _project_id?: string
          _requester_id?: string
          _school_id?: string
        }
        Returns: Json
      }
      return_financial_entry: {
        Args: { _entry_id: string; _reason: string }
        Returns: undefined
      }
      return_teacher_substitution_for_correction: {
        Args: { p_reason: string; p_substitution_request_id: string }
        Returns: undefined
      }
      reverse_financial_entry: {
        Args: { _entry_id: string; _reason: string }
        Returns: undefined
      }
      reverse_financial_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: string
      }
      review_teacher_attendance_adjustment: {
        Args: {
          p_adjustment_id: string
          p_decision: string
          p_review_notes?: string
        }
        Returns: Json
      }
      revoke_financial_permission: {
        Args: { _permission_key: string; _reason: string; _user_id: string }
        Returns: undefined
      }
      revoke_teacher_substitution_financial_access: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      route_school_check_in: {
        Args: {
          p_accuracy_m: number
          p_lat: number
          p_lng: number
          p_photo_path: string
          p_school_stop_id: string
        }
        Returns: undefined
      }
      route_school_check_out: {
        Args: {
          p_accuracy_m: number
          p_lat: number
          p_lng: number
          p_occurrence_description?: string
          p_occurrence_type?: string
          p_photo_path: string
          p_school_stop_id: string
        }
        Returns: undefined
      }
      route_teacher_substitution_to_channel: {
        Args: { p_substitution_request_id: string }
        Returns: string
      }
      run_daily_storage_maintenance: { Args: never; Returns: undefined }
      save_indication_draft: {
        Args: {
          p_diretor_nome?: string
          p_keyword: string
          p_payload: Json
          p_token: string
        }
        Returns: Json
      }
      seed_default_chat_labels: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      seed_default_ticket_labels: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      seed_financial_defaults: {
        Args: { _organization_id?: string }
        Returns: Json
      }
      send_professors_to_hiring: {
        Args: { _notes?: string; _professor_ids: string[] }
        Returns: Json
      }
      set_indication_grade_subject: {
        Args: { p_boletim_key: string; p_indication_id: string }
        Returns: Json
      }
      soft_delete_pre_planning: {
        Args: { p_pre_planning_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      submit_financial_entry: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      submit_school_indication: {
        Args: { p_keyword: string; p_payload: Json; p_token: string }
        Returns: Json
      }
      submit_school_indication_full: {
        Args: {
          p_classes: Json
          p_course_id: string
          p_indicado_por_nome?: string
          p_indications: Json
          p_keyword: string
          p_token: string
        }
        Returns: Json
      }
      submit_teacher_attendance_sheet_for_review:
        | {
            Args: { p_monthly_sheet_id: string; p_notes?: string }
            Returns: Json
          }
        | {
            Args: {
              p_force?: boolean
              p_monthly_sheet_id: string
              p_notes?: string
            }
            Returns: Json
          }
      suggest_teacher_substitution_candidate: {
        Args: {
          p_candidate_data: Json
          p_notes?: string
          p_professor_id: string
          p_substitution_request_id: string
        }
        Returns: string
      }
      transition_substitution_status: {
        Args: { _id: string; _note?: string; _to_status: string }
        Returns: {
          absence_date: string
          absent_professor_id: string
          approved_at: string | null
          approved_by: string | null
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          class_group_id: string | null
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          course_id: string | null
          created_at: string
          doc_state: Database["public"]["Enums"]["substitution_doc_state"]
          hourly_rate: number
          id: string
          notes: string | null
          organization_id: string
          payment_state: Database["public"]["Enums"]["substitution_payment_state"]
          phase: number
          reason: string | null
          requested_by: string
          school_id: string
          status: Database["public"]["Enums"]["substitution_status"]
          subject_id: string | null
          substitute_professor_id: string | null
          ticket_id: string | null
          total_amount: number | null
          total_class_hours: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "substitution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tsr_coord_notify_school: {
        Args: {
          p_channel: string
          p_id: string
          p_message?: string
          p_notified_at?: string
          p_proof_url?: string
          p_recipient?: string
        }
        Returns: undefined
      }
      tsr_coord_return_to_rh: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      tsr_rh_return:
        | {
            Args: {
              p_attachment_url?: string
              p_id: string
              p_notes?: string
              p_substitute_cpf?: string
              p_substitute_name?: string
              p_substitute_phone?: string
              p_substitute_professor_id?: string
              p_substitute_rg?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_attachment_url?: string
              p_id: string
              p_notes?: string
              p_substitute_cpf?: string
              p_substitute_email?: string
              p_substitute_name?: string
              p_substitute_phone?: string
              p_substitute_pix?: string
              p_substitute_professor_id?: string
              p_substitute_rg?: string
              p_substitute_talent_pool_candidate_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_attachment_url?: string
              p_id: string
              p_notes?: string
              p_substitute_cpf?: string
              p_substitute_email?: string
              p_substitute_name?: string
              p_substitute_phone?: string
              p_substitute_professor_id?: string
              p_substitute_rg?: string
              p_substitute_talent_pool_candidate_id?: string
            }
            Returns: undefined
          }
      tsr_rh_take: { Args: { p_id: string }; Returns: undefined }
      unmaterialize_grade_from_indications: {
        Args: { p_link_id: string; p_reason: string }
        Returns: Json
      }
      unreconcile_bank_transaction: {
        Args: { _reason: string; _reconciliation_id: string }
        Returns: undefined
      }
      update_batch_item_pix_override: {
        Args: { p_item_id: string; p_pix_key: string; p_pix_key_type: string }
        Returns: undefined
      }
      update_route_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["visit_route_status"]
          p_route: string
        }
        Returns: {
          break_end: string | null
          break_start: string | null
          code: string | null
          created_at: string
          created_by: string
          default_visit_minutes: number
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          departure_point: string | null
          efficiency_score: string | null
          end_date: string
          fuel_cost_per_km: number
          fuel_price_per_liter: number
          id: string
          kml_per_liter: number
          legacy_visit_id: string | null
          name: string
          notes: string | null
          optimization_payload: Json | null
          organization_id: string
          shift_end: string
          shift_start: string
          start_date: string
          status: Database["public"]["Enums"]["visit_route_status"]
          supervisor_id: string
          toll_estimated: number
          total_estimated_cost: number
          total_km: number
          total_travel_minutes: number
          total_visit_minutes: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "visit_routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upload_teacher_substitution_document_metadata: {
        Args: {
          p_document_type: string
          p_file_name: string
          p_file_size_bytes?: number
          p_file_url: string
          p_mime_type?: string
          p_notes?: string
          p_storage_path: string
          p_substitution_request_id: string
        }
        Returns: string
      }
      user_can_view_substitution: {
        Args: { _req_id: string }
        Returns: boolean
      }
      user_is_member_of_message_channel: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      validate_pre_planning_generation: {
        Args: {
          p_bimester_number: number
          p_class_group_id: string
          p_course_id: string
          p_org_id: string
          p_school_id: string
          p_subject_id: string
        }
        Returns: {
          can_generate: boolean
          error_message: string
          has_schedule: boolean
          professors_count: number
          subject_semester: string
        }[]
      }
      validate_professor_context: {
        Args: {
          _class_group_id: string
          _course_id: string
          _professor_id: string
          _school_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenador" | "professor" | "rh" | "financeiro"
      bank_transaction_direction: "CREDIT" | "DEBIT"
      bank_transaction_status:
        | "PENDING"
        | "PARTIALLY_RECONCILED"
        | "RECONCILED"
        | "IGNORED"
      binding_status: "ACTIVE" | "INACTIVE"
      calendar_event_type: "LETIVO" | "FERIADO" | "RECESSO" | "EVENTO"
      calendar_status: "ACTIVE" | "INACTIVE" | "CLOSED"
      chat_attachment_kind: "file" | "image" | "link"
      chat_channel_type:
        | "coordenacao"
        | "professores"
        | "projeto"
        | "rh"
        | "escola"
        | "curso"
        | "direct"
        | "substituicao"
      chat_member_role: "owner" | "admin" | "member"
      enrollment_status: "ativa" | "transferida" | "cancelada"
      entity_status: "ativo" | "inativo"
      financial_approval_action:
        | "submitted"
        | "approved"
        | "returned"
        | "cancelled"
        | "reversed"
        | "rejected"
      financial_batch_item_status:
        | "pending"
        | "success"
        | "failed"
        | "cancelled"
      financial_batch_status:
        | "draft"
        | "sent"
        | "processed"
        | "partially_processed"
        | "rejected"
        | "cancelled"
      financial_budget_overrun_mode: "ALERT" | "REQUIRE_APPROVAL" | "BLOCK"
      financial_budget_status: "DRAFT" | "ACTIVE" | "CLOSED"
      financial_closure_scope: "ORG" | "SCHOOL" | "COST_CENTER"
      financial_closure_status: "OPEN" | "CLOSED"
      financial_entry_kind: "payable" | "receivable"
      financial_entry_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "scheduled"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
        | "reversed"
        | "renegotiated"
      financial_installment_status:
        | "pending"
        | "scheduled"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      financial_payment_kind: "payment" | "reversal" | "receipt"
      financial_permission_audit_action:
        | "grant"
        | "revoke"
        | "template_applied"
        | "scope_added"
        | "scope_removed"
        | "limit_set"
        | "limit_removed"
      financial_project_status:
        | "planning"
        | "active"
        | "suspended"
        | "completed"
        | "cancelled"
      financial_scope_type:
        | "organization"
        | "city"
        | "school"
        | "cost_center"
        | "project"
        | "bank_account"
      help_audience: "admin_coord_rh" | "admin_coord" | "admin_coord_prof"
      help_category:
        | "inicio"
        | "cadastros"
        | "rotina_pedagogica"
        | "recursos_agenda"
        | "rh"
        | "analise_acompanhamento"
        | "comunicacao"
        | "compartilhamento_externo"
        | "sistema"
        | "conta"
      help_content_type:
        | "video_upload"
        | "video_link"
        | "pdf"
        | "image"
        | "link"
      hr_hiring_audit_event:
        | "SENT_TO_HIRING"
        | "CANCELLED"
        | "DOC_ADDED"
        | "DOC_REMOVED"
        | "SIGNED_DOC_RECEIVED"
        | "EXTERNAL_LINK_CREATED"
        | "EXTERNAL_LINK_REVOKED"
        | "EXTERNAL_VIEW"
        | "EXTERNAL_DOWNLOAD"
        | "STATUS_CHANGED"
      hr_hiring_doc_kind:
        | "CONTRATO"
        | "TERMO"
        | "ADITIVO"
        | "OUTRO"
        | "FICHA_REGISTRO"
        | "RENUNCIA_VT"
        | "DECLARACAO_VT"
        | "DEPENDENTE_IR"
      hr_hiring_doc_version_kind: "ORIGINAL" | "ASSINADO"
      hr_hiring_status:
        | "PENDENTE_DOC"
        | "AGUARDANDO_ASSINATURA"
        | "ASSINADO"
        | "CONCLUIDO"
        | "CANCELADO"
      hr_indication_status:
        | "PENDENTE"
        | "APROVADA"
        | "RECUSADA"
        | "CONVERTIDA"
        | "EM_ANALISE"
        | "ALOCADA"
      hr_item_origin: "SUGERIDO" | "MANUAL" | "INDICADO_ESCOLA"
      hr_item_status: "PENDENTE" | "APROVADO" | "RECUSADO" | "PUBLICADO"
      hr_period: "MANHA" | "TARDE" | "NOITE"
      hr_plan_status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      import_batch_status:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "PARTIAL"
      nivel_ensino:
        | "educacao_infantil"
        | "fundamental_1"
        | "fundamental_2"
        | "ensino_medio"
        | "eja"
        | "profissional"
      occurrence_status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
      pre_planning_status:
        | "GERADO"
        | "EM_EDICAO"
        | "ENVIADO"
        | "DEVOLVIDO"
        | "ASSINADO"
        | "DISPONIVEL"
      pre_planning_type: "MENSAL" | "BIMESTRAL" | "SEMESTRAL" | "ANUAL"
      professor_status: "ACTIVE" | "INACTIVE" | "ON_LEAVE"
      schedule_type: "CLASS" | "PLANNING"
      shift_type: "manha" | "tarde" | "noite" | "integral"
      signature_type: "PROFESSOR" | "COORDINATOR"
      subject_semester: "FIRST" | "SECOND" | "ANNUAL"
      substitution_doc_state:
        | "NOT_REQUIRED"
        | "PENDING_UPLOAD"
        | "UPLOADED"
        | "SIGNED"
        | "APPROVED"
        | "REJECTED"
        | "EXPIRED"
      substitution_doc_type:
        | "REPORT"
        | "SIGNED_REPORT"
        | "RECEIPT"
        | "DECLARATION"
        | "PAYMENT_PROOF"
        | "OTHER"
      substitution_payment_state:
        | "NOT_APPLICABLE"
        | "PENDING_CALCULATION"
        | "CALCULATED"
        | "PENDING_DOCUMENTATION"
        | "PENDING_RH_VALIDATION"
        | "APPROVED_FOR_PAYMENT"
        | "PAYMENT_SCHEDULED"
        | "PAID"
        | "RETURNED_FOR_CORRECTION"
        | "CANCELLED"
      substitution_payment_status:
        | "PENDING"
        | "APPROVED"
        | "PAID"
        | "REJECTED"
        | "CANCELED"
      substitution_status:
        | "OPEN"
        | "INDICATED"
        | "CONFIRMED"
        | "EXECUTED"
        | "REPORT_SUBMITTED"
        | "APPROVED"
        | "PAID"
        | "CANCELED"
        | "DRAFT"
        | "IDENTIFIED_ABSENCE"
        | "REQUEST_CREATED"
        | "TICKET_CREATED"
        | "ROUTED_TO_CHANNEL"
        | "AWAITING_SUBSTITUTE_INDICATION"
        | "SUBSTITUTE_SUGGESTED"
        | "SUBSTITUTE_CONFIRMED"
        | "IN_EXECUTION"
        | "EXECUTION_COMPLETED"
        | "REPORT_PENDING"
        | "REPORT_GENERATED"
        | "SIGNED_REPORT_PENDING"
        | "SIGNED_REPORT_UPLOADED"
        | "PENDING_RH_VALIDATION"
        | "APPROVED_FOR_PAYMENT"
        | "PAYMENT_PENDING"
        | "PAYMENT_COMPLETED"
        | "CANCELLED"
        | "REOPENED"
      talent_period: "MANHA" | "TARDE" | "NOITE"
      talent_weekday: "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB" | "DOM"
      teacher_planning_status:
        | "DRAFT"
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "ENVIADO"
        | "DEVOLVIDO"
        | "ASSINADO"
        | "AGUARDANDO_ASSINATURA"
        | "AGUARDANDO_ASSINATURA_COORDENADOR"
        | "CONCLUIDO"
      ticket_type: "escola" | "interno"
      transfer_status: "PENDING" | "COMPLETED" | "CANCELED"
      ucp_type: "UCP1" | "UCP2" | "UCP3" | "PEDAGOGICA" | "OUTRA"
      visit_route_status:
        | "planejada"
        | "em_andamento"
        | "finalizada"
        | "cancelada"
      weekday: "SEGUNDA" | "TERCA" | "QUARTA" | "QUINTA" | "SEXTA"
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
      app_role: ["admin", "coordenador", "professor", "rh", "financeiro"],
      bank_transaction_direction: ["CREDIT", "DEBIT"],
      bank_transaction_status: [
        "PENDING",
        "PARTIALLY_RECONCILED",
        "RECONCILED",
        "IGNORED",
      ],
      binding_status: ["ACTIVE", "INACTIVE"],
      calendar_event_type: ["LETIVO", "FERIADO", "RECESSO", "EVENTO"],
      calendar_status: ["ACTIVE", "INACTIVE", "CLOSED"],
      chat_attachment_kind: ["file", "image", "link"],
      chat_channel_type: [
        "coordenacao",
        "professores",
        "projeto",
        "rh",
        "escola",
        "curso",
        "direct",
        "substituicao",
      ],
      chat_member_role: ["owner", "admin", "member"],
      enrollment_status: ["ativa", "transferida", "cancelada"],
      entity_status: ["ativo", "inativo"],
      financial_approval_action: [
        "submitted",
        "approved",
        "returned",
        "cancelled",
        "reversed",
        "rejected",
      ],
      financial_batch_item_status: [
        "pending",
        "success",
        "failed",
        "cancelled",
      ],
      financial_batch_status: [
        "draft",
        "sent",
        "processed",
        "partially_processed",
        "rejected",
        "cancelled",
      ],
      financial_budget_overrun_mode: ["ALERT", "REQUIRE_APPROVAL", "BLOCK"],
      financial_budget_status: ["DRAFT", "ACTIVE", "CLOSED"],
      financial_closure_scope: ["ORG", "SCHOOL", "COST_CENTER"],
      financial_closure_status: ["OPEN", "CLOSED"],
      financial_entry_kind: ["payable", "receivable"],
      financial_entry_status: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
        "reversed",
        "renegotiated",
      ],
      financial_installment_status: [
        "pending",
        "scheduled",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      financial_payment_kind: ["payment", "reversal", "receipt"],
      financial_permission_audit_action: [
        "grant",
        "revoke",
        "template_applied",
        "scope_added",
        "scope_removed",
        "limit_set",
        "limit_removed",
      ],
      financial_project_status: [
        "planning",
        "active",
        "suspended",
        "completed",
        "cancelled",
      ],
      financial_scope_type: [
        "organization",
        "city",
        "school",
        "cost_center",
        "project",
        "bank_account",
      ],
      help_audience: ["admin_coord_rh", "admin_coord", "admin_coord_prof"],
      help_category: [
        "inicio",
        "cadastros",
        "rotina_pedagogica",
        "recursos_agenda",
        "rh",
        "analise_acompanhamento",
        "comunicacao",
        "compartilhamento_externo",
        "sistema",
        "conta",
      ],
      help_content_type: ["video_upload", "video_link", "pdf", "image", "link"],
      hr_hiring_audit_event: [
        "SENT_TO_HIRING",
        "CANCELLED",
        "DOC_ADDED",
        "DOC_REMOVED",
        "SIGNED_DOC_RECEIVED",
        "EXTERNAL_LINK_CREATED",
        "EXTERNAL_LINK_REVOKED",
        "EXTERNAL_VIEW",
        "EXTERNAL_DOWNLOAD",
        "STATUS_CHANGED",
      ],
      hr_hiring_doc_kind: [
        "CONTRATO",
        "TERMO",
        "ADITIVO",
        "OUTRO",
        "FICHA_REGISTRO",
        "RENUNCIA_VT",
        "DECLARACAO_VT",
        "DEPENDENTE_IR",
      ],
      hr_hiring_doc_version_kind: ["ORIGINAL", "ASSINADO"],
      hr_hiring_status: [
        "PENDENTE_DOC",
        "AGUARDANDO_ASSINATURA",
        "ASSINADO",
        "CONCLUIDO",
        "CANCELADO",
      ],
      hr_indication_status: [
        "PENDENTE",
        "APROVADA",
        "RECUSADA",
        "CONVERTIDA",
        "EM_ANALISE",
        "ALOCADA",
      ],
      hr_item_origin: ["SUGERIDO", "MANUAL", "INDICADO_ESCOLA"],
      hr_item_status: ["PENDENTE", "APROVADO", "RECUSADO", "PUBLICADO"],
      hr_period: ["MANHA", "TARDE", "NOITE"],
      hr_plan_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      import_batch_status: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "PARTIAL",
      ],
      nivel_ensino: [
        "educacao_infantil",
        "fundamental_1",
        "fundamental_2",
        "ensino_medio",
        "eja",
        "profissional",
      ],
      occurrence_status: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      pre_planning_status: [
        "GERADO",
        "EM_EDICAO",
        "ENVIADO",
        "DEVOLVIDO",
        "ASSINADO",
        "DISPONIVEL",
      ],
      pre_planning_type: ["MENSAL", "BIMESTRAL", "SEMESTRAL", "ANUAL"],
      professor_status: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
      schedule_type: ["CLASS", "PLANNING"],
      shift_type: ["manha", "tarde", "noite", "integral"],
      signature_type: ["PROFESSOR", "COORDINATOR"],
      subject_semester: ["FIRST", "SECOND", "ANNUAL"],
      substitution_doc_state: [
        "NOT_REQUIRED",
        "PENDING_UPLOAD",
        "UPLOADED",
        "SIGNED",
        "APPROVED",
        "REJECTED",
        "EXPIRED",
      ],
      substitution_doc_type: [
        "REPORT",
        "SIGNED_REPORT",
        "RECEIPT",
        "DECLARATION",
        "PAYMENT_PROOF",
        "OTHER",
      ],
      substitution_payment_state: [
        "NOT_APPLICABLE",
        "PENDING_CALCULATION",
        "CALCULATED",
        "PENDING_DOCUMENTATION",
        "PENDING_RH_VALIDATION",
        "APPROVED_FOR_PAYMENT",
        "PAYMENT_SCHEDULED",
        "PAID",
        "RETURNED_FOR_CORRECTION",
        "CANCELLED",
      ],
      substitution_payment_status: [
        "PENDING",
        "APPROVED",
        "PAID",
        "REJECTED",
        "CANCELED",
      ],
      substitution_status: [
        "OPEN",
        "INDICATED",
        "CONFIRMED",
        "EXECUTED",
        "REPORT_SUBMITTED",
        "APPROVED",
        "PAID",
        "CANCELED",
        "DRAFT",
        "IDENTIFIED_ABSENCE",
        "REQUEST_CREATED",
        "TICKET_CREATED",
        "ROUTED_TO_CHANNEL",
        "AWAITING_SUBSTITUTE_INDICATION",
        "SUBSTITUTE_SUGGESTED",
        "SUBSTITUTE_CONFIRMED",
        "IN_EXECUTION",
        "EXECUTION_COMPLETED",
        "REPORT_PENDING",
        "REPORT_GENERATED",
        "SIGNED_REPORT_PENDING",
        "SIGNED_REPORT_UPLOADED",
        "PENDING_RH_VALIDATION",
        "APPROVED_FOR_PAYMENT",
        "PAYMENT_PENDING",
        "PAYMENT_COMPLETED",
        "CANCELLED",
        "REOPENED",
      ],
      talent_period: ["MANHA", "TARDE", "NOITE"],
      talent_weekday: ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"],
      teacher_planning_status: [
        "DRAFT",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "ENVIADO",
        "DEVOLVIDO",
        "ASSINADO",
        "AGUARDANDO_ASSINATURA",
        "AGUARDANDO_ASSINATURA_COORDENADOR",
        "CONCLUIDO",
      ],
      ticket_type: ["escola", "interno"],
      transfer_status: ["PENDING", "COMPLETED", "CANCELED"],
      ucp_type: ["UCP1", "UCP2", "UCP3", "PEDAGOGICA", "OUTRA"],
      visit_route_status: [
        "planejada",
        "em_andamento",
        "finalizada",
        "cancelada",
      ],
      weekday: ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"],
    },
  },
} as const
