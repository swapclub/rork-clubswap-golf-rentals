/**
 * Authentication & Profile tRPC Router
 * Handles user authentication, profile management, and verification
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../create-context';
import { supabase, supabaseAdmin, auth } from '../../../../lib/supabase';
import { smsService } from '../../../../services/sms';
import { emailService } from '../../../../services/email';
import { stripeService } from '../../../../services/stripe';
import { cloudinaryService } from '../../../../services/cloudinary';

export const authRouter = router({
  /**
   * Sign up with email and password
   */
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        role: z.enum(['renter', 'owner', 'both']).default('renter'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { data, error } = await auth.signUp(input.email, input.password, {
          first_name: input.firstName,
          last_name: input.lastName,
        });

        if (error) throw error;

        // Update profile with role
        if (data.user && supabaseAdmin) {
          await supabaseAdmin
            .from('profiles')
            .update({ role: input.role })
            .eq('id', data.user.id);
        }

        // Send welcome email
        await emailService.sendWelcomeEmail(input.email, input.firstName);

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Failed to sign up');
      }
    }),

  /**
   * Sign in with email and password
   */
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { data, error } = await auth.signIn(input.email, input.password);

        if (error) throw error;

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Failed to sign in');
      }
    }),

  /**
   * Sign out
   */
  signOut: protectedProcedure.mutation(async () => {
    const { error } = await auth.signOut();
    if (error) throw error;
    return { success: true };
  }),

  /**
   * Get current user session
   */
  getSession: publicProcedure.query(async () => {
    const { session, error } = await auth.getSession();
    if (error) throw error;
    return { session };
  }),

  /**
   * Request password reset
   */
  resetPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { error } = await auth.resetPassword(input.email);
      if (error) throw error;

      // Send password reset email
      const resetLink = `${process.env.APP_URL}/reset-password?email=${input.email}`;
      await emailService.sendPasswordResetEmail(input.email, resetLink);

      return { success: true };
    }),

  /**
   * Update password
   */
  updatePassword: protectedProcedure
    .input(z.object({ newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const { error } = await auth.updatePassword(input.newPassword);
      if (error) throw error;
      return { success: true };
    }),

  /**
   * Get user profile
   */
  getProfile: protectedProcedure
    .input(z.string().uuid().optional())
    .query(async ({ input: userId, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');

      const targetUserId = userId || ctx.user?.id;
      if (!targetUserId) throw new Error('User ID required');

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select(
          `
          *,
          home_course:golf_courses (
            id,
            name,
            city,
            province
          )
        `
        )
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      // Hide private info if viewing another user's profile
      if (userId && userId !== ctx.user?.id) {
        return {
          ...profile,
          email: profile.show_email ? profile.email : null,
          phone_number: profile.show_phone ? profile.phone_number : null,
        };
      }

      return profile;
    }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(2).optional(),
        lastName: z.string().min(2).optional(),
        bio: z.string().max(150).optional(),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        handicap: z.number().min(-10).max(54).optional(),
        homeCourseId: z.string().uuid().optional(),
        showEmail: z.boolean().optional(),
        showPhone: z.boolean().optional(),
        avatarBase64: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const updates: any = {};

      if (input.firstName) updates.first_name = input.firstName;
      if (input.lastName) updates.last_name = input.lastName;
      if (input.bio !== undefined) updates.bio = input.bio;
      if (input.experienceLevel) updates.experience_level = input.experienceLevel;
      if (input.handicap !== undefined) updates.handicap = input.handicap;
      if (input.homeCourseId) updates.home_course_id = input.homeCourseId;
      if (input.showEmail !== undefined) updates.show_email = input.showEmail;
      if (input.showPhone !== undefined) updates.show_phone = input.showPhone;

      // Upload avatar if provided
      if (input.avatarBase64) {
        const uploadResult = await cloudinaryService.uploadAvatar(
          ctx.user.id,
          input.avatarBase64
        );
        updates.avatar_url = uploadResult.secureUrl;
      }

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, profile };
    }),

  /**
   * Send phone verification code
   */
  sendPhoneVerification: protectedProcedure
    .input(z.object({ phoneNumber: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error('Not authenticated');

      // Format phone number
      const formattedPhone = smsService.formatPhoneNumber(input.phoneNumber);

      if (!smsService.isValidCanadianPhone(formattedPhone)) {
        throw new Error('Invalid Canadian phone number');
      }

      // Send verification code
      const result = await smsService.sendVerificationCode(formattedPhone);

      // Update phone number in profile (but not verified yet)
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({ phone_number: formattedPhone })
          .eq('id', ctx.user.id);
      }

      return {
        success: true,
        status: result.status,
      };
    }),

  /**
   * Verify phone code
   */
  verifyPhone: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const formattedPhone = smsService.formatPhoneNumber(input.phoneNumber);

      // Verify code with Twilio
      const result = await smsService.verifyCode(formattedPhone, input.code);

      if (!result.success) {
        throw new Error('Invalid verification code');
      }

      // Update profile as phone verified
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update({
          phone_number: formattedPhone,
          phone_verified: true,
          verification_levels: ['email', 'phone'],
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        profile,
      };
    }),

  /**
   * Create Stripe Connect account for receiving payouts
   */
  createPayoutAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    // Check if account already exists
    const { data: existing } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id')
      .eq('user_id', ctx.user.id)
      .single();

    if (existing) {
      // Return existing account link
      const accountLink = await stripeService.createAccountLink(
        existing.stripe_account_id,
        `${process.env.APP_URL}/settings/payout`,
        `${process.env.APP_URL}/settings/payout/complete`
      );
      return { success: true, accountLink: accountLink.url };
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', ctx.user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Create Stripe Connect account
    const account = await stripeService.createConnectedAccount(profile.email, 'CA', {
      user_id: ctx.user.id,
    });

    // Save to database
    await supabaseAdmin.from('payout_accounts').insert({
      user_id: ctx.user.id,
      stripe_account_id: account.id,
      stripe_account_status: 'pending',
      charges_enabled: account.chargesEnabled,
      payouts_enabled: account.payoutsEnabled,
    });

    // Create account link for onboarding
    const accountLink = await stripeService.createAccountLink(
      account.id,
      `${process.env.APP_URL}/settings/payout`,
      `${process.env.APP_URL}/settings/payout/complete`
    );

    return {
      success: true,
      accountLink: accountLink.url,
    };
  }),

  /**
   * Get payout account status
   */
  getPayoutAccount: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    const { data: payoutAccount, error } = await supabaseAdmin
      .from('payout_accounts')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single();

    if (error || !payoutAccount) {
      return null;
    }

    // Get latest status from Stripe
    const stripeAccount = await stripeService.getConnectedAccount(
      payoutAccount.stripe_account_id
    );

    // Update local record
    await supabaseAdmin
      .from('payout_accounts')
      .update({
        charges_enabled: stripeAccount.chargesEnabled,
        payouts_enabled: stripeAccount.payoutsEnabled,
        stripe_account_status: stripeAccount.detailsSubmitted ? 'enabled' : 'pending',
      })
      .eq('id', payoutAccount.id);

    return {
      ...payoutAccount,
      charges_enabled: stripeAccount.chargesEnabled,
      payouts_enabled: stripeAccount.payoutsEnabled,
    };
  }),

  /**
   * Get notification preferences
   */
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!supabaseAdmin) throw new Error('Supabase not configured');
    if (!ctx.user) throw new Error('Not authenticated');

    const { data: prefs, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single();

    if (error) {
      // Create default preferences if none exist
      const { data: newPrefs } = await supabaseAdmin
        .from('notification_preferences')
        .insert({ user_id: ctx.user.id })
        .select()
        .single();
      return newPrefs;
    }

    return prefs;
  }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        bookingNotifications: z.boolean().optional(),
        messageNotifications: z.boolean().optional(),
        reviewNotifications: z.boolean().optional(),
        payoutNotifications: z.boolean().optional(),
        marketingNotifications: z.boolean().optional(),
        dndEnabled: z.boolean().optional(),
        dndStartHour: z.number().min(0).max(23).optional(),
        dndEndHour: z.number().min(0).max(23).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!supabaseAdmin) throw new Error('Supabase not configured');
      if (!ctx.user) throw new Error('Not authenticated');

      const updates: any = {};

      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          updates[snakeKey] = value;
        }
      });

      const { data: prefs, error } = await supabaseAdmin
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', ctx.user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, preferences: prefs };
    }),
});

export default authRouter;
