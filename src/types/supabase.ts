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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          month_key: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          month_key?: string | null
          status: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          month_key?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          affected_entity_id: string | null
          affected_entity_name: string | null
          details: string | null
          id: string
          rule_id: string | null
          rule_name: string | null
          status: string
          triggered_at: string
        }
        Insert: {
          affected_entity_id?: string | null
          affected_entity_name?: string | null
          details?: string | null
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          status: string
          triggered_at?: string
        }
        Update: {
          affected_entity_id?: string | null
          affected_entity_name?: string | null
          details?: string | null
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          recipients: string[] | null
          schedule: Json | null
          type: string
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          recipients?: string[] | null
          schedule?: Json | null
          type: string
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          recipients?: string[] | null
          schedule?: Json | null
          type?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          participant_names: string[]
          participants: string[]
          type: string | null
          unread_counts: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_names: string[]
          participants: string[]
          type?: string | null
          unread_counts?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_names?: string[]
          participants?: string[]
          type?: string | null
          unread_counts?: Json | null
        }
        Relationships: []
      }
      deductions: {
        Row: {
          amount: number
          applied_by: string | null
          created_at: string
          date: string
          id: string
          is_automatic: boolean | null
          notes: string | null
          reason: string | null
          status: string | null
          teacher_id: string | null
        }
        Insert: {
          amount: number
          applied_by?: string | null
          created_at?: string
          date: string
          id?: string
          is_automatic?: boolean | null
          notes?: string | null
          reason?: string | null
          status?: string | null
          teacher_id?: string | null
        }
        Update: {
          amount?: number
          applied_by?: string | null
          created_at?: string
          date?: string
          id?: string
          is_automatic?: boolean | null
          notes?: string | null
          reason?: string | null
          status?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deductions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_cycle_assignments: {
        Row: {
          created_at: string
          id: string
          student_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_cycle_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_cycle_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      exam_goals: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          end_date: string
          exam_type: string
          id: string
          is_completed: boolean | null
          notes: string | null
          sessions_count: number | null
          start_date: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          end_date: string
          exam_type: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          sessions_count?: number | null
          start_date: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          end_date?: string
          exam_type?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          sessions_count?: number | null
          start_date?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          date: string | null
          exam_type: string | null
          goal_id: string | null
          grade: string | null
          id: string
          lines_count: number | null
          pages_count: number | null
          student_id: string | null
          surah: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          exam_type?: string | null
          goal_id?: string | null
          grade?: string | null
          id?: string
          lines_count?: number | null
          pages_count?: number | null
          student_id?: string | null
          surah?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          exam_type?: string | null
          goal_id?: string | null
          grade?: string | null
          id?: string
          lines_count?: number | null
          pages_count?: number | null
          student_id?: string | null
          surah?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "exam_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number | null
          collected_by_id: string | null
          created_at: string
          created_by: string | null
          date: string | null
          id: string
          month: string | null
          receipt_number: string | null
          student_id: string | null
        }
        Insert: {
          amount?: number | null
          collected_by_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          month?: string | null
          receipt_number?: string | null
          student_id?: string | null
        }
        Update: {
          amount?: number | null
          collected_by_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          month?: string | null
          receipt_number?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fees_collected_by_id_fkey"
            columns: ["collected_by_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          performed_by: string | null
          related_user_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          performed_by?: string | null
          related_user_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          performed_by?: string | null
          related_user_id?: string | null
          type?: string
        }
        Relationships: []
      }
      free_exemptions: {
        Row: {
          amount: number
          created_at: string | null
          exempted_by: string
          id: string
          month: string
          student_id: string
          student_name: string
          teacher_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          exempted_by: string
          id?: string
          month: string
          student_id: string
          student_name: string
          teacher_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          exempted_by?: string
          id?: string
          month?: string
          student_id?: string
          student_name?: string
          teacher_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          hours: number | null
          id: string
          max_students_per_hour: number | null
          name: string
          schedule: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          hours?: number | null
          id?: string
          max_students_per_hour?: number | null
          name: string
          schedule?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          hours?: number | null
          id?: string
          max_students_per_hour?: number | null
          name?: string
          schedule?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          student_id: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string | null
          student_id?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          student_id?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          read_by: string[] | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          read_by?: string[] | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          read_by?: string[] | null
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_sessions: {
        Row: {
          actor: string
          created_at: string | null
          expires_at: string | null
          token: string
        }
        Insert: {
          actor: string
          created_at?: string | null
          expires_at?: string | null
          token?: string
        }
        Update: {
          actor?: string
          created_at?: string | null
          expires_at?: string | null
          token?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reason: string | null
          related_date: string | null
          teacher_id: string | null
          title: string
          type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reason?: string | null
          related_date?: string | null
          teacher_id?: string | null
          title: string
          type: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reason?: string | null
          related_date?: string | null
          teacher_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          date: string | null
          distant_review: string | null
          id: string
          new_hifz: string | null
          prev_review: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          distant_review?: string | null
          id?: string
          new_hifz?: string | null
          prev_review?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          distant_review?: string | null
          id?: string
          new_hifz?: string | null
          prev_review?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean | null
          replied_at: string | null
          replied_by: string | null
          reply: string | null
          student_id: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          student_id?: string | null
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          student_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_parent_access"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          appointment: string | null
          archived_date: string | null
          azhari_grade: string | null
          created_at: string
          enrollment_date: string | null
          full_name: string
          group_id: string | null
          id: string
          is_azhari: boolean | null
          is_orphan: boolean | null
          monthly_amount: number | null
          notes: string | null
          parent_phone: string | null
          status: string | null
        }
        Insert: {
          appointment?: string | null
          archived_date?: string | null
          azhari_grade?: string | null
          created_at?: string
          enrollment_date?: string | null
          full_name: string
          group_id?: string | null
          id?: string
          is_azhari?: boolean | null
          is_orphan?: boolean | null
          monthly_amount?: number | null
          notes?: string | null
          parent_phone?: string | null
          status?: string | null
        }
        Update: {
          appointment?: string | null
          archived_date?: string | null
          azhari_grade?: string | null
          created_at?: string
          enrollment_date?: string | null
          full_name?: string
          group_id?: string | null
          id?: string
          is_azhari?: boolean | null
          is_orphan?: boolean | null
          monthly_amount?: number | null
          notes?: string | null
          parent_phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          applied_by: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          teacher_id: string | null
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          status: string
          teacher_id?: string | null
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          accounting_type: string | null
          created_at: string
          daily_hours: number | null
          full_name: string
          id: string
          partnership_percentage: number | null
          password: string | null
          phone: string | null
          responsible_sections: string[] | null
          role: string | null
          salary: number | null
          status: string | null
          weekly_working_days: number | null
        }
        Insert: {
          accounting_type?: string | null
          created_at?: string
          daily_hours?: number | null
          full_name: string
          id?: string
          partnership_percentage?: number | null
          password?: string | null
          phone?: string | null
          responsible_sections?: string[] | null
          role?: string | null
          salary?: number | null
          status?: string | null
          weekly_working_days?: number | null
        }
        Update: {
          accounting_type?: string | null
          created_at?: string
          daily_hours?: number | null
          full_name?: string
          id?: string
          partnership_percentage?: number | null
          password?: string | null
          phone?: string | null
          responsible_sections?: string[] | null
          role?: string | null
          salary?: number | null
          status?: string | null
          weekly_working_days?: number | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      teacher_parent_access: {
        Row: {
          parent_phone: string | null
          student_id: string | null
          student_name: string | null
          teacher_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_conversation_allowed: {
        Args: { p_participants: string[]; p_type: string }
        Returns: boolean
      }
      mark_messages_read: {
        Args: { p_actor: string; p_conversation_id: string }
        Returns: undefined
      }
      msg_create_conversation: {
        Args: { p_other: string; p_token: string }
        Returns: Json
      }
      msg_get_contacts: { Args: { p_token: string }; Returns: Json }
      msg_get_messages: {
        Args: { p_conversation_id: string; p_token: string }
        Returns: Json
      }
      msg_list_conversations: { Args: { p_token: string }; Returns: Json }
      msg_login: {
        Args: { p_actor: string; p_passcode: string }
        Returns: string
      }
      msg_mark_read: {
        Args: { p_conversation_id: string; p_token: string }
        Returns: boolean
      }
      msg_pin_message: {
        Args: {
          p_conversation_id: string
          p_message_id: string
          p_pin: boolean
          p_token: string
        }
        Returns: boolean
      }
      msg_send_message: {
        Args: { p_content: string; p_conversation_id: string; p_token: string }
        Returns: Json
      }
      msg_verify_token: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
