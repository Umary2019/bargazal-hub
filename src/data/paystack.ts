import { supabase } from "@/integrations/supabase/client";

export interface PaystackInitResponse {
  authorizationUrl: string;
  reference: string;
  error?: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "abandoned" | "error" | "unknown";
  reference?: string;
  amount?: number;
  channel?: string;
  paidAt?: string;
  error?: string;
}

/**
 * Initiates a Paystack checkout transaction server-side.
 * The secret key remains safely on the server.
 */
export async function initiatePaystackPayment({
  invoiceId,
  token,
  email,
  callbackUrl,
}: {
  invoiceId?: string;
  token?: string;
  email?: string;
  callbackUrl?: string;
}): Promise<PaystackInitResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch("/api/public/paystack/init", {
    method: "POST",
    headers,
    body: JSON.stringify({
      invoiceId,
      token,
      email,
      callbackUrl,
    }),
  });

  const payload = await response.json().catch(() => ({ error: "Failed to parse server response" }));
  if (!response.ok || !payload.authorizationUrl) {
    throw new Error(payload.error || "Could not initialize payment. Please try again.");
  }

  return payload as PaystackInitResponse;
}

/**
 * Verifies a Paystack transaction reference server-side with Paystack.
 * Automatically updates invoice and payment records upon verification.
 */
export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch("/api/public/paystack/verify", {
    method: "POST",
    headers,
    body: JSON.stringify({ reference }),
  });

  const payload = await response.json().catch(() => ({ error: "Failed to parse verify response" }));
  if (!response.ok) {
    throw new Error(payload.error || "Payment verification failed.");
  }

  return payload as PaystackVerifyResponse;
}
