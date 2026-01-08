import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const ALLOWED_ORIGINS = [
  "https://mytools.app",
  "https://www.mytools.app",
  Deno.env.get("SUPABASE_URL") || "",
].filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
                   origin.startsWith("http://localhost") ||
                   origin.startsWith("exp://");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = user.id;
    console.log(`[Delete Account] Starting deletion for user: ${userId}`);

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscription?.stripe_subscription_id) {
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeSecretKey) {
        try {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
          });
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
          console.log(`[Delete Account] Canceled Stripe subscription: ${subscription.stripe_subscription_id}`);
        } catch (stripeError) {
          console.warn(`[Delete Account] Failed to cancel Stripe subscription:`, stripeError);
        }
      }
    }

    const { data: storageImages } = await supabase
      .from("storage_images")
      .select("image_uri")
      .eq("user_id", userId);

    if (storageImages && storageImages.length > 0) {
      const filePaths: string[] = [];

      for (const img of storageImages) {
        if (img.image_uri) {
          const urlWithoutQuery = img.image_uri.split("?")[0];
          const filePathMatch = urlWithoutQuery.match(/([a-f0-9-]{36}\/[^/]+)$/) ||
                                urlWithoutQuery.match(/uploads\/(.+)$/);
          if (filePathMatch && filePathMatch[1]) {
            filePaths.push(filePathMatch[1]);
          }
        }
      }

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("storage-images")
          .remove(filePaths);

        if (storageError) {
          console.warn(`[Delete Account] Failed to delete some storage files:`, storageError);
        } else {
          console.log(`[Delete Account] Deleted ${filePaths.length} storage files`);
        }
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(`[Delete Account] Failed to delete user:`, deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Delete Account] Successfully deleted user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Delete Account] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Account deletion failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});