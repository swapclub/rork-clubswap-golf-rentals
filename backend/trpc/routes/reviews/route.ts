/**
 * Reviews tRPC Router
 * Double-blind review system for listings and renters
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../../create-context';
import { supabaseAdmin } from '../../../../lib/supabase';
import { addDays } from 'date-fns';

const createListingReviewInput = z.object({
  bookingId: z.string().uuid(),
  overallRating: z.number().min(1).max(5),
  equipmentQualityRating: z.number().min(1).max(5),
  cleanlinessRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  accuracyRating: z.number().min(1).max(5),
  valueRating: z.number().min(1).max(5),
  reviewText: z.string().min(50).max(500).optional(),
  privateFeedback: z.string().max(500).optional(),
});

const createRenterReviewInput = z.object({
  bookingId: z.string().uuid(),
  overallRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  respectRating: z.number().min(1).max(5),
  timelinessRating: z.number().min(1).max(5),
  conditionOnReturnRating: z.number().min(1).max(5),
  reviewText: z.string().min(50).max(500).optional(),
  privateFeedback: z.string().max(500).optional(),
});

export const reviewsRouter = router({
  /**
   * Create listing review (by renter)
   */
  createListingReview: protectedProcedure
    .input(createListingReviewInput)
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('*, listing:listings(*)')
        .eq('id', input.bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      // Verify user is renter
      if (booking.renter_id !== ctx.user.id) {
        throw new Error('Only the renter can review this listing');
      }

      // Verify booking is completed
      if (booking.status !== 'completed') {
        throw new Error('Can only review completed bookings');
      }

      // Check if already reviewed
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('booking_id', input.bookingId)
        .eq('reviewer_id', ctx.user.id)
        .eq('review_type', 'listing')
        .single();

      if (existing) {
        throw new Error('You have already reviewed this booking');
      }

      // Create review
      const { data: review, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .insert({
          booking_id: input.bookingId,
          reviewer_id: ctx.user.id,
          reviewee_id: booking.owner_id,
          listing_id: booking.listing_id,
          review_type: 'listing',
          overall_rating: input.overallRating,
          equipment_quality_rating: input.equipmentQualityRating,
          cleanliness_rating: input.cleanlinessRating,
          communication_rating: input.communicationRating,
          accuracy_rating: input.accuracyRating,
          value_rating: input.valueRating,
          review_text: input.reviewText,
          private_feedback: input.privateFeedback,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Mark booking as reviewed by renter
      await supabaseAdmin
        .from('bookings')
        .update({ renter_reviewed: true })
        .eq('id', input.bookingId);

      // Check if both parties have reviewed (double-blind system)
      const { data: ownerReview } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('booking_id', input.bookingId)
        .eq('review_type', 'renter')
        .single();

      // If both reviewed or 14 days elapsed, publish reviews
      const fourteenDaysAgo = addDays(new Date(), -14);
      const bookingEndDate = new Date(booking.end_date);
      const shouldPublish = ownerReview || bookingEndDate < fourteenDaysAgo;

      if (shouldPublish) {
        const publishedAt = new Date().toISOString();

        await supabaseAdmin
          .from('reviews')
          .update({ published_at: publishedAt })
          .eq('booking_id', input.bookingId);

        // Update listing rating
        await updateListingRating(booking.listing_id);

        // Update owner rating
        await updateUserRating(booking.owner_id);
      }

      return { success: true, review };
    }),

  /**
   * Create renter review (by owner)
   */
  createRenterReview: protectedProcedure
    .input(createRenterReviewInput)
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', input.bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      // Verify user is owner
      if (booking.owner_id !== ctx.user.id) {
        throw new Error('Only the owner can review this renter');
      }

      // Verify booking is completed
      if (booking.status !== 'completed') {
        throw new Error('Can only review completed bookings');
      }

      // Check if already reviewed
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('booking_id', input.bookingId)
        .eq('reviewer_id', ctx.user.id)
        .eq('review_type', 'renter')
        .single();

      if (existing) {
        throw new Error('You have already reviewed this renter');
      }

      // Create review
      const { data: review, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .insert({
          booking_id: input.bookingId,
          reviewer_id: ctx.user.id,
          reviewee_id: booking.renter_id,
          review_type: 'renter',
          overall_rating: input.overallRating,
          communication_rating: input.communicationRating,
          respect_rating: input.respectRating,
          timeliness_rating: input.timelinessRating,
          condition_on_return_rating: input.conditionOnReturnRating,
          review_text: input.reviewText,
          private_feedback: input.privateFeedback,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Mark booking as reviewed by owner
      await supabaseAdmin
        .from('bookings')
        .update({ owner_reviewed: true })
        .eq('id', input.bookingId);

      // Check if both parties have reviewed
      const { data: renterReview } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('booking_id', input.bookingId)
        .eq('review_type', 'listing')
        .single();

      // If both reviewed or 14 days elapsed, publish reviews
      const fourteenDaysAgo = addDays(new Date(), -14);
      const bookingEndDate = new Date(booking.end_date);
      const shouldPublish = renterReview || bookingEndDate < fourteenDaysAgo;

      if (shouldPublish) {
        const publishedAt = new Date().toISOString();

        await supabaseAdmin
          .from('reviews')
          .update({ published_at: publishedAt })
          .eq('booking_id', input.bookingId);

        // Update renter rating
        await updateUserRating(booking.renter_id);
      }

      return { success: true, review };
    }),

  /**
   * Get reviews for a listing
   */
  getListingReviews: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');

      const { data: reviews, error } = await supabaseAdmin
        .from('reviews')
        .select(
          `
          *,
          reviewer:profiles!reviewer_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq('listing_id', input.listingId)
        .eq('review_type', 'listing')
        .eq('is_public', true)
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      // Get total count
      const { count } = await supabaseAdmin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', input.listingId)
        .eq('review_type', 'listing')
        .eq('is_public', true)
        .not('published_at', 'is', null);

      return {
        reviews: reviews || [],
        total: count || 0,
        hasMore: (count || 0) > input.offset + input.limit,
      };
    }),

  /**
   * Get reviews for a user (as owner or renter)
   */
  getUserReviews: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reviewType: z.enum(['listing', 'renter']).optional(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');

      let query = supabaseAdmin
        .from('reviews')
        .select(
          `
          *,
          reviewer:profiles!reviewer_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          listing:listings (
            id,
            title
          )
        `
        )
        .eq('reviewee_id', input.userId)
        .eq('is_public', true)
        .not('published_at', 'is', null);

      if (input.reviewType) {
        query = query.eq('review_type', input.reviewType);
      }

      const { data: reviews, error } = await query
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      // Get total count
      const countQuery = supabaseAdmin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewee_id', input.userId)
        .eq('is_public', true)
        .not('published_at', 'is', null);

      if (input.reviewType) {
        countQuery.eq('review_type', input.reviewType);
      }

      const { count } = await countQuery;

      return {
        reviews: reviews || [],
        total: count || 0,
        hasMore: (count || 0) > input.offset + input.limit,
      };
    }),

  /**
   * Respond to a review (owner only)
   */
  respondToReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().uuid(),
        response: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get review
      const { data: review } = await supabaseAdmin
        .from('reviews')
        .select('*, listing:listings(*)')
        .eq('id', input.reviewId)
        .single();

      if (!review) throw new Error('Review not found');

      // Verify user owns the listing
      if (review.listing?.owner_id !== ctx.user.id) {
        throw new Error('Only the listing owner can respond');
      }

      // Check if already responded
      if (review.owner_response) {
        throw new Error('You have already responded to this review');
      }

      // Add response
      const { data: updatedReview, error } = await supabaseAdmin
        .from('reviews')
        .update({
          owner_response: input.response,
          response_created_at: new Date().toISOString(),
          response_locked_at: addDays(new Date(), 2).toISOString(), // Lock after 48 hours
        })
        .eq('id', input.reviewId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, review: updatedReview };
    }),

  /**
   * Flag review as inappropriate
   */
  flagReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().uuid(),
        reason: z.string().max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { error } = await supabaseAdmin
        .from('reviews')
        .update({ is_flagged: true })
        .eq('id', input.reviewId);

      if (error) throw error;

      // TODO: Create admin notification for review

      return { success: true };
    }),
});

/**
 * Helper: Update listing average rating
 */
async function updateListingRating(listingId: string) {
  if (!supabaseAdmin) return;

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('overall_rating')
    .eq('listing_id', listingId)
    .eq('review_type', 'listing')
    .not('published_at', 'is', null);

  if (!reviews || reviews.length === 0) return;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;

  await supabaseAdmin
    .from('listings')
    .update({
      average_rating: Math.round(avgRating * 100) / 100,
      total_reviews: reviews.length,
    })
    .eq('id', listingId);
}

/**
 * Helper: Update user average rating
 */
async function updateUserRating(userId: string) {
  if (!supabaseAdmin) return;

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('overall_rating')
    .eq('reviewee_id', userId)
    .not('published_at', 'is', null);

  if (!reviews || reviews.length === 0) return;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;

  await supabaseAdmin
    .from('profiles')
    .update({
      overall_rating: Math.round(avgRating * 100) / 100,
      total_reviews: reviews.length,
    })
    .eq('id', userId);
}

export default reviewsRouter;
