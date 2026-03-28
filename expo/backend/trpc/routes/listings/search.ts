/**
 * Listings Search tRPC Route
 * Handles searching, filtering, and discovery of listings
 */

import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { supabaseAdmin } from '../../../../lib/supabase';

export const searchListingsInput = z.object({
  // Location
  userLat: z.number().optional(),
  userLng: z.number().optional(),
  radiusKm: z.number().min(5).max(500).default(50),

  // Filters
  clubTypes: z
    .array(
      z.enum([
        'driver',
        'fairway_wood',
        'hybrid',
        'iron_set',
        'wedge_set',
        'putter',
        'complete_set',
      ])
    )
    .optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().max(1000).optional(),
  handedness: z.enum(['right', 'left']).optional(),
  flex: z
    .array(z.enum(['extra_stiff', 'stiff', 'regular', 'senior', 'ladies']))
    .optional(),
  instantBooking: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),

  // Availability
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Search
  searchQuery: z.string().optional(),

  // Pagination
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),

  // Sort
  sortBy: z
    .enum(['distance', 'price_asc', 'price_desc', 'rating', 'newest', 'popular'])
    .default('distance'),
});

export const searchListings = publicProcedure
  .input(searchListingsInput)
  .query(async ({ input }) => {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured');
    }

    try {
      // Build the query
      let query = supabaseAdmin
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
            response_rate
          ),
          photos:listing_photos (
            id,
            url,
            position,
            is_primary
          )
        `
        )
        .eq('is_active', true)
        .eq('is_draft', false);

      // Apply filters
      if (input.clubTypes && input.clubTypes.length > 0) {
        query = query.in('club_type', input.clubTypes);
      }

      if (input.priceMin !== undefined) {
        query = query.gte('daily_rate', input.priceMin);
      }

      if (input.priceMax !== undefined) {
        query = query.lte('daily_rate', input.priceMax);
      }

      if (input.handedness) {
        query = query.eq('handedness', input.handedness);
      }

      if (input.flex && input.flex.length > 0) {
        query = query.in('flex', input.flex);
      }

      if (input.instantBooking !== undefined) {
        query = query.eq('instant_booking', input.instantBooking);
      }

      if (input.deliveryAvailable !== undefined) {
        query = query.eq('delivery_available', input.deliveryAvailable);
      }

      // Search query (title, description, brand)
      if (input.searchQuery) {
        query = query.or(
          `title.ilike.%${input.searchQuery}%,description.ilike.%${input.searchQuery}%,brand.ilike.%${input.searchQuery}%`
        );
      }

      // Apply sorting
      switch (input.sortBy) {
        case 'price_asc':
          query = query.order('daily_rate', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('daily_rate', { ascending: false });
          break;
        case 'rating':
          query = query.order('average_rating', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('booking_count', { ascending: false });
          break;
        default:
          // Distance sorting handled below
          break;
      }

      // Apply pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data: listings, error } = await query;

      if (error) throw error;

      // Calculate distances if location provided
      let listingsWithDistance = listings || [];
      if (input.userLat && input.userLng) {
        listingsWithDistance = listings
          ?.map((listing) => {
            // Extract lat/lng from PostGIS geography
            // This is a simplified version - in production, use proper PostGIS queries
            const distance = calculateDistance(
              input.userLat!,
              input.userLng!,
              43.651070, // Placeholder - should extract from listing.location
              -79.347015
            );

            return {
              ...listing,
              distance_km: Math.round(distance * 10) / 10,
            };
          })
          .filter((listing) => listing.distance_km <= input.radiusKm)
          .sort((a, b) => {
            if (input.sortBy === 'distance') {
              return a.distance_km - b.distance_km;
            }
            return 0;
          }) || [];
      }

      // Filter by availability
      if (input.startDate && input.endDate) {
        const availableListings = [];
        for (const listing of listingsWithDistance) {
          const { data: conflictingBookings } = await supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('listing_id', listing.id)
            .in('status', ['confirmed', 'in_progress'])
            .or(
              `and(start_date.lte.${input.endDate},end_date.gte.${input.startDate})`
            );

          if (!conflictingBookings || conflictingBookings.length === 0) {
            availableListings.push(listing);
          }
        }
        listingsWithDistance = availableListings;
      }

      return {
        listings: listingsWithDistance,
        total: listingsWithDistance.length,
        hasMore: listingsWithDistance.length === input.limit,
      };
    } catch (error) {
      console.error('Error searching listings:', error);
      throw new Error('Failed to search listings');
    }
  });

// Helper function to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default searchListings;
