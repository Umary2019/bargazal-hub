import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabaseUrl =
            process.env["SUPABASE_URL"] ||
            process.env["VITE_SUPABASE_URL"];

          const supabaseKey =
            process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
            process.env["SUPABASE_PUBLISHABLE_KEY"] ||
            process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

          if (!supabaseUrl || !supabaseKey) {
            return new Response(
              JSON.stringify({
                status: "error",
                database: "not_configured",
              }),
              {
                status: 500,
                headers: {
                  "content-type": "application/json",
                  "cache-control": "no-store",
                },
              },
            );
          }

          const supabase = createClient(supabaseUrl, supabaseKey);

          const { error } = await supabase
            .from("invoices")
            .select("id")
            .limit(1);

          if (error) {
            return new Response(
              JSON.stringify({
                status: "error",
                database: "unreachable",
              }),
              {
                status: 503,
                headers: {
                  "content-type": "application/json",
                  "cache-control": "no-store",
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              status: "ok",
              database: "connected",
              service: "bargazal",
              time: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
            },
          );
        } catch {
          return new Response(
            JSON.stringify({
              status: "error",
              database: "unreachable",
            }),
            {
              status: 503,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
            },
          );
        }
      },
    },
  },
});   
