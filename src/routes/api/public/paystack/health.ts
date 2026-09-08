import { createFileRoute } from "@tanstack/react-router";

// Reports whether the backend can read the Paystack settings. Never returns values.
export const Route = createFileRoute("/api/public/paystack/health")({
  server: {
    handlers: {
      GET: async () => {
        const secret = process.env["PAYSTACK_SECRET_KEY"] ?? "";
        const appUrl = process.env["PUBLIC_APP_URL"] ?? "";
        let paystackReachable: boolean | null = null;
        if (secret) {
          try {
            const response = await fetch("https://api.paystack.co/balance", {
              headers: { Authorization: `Bearer ${secret}` },
            });
            paystackReachable = response.ok;
          } catch {
            paystackReachable = false;
          }
        }
        return new Response(
          JSON.stringify({
            paystackSecretConfigured: secret.length > 0,
            publicAppUrlConfigured: appUrl.length > 0,
            paystackKeyAccepted: paystackReachable,
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
