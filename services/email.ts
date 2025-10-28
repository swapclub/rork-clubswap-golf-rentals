/**
 * Email Service
 * Handles transactional emails using SendGrid or Resend
 */

import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';

// Initialize SendGrid if available
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@clubswap.ca';
const sendGridFromName = process.env.SENDGRID_FROM_NAME || 'ClubSwap';

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
}

// Initialize Resend if available
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const emailService = {
  /**
   * Send email using available provider (SendGrid or Resend)
   */
  sendEmail: async ({ to, subject, html, text, from }: EmailParams) => {
    const fromEmail = from || sendGridFromEmail;

    // Try SendGrid first
    if (sendGridApiKey) {
      try {
        await sgMail.send({
          to,
          from: {
            email: fromEmail,
            name: sendGridFromName,
          },
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });
        return { success: true, provider: 'sendgrid' };
      } catch (error) {
        console.error('SendGrid error:', error);
        throw error;
      }
    }

    // Fallback to Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
          text,
        });
        return { success: true, provider: 'resend' };
      } catch (error) {
        console.error('Resend error:', error);
        throw error;
      }
    }

    throw new Error('No email provider configured');
  },

  /**
   * Send welcome email
   */
  sendWelcomeEmail: async (to: string, firstName: string) => {
    const subject = `Welcome to ClubSwap, ${firstName}!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">Welcome to ClubSwap!</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for joining ClubSwap, Canada's premier golf equipment rental marketplace!</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile verification</li>
          <li>Browse thousands of golf club listings</li>
          <li>List your own clubs to earn extra income</li>
          <li>Book your first rental</li>
        </ul>
        <p>If you have any questions, our support team is here to help!</p>
        <p>Happy golfing,<br>The ClubSwap Team</p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send email verification
   */
  sendVerificationEmail: async (to: string, verificationLink: string) => {
    const subject = 'Verify your ClubSwap email';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">Verify Your Email</h1>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="background-color: #1B5E20; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link: ${verificationLink}
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours.
        </p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send password reset email
   */
  sendPasswordResetEmail: async (to: string, resetLink: string) => {
    const subject = 'Reset your ClubSwap password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">Reset Your Password</h1>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}"
             style="background-color: #1B5E20; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link: ${resetLink}
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send booking confirmation email
   */
  sendBookingConfirmation: async (
    to: string,
    bookingDetails: {
      bookingId: string;
      listingTitle: string;
      ownerName: string;
      startDate: string;
      endDate: string;
      totalAmount: number;
      pickupAddress: string;
    }
  ) => {
    const subject = `Booking Confirmed: ${bookingDetails.listingTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">Booking Confirmed!</h1>
        <p>Your rental has been confirmed. Get ready for a great round of golf!</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Booking Details</h2>
          <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
          <p><strong>Equipment:</strong> ${bookingDetails.listingTitle}</p>
          <p><strong>Owner:</strong> ${bookingDetails.ownerName}</p>
          <p><strong>Rental Period:</strong> ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
          <p><strong>Pickup Location:</strong> ${bookingDetails.pickupAddress}</p>
          <p><strong>Total Paid:</strong> $${bookingDetails.totalAmount.toFixed(2)} CAD</p>
        </div>

        <h3>Next Steps:</h3>
        <ol>
          <li>Contact the owner to arrange pickup details</li>
          <li>Inspect the equipment carefully at pickup</li>
          <li>Enjoy your round!</li>
          <li>Return the equipment on time and in good condition</li>
          <li>Leave a review to help the community</li>
        </ol>

        <p>Questions? Contact us at support@clubswap.ca</p>
        <p>Happy golfing,<br>The ClubSwap Team</p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send booking request email (for non-instant bookings)
   */
  sendBookingRequest: async (
    to: string,
    requestDetails: {
      renterName: string;
      listingTitle: string;
      startDate: string;
      endDate: string;
      message: string;
      approveLink: string;
      declineLink: string;
    }
  ) => {
    const subject = `New Booking Request: ${requestDetails.listingTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">New Booking Request</h1>
        <p>${requestDetails.renterName} wants to rent your equipment!</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Listing:</strong> ${requestDetails.listingTitle}</p>
          <p><strong>Rental Period:</strong> ${requestDetails.startDate} - ${requestDetails.endDate}</p>
          <p><strong>Message from renter:</strong></p>
          <p style="font-style: italic;">"${requestDetails.message}"</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${requestDetails.approveLink}"
             style="background-color: #1B5E20; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            Approve Request
          </a>
          <a href="${requestDetails.declineLink}"
             style="background-color: #666; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Decline Request
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          Please respond within 24 hours to maintain your response rate.
        </p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send payout notification email
   */
  sendPayoutNotification: async (
    to: string,
    payoutDetails: {
      amount: number;
      bookingId: string;
      listingTitle: string;
      expectedDate: string;
    }
  ) => {
    const subject = `Payout on the way: $${payoutDetails.amount.toFixed(2)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">Payout Processed!</h1>
        <p>Great news! Your earnings are on the way.</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${payoutDetails.amount.toFixed(2)} CAD</p>
          <p><strong>Booking ID:</strong> ${payoutDetails.bookingId}</p>
          <p><strong>Listing:</strong> ${payoutDetails.listingTitle}</p>
          <p><strong>Expected in your account:</strong> ${payoutDetails.expectedDate}</p>
        </div>

        <p>Funds will be deposited to your registered bank account within 2-3 business days.</p>
        <p>Keep up the great work!<br>The ClubSwap Team</p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },

  /**
   * Send review reminder email
   */
  sendReviewReminder: async (
    to: string,
    reminderDetails: {
      listingTitle: string;
      reviewLink: string;
    }
  ) => {
    const subject = `How was your rental? Leave a review`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1B5E20;">How Did It Go?</h1>
        <p>We hope you had a great experience with "${reminderDetails.listingTitle}"!</p>
        <p>Your feedback helps build a trusted community. Please take a moment to leave a review.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${reminderDetails.reviewLink}"
             style="background-color: #1B5E20; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Leave a Review
          </a>
        </div>

        <p>Thank you for being part of ClubSwap!<br>The ClubSwap Team</p>
      </div>
    `;
    return emailService.sendEmail({ to, subject, html });
  },
};

export default emailService;
