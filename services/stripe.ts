/**
 * Stripe Payment Service
 * Handles all Stripe operations including Connect, payments, and security deposits
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Platform fee configuration
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '12');
const STRIPE_FEE_PERCENTAGE = parseFloat(process.env.STRIPE_FEE_PERCENTAGE || '2.9');
const STRIPE_FEE_FIXED = parseFloat(process.env.STRIPE_FEE_FIXED || '0.30');

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  status: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
  connectedAccountId?: string; // For Stripe Connect
  applicationFeeAmount?: number;
}

export interface CreateDepositHoldParams {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export const stripeService = {
  /**
   * Calculate platform fee for a booking
   */
  calculateFees: (rentalAmount: number) => {
    const platformFee = rentalAmount * (PLATFORM_FEE_PERCENTAGE / 100);
    const stripeFee = rentalAmount * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FEE_FIXED;
    const ownerEarnings = rentalAmount - platformFee;

    return {
      rentalAmount,
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee: Math.round(stripeFee * 100) / 100,
      serviceFee: Math.round(stripeFee * 100) / 100, // Passed to renter
      ownerEarnings: Math.round(ownerEarnings * 100) / 100,
      totalCharge: Math.round((rentalAmount + stripeFee) * 100) / 100,
    };
  },

  /**
   * Create a payment intent for booking
   */
  createPaymentIntent: async ({
    amount,
    currency = 'cad',
    customerId,
    metadata = {},
    description,
    connectedAccountId,
    applicationFeeAmount,
  }: CreatePaymentIntentParams): Promise<PaymentIntent> => {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
      description,
    };

    if (customerId) {
      params.customer = customerId;
    }

    // For Stripe Connect - charge goes to connected account
    if (connectedAccountId && applicationFeeAmount) {
      params.application_fee_amount = Math.round(applicationFeeAmount * 100);
      params.transfer_data = {
        destination: connectedAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
    };
  },

  /**
   * Create a security deposit hold (authorization only, not charge)
   */
  createDepositHold: async ({
    amount,
    currency = 'cad',
    customerId,
    metadata = {},
  }: CreateDepositHoldParams): Promise<PaymentIntent> => {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customerId,
      capture_method: 'manual', // Authorization only
      metadata: {
        ...metadata,
        type: 'security_deposit',
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
    };
  },

  /**
   * Capture security deposit (charge it)
   */
  captureDeposit: async (paymentIntentId: string, amount?: number) => {
    const captureParams: Stripe.PaymentIntentCaptureParams = amount
      ? { amount_to_capture: Math.round(amount * 100) }
      : {};

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      captureParams
    );

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
    };
  },

  /**
   * Release security deposit (cancel authorization)
   */
  releaseDeposit: async (paymentIntentId: string) => {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
    };
  },

  /**
   * Create or retrieve Stripe customer
   */
  createCustomer: async (email: string, name: string, metadata: Record<string, string> = {}) => {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };
  },

  /**
   * Retrieve customer
   */
  getCustomer: async (customerId: string) => {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  },

  /**
   * Process refund
   */
  createRefund: async (
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ) => {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    };
  },

  /**
   * Stripe Connect - Create account link for onboarding
   */
  createAccountLink: async (accountId: string, refreshUrl: string, returnUrl: string) => {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return {
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  },

  /**
   * Stripe Connect - Create connected account
   */
  createConnectedAccount: async (
    email: string,
    country: string = 'CA',
    metadata: Record<string, string> = {}
  ) => {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata,
    });

    return {
      id: account.id,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  },

  /**
   * Stripe Connect - Get account status
   */
  getConnectedAccount: async (accountId: string) => {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      id: account.id,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country,
    };
  },

  /**
   * Stripe Connect - Create transfer to owner
   */
  createTransfer: async (
    amount: number,
    connectedAccountId: string,
    metadata: Record<string, string> = {}
  ) => {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'cad',
      destination: connectedAccountId,
      metadata,
    });

    return {
      id: transfer.id,
      amount: transfer.amount / 100,
      destination: transfer.destination,
    };
  },

  /**
   * Verify webhook signature
   */
  constructWebhookEvent: (payload: string | Buffer, signature: string) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  },

  /**
   * Handle webhook events
   */
  handleWebhook: async (event: Stripe.Event) => {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        // TODO: Update booking status in database
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        // TODO: Notify user and update booking
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);
        // TODO: Update payout account status in database
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', refund.id);
        // TODO: Update booking and notify user
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  },
};

export default stripeService;
