export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: string
          accounting_type: string
          salary: number
          partnership_percentage: number
          daily_hours: number
          weekly_working_days: number
          password?: string | null
          responsible_sections?: string[] | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          role?: string
          accounting_type?: string
          salary?: number
          partnership_percentage?: number
          daily_hours?: number
          weekly_working_days?: number
          password?: string | null
          responsible_sections?: string[] | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          role?: string
          accounting_type?: string
          salary?: number
          partnership_percentage?: number
          daily_hours?: number
          weekly_working_days?: number
          password?: string | null
          responsible_sections?: string[] | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          full_name: string
          group_id: string | null
          parent_phone: string | null
          phone?: string | null
          status: string
          monthly_amount: number
          birth_date?: string | null
          address?: string | null
          appointment?: string | null
          notes?: string | null
          is_orphan?: boolean
          is_azhari?: boolean
          azhari_grade?: string | null
          enrollment_date?: string | null
          archived_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          full_name: string
          group_id?: string | null
          parent_phone?: string | null
          phone?: string | null
          status?: string
          monthly_amount?: number
          birth_date?: string | null
          address?: string | null
          appointment?: string | null
          notes?: string | null
          is_orphan?: boolean
          is_azhari?: boolean
          azhari_grade?: string | null
          enrollment_date?: string | null
          archived_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          group_id?: string | null
          parent_phone?: string | null
          phone?: string | null
          status?: string
          monthly_amount?: number
          birth_date?: string | null
          address?: string | null
          appointment?: string | null
          notes?: string | null
          is_orphan?: boolean
          is_azhari?: boolean
          azhari_grade?: string | null
          enrollment_date?: string | null
          archived_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          teacher_id: string | null
          schedule: string | null
          max_students_per_hour: number | null
          hours: number | null
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          teacher_id?: string | null
          schedule?: string | null
          max_students_per_hour?: number | null
          hours?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          teacher_id?: string | null
          schedule?: string | null
          max_students_per_hour?: number | null
          hours?: number | null
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          student_id: string
          date: string
          month_key: string | null
          status: string
          created_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          date: string
          month_key?: string | null
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          date?: string
          month_key?: string | null
          status?: string
          created_at?: string
        }
      }
      fees: {
        Row: {
          id: string
          student_id: string
          month: string
          amount: number
          receipt_number: string | null
          date: string
          created_by: string | null
          collected_by_id?: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          month: string
          amount: number
          receipt_number?: string | null
          date: string
          created_by?: string | null
          collected_by_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          month?: string
          amount?: number
          receipt_number?: string | null
          date?: string
          created_by?: string | null
          collected_by_id?: string | null
          created_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          student_id: string
          surah: string
          exam_type: string
          grade: string
          date: string
          goal_id?: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          surah: string
          exam_type: string
          grade: string
          date: string
          goal_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          surah?: string
          exam_type?: string
          grade?: string
          date?: string
          goal_id?: string | null
          created_at?: string
        }
      }
      exam_goals: {
        Row: {
          id: string
          student_id: string
          exam_type: 'جديد' | 'ماضي قريب' | 'ماضي بعيد'
          title: string
          start_date: string
          end_date: string
          sessions_count?: number | null
          notes?: string | null
          is_completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          exam_type: 'جديد' | 'ماضي قريب' | 'ماضي بعيد'
          title: string
          start_date: string
          end_date: string
          sessions_count?: number | null
          notes?: string | null
          is_completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          exam_type?: 'جديد' | 'ماضي قريب' | 'ماضي بعيد'
          title?: string
          start_date?: string
          end_date?: string
          sessions_count?: number | null
          notes?: string | null
          is_completed?: boolean
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
