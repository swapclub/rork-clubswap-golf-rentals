/**
 * Database Types
 * Generated from Supabase schema
 */

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
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone_number: string | null
          phone_verified: boolean
          avatar_url: string | null
          bio: string | null
          role: 'renter' | 'owner' | 'both'
          experience_level: 'beginner' | 'intermediate' | 'advanced' | null
          handicap: number | null
          home_course_id: string | null
          verification_levels: ('email' | 'phone' | 'id' | 'payment')[]
          id_verified: boolean
          stripe_verified: boolean
          overall_rating: number
          total_reviews: number
          total_bookings_as_renter: number
          total_bookings_as_owner: number
          response_rate: number
          average_response_time_minutes: number | null
          preferred_currency: string
          language: string
          timezone: string
          show_email: boolean
          show_phone: boolean
          created_at: string
          updated_at: string
          last_active_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone_number?: string | null
          phone_verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          role?: 'renter' | 'owner' | 'both'
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | null
          handicap?: number | null
          home_course_id?: string | null
          verification_levels?: ('email' | 'phone' | 'id' | 'payment')[]
          id_verified?: boolean
          stripe_verified?: boolean
          overall_rating?: number
          total_reviews?: number
          total_bookings_as_renter?: number
          total_bookings_as_owner?: number
          response_rate?: number
          average_response_time_minutes?: number | null
          preferred_currency?: string
          language?: string
          timezone?: string
          show_email?: boolean
          show_phone?: boolean
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          phone_verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          role?: 'renter' | 'owner' | 'both'
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | null
          handicap?: number | null
          home_course_id?: string | null
          verification_levels?: ('email' | 'phone' | 'id' | 'payment')[]
          id_verified?: boolean
          stripe_verified?: boolean
          overall_rating?: number
          total_reviews?: number
          total_bookings_as_renter?: number
          total_bookings_as_owner?: number
          response_rate?: number
          average_response_time_minutes?: number | null
          preferred_currency?: string
          language?: string
          timezone?: string
          show_email?: boolean
          show_phone?: boolean
          updated_at?: string
          last_active_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          club_type: 'driver' | 'fairway_wood' | 'hybrid' | 'iron_set' | 'wedge_set' | 'putter' | 'complete_set'
          brand: string
          model: string | null
          year: number | null
          handedness: 'right' | 'left'
          flex: 'extra_stiff' | 'stiff' | 'regular' | 'senior' | 'ladies'
          condition: 'excellent' | 'very_good' | 'good' | 'fair'
          serial_numbers: string[] | null
          includes_bag: boolean
          bag_type: string | null
          includes_balls: boolean
          ball_count: number | null
          accessories: string[] | null
          club_composition: Json | null
          daily_rate: number
          weekly_rate: number | null
          security_deposit: number
          pickup_location_type: string | null
          golf_course_id: string | null
          location: unknown // PostGIS geography
          address: string | null
          city: string
          province: string
          neighborhood: string | null
          delivery_available: boolean
          delivery_fee: number | null
          max_delivery_distance_km: number | null
          minimum_rental_days: number
          maximum_rental_days: number | null
          advance_notice_days: number
          preparation_time_days: number
          instant_booking: boolean
          response_time_commitment_hours: number
          cancellation_policy: 'flexible' | 'moderate' | 'strict'
          special_instructions: string | null
          is_active: boolean
          is_draft: boolean
          view_count: number
          favorite_count: number
          booking_count: number
          average_rating: number
          total_reviews: number
          created_at: string
          updated_at: string
          last_booked_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          club_type: 'driver' | 'fairway_wood' | 'hybrid' | 'iron_set' | 'wedge_set' | 'putter' | 'complete_set'
          brand: string
          model?: string | null
          year?: number | null
          handedness: 'right' | 'left'
          flex: 'extra_stiff' | 'stiff' | 'regular' | 'senior' | 'ladies'
          condition: 'excellent' | 'very_good' | 'good' | 'fair'
          serial_numbers?: string[] | null
          includes_bag?: boolean
          bag_type?: string | null
          includes_balls?: boolean
          ball_count?: number | null
          accessories?: string[] | null
          club_composition?: Json | null
          daily_rate: number
          weekly_rate?: number | null
          security_deposit?: number
          pickup_location_type?: string | null
          golf_course_id?: string | null
          location?: unknown
          address?: string | null
          city: string
          province: string
          neighborhood?: string | null
          delivery_available?: boolean
          delivery_fee?: number | null
          max_delivery_distance_km?: number | null
          minimum_rental_days?: number
          maximum_rental_days?: number | null
          advance_notice_days?: number
          preparation_time_days?: number
          instant_booking?: boolean
          response_time_commitment_hours?: number
          cancellation_policy?: 'flexible' | 'moderate' | 'strict'
          special_instructions?: string | null
          is_active?: boolean
          is_draft?: boolean
        }
        Update: {
          title?: string
          description?: string
          club_type?: 'driver' | 'fairway_wood' | 'hybrid' | 'iron_set' | 'wedge_set' | 'putter' | 'complete_set'
          brand?: string
          model?: string | null
          year?: number | null
          handedness?: 'right' | 'left'
          flex?: 'extra_stiff' | 'stiff' | 'regular' | 'senior' | 'ladies'
          condition?: 'excellent' | 'very_good' | 'good' | 'fair'
          daily_rate?: number
          weekly_rate?: number | null
          security_deposit?: number
          is_active?: boolean
          is_draft?: boolean
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          rental_days: number
          daily_rate: number
          total_rental_fee: number
          service_fee: number
          security_deposit: number
          delivery_fee: number
          total_amount: number
          stripe_payment_intent_id: string | null
          stripe_deposit_hold_id: string | null
          deposit_released: boolean
          deposit_captured: boolean
          deposit_release_date: string | null
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined'
          pickup_method: string | null
          pickup_address: string | null
          delivery_address: string | null
          pickup_instructions: string | null
          renter_message: string | null
          owner_decline_reason: string | null
          renter_reviewed: boolean
          owner_reviewed: boolean
          created_at: string
          updated_at: string
          confirmed_at: string | null
          cancelled_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          renter_id: string
          owner_id: string
          start_date: string
          end_date: string
          rental_days: number
          daily_rate: number
          total_rental_fee: number
          service_fee: number
          security_deposit: number
          delivery_fee?: number
          total_amount: number
          stripe_payment_intent_id?: string | null
          stripe_deposit_hold_id?: string | null
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined'
          pickup_method?: string | null
          pickup_address?: string | null
          delivery_address?: string | null
          pickup_instructions?: string | null
          renter_message?: string | null
        }
        Update: {
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined'
          deposit_released?: boolean
          deposit_captured?: boolean
          deposit_release_date?: string | null
          owner_decline_reason?: string | null
          renter_reviewed?: boolean
          owner_reviewed?: boolean
          confirmed_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          booking_id: string | null
          listing_id: string | null
          content: string
          image_url: string | null
          is_read: boolean
          read_at: string | null
          is_flagged: boolean
          is_system_message: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          booking_id?: string | null
          listing_id?: string | null
          content: string
          image_url?: string | null
          is_read?: boolean
          is_system_message?: boolean
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
          is_flagged?: boolean
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          listing_id: string | null
          review_type: 'listing' | 'renter'
          overall_rating: number
          equipment_quality_rating: number | null
          cleanliness_rating: number | null
          communication_rating: number | null
          accuracy_rating: number | null
          value_rating: number | null
          respect_rating: number | null
          timeliness_rating: number | null
          condition_on_return_rating: number | null
          review_text: string | null
          private_feedback: string | null
          owner_response: string | null
          response_created_at: string | null
          response_locked_at: string | null
          is_public: boolean
          is_flagged: boolean
          created_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          reviewer_id: string
          reviewee_id: string
          listing_id?: string | null
          review_type: 'listing' | 'renter'
          overall_rating: number
          equipment_quality_rating?: number | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          accuracy_rating?: number | null
          value_rating?: number | null
          respect_rating?: number | null
          timeliness_rating?: number | null
          condition_on_return_rating?: number | null
          review_text?: string | null
          private_feedback?: string | null
        }
        Update: {
          owner_response?: string | null
          response_created_at?: string | null
          response_locked_at?: string | null
          is_public?: boolean
          is_flagged?: boolean
          published_at?: string | null
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
        }
        Update: {}
      }
    }
    Views: {}
    Functions: {
      search_listings: {
        Args: {
          p_user_lat?: number
          p_user_lng?: number
          p_radius_km?: number
          p_club_types?: string[]
          p_price_min?: number
          p_price_max?: number
          p_handedness?: string
          p_flex?: string[]
          p_instant_booking?: boolean
          p_delivery_available?: boolean
          p_start_date?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          listing_id: string
          distance_km: number
        }[]
      }
      calculate_distance: {
        Args: {
          lat1: number
          lng1: number
          lat2: number
          lng2: number
        }
        Returns: number
      }
    }
  }
}
