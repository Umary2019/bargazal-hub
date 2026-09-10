import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({ reference: z.string().min(6) });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Called by the invoice page after Paystack redirects back, so the invoice
// updates immediately instead of waiting for the webhook.
export const Route = createFileRoute("/api/public/paystack/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return json({ error: "Online payments are not configured" }, 503);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        const reference = parsed.data.reference;

        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${secret}` } },
        );
        const result = (await response.json().catch(() => null)) as {
          status?: boolean;
          data?: { status?: string; amount?: number; paid_at?: string; channel?: string };
        } | null;

        if (!response.ok || !result?.status || !result.data) {
          return json({ status: "unknown" }, 502);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (result.data.status === "success") {
          const paidAmount = (result.data.amount ?? 0) / 100;
          const paidAt = result.data.paid_at ?? new Date().toISOString();
          const channel = result.data.channel ?? "online";

          let successRecorded = false;
          try {
            const { data: rpcData, error } = await supabaseAdmin.rpc(
              "record_paystack_success" as never,
              {
                _reference: reference,
                _amount: paidAmount,
                _paid_at: paidAt,
                _channel: channel,
                _raw: result as unknown as Record<string, unknown>,
              } as never,
            );
            if (!error && rpcData) {
              successRecorded = true;
            } else if (error) {
              console.warn("record_paystack_success RPC returned error, executing fallback:", error);
            }
          } catch (rpcErr) {
            console.warn("record_paystack_success RPC threw exception, executing fallback:", rpcErr);
          }

          if (!successRecorded) {
            // Direct database transaction fallback
            const { data: tx } = await supabaseAdmin
              .from("paystack_transactions")
              .select("*")
              .eq("reference", reference)
              .maybeSingle();

            if (tx) {
              if (tx.status !== "success") {
                // Check if payment already exists with this provider_reference
                const { data: existingPayment } = await supabaseAdmin
                  .from("payments")
                  .select("id")
                  .eq("provider_reference", reference)
                  .maybeSingle();

                let paymentId = existingPayment?.id;

                if (!paymentId) {
                  // Fetch linked invoice to get client_id and project_id
                  const { data: inv } = await supabaseAdmin
                    .from("invoices")
                    .select("id, client_id, project_id, total, amount_paid")
                    .eq("id", tx.invoice_id)
                    .single();

                  const clientId = tx.client_id || inv?.client_id;
                  if (!clientId) {
                    throw new Error("Missing client_id for payment");
                  }
                  const projectId = inv?.project_id || null;

                  const { data: newPayment, error: payError } = await supabaseAdmin
                    .from("payments")
                    .insert({
                      client_id: clientId,
                      invoice_id: tx.invoice_id,
                      project_id: projectId,
                      amount: paidAmount,
                      payment_method: "Online Payment",
                      payment_date: paidAt.slice(0, 10),
                      reference,
                      provider_reference: reference,
                      channel,
                      currency: "NGN",
                      notes: `Paystack ${channel}`,
                      payment_number: "",
                    })
                    .select("id")
                    .single();

                  if (payError) {
                    console.error("Direct payment insert error:", payError);
                  } else if (newPayment) {
                    paymentId = newPayment.id;
                  }

                  // Update invoice balance and status
                  if (inv) {
                    const newAmountPaid = Number(inv.amount_paid || 0) + paidAmount;
                    const newStatus =
                      newAmountPaid >= Number(inv.total) && Number(inv.total) > 0
                        ? "Paid"
                        : "Partially Paid";
                    await supabaseAdmin
                      .from("invoices")
                      .update({ amount_paid: newAmountPaid, status: newStatus })
                      .eq("id", tx.invoice_id);
                  }

                  // Update project balance
                  if (projectId) {
                    const { data: projPayments } = await supabaseAdmin
                      .from("payments")
                      .select("amount")
                      .eq("project_id", projectId);

                    const projPaid = (projPayments || []).reduce(
                      (acc, p) => acc + Number(p.amount),
                      0,
                    );
                    await supabaseAdmin
                      .from("projects")
                      .update({ amount_paid: projPaid })
                      .eq("id", projectId);
                  }
                }

                // Update transaction status
                await supabaseAdmin
                  .from("paystack_transactions")
                  .update({
                    status: "success",
                    paid_at: paidAt,
                    channel,
                    raw: result as any,
                    payment_id: paymentId || null,
                  })
                  .eq("id", tx.id);
              }
            }
          }

          return json({
            status: "success",
            reference,
            amount: paidAmount,
            channel,
            paidAt,
          });
        }

        await supabaseAdmin.rpc("mark_paystack_failed" as never, {
          _reference: reference,
          _status: result.data.status === "abandoned" ? "abandoned" : "failed",
          _raw: result as unknown as Record<string, unknown>,
        } as never);
        return json({ status: result.data.status ?? "failed" });
      },
    },
  },
});
