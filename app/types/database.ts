/**
 * Database types for Supabase
 * Generate with: npx supabase gen types typescript --project-id "your-project-id"
 */

export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          weight_kg: number
          reps: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          weight_kg: number
          reps: number
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          weight_kg?: number
          reps?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sets_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sets_exercise_id_fkey'
            columns: ['exercise_id']
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          }
        ]
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

// Convenience types
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']

export type Set = Database['public']['Tables']['sets']['Row']
export type SetInsert = Database['public']['Tables']['sets']['Insert']
export type SetUpdate = Database['public']['Tables']['sets']['Update']

// Set with exercise name joined
export interface SetWithExercise extends Set {
  exercise: Exercise
}
