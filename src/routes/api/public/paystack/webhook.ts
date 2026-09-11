import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    channel?: string;
    status?: string;
    customer?: { email?: string };
    metadata?: {
      invoice_id?: string;
      invoice_number?: string;
      client_id?: string;
    };
  };
};

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as PaystackEvent;
        const reference = payload.data?.reference;
        if (!reference) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (payload.event === "charge.success" && payload.data?.status === "success") {
          const currency = (payload.data.currency || "").toUpperCase();
          if (currency && currency !== "NGN") {
            console.warn("Paystack webhook ignored: currency mismatch:", currency);
            return new Response("Invalid currency", { status: 400 });
          }

          const paidAmount = (payload.data.amount ?? 0) / 100;
          if (paidAmount <= 0) {
            console.warn("Paystack webhook ignored: non-positive amount:", payload.data.amount);
            return new Response("Invalid amount", { status: 400 });
          }

          const paidAt = payload.data.paid_at ?? new Date().toISOString();
          const channel = payload.data.channel ?? "online";

          let successRecorded = false;
          try {
            const { data: rpcData, error } = await supabaseAdmin.rpc(
              "record_paystack_success" as never,
              {
                _reference: reference,
                _amount: paidAmount,
                _paid_at: paidAt,
                _channel: channel,
                _raw: payload as unknown as Record<string, unknown>,
              } as never,
            );
            if (!error && (rpcData as any)?.ok) {
              successRecorded = true;
            } else if (error || (rpcData as any)?.ok === false) {
              console.warn("record_paystack_success RPC returned error in webhook:", error || rpcData);
            }
          } catch (rpcErr) {
            console.warn("record_paystack_success RPC exception in webhook:", rpcErr);
          }

          if (!successRecorded) {
            // Direct fallback
            const { data: tx } = await supabaseAdmin
              .from("paystack_transactions")
              .select("*")
              .eq("reference", reference)
              .maybeSingle();

            if (tx && tx.status !== "success") {
              const { data: existingPayment } = await supabaseAdmin
                .from("payments")
                .select("id")
                .eq("reference", reference)
                .maybeSingle();

              let paymentId = existingPayment?.id;

              if (!paymentId) {
                const { data: inv } = await supabaseAdmin
                  .from("invoices")
                  .select("id, client_id, project_id, total, amount_paid")
                  .eq("id", tx.invoice_id)
                  .single();

                const clientId = tx.client_id || inv?.client_id;
                if (!clientId) {
                  return Response.json({ error: "Missing client_id for payment" }, { status: 400 });
                }
                const projectId = inv?.project_id || null;

                const { data: newPayment } = await supabaseAdmin
                  .from("payments")
                  .insert({
                    client_id: clientId,
                    invoice_id: tx.invoice_id,
                    project_id: projectId,
                    amount: paidAmount,
                    payment_method: "Online Payment",
                    payment_date: paidAt.slice(0, 10),
                    reference,
                    notes: `Paystack ${channel}`,
                    payment_number: "",
                  })
                  .select("id")
                  .single();

                if (newPayment) paymentId = newPayment.id;

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

              await supabaseAdmin
                .from("paystack_transactions")
                .update({
                  status: "success",
                  paid_at: paidAt,
                  channel,
                  raw: payload as any,
                  payment_id: paymentId || null,
                })
                .eq("id", tx.id);
            }
          }
        } else if (payload.event === "charge.failed") {
          await supabaseAdmin.rpc("mark_paystack_failed" as never, {
            _reference: reference,
            _status: "failed",
            _raw: payload as unknown as Record<string, unknown>,
          } as never);
        }

        return new Response("ok");
      },
    },
  },
});
