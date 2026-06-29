export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          is_public: boolean;
          privacy_level?: 'public' | 'private' | 'followers';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_public?: boolean;
          privacy_level?: 'public' | 'private' | 'followers';
        };
        Update: {
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_public?: boolean;
          privacy_level?: 'public' | 'private' | 'followers';
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
        };
        Update: never;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          duration_ms: number;
          category: string;
          visibility: string;
          started_at: string;
          ended_at: string;
          created_at: string;
          tz_offset: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          duration_ms: number;
          category: string;
          visibility?: string;
          started_at: string;
          ended_at: string;
          tz_offset?: number | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string;
          visibility?: string;
        };
      };
      likes: {
        Row: {
          session_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Follow = Database['public']['Tables']['follows']['Row'];

export type CloudSession = Database['public']['Tables']['sessions']['Row'];
export type CloudSessionInsert = Database['public']['Tables']['sessions']['Insert'];

export type Like = Database['public']['Tables']['likes']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
