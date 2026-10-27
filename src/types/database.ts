export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'ADMIN' | 'MEMBER'
          auto_approve_own_reservations: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'ADMIN' | 'MEMBER'
          auto_approve_own_reservations?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'ADMIN' | 'MEMBER'
          auto_approve_own_reservations?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      invitations: {
        Row: {
          id: string
          email: string
          token: string
          invited_by: string
          used: boolean
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          email: string
          token: string
          invited_by: string
          used?: boolean
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          email?: string
          token?: string
          invited_by?: string
          used?: boolean
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      reservations: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests: number
          comment: string | null
          admin_comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests: number
          comment?: string | null
          admin_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests?: number
          comment?: string | null
          admin_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reservations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      property_info: {
        Row: {
          id: string
          opening_time: string | null
          closing_time: string | null
          practical_info: string | null
          opening_checklist: unknown | null
          closing_checklist: unknown | null
          general_info: string | null
          address: string | null
          wifi_network: string | null
          wifi_password: string | null
          contacts: unknown | null
          trash_schedule: unknown | null
          apartment_rules: unknown | null
          custom_info_items: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          opening_time?: string | null
          closing_time?: string | null
          practical_info?: string | null
          opening_checklist?: unknown | null
          closing_checklist?: unknown | null
          general_info?: string | null
          address?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
          contacts?: unknown | null
          trash_schedule?: unknown | null
          apartment_rules?: unknown | null
          custom_info_items?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          opening_time?: string | null
          closing_time?: string | null
          practical_info?: string | null
          opening_checklist?: unknown | null
          closing_checklist?: unknown | null
          general_info?: string | null
          address?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
          contacts?: unknown | null
          trash_schedule?: unknown | null
          apartment_rules?: unknown | null
          custom_info_items?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      guestbook_entries: {
        Row: {
          id: string
          user_id: string
          reservation_id: string | null
          message: string
          photos: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reservation_id?: string | null
          message: string
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reservation_id?: string | null
          message?: string
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'guestbook_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'guestbook_entries_reservation_id_fkey'
            columns: ['reservation_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
        ]
      }

      guestbook_photos: {
        Row: {
          id: string
          entry_id: string
          storage_path: string
          url: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          storage_path: string
          url: string
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          storage_path?: string
          url?: string
          order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'guestbook_photos_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'guestbook_entries'
            referencedColumns: ['id']
          },
        ]
      }

      local_guide_entries: {
        Row: {
          id: string
          category: 'restaurant' | 'activite' | 'service' | 'commerce'
          name: string
          description: string | null
          image_url: string | null
          phone: string | null
          email: string | null
          address: string | null
          website: string | null
          access_instructions: string | null
          tags: string[] | null
          seasons: ('hiver' | 'ete')[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: 'restaurant' | 'activite' | 'service' | 'commerce'
          name: string
          description?: string | null
          image_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          website?: string | null
          access_instructions?: string | null
          tags?: string[] | null
          seasons?: ('hiver' | 'ete')[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: 'restaurant' | 'activite' | 'service' | 'commerce'
          name?: string
          description?: string | null
          image_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          website?: string | null
          access_instructions?: string | null
          tags?: string[] | null
          seasons?: ('hiver' | 'ete')[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

    }
    Views: Record<string, never>
    Enums: {
      user_role: 'ADMIN' | 'MEMBER'
      reservation_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
      local_guide_season: 'hiver' | 'ete'
    }
    CompositeTypes: Record<string, never>
    Functions: {
      is_admin: { Args: { user_id: string }; Returns: boolean }
      upsert_user_from_auth: { Args: Record<string, unknown>; Returns: unknown }
      get_users_needing_role_sync: {
        Args: Record<string, never>
        Returns: { user_id: string; public_role: string; auth_role: string | null }[]
      }
      try_create_first_admin: {
        Args: { p_id: string; p_email: string; p_name?: string | null }
        // Inline Returns — avoid self-ref on Database (breaks rpc Args → undefined)
        Returns: {
          id: string
          email: string
          name: string | null
          role: 'ADMIN' | 'MEMBER'
          created_at: string
          updated_at: string
        }
      }
      create_reservation: {
        Args: {
          p_user_id: string
          p_start: string
          p_end: string
          p_guests: number
          p_comment?: string | null
          p_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
        }
        Returns: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests: number
          comment: string | null
          admin_comment: string | null
          created_at: string
          updated_at: string
        }
      }
      decide_reservation: {
        Args: { p_id: string; p_action: string; p_admin_comment?: string | null }
        Returns: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests: number
          comment: string | null
          admin_comment: string | null
          created_at: string
          updated_at: string
        }
      }
      update_reservation_dates: {
        Args: {
          p_id: string
          p_start: string
          p_end: string
          p_guests: number
          p_comment?: string | null
          p_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null
          p_admin_comment?: string | null
        }
        Returns: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
          guests: number
          comment: string | null
          admin_comment: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
