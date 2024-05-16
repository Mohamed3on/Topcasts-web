export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      podcast: {
        Row: {
          artist_name: string | null;
          genres: string[] | null;
          id: number;
          itunes_id: string | null;
          name: string;
          rss_feed: string | null;
          spotify_id: string | null;
        };
        Insert: {
          artist_name?: string | null;
          genres?: string[] | null;
          id?: number;
          itunes_id?: string | null;
          name: string;
          rss_feed?: string | null;
          spotify_id?: string | null;
        };
        Update: {
          artist_name?: string | null;
          genres?: string[] | null;
          id?: number;
          itunes_id?: string | null;
          name?: string;
          rss_feed?: string | null;
          spotify_id?: string | null;
        };
        Relationships: [];
      };
      podcast_episode: {
        Row: {
          audio_url: string | null;
          date_published: string | null;
          description: string | null;
          duration: number | null;
          episode_itunes_id: string | null;
          episode_name: string;
          formatted_duration: string | null;
          guid: string | null;
          id: number;
          image_url: string | null;
          podcast_id: number | null;
          slug: string | null;
        };
        Insert: {
          audio_url?: string | null;
          date_published?: string | null;
          description?: string | null;
          duration?: number | null;
          episode_itunes_id?: string | null;
          episode_name: string;
          formatted_duration?: string | null;
          guid?: string | null;
          id?: number;
          image_url?: string | null;
          podcast_id?: number | null;
          slug?: string | null;
        };
        Update: {
          audio_url?: string | null;
          date_published?: string | null;
          description?: string | null;
          duration?: number | null;
          episode_itunes_id?: string | null;
          episode_name?: string;
          formatted_duration?: string | null;
          guid?: string | null;
          id?: number;
          image_url?: string | null;
          podcast_id?: number | null;
          slug?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'podcast_episode_podcast_id_fkey';
            columns: ['podcast_id'];
            isOneToOne: false;
            referencedRelation: 'podcast';
            referencedColumns: ['id'];
          },
        ];
      };
      podcast_episode_review: {
        Row: {
          created_at: string;
          episode_id: number;
          id: number;
          review_type: string;
          text: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          episode_id: number;
          id?: number;
          review_type: string;
          text?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          episode_id?: number;
          id?: number;
          review_type?: string;
          text?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'episode_reviews_review_type_fkey';
            columns: ['review_type'];
            isOneToOne: false;
            referencedRelation: 'review_type';
            referencedColumns: ['type'];
          },
          {
            foreignKeyName: 'reviews_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episode_with_rating_data';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'podcast_episode';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      podcast_episode_url: {
        Row: {
          episode_id: number;
          id: number;
          type: string;
          url: string;
        };
        Insert: {
          episode_id: number;
          id?: number;
          type: string;
          url: string;
        };
        Update: {
          episode_id?: number;
          id?: number;
          type?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_episode_urls_new_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episode_with_rating_data';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_episode_urls_new_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'podcast_episode';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          id: string;
          name: string | null;
          updated_at: string | null;
          username: string;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          id: string;
          name?: string | null;
          updated_at?: string | null;
          username: string;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
          username: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      review_type: {
        Row: {
          type: string;
        };
        Insert: {
          type: string;
        };
        Update: {
          type?: string;
        };
        Relationships: [];
      };
      social_share: {
        Row: {
          episode_id: number;
          twitter_screen_name: string;
        };
        Insert: {
          episode_id: number;
          twitter_screen_name: string;
        };
        Update: {
          episode_id?: number;
          twitter_screen_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'social_shares_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'episode_with_rating_data';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'social_shares_episode_id_fkey';
            columns: ['episode_id'];
            isOneToOne: false;
            referencedRelation: 'podcast_episode';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      episode_with_rating_data: {
        Row: {
          artist_name: string | null;
          audio_url: string | null;
          date_published: string | null;
          description: string | null;
          dislikes: number | null;
          duration: number | null;
          episode_itunes_id: string | null;
          episode_name: string | null;
          formatted_duration: string | null;
          guid: string | null;
          id: number;
          image_url: string | null;
          likes: number | null;
          podcast_genres: string[] | null;
          podcast_itunes_id: string | null;
          podcast_name: string | null;
          rss_feed: string | null;
          slug: string | null;
          twitter_shares: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      search_episodes: {
        Args: {
          search_query?: string;
          current_user_id?: string;
        };
        Returns: {
          duration: number;
          podcast_itunes_id: string;
          audio_url: string;
          episode_itunes_id: string;
          episode_name: string;
          image_url: string;
          podcast_name: string;
          description: string;
          guid: string;
          artist_name: string;
          date_published: string;
          formatted_duration: string;
          id: number;
          slug: string;
          likes: number;
          dislikes: number;
          twitter_shares: number;
          review_type: string;
        }[];
      };
      upsert_podcast: {
        Args: {
          p_name: string;
          p_itunes_id?: string;
          p_spotify_id?: string;
          p_genres?: string[];
          p_rss_feed?: string;
          p_artist_name?: string;
        };
        Returns: {
          id: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
