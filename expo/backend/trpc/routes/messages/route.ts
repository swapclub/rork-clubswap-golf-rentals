/**
 * Messages tRPC Router
 * Real-time messaging system between renters and owners
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../create-context';
import { supabaseAdmin } from '../../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const messagesRouter = router({
  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    // Get all messages where user is sender or recipient
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(
        `
        *,
        sender:profiles!sender_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        recipient:profiles!recipient_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        listing:listings (
          id,
          title,
          photos:listing_photos (
            url,
            position,
            is_primary
          )
        ),
        booking:bookings (
          id,
          status,
          start_date,
          end_date
        )
      `
      )
      .or(`sender_id.eq.${ctx.user.id},recipient_id.eq.${ctx.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group messages by conversation_id
    const conversationsMap = new Map();

    messages?.forEach((message) => {
      const conversationId = message.conversation_id;

      if (!conversationsMap.has(conversationId)) {
        // Determine the other user
        const otherUser =
          message.sender_id === ctx.user.id ? message.recipient : message.sender;

        conversationsMap.set(conversationId, {
          conversation_id: conversationId,
          other_user: otherUser,
          listing: message.listing,
          booking: message.booking,
          last_message: message,
          unread_count: 0,
          messages: [],
        });
      }

      const conversation = conversationsMap.get(conversationId);

      // Count unread messages
      if (message.recipient_id === ctx.user.id && !message.is_read) {
        conversation.unread_count++;
      }

      // Update last message if this one is newer
      if (
        new Date(message.created_at) >
        new Date(conversation.last_message.created_at)
      ) {
        conversation.last_message = message;
      }
    });

    return Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime()
    );
  }),

  /**
   * Get messages in a conversation
   */
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          recipient:profiles!recipient_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq('conversation_id', input.conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Verify user is part of this conversation
      const userInConversation = messages?.some(
        (m) => m.sender_id === ctx.user.id || m.recipient_id === ctx.user.id
      );

      if (!userInConversation) {
        throw new Error('Unauthorized');
      }

      // Mark messages as read
      const unreadIds = messages
        ?.filter((m) => m.recipient_id === ctx.user.id && !m.is_read)
        .map((m) => m.id);

      if (unreadIds && unreadIds.length > 0) {
        await supabaseAdmin
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .in('id', unreadIds);
      }

      return messages || [];
    }),

  /**
   * Send a message
   */
  send: protectedProcedure
    .input(
      z.object({
        recipientId: z.string().uuid(),
        content: z.string().min(1).max(1000),
        listingId: z.string().uuid().optional(),
        bookingId: z.string().uuid().optional(),
        conversationId: z.string().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Generate conversation ID if not provided
      const conversationId =
        input.conversationId ||
        uuidv4(); // In production, use a deterministic ID based on users + listing/booking

      // Check if booking is confirmed before allowing contact info sharing
      if (input.bookingId) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('status')
          .eq('id', input.bookingId)
          .single();

        // Block phone numbers and emails in messages before booking confirmed
        if (booking?.status !== 'confirmed') {
          const containsContact = /(\d{3}[-.]?\d{3}[-.]?\d{4})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.test(
            input.content
          );

          if (containsContact) {
            throw new Error(
              'Cannot share contact information before booking is confirmed'
            );
          }
        }
      }

      // Create message
      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: ctx.user.id,
          recipient_id: input.recipientId,
          content: input.content,
          listing_id: input.listingId,
          booking_id: input.bookingId,
          image_url: input.imageUrl,
        })
        .select(
          `
          *,
          sender:profiles!sender_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          recipient:profiles!recipient_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      // Create notification for recipient
      await supabaseAdmin.from('notifications').insert({
        user_id: input.recipientId,
        type: 'message',
        title: 'New message',
        message: `You have a new message from ${ctx.user.first_name}`,
        message_id: message.id,
        channels: ['push', 'email'],
      });

      return { success: true, message };
    }),

  /**
   * Mark message as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', input.messageId)
        .eq('recipient_id', ctx.user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, message };
    }),

  /**
   * Mark all messages in conversation as read
   */
  markConversationAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { error } = await supabaseAdmin
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('conversation_id', input.conversationId)
        .eq('recipient_id', ctx.user.id)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true };
    }),

  /**
   * Get unread message count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', ctx.user.id)
      .eq('is_read', false);

    if (error) throw error;

    return { count: count || 0 };
  }),

  /**
   * Flag message as inappropriate
   */
  flagMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        reason: z.string().max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Mark message as flagged
      const { error } = await supabaseAdmin
        .from('messages')
        .update({ is_flagged: true })
        .eq('id', input.messageId);

      if (error) throw error;

      // TODO: Create admin notification for review

      return { success: true };
    }),

  /**
   * Delete message (soft delete - only marks as deleted for sender)
   */
  delete: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Verify sender
      const { data: message } = await supabaseAdmin
        .from('messages')
        .select('sender_id')
        .eq('id', input.messageId)
        .single();

      if (!message || message.sender_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // In production, implement soft delete
      // For now, we'll just prevent deletion
      throw new Error('Messages cannot be deleted');
    }),
});

export default messagesRouter;
