/**
 * Bookings tRPC Router
 * Handles booking creation, management, and payment processing
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../create-context';
import { supabaseAdmin } from '../../../../lib/supabase';
import { stripeService } from '../../../../services/stripe';
import { emailService } from '../../../../services/email';
import { smsService } from '../../../../services/sms';
import { addDays, differenceInDays, format } from 'date-fns';

const createBookingInput = z.object({
  listingId: z.string().uuid(),
  startDate: z.string(), // ISO date string
  endDate: z.string(), // ISO date string
  pickupMethod: z.enum(['owner_location', 'delivery']),
  deliveryAddress: z.string().optional(),
  renterMessage: z.string().max(500).optional(),
  paymentMethodId: z.string(), // Stripe payment method ID
});

export const bookingsRouter = router({
  /**
   * Create a new booking
   */
  create: protectedProcedure
    .input(createBookingInput)
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      try {
        // Get listing details
        const { data: listing, error: listingError } = await supabaseAdmin
          .from('listings')
          .select(
            `
            *,
            owner:profiles!owner_id (
              id,
              email,
              first_name,
              last_name,
              phone_number
            )
          `
          )
          .eq('id', input.listingId)
          .single();

        if (listingError || !listing) {
          throw new Error('Listing not found');
        }

        // Calculate rental days
        const rentalDays = differenceInDays(
          new Date(input.endDate),
          new Date(input.startDate)
        );

        if (rentalDays < listing.minimum_rental_days) {
          throw new Error(
            `Minimum rental period is ${listing.minimum_rental_days} days`
          );
        }

        if (listing.maximum_rental_days && rentalDays > listing.maximum_rental_days) {
          throw new Error(
            `Maximum rental period is ${listing.maximum_rental_days} days`
          );
        }

        // Check availability
        const { data: conflictingBookings } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('listing_id', input.listingId)
          .in('status', ['confirmed', 'in_progress'])
          .or(
            `and(start_date.lte.${input.endDate},end_date.gte.${input.startDate})`
          );

        if (conflictingBookings && conflictingBookings.length > 0) {
          throw new Error('Listing is not available for selected dates');
        }

        // Calculate pricing
        const dailyRate = listing.daily_rate;
        const totalRentalFee =
          rentalDays >= 7 && listing.weekly_rate
            ? Math.floor(rentalDays / 7) * listing.weekly_rate +
              (rentalDays % 7) * dailyRate
            : rentalDays * dailyRate;

        const fees = stripeService.calculateFees(totalRentalFee);
        const deliveryFee =
          input.pickupMethod === 'delivery' ? listing.delivery_fee || 0 : 0;
        const totalAmount = fees.totalCharge + deliveryFee;

        // Get or create Stripe customer
        const { data: renter } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', ctx.user.id)
          .single();

        // Create payment intent
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: totalAmount,
          customerId: input.paymentMethodId,
          metadata: {
            listing_id: input.listingId,
            renter_id: ctx.user.id,
            owner_id: listing.owner_id,
          },
          description: `ClubSwap rental: ${listing.title}`,
        });

        // Create security deposit hold
        const depositHold = await stripeService.createDepositHold({
          amount: listing.security_deposit,
          customerId: input.paymentMethodId,
          metadata: {
            listing_id: input.listingId,
            renter_id: ctx.user.id,
            type: 'security_deposit',
          },
        });

        // Create booking record
        const bookingStatus = listing.instant_booking ? 'confirmed' : 'pending';

        const { data: booking, error: bookingError } = await supabaseAdmin
          .from('bookings')
          .insert({
            listing_id: input.listingId,
            renter_id: ctx.user.id,
            owner_id: listing.owner_id,
            start_date: input.startDate,
            end_date: input.endDate,
            rental_days: rentalDays,
            daily_rate: dailyRate,
            total_rental_fee: totalRentalFee,
            service_fee: fees.serviceFee,
            security_deposit: listing.security_deposit,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_deposit_hold_id: depositHold.id,
            status: bookingStatus,
            pickup_method: input.pickupMethod,
            delivery_address: input.deliveryAddress,
            renter_message: input.renterMessage,
            confirmed_at: listing.instant_booking ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Send notifications
        if (listing.instant_booking) {
          // Send confirmation emails
          await emailService.sendBookingConfirmation(renter!.email, {
            bookingId: booking.id,
            listingTitle: listing.title,
            ownerName: `${listing.owner.first_name} ${listing.owner.last_name}`,
            startDate: format(new Date(input.startDate), 'PPP'),
            endDate: format(new Date(input.endDate), 'PPP'),
            totalAmount,
            pickupAddress: listing.address || listing.neighborhood || listing.city,
          });

          // Send SMS confirmation if phone verified
          if (renter && ctx.user.phone_number) {
            await smsService.sendBookingConfirmation(ctx.user.phone_number, {
              listingTitle: listing.title,
              startDate: format(new Date(input.startDate), 'PPP'),
              endDate: format(new Date(input.endDate), 'PPP'),
              pickupLocation: listing.neighborhood || listing.city,
            });
          }
        } else {
          // Send booking request to owner
          await emailService.sendBookingRequest(listing.owner.email, {
            renterName: `${renter!.first_name} ${renter!.last_name}`,
            listingTitle: listing.title,
            startDate: format(new Date(input.startDate), 'PPP'),
            endDate: format(new Date(input.endDate), 'PPP'),
            message: input.renterMessage || '',
            approveLink: `${process.env.APP_URL}/bookings/${booking.id}/approve`,
            declineLink: `${process.env.APP_URL}/bookings/${booking.id}/decline`,
          });
        }

        return {
          success: true,
          booking,
          requiresApproval: !listing.instant_booking,
        };
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    }),

  /**
   * Get booking by ID
   */
  getById: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ input: bookingId, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select(
          `
          *,
          listing:listings (
            *,
            photos:listing_photos (
              url,
              position,
              is_primary
            )
          ),
          renter:profiles!renter_id (
            id,
            first_name,
            last_name,
            avatar_url,
            phone_number,
            overall_rating,
            total_reviews
          ),
          owner:profiles!owner_id (
            id,
            first_name,
            last_name,
            avatar_url,
            phone_number,
            overall_rating,
            total_reviews
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (error) throw new Error('Booking not found');

      // Verify access
      if (booking.renter_id !== ctx.user.id && booking.owner_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      return booking;
    }),

  /**
   * Get user's bookings (as renter or owner)
   */
  getMyBookings: protectedProcedure
    .input(
      z.object({
        role: z.enum(['renter', 'owner']),
        status: z
          .enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      let query = supabaseAdmin
        .from('bookings')
        .select(
          `
          *,
          listing:listings (
            *,
            photos:listing_photos (
              url,
              position,
              is_primary
            )
          ),
          renter:profiles!renter_id (
            id,
            first_name,
            last_name,
            avatar_url,
            overall_rating,
            total_reviews
          ),
          owner:profiles!owner_id (
            id,
            first_name,
            last_name,
            avatar_url,
            overall_rating,
            total_reviews
          )
        `
        );

      if (input.role === 'renter') {
        query = query.eq('renter_id', ctx.user.id);
      } else {
        query = query.eq('owner_id', ctx.user.id);
      }

      if (input.status) {
        query = query.eq('status', input.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data: bookings, error } = await query;

      if (error) throw error;

      return bookings || [];
    }),

  /**
   * Approve booking request (owner only)
   */
  approve: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: bookingId, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get booking
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, listing:listings(*), renter:profiles!renter_id(*)')
        .eq('id', bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');
      if (booking.owner_id !== ctx.user.id) throw new Error('Unauthorized');
      if (booking.status !== 'pending') {
        throw new Error('Booking is not pending');
      }

      // Update booking status
      const { data: updatedBooking, error } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      // Send confirmation email to renter
      await emailService.sendBookingConfirmation(booking.renter.email, {
        bookingId: booking.id,
        listingTitle: booking.listing.title,
        ownerName: `${ctx.user.first_name} ${ctx.user.last_name}`,
        startDate: format(new Date(booking.start_date), 'PPP'),
        endDate: format(new Date(booking.end_date), 'PPP'),
        totalAmount: booking.total_amount,
        pickupAddress: booking.listing.address || booking.listing.city,
      });

      return { success: true, booking: updatedBooking };
    }),

  /**
   * Decline booking request (owner only)
   */
  decline: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get booking
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', input.bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');
      if (booking.owner_id !== ctx.user.id) throw new Error('Unauthorized');
      if (booking.status !== 'pending') {
        throw new Error('Booking is not pending');
      }

      // Release payment and deposit holds
      if (booking.stripe_payment_intent_id) {
        await stripeService.releaseDeposit(booking.stripe_payment_intent_id);
      }
      if (booking.stripe_deposit_hold_id) {
        await stripeService.releaseDeposit(booking.stripe_deposit_hold_id);
      }

      // Update booking status
      const { data: updatedBooking, error } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'declined',
          owner_decline_reason: input.reason,
        })
        .eq('id', input.bookingId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, booking: updatedBooking };
    }),

  /**
   * Cancel booking
   */
  cancel: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      // Get booking with listing details
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, listing:listings(*)')
        .eq('id', input.bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');

      // Verify user is renter or owner
      if (booking.renter_id !== ctx.user.id && booking.owner_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Calculate refund based on cancellation policy
      const daysUntilStart = differenceInDays(
        new Date(booking.start_date),
        new Date()
      );

      let refundAmount = 0;
      const policy = booking.listing.cancellation_policy;

      if (policy === 'flexible' && daysUntilStart >= 1) {
        refundAmount = booking.total_amount;
      } else if (policy === 'moderate' && daysUntilStart >= 5) {
        refundAmount = booking.total_amount;
      } else if (policy === 'strict' && daysUntilStart >= 7) {
        refundAmount = booking.total_amount * 0.5;
      }

      // Process refund if applicable
      if (refundAmount > 0 && booking.stripe_payment_intent_id) {
        await stripeService.createRefund(
          booking.stripe_payment_intent_id,
          refundAmount,
          'requested_by_customer'
        );
      }

      // Release deposit hold
      if (booking.stripe_deposit_hold_id) {
        await stripeService.releaseDeposit(booking.stripe_deposit_hold_id);
      }

      // Update booking
      const { data: updatedBooking, error } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', input.bookingId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        booking: updatedBooking,
        refundAmount,
      };
    }),

  /**
   * Mark booking as completed
   */
  complete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: bookingId, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');
      if (booking.owner_id !== ctx.user.id) throw new Error('Unauthorized');

      // Release security deposit
      if (booking.stripe_deposit_hold_id && !booking.deposit_released) {
        await stripeService.releaseDeposit(booking.stripe_deposit_hold_id);
      }

      // Update booking
      const { data: updatedBooking, error } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          deposit_released: true,
          deposit_release_date: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, booking: updatedBooking };
    }),
});

export default bookingsRouter;
