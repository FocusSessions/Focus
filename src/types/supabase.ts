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
        };
        Update: {
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_public?: boolean;
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
          tz_offset?: number | null;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Follow = Database['public']['Tables']['follows']['Row'];

export type CloudSession = Database['public']['Tables']['sessions']['Row'];
export type CloudSessionInsert = Database['public']['Tables']['sessions']['Insert'];
