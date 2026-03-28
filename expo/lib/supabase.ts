/**
 * Supabase Client Configuration
 * Provides both client-side and server-side Supabase clients
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

// Environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Client-side Supabase client (for React Native/Web)
 * Uses AsyncStorage for session persistence
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Server-side Supabase client (for backend/API routes)
 * Uses service role key for elevated permissions
 * WARNING: Never expose this client to the frontend!
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Auth helpers
 */
export const auth = {
  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign in with OAuth provider (Google, Apple)
   */
  signInWithOAuth: async (provider: 'google' | 'apple') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: process.env.APP_URL,
      },
    });
    return { data, error };
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/reset-password`,
    });
    return { data, error };
  },

  /**
   * Update password
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  /**
   * Update user metadata
   */
  updateUser: async (metadata: Record<string, any>) => {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });
    return { data, error };
  },
};

/**
 * Real-time subscription helpers
 */
export const realtime = {
  /**
   * Subscribe to messages for a conversation
   */
  subscribeToMessages: (
    conversationId: string,
    callback: (message: any) => void
  ) => {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Subscribe to booking updates
   */
  subscribeToBooking: (bookingId: string, callback: (booking: any) => void) => {
    return supabase
      .channel(`booking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications: (userId: string, callback: (notification: any) => void) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },
};

/**
 * Storage helpers for file uploads
 */
export const storage = {
  /**
   * Upload listing photo
   */
  uploadListingPhoto: async (
    listingId: string,
    file: Blob,
    filename: string
  ) => {
    const path = `listings/${listingId}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage
      .from('listing-photos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) return { data: null, error };

    const { data: urlData } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(path);

    return { data: { path, url: urlData.publicUrl }, error: null };
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (userId: string, file: Blob, filename: string) => {
    const path = `avatars/${userId}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) return { data: null, error };

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return { data: { path, url: urlData.publicUrl }, error: null };
  },

  /**
   * Delete file from storage
   */
  deleteFile: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    return { data, error };
  },
};

export default supabase;
