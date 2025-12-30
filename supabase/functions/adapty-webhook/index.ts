import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, svix-id, svix-timestamp, svix-signature",
};

interface AdaptyEvent {
  event_type: string;
  event_datetime: string;
  profile_id: string;
  customer_user_id: string;
  event_properties: {
    vendor_product_id?: string;
    store?: string;
    environment?: string;
    is_in_grace_period?: boolean;
    activated_at?: string;
    expires_at?: string;
    renewed_at?: string;
    cancelled_at?: string;
    is_refund?: boolean;
    cancellation_reason?: string;
    is_introductory?: boolean;
    is_promotional?: boolean;
    is_trial?: boolean;
    access_level_id?: string;
    will_renew?: boolean;
    original_transaction_id?: string;
  };
}

function getPlanFromProductId(productId: string): string {
  if (productId.includes('premium')) return 'premium';
  if (productId.includes('pro')) return 'pro';
  return 'free';
}

function getBillingCycleFromProductId(productId: string): string | null {
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
  if (productId.includes('monthly')) return 'monthly';
  return null;
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  
  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", message: "Adapty webhook endpoint is active" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const webhookSecret = Deno.env.get("ADAPTY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();

    if (!body || body.trim() === '' || body === '{}') {
      console.log("Received test/verification request - returning 200 OK");
      return new Response(
        JSON.stringify({ status: "ok", message: "Webhook endpoint verified" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let event: AdaptyEvent;
    try {
      event = JSON.parse(body);
    } catch {
      console.log("Invalid JSON in request body - likely a test request");
      return new Response(
        JSON.stringify({ status: "ok", message: "Webhook endpoint active" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!event.event_type || event.event_type === 'test' || event.event_type === 'ping') {
      console.log("Received test/ping event - returning 200 OK");
      return new Response(
        JSON.stringify({ status: "ok", message: "Test event received" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const signature = req.headers.get("svix-signature") || req.headers.get("x-adapty-signature");

    if (webhookSecret && signature && !verifySignature(body, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received Adapty event:", event.event_type, "for user:", event.customer_user_id);

    const userId = event.customer_user_id;
    if (!userId) {
      console.log("No customer_user_id in event - acknowledging without processing");
      return new Response(
        JSON.stringify({ status: "ok", message: "Event acknowledged but not processed (no user ID)" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const props = event.event_properties;
    const productId = props.vendor_product_id || '';
    const planId = getPlanFromProductId(productId);
    const billingCycle = getBillingCycleFromProductId(productId);

    switch (event.event_type) {
      case 'subscription_started':
      case 'subscription_initial_purchase':
      case 'subscription_renewed':
      case 'subscription_restored':
      case 'trial_started': {
        const isTrial = props.is_trial || event.event_type === 'trial_started';
        const status = isTrial ? 'trialing' : 'active';

        const { error: dbError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              plan_id: planId,
              billing_cycle: billingCycle,
              status: status,
              is_trial: isTrial,
              adapty_profile_id: event.profile_id,
              adapty_access_level: props.access_level_id || 'premium',
              original_transaction_id: props.original_transaction_id,
              current_period_end: props.expires_at || null,
            },
            { onConflict: 'user_id' }
          );

        if (dbError) {
          console.error('Database error on purchase/renewal:', dbError);
        } else {
          console.log(`Successfully updated subscription for user: ${userId}, plan: ${planId}, trial: ${isTrial}`);
        }
        break;
      }

      case 'trial_converted': {
        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            is_trial: false,
            current_period_end: props.expires_at || null,
          })
          .eq('user_id', userId);

        if (dbError) {
          console.error('Database error on trial_converted:', dbError);
        } else {
          console.log(`Trial converted to paid for user: ${userId}`);
        }
        break;
      }

      case 'subscription_renewal_cancelled':
      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'trial_renewal_cancelled':
      case 'trial_cancelled':
      case 'trial_expired': {
        const isExpired = event.event_type === 'subscription_expired' || event.event_type === 'trial_expired';
        
        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({
            status: isExpired ? 'expired' : 'canceled',
            canceled_at: props.cancelled_at || new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (dbError) {
          console.error('Database error on cancellation:', dbError);
        } else {
          console.log(`Subscription ${event.event_type} for user: ${userId}`);
        }
        break;
      }

      case 'subscription_refunded': {
        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: 'free',
            status: 'active',
            billing_cycle: null,
            is_trial: false,
            adapty_access_level: null,
            current_period_end: null,
            canceled_at: null,
          })
          .eq('user_id', userId);

        if (dbError) {
          console.error('Database error on refund:', dbError);
        } else {
          console.log(`Subscription refunded, reverted to free for user: ${userId}`);
        }
        break;
      }

      case 'access_level_updated': {
        const isActive = props.access_level_id && props.expires_at && new Date(props.expires_at) > new Date();
        
        if (isActive) {
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({
              adapty_access_level: props.access_level_id,
              current_period_end: props.expires_at,
            })
            .eq('user_id', userId);

          if (dbError) {
            console.error('Database error on access_level_updated:', dbError);
          }
        } else {
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({
              plan_id: 'free',
              status: 'active',
              billing_cycle: null,
              is_trial: false,
              adapty_access_level: null,
              current_period_end: null,
            })
            .eq('user_id', userId);

          if (dbError) {
            console.error('Database error on access revocation:', dbError);
          } else {
            console.log(`Access revoked, reverted to free for user: ${userId}`);
          }
        }
        break;
      }

      case 'billing_issue_detected': {
        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', userId);

        if (dbError) {
          console.error('Database error on billing_issue:', dbError);
        } else {
          console.log(`Billing issue detected for user: ${userId}`);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.event_type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});