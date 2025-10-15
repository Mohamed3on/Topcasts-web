export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: { PostgrestVersion: '12.0.2 (a4e00ff)' };
  public: {
    Tables: {
      podcast: {
        Row: {
          artist_name: string | null;
          genres: string[] | null;
          id: number;
          image_url: string | null;
          itunes_id: string | null;
          name: string;
          rss_feed: string | null;
          spotify_id: string | null;
        };
        Insert: {
          artist_name?: string | null;
          genres?: string[] | null;
          id?: number;
          image_url?: string | null;
          itunes_id?: string | null;
          name: string;
          rss_feed?: string | null;
          spotify_id?: string | null;
        };
        Update: {
          artist_name?: string | null;
          genres?: string[] | null;
          id?: number;
          image_url?: string | null;
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
          podcast_id: number;
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
          podcast_id: number;
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
          podcast_id?: number;
          slug?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'podcast_episode_podcast_id_fkey';
            columns: ['podcast_id'];
            isOneToOne: false;
            referencedRelation: 'episode_with_rating_data';
            referencedColumns: ['podcast_id'];
          },
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
        Row: { episode_id: number; id: number; type: string; url: string };
        Insert: { episode_id: number; id?: number; type: string; url: string };
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
          email: string;
          id: string;
          name: string | null;
          updated_at: string | null;
          username: string;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          email: string;
          id: string;
          name?: string | null;
          updated_at?: string | null;
          username: string;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          email?: string;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
          username?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      review_type: {
        Row: { type: string };
        Insert: { type: string };
        Update: { type?: string };
        Relationships: [];
      };
      social_share: {
        Row: {
          episode_id: number;
          shared_at: string | null;
          tweet_id: string | null;
          tweet_text: string | null;
          twitter_screen_name: string;
        };
        Insert: {
          episode_id: number;
          shared_at?: string | null;
          tweet_id?: string | null;
          tweet_text?: string | null;
          twitter_screen_name: string;
        };
        Update: {
          episode_id?: number;
          shared_at?: string | null;
          tweet_id?: string | null;
          tweet_text?: string | null;
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
          id: number | null;
          image_url: string | null;
          likes: number | null;
          podcast_genres: string[] | null;
          podcast_id: number | null;
          podcast_itunes_id: string | null;
          podcast_name: string | null;
          podcast_spotify_id: string | null;
          popularity_score: number | null;
          rss_feed: string | null;
          slug: string | null;
          twitter_shares: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calculate_episode_metrics: {
        Args:
          | { end_date: string; episode_id: number; start_date: string }
          | { end_date: string; p_episode_id: number; start_date: string };
        Returns: {
          dislikes: number;
          likes: number;
          popularity_score: number;
          shares: number;
        }[];
      };
      filter_and_rank_episodes: {
        Args: { base_query: string; days_limit: number };
        Returns: {
          artist_name: string;
          date_published: string;
          description: string;
          dislikes: number;
          episode_name: string;
          formatted_duration: string;
          id: number;
          image_url: string;
          likes: number;
          podcast_name: string;
          popularity_score: number;
          shares: number;
          slug: string;
        }[];
      };
      get_episodes_in_range: {
        Args: { days_limit: number };
        Returns: {
          artist_name: string;
          audio_url: string;
          date_published: string;
          description: string;
          dislikes: number;
          duration: number;
          episode_itunes_id: number;
          episode_name: string;
          formatted_duration: string;
          guid: string;
          id: number;
          image_url: string;
          likes: number;
          podcast_genres: string[];
          podcast_id: number;
          podcast_itunes_id: number;
          podcast_name: string;
          podcast_spotify_id: string;
          rss_feed: string;
          slug: string;
          twitter_shares: number;
        }[];
      };
      get_episodes_within_day_range: {
        Args: { days_limit: number };
        Returns: {
          artist_name: string;
          date_published: string;
          description: string;
          dislikes: number;
          duration: number;
          episode_name: string;
          formatted_duration: string;
          id: number;
          image_url: string;
          likes: number;
          podcast_name: string;
          popularity_score: number;
          slug: string;
          twitter_shares: number;
        }[];
      };
      get_podcast_reviews: {
        Args: { username_param: string };
        Returns: {
          artist_name: string;
          dislikes_count: number;
          id: number;
          image_url: string;
          likes_count: number;
          podcast_name: string;
          review_difference: number;
        }[];
      };
      get_top_episodes_by_genre: {
        Args: { genre_param: string; page_number?: number; page_size?: number };
        Returns: {
          artist_name: string;
          date_published: string;
          dislikes: number;
          episode_id: number;
          episode_name: string;
          image_url: string;
          likes: number;
          podcast_name: string;
          popularity_score: number;
          total_count: number;
          twitter_shares: number;
        }[];
      };
      get_user_podcast_reviews: {
        Args: { podcast_id_param: number; user_id_param: string };
        Returns: {
          artist_name: string;
          dislikes_count: number;
          image_url: string;
          likes_count: number;
          podcast_id: number;
          podcast_name: string;
          review_difference: number;
        }[];
      };
      search_episodes: {
        Args: { current_user_id?: string; search_query?: string };
        Returns: {
          artist_name: string;
          audio_url: string;
          date_published: string;
          description: string;
          dislikes: number;
          duration: number;
          episode_itunes_id: string;
          episode_name: string;
          formatted_duration: string;
          guid: string;
          id: number;
          image_url: string;
          likes: number;
          podcast_itunes_id: string;
          podcast_name: string;
          review_type: string;
          slug: string;
          twitter_shares: number;
        }[];
      };
      search_episodes_by_relevance: {
        Args:
          | {
              current_user_id?: string;
              search_description?: string;
              search_episode_name?: string;
              search_podcast_name?: string;
              search_query?: string;
            }
          | { current_user_id?: string; search_query?: string };
        Returns: {
          artist_name: string;
          audio_url: string;
          date_published: string;
          description: string;
          dislikes: number;
          duration: number;
          episode_itunes_id: string;
          episode_name: string;
          formatted_duration: string;
          guid: string;
          id: number;
          image_url: string;
          likes: number;
          podcast_itunes_id: string;
          podcast_name: string;
          rank: number;
          review_type: string;
          slug: string;
          twitter_shares: number;
        }[];
      };
      upsert_podcast: {
        Args: {
          p_artist_name?: string;
          p_genres?: string[];
          p_itunes_id?: string;
          p_name: string;
          p_rss_feed?: string;
          p_spotify_id?: string;
        };
        Returns: { id: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = { public: { Enums: {} } } as const;
