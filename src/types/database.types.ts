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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agendas: {
        Row: {
          created_at: string
          date: string | null
          id: string
          name: string
          seq: number
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          name: string
          seq: number
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          seq?: number
        }
        Relationships: []
      }
      articles: {
        Row: {
          content: string
          created_at: string
          id: string
          image: string
          image_mobile: string | null
          image_position: Json | null
          slug: string | null
          title: string
          web_content_en: string | null
          web_content_it: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image: string
          image_mobile?: string | null
          image_position?: Json | null
          slug?: string | null
          title: string
          web_content_en?: string | null
          web_content_it?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image?: string
          image_mobile?: string | null
          image_position?: Json | null
          slug?: string | null
          title?: string
          web_content_en?: string | null
          web_content_it?: string | null
        }
        Relationships: []
      }
      car_awards: {
        Row: {
          active: boolean
          award_category: string
          award_color: string
          award_icon: string | null
          award_label: string
          badge_color: string
          car_category_id: number | null
          car_id: string
          created_at: string
          id: string
          partners: string
          seq: number
        }
        Insert: {
          active?: boolean
          award_category: string
          award_color: string
          award_icon?: string | null
          award_label: string
          badge_color: string
          car_category_id?: number | null
          car_id: string
          created_at?: string
          id?: string
          partners?: string
          seq: number
        }
        Update: {
          active?: boolean
          award_category?: string
          award_color?: string
          award_icon?: string | null
          award_label?: string
          badge_color?: string
          car_category_id?: number | null
          car_id?: string
          created_at?: string
          id?: string
          partners?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "car_awards_car_category_id_fkey"
            columns: ["car_category_id"]
            isOneToOne: false
            referencedRelation: "car_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_car_awards_car"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_categories: {
        Row: {
          created_at: string
          enable: boolean | null
          id: number
          name: string
          seq: number
        }
        Insert: {
          created_at?: string
          enable?: boolean | null
          id?: number
          name: string
          seq: number
        }
        Update: {
          created_at?: string
          enable?: boolean | null
          id?: number
          name?: string
          seq?: number
        }
        Relationships: []
      }
      car_submission_vehicles: {
        Row: {
          additional_photo_link: string | null
          archived_at: string | null
          body_style: string | null
          car_id: string
          chassis_no: string | null
          coachbuilder: string | null
          created_at: string
          deleted_at: string | null
          engine_no: string | null
          exterior_colour: string | null
          id: string
          images: Json
          interior_colour: string | null
          internal_comment: string | null
          make_of_vehicle: string
          model: string
          review_note: Json
          reviewed_at: string | null
          seen: boolean | null
          sequence: number
          status: Database["public"]["Enums"]["submission_status"]
          submission_id: string
          updated_at: string
          vehicle_documents: Json
          vehicle_history_en: string | null
          vehicle_history_it: string | null
          year_of_manufacture: string
        }
        Insert: {
          additional_photo_link?: string | null
          archived_at?: string | null
          body_style?: string | null
          car_id: string
          chassis_no?: string | null
          coachbuilder?: string | null
          created_at?: string
          deleted_at?: string | null
          engine_no?: string | null
          exterior_colour?: string | null
          id?: string
          images?: Json
          interior_colour?: string | null
          internal_comment?: string | null
          make_of_vehicle: string
          model: string
          review_note?: Json
          reviewed_at?: string | null
          seen?: boolean | null
          sequence: number
          status?: Database["public"]["Enums"]["submission_status"]
          submission_id: string
          updated_at?: string
          vehicle_documents?: Json
          vehicle_history_en?: string | null
          vehicle_history_it?: string | null
          year_of_manufacture: string
        }
        Update: {
          additional_photo_link?: string | null
          archived_at?: string | null
          body_style?: string | null
          car_id?: string
          chassis_no?: string | null
          coachbuilder?: string | null
          created_at?: string
          deleted_at?: string | null
          engine_no?: string | null
          exterior_colour?: string | null
          id?: string
          images?: Json
          interior_colour?: string | null
          internal_comment?: string | null
          make_of_vehicle?: string
          model?: string
          review_note?: Json
          reviewed_at?: string | null
          seen?: boolean | null
          sequence?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submission_id?: string
          updated_at?: string
          vehicle_documents?: Json
          vehicle_history_en?: string | null
          vehicle_history_it?: string | null
          year_of_manufacture?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_submission_vehicles_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "car_submissions_form"
            referencedColumns: ["id"]
          },
        ]
      }
      car_submissions_email_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          type?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      car_submissions_form: {
        Row: {
          accept_news: boolean | null
          accept_terms: boolean
          access_token: string | null
          address: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          first_name: string
          form_id: string
          id: string
          name: string
          phone_number: string | null
          synced_at: string | null
          zip_code: string | null
        }
        Insert: {
          accept_news?: boolean | null
          accept_terms?: boolean
          access_token?: string | null
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          first_name: string
          form_id: string
          id?: string
          name: string
          phone_number?: string | null
          synced_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accept_news?: boolean | null
          accept_terms?: boolean
          access_token?: string | null
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string
          form_id?: string
          id?: string
          name?: string
          phone_number?: string | null
          synced_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      cars: {
        Row: {
          category: string | null
          category_id: number | null
          created_at: string
          description: string
          description_it: string | null
          id: string
          images: Json
          name: string
          owner: string
          ref: string | null
          seq: number | null
          short_name: string | null
          submission_vehicle_id: string | null
          votable: boolean
          year: number
        }
        Insert: {
          category?: string | null
          category_id?: number | null
          created_at?: string
          description: string
          description_it?: string | null
          id?: string
          images?: Json
          name: string
          owner: string
          ref?: string | null
          seq?: number | null
          short_name?: string | null
          submission_vehicle_id?: string | null
          votable?: boolean
          year: number
        }
        Update: {
          category?: string | null
          category_id?: number | null
          created_at?: string
          description?: string
          description_it?: string | null
          id?: string
          images?: Json
          name?: string
          owner?: string
          ref?: string | null
          seq?: number | null
          short_name?: string | null
          submission_vehicle_id?: string | null
          votable?: boolean
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "car_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_submission_vehicle_fk"
            columns: ["submission_vehicle_id"]
            isOneToOne: false
            referencedRelation: "car_submission_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      config_app_text: {
        Row: {
          app_text: Json
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          app_text?: Json
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          app_text?: Json
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      events: {
        Row: {
          active: boolean | null
          agenda_id: string | null
          app_icon: string | null
          created_at: string
          description: string | null
          description_it: string | null
          ended_at: string | null
          id: string
          name: string
          name_it: string | null
          remark: string | null
          remark_it: string | null
          start_date_format: string | null
          started_at: string
        }
        Insert: {
          active?: boolean | null
          agenda_id?: string | null
          app_icon?: string | null
          created_at?: string
          description?: string | null
          description_it?: string | null
          ended_at?: string | null
          id?: string
          name: string
          name_it?: string | null
          remark?: string | null
          remark_it?: string | null
          start_date_format?: string | null
          started_at: string
        }
        Update: {
          active?: boolean | null
          agenda_id?: string | null
          app_icon?: string | null
          created_at?: string
          description?: string | null
          description_it?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          name_it?: string | null
          remark?: string | null
          remark_it?: string | null
          start_date_format?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_image: {
        Row: {
          id: string
          image: string
          sequence: number | null
        }
        Insert: {
          id?: string
          image: string
          sequence?: number | null
        }
        Update: {
          id?: string
          image?: string
          sequence?: number | null
        }
        Relationships: []
      }
      judges: {
        Row: {
          bio: string | null
          bio_en: string | null
          bio_it: string | null
          created_at: string
          id: string
          name: string
          position: string | null
          position_en: string | null
          position_icon: string | null
          position_it: string | null
          profile_image: string
          ref: string | null
          seq: number | null
        }
        Insert: {
          bio?: string | null
          bio_en?: string | null
          bio_it?: string | null
          created_at?: string
          id?: string
          name: string
          position?: string | null
          position_en?: string | null
          position_icon?: string | null
          position_it?: string | null
          profile_image: string
          ref?: string | null
          seq?: number | null
        }
        Update: {
          bio?: string | null
          bio_en?: string | null
          bio_it?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: string | null
          position_en?: string | null
          position_icon?: string | null
          position_it?: string | null
          profile_image?: string
          ref?: string | null
          seq?: number | null
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content_en: string
          content_it: string
          created_at: string | null
          id: string
          slug: string
          title_en: string
          title_it: string
        }
        Insert: {
          content_en: string
          content_it: string
          created_at?: string | null
          id?: string
          slug: string
          title_en: string
          title_it: string
        }
        Update: {
          content_en?: string
          content_it?: string
          created_at?: string | null
          id?: string
          slug?: string
          title_en?: string
          title_it?: string
        }
        Relationships: []
      }
      map_pins: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          title: string | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string | null
          x: number
          y: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string | null
          x?: number
          y?: number
        }
        Relationships: []
      }
      news: {
        Row: {
          article_ids: Json
          created_at: string
          id: string
          published_at: string | null
          ref: string | null
          visible: boolean
        }
        Insert: {
          article_ids?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          ref?: string | null
          visible?: boolean
        }
        Update: {
          article_ids?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          ref?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          image: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          link: string
          logo: string
          logo_properties: Json
          name: string
          seq: number | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link: string
          logo: string
          logo_properties?: Json
          name: string
          seq?: number | null
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link?: string
          logo?: string
          logo_properties?: Json
          name?: string
          seq?: number | null
          type?: string
        }
        Relationships: []
      }
      presses: {
        Row: {
          created_at: string
          id: string
          link: string
          published_at: string
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          link: string
          published_at: string
          source: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string
          published_at?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      special_awards: {
        Row: {
          active: boolean
          award_category: string
          award_color: string
          award_description: string | null
          award_icon: string | null
          award_label: string
          badge_color: string
          created_at: string
          id: string
          image: string | null
          name: string | null
          seq: number
        }
        Insert: {
          active?: boolean
          award_category: string
          award_color: string
          award_description?: string | null
          award_icon?: string | null
          award_label: string
          badge_color: string
          created_at?: string
          id?: string
          image?: string | null
          name?: string | null
          seq: number
        }
        Update: {
          active?: boolean
          award_category?: string
          award_color?: string
          award_description?: string | null
          award_icon?: string | null
          award_label?: string
          badge_color?: string
          created_at?: string
          id?: string
          image?: string | null
          name?: string | null
          seq?: number
        }
        Relationships: []
      }
      ticket_and_package: {
        Row: {
          description_en: string | null
          description_it: string | null
          filter_key: string[] | null
          height: number | null
          id: number
          image: string | null
          image_position: Json | null
          image_position_mobile: Json | null
          item_category: string | null
          item_id: string | null
          link_url: string | null
          price: number | null
          remark_en: string | null
          remark_it: string | null
          seq: number | null
          sold_out: boolean | null
          sub_title_en: string | null
          sub_title_it: string | null
          title_en: string | null
          title_it: string | null
        }
        Insert: {
          description_en?: string | null
          description_it?: string | null
          filter_key?: string[] | null
          height?: number | null
          id?: number
          image?: string | null
          image_position?: Json | null
          image_position_mobile?: Json | null
          item_category?: string | null
          item_id?: string | null
          link_url?: string | null
          price?: number | null
          remark_en?: string | null
          remark_it?: string | null
          seq?: number | null
          sold_out?: boolean | null
          sub_title_en?: string | null
          sub_title_it?: string | null
          title_en?: string | null
          title_it?: string | null
        }
        Update: {
          description_en?: string | null
          description_it?: string | null
          filter_key?: string[] | null
          height?: number | null
          id?: number
          image?: string | null
          image_position?: Json | null
          image_position_mobile?: Json | null
          item_category?: string | null
          item_id?: string | null
          link_url?: string | null
          price?: number | null
          remark_en?: string | null
          remark_it?: string | null
          seq?: number | null
          sold_out?: boolean | null
          sub_title_en?: string | null
          sub_title_it?: string | null
          title_en?: string | null
          title_it?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          device_id: string | null
          fcm_token: string | null
          id: string
          last_notification_checked_at: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          fcm_token?: string | null
          id?: string
          last_notification_checked_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          fcm_token?: string | null
          id?: string
          last_notification_checked_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          car_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_my_submission_vehicles: {
        Args: { p_access_token: string; p_vehicles: Json }
        Returns: Json
      }
      check_active_car_submission: {
        Args: { p_email: string }
        Returns: boolean
      }
      gen_ref: { Args: { length: number; prefix: string }; Returns: string }
      get_car_submissions_list: {
        Args: {
          p_excluded_statuses?: Database["public"]["Enums"]["submission_status"][]
          p_has_archived_at?: boolean
          p_has_deleted_at?: boolean
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_sort_desc?: boolean
          p_sort_key?: string
          p_statuses?: Database["public"]["Enums"]["submission_status"][]
        }
        Returns: Json
      }
      get_my_submission: { Args: { p_access_token: string }; Returns: Json }
      get_my_submission_edit_vehicle: {
        Args: { p_access_token: string; p_car_id: string }
        Returns: Json
      }
      refresh_car_submission_deleted_at: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      save_car_submission_review: {
        Args: {
          p_expected_updated_at: string
          p_form: Json
          p_form_id: string
          p_submission_id: string
          p_vehicle: Json
        }
        Returns: Json
      }
      submit_car_application: {
        Args: { p_submission: Json; p_vehicles: Json }
        Returns: string
      }
      update_my_submission_vehicle: {
        Args: { p_access_token: string; p_car_id: string; p_vehicle: Json }
        Returns: Json
      }
    }
    Enums: {
      submission_status:
        | "pending"
        | "under_review"
        | "requested_info"
        | "waitlist"
        | "approved"
        | "rejected"
        | "finalized"
        | "archived"
        | "info_received"
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
      submission_status: [
        "pending",
        "under_review",
        "requested_info",
        "waitlist",
        "approved",
        "rejected",
        "finalized",
        "archived",
        "info_received",
      ],
    },
  },
} as const
