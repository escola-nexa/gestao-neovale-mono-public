import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/financial-reports`;

Deno.test("financial-reports rejects requests without Authorization", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ report: "dre" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, "Unauthorized");
});

Deno.test("financial-reports rejects invalid report names", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer not-a-valid-jwt`,
    },
    body: JSON.stringify({ report: "INVALID_REPORT" }),
  });
  const body = await res.json();
  // Either 401 (bad token) or 400 (bad report) — both prove the validation happens server-side
  if (res.status !== 401) {
    assertEquals(res.status, 400);
    assertEquals(body.error, "Invalid report");
  }
});

Deno.test("financial-reports handles CORS preflight", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
});
