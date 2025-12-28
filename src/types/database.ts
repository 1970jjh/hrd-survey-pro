// HRD Survey Pro - Database Types
// Auto-generated based on TRD schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          admin_id: string;
          title: string;
          objectives: string | null;
          content: string | null;
          instructor: string | null;
          training_start_date: string | null;
          training_end_date: string | null;
          target_participants: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          title: string;
          objectives?: string | null;
          content?: string | null;
          instructor?: string | null;
          training_start_date?: string | null;
          training_end_date?: string | null;
          target_participants?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          title?: string;
          objectives?: string | null;
          content?: string | null;
          instructor?: string | null;
          training_start_date?: string | null;
          training_end_date?: string | null;
          target_participants?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      surveys: {
        Row: {
          id: string;
          course_id: string | null;
          admin_id: string;
          title: string;
          description: string | null;
          status: "draft" | "active" | "closed";
          unique_code: string;
          scale_type: 5 | 7 | 9 | 10;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          admin_id: string;
          title: string;
          description?: string | null;
          status?: "draft" | "active" | "closed";
          unique_code: string;
          scale_type?: 5 | 7 | 9 | 10;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          admin_id?: string;
          title?: string;
          description?: string | null;
          status?: "draft" | "active" | "closed";
          unique_code?: string;
          scale_type?: 5 | 7 | 9 | 10;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
      };
      questions: {
        Row: {
          id: string;
          survey_id: string;
          type: "choice" | "text";
          category: string | null;
          content: string;
          order_num: number;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          type: "choice" | "text";
          category?: string | null;
          content: string;
          order_num: number;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          type?: "choice" | "text";
          category?: string | null;
          content?: string;
          order_num?: number;
          is_required?: boolean;
          created_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          survey_id: string;
          session_id: string;
          device_info: Json | null;
          ip_hash: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          session_id: string;
          device_info?: Json | null;
          ip_hash?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          session_id?: string;
          device_info?: Json | null;
          ip_hash?: string | null;
          submitted_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          response_id: string;
          question_id: string;
          score_value: number | null;
          text_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          response_id: string;
          question_id: string;
          score_value?: number | null;
          text_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          question_id?: string;
          score_value?: number | null;
          text_value?: string | null;
          created_at?: string;
        };
      };
      survey_templates: {
        Row: {
          id: string;
          admin_id: string;
          name: string;
          description: string | null;
          template_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          name: string;
          description?: string | null;
          template_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          name?: string;
          description?: string | null;
          template_data?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      survey_stats: {
        Row: {
          survey_id: string;
          question_id: string;
          category: string | null;
          question_content: string;
          response_count: number;
          average: number | null;
          std_dev: number | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Utility types for easier usage
export type Admin = Database["public"]["Tables"]["admins"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Survey = Database["public"]["Tables"]["surveys"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Response = Database["public"]["Tables"]["responses"]["Row"];
export type Answer = Database["public"]["Tables"]["answers"]["Row"];
export type SurveyTemplate =
  Database["public"]["Tables"]["survey_templates"]["Row"];
export type SurveyStats = Database["public"]["Views"]["survey_stats"]["Row"];

// Insert types
export type AdminInsert = Database["public"]["Tables"]["admins"]["Insert"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type SurveyInsert = Database["public"]["Tables"]["surveys"]["Insert"];
export type QuestionInsert =
  Database["public"]["Tables"]["questions"]["Insert"];
export type ResponseInsert =
  Database["public"]["Tables"]["responses"]["Insert"];
export type AnswerInsert = Database["public"]["Tables"]["answers"]["Insert"];

// Update types
export type AdminUpdate = Database["public"]["Tables"]["admins"]["Update"];
export type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
export type SurveyUpdate = Database["public"]["Tables"]["surveys"]["Update"];
export type QuestionUpdate =
  Database["public"]["Tables"]["questions"]["Update"];

// Survey status type
export type SurveyStatus = "draft" | "active" | "closed";

// Scale type
export type ScaleType = 5 | 7 | 9 | 10;

// Question type
export type QuestionType = "choice" | "text";

// Device info type
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight?: number;
  language?: string;
}
