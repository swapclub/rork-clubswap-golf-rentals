/**
 * Listings tRPC Router
 * Complete CRUD operations for listings
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../create-context';
import { supabaseAdmin } from '../../../../lib/supabase';
import { cloudinaryService } from '../../../../services/cloudinary';
import { searchListings } from './search';

const createListingInput = z.object({
  // Basic info
  title: z.string().min(10).max(60),
  description: z.string().min(50).max(500),
  clubType: z.enum([
    'driver',
    'fairway_wood',
    'hybrid',
    'iron_set',
    'wedge_set',
    'putter',
    'complete_set',
  ]),

  // Specifications
  brand: z.string().min(2),
  model: z.string().optional(),
  year: z.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  handedness: z.enum(['right', 'left']),
  flex: z.enum(['extra_stiff', 'stiff', 'regular', 'senior', 'ladies']),
  condition: z.enum(['excellent', 'very_good', 'good', 'fair']),

  // What's included
  includesBag: z.boolean().default(false),
  bagType: z.string().optional(),
  includesBalls: z.boolean().default(false),
  ballCount: z.number().min(0).optional(),
  accessories: z.array(z.string()).optional(),
  clubComposition: z
    .object({
      woods: z.number().optional(),
      hybrids: z.number().optional(),
      irons: z.number().optional(),
      wedges: z.number().optional(),
      putter: z.number().optional(),
    })
    .optional(),

  // Pricing
  dailyRate: z.number().min(20).max(500),
  weeklyRate: z.number().optional(),
  securityDeposit: z.number().min(50).max(300).default(100),

  // Location
  pickupLocationType: z.enum(['golf_course', 'residence', 'both', 'custom']),
  golfCourseId: z.string().uuid().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  province: z.string().min(2),
  neighborhood: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Delivery
  deliveryAvailable: z.boolean().default(false),
  deliveryFee: z.number().min(0).optional(),
  maxDeliveryDistanceKm: z.number().min(5).max(100).optional(),

  // Availability
  minimumRentalDays: z.number().min(1).default(1),
  maximumRentalDays: z.number().min(1).optional(),
  advanceNoticeDays: z.number().min(0).default(1),
  preparationTimeDays: z.number().min(0).default(0),

  // Booking settings
  instantBooking: z.boolean().default(false),
  responseTimeCommitmentHours: z.number().min(1).max(72).default(24),
  cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']).default('moderate'),
  specialInstructions: z.string().max(500).optional(),

  // Photos (base64 encoded)
  photos: z.array(z.string()).min(5).max(10),

  // Status
  isDraft: z.boolean().default(false),
});

export const listingsRouter = router({
  /**
   * Search/filter listings
   */
  search: searchListings,

  /**
   * Get listing by ID
   */
  getById: publicProcedure.input(z.string().uuid()).query(async ({ input: listingId }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');

    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        owner:profiles!owner_id (
          id,
          first_name,
          last_name,
          avatar_url,
          overall_rating,
          total_reviews,
          verification_levels,
          response_rate,
          average_response_time_minutes,
          created_at
        ),
        photos:listing_photos (
          id,
          url,
          cloudinary_public_id,
          position,
          is_primary,
          width,
          height
        ),
        golf_course:golf_courses (
          id,
          name,
          address,
          city,
          province
        )
      `
      )
      .eq('id', listingId)
      .single();

    if (error) throw new Error('Listing not found');

    // Increment view count
    await supabaseAdmin
      .from('listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', listingId);

    return listing;
  }),

  /**
   * Create new listing
   */
  create: protectedProcedure
    .input(createListingInput)
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      try {
        // Create listing
        const { data: listing, error: listingError } = await supabaseAdmin
          .from('listings')
          .insert({
            owner_id: ctx.user.id,
            title: input.title,
            description: input.description,
            club_type: input.clubType,
            brand: input.brand,
            model: input.model,
            year: input.year,
            handedness: input.handedness,
            flex: input.flex,
            condition: input.condition,
            includes_bag: input.includesBag,
            bag_type: input.bagType,
            includes_balls: input.includesBalls,
            ball_count: input.ballCount,
            accessories: input.accessories,
            club_composition: input.clubComposition,
            daily_rate: input.dailyRate,
            weekly_rate: input.weeklyRate,
            security_deposit: input.securityDeposit,
            pickup_location_type: input.pickupLocationType,
            golf_course_id: input.golfCourseId,
            address: input.address,
            city: input.city,
            province: input.province,
            neighborhood: input.neighborhood,
            delivery_available: input.deliveryAvailable,
            delivery_fee: input.deliveryFee,
            max_delivery_distance_km: input.maxDeliveryDistanceKm,
            minimum_rental_days: input.minimumRentalDays,
            maximum_rental_days: input.maximumRentalDays,
            advance_notice_days: input.advanceNoticeDays,
            preparation_time_days: input.preparationTimeDays,
            instant_booking: input.instantBooking,
            response_time_commitment_hours: input.responseTimeCommitmentHours,
            cancellation_policy: input.cancellationPolicy,
            special_instructions: input.specialInstructions,
            is_draft: input.isDraft,
          })
          .select()
          .single();

        if (listingError) throw listingError;

        // Upload photos to Cloudinary
        const photoUploads = input.photos.map((photoData, index) =>
          cloudinaryService.uploadListingPhoto(listing.id, photoData, index)
        );

        const uploadedPhotos = await Promise.all(photoUploads);

        // Save photo records to database
        const photoRecords = uploadedPhotos.map((photo, index) => ({
          listing_id: listing.id,
          url: photo.secureUrl,
          cloudinary_public_id: photo.publicId,
          position: index,
          is_primary: index === 0,
          width: photo.width,
          height: photo.height,
        }));

        const { error: photosError } = await supabaseAdmin
          .from('listing_photos')
          .insert(photoRecords);

        if (photosError) {
          console.error('Error saving photos:', photosError);
        }

        return {
          success: true,
          listing: {
            ...listing,
            photos: photoRecords,
          },
        };
      } catch (error) {
        console.error('Error creating listing:', error);
        throw new Error('Failed to create listing');
      }
    }),

  /**
   * Update listing
   */
  update: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        updates: createListingInput.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Verify ownership
      const { data: listing } = await supabaseAdmin
        .from('listings')
        .select('owner_id')
        .eq('id', input.listingId)
        .single();

      if (!listing || listing.owner_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabaseAdmin
        .from('listings')
        .update(input.updates as any)
        .eq('id', input.listingId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, listing: data };
    }),

  /**
   * Delete listing
   */
  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: listingId, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Verify ownership
      const { data: listing } = await supabaseAdmin
        .from('listings')
        .select('owner_id')
        .eq('id', listingId)
        .single();

      if (!listing || listing.owner_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Delete photos from Cloudinary
      const { data: photos } = await supabaseAdmin
        .from('listing_photos')
        .select('cloudinary_public_id')
        .eq('listing_id', listingId);

      if (photos && photos.length > 0) {
        const publicIds = photos
          .map((p) => p.cloudinary_public_id)
          .filter(Boolean) as string[];
        await cloudinaryService.deleteImages(publicIds);
      }

      // Delete listing (cascade will delete photos)
      const { error } = await supabaseAdmin
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      return { success: true };
    }),

  /**
   * Get user's listings
   */
  getMyListings: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        photos:listing_photos (
          id,
          url,
          position,
          is_primary
        )
      `
      )
      .eq('owner_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return listings || [];
  }),

  /**
   * Toggle favorite
   */
  toggleFavorite: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Check if already favorited
      const { data: existing } = await supabaseAdmin
        .from('favorites')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('listing_id', input.listingId)
        .single();

      if (existing) {
        // Remove favorite
        await supabaseAdmin
          .from('favorites')
          .delete()
          .eq('id', existing.id);

        // Decrement favorite count
        await supabaseAdmin.rpc('decrement_favorite_count', {
          listing_id: input.listingId,
        });

        return { favorited: false };
      } else {
        // Add favorite
        await supabaseAdmin.from('favorites').insert({
          user_id: ctx.user.id,
          listing_id: input.listingId,
        });

        // Increment favorite count
        await supabaseAdmin.rpc('increment_favorite_count', {
          listing_id: input.listingId,
        });

        return { favorited: true };
      }
    }),

  /**
   * Get user's favorites
   */
  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    const { data: favorites, error } = await supabaseAdmin
      .from('favorites')
      .select(
        `
        *,
        listing:listings (
          *,
          owner:profiles!owner_id (
            id,
            first_name,
            last_name,
            avatar_url,
            overall_rating,
            total_reviews
          ),
          photos:listing_photos (
            id,
            url,
            position,
            is_primary
          )
        )
      `
      )
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return favorites?.map((f) => f.listing) || [];
  }),
});

export default listingsRouter;
