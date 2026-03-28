/**
 * Twilio SMS Service
 * Handles SMS verification and notifications
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const smsService = {
  /**
   * Send verification code using Twilio Verify
   */
  sendVerificationCode: async (phoneNumber: string) => {
    if (!client || !verifyServiceSid) {
      throw new Error('Twilio is not configured');
    }

    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
        });

      return {
        success: true,
        status: verification.status,
        to: verification.to,
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw error;
    }
  },

  /**
   * Verify code entered by user
   */
  verifyCode: async (phoneNumber: string, code: string) => {
    if (!client || !verifyServiceSid) {
      throw new Error('Twilio is not configured');
    }

    try {
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          to: phoneNumber,
          code,
        });

      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status,
        valid: verificationCheck.valid,
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
    }
  },

  /**
   * Send SMS notification (non-verification)
   */
  sendSMS: async (to: string, message: string) => {
    if (!client || !phoneNumber) {
      throw new Error('Twilio is not configured');
    }

    try {
      const sms = await client.messages.create({
        body: message,
        from: phoneNumber,
        to,
      });

      return {
        success: true,
        sid: sms.sid,
        status: sms.status,
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  },

  /**
   * Send booking confirmation SMS
   */
  sendBookingConfirmation: async (phoneNumber: string, bookingDetails: {
    listingTitle: string;
    startDate: string;
    endDate: string;
    pickupLocation: string;
  }) => {
    const message = `ClubSwap: Your booking for "${bookingDetails.listingTitle}" is confirmed! Pickup: ${bookingDetails.startDate} at ${bookingDetails.pickupLocation}. Return: ${bookingDetails.endDate}.`;
    return smsService.sendSMS(phoneNumber, message);
  },

  /**
   * Send booking reminder SMS
   */
  sendBookingReminder: async (phoneNumber: string, listingTitle: string, hours: number) => {
    const message = `ClubSwap Reminder: Your rental for "${listingTitle}" starts in ${hours} hours. Have a great round!`;
    return smsService.sendSMS(phoneNumber, message);
  },

  /**
   * Send return reminder SMS
   */
  sendReturnReminder: async (phoneNumber: string, listingTitle: string, returnDate: string) => {
    const message = `ClubSwap: Please return "${listingTitle}" by ${returnDate}. Thank you!`;
    return smsService.sendSMS(phoneNumber, message);
  },

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber: (phoneNumber: string, countryCode: string = '+1'): string => {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // If it starts with country code, return as is
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }

    // If 10 digits, add country code
    if (digits.length === 10) {
      return `${countryCode}${digits}`;
    }

    // Otherwise return with country code
    return `${countryCode}${digits}`;
  },

  /**
   * Validate Canadian phone number
   */
  isValidCanadianPhone: (phoneNumber: string): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  },
};

export default smsService;
