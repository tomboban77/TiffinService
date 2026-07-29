import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { fetch as undiciFetch } from "undici";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component render; middleware.ts is what
          // actually refreshes the session cookie on the way back out.
        }
      },
    },
    // Next's Node-runtime fetch patch (for its Data Cache) breaks Supabase's
    // POST requests outright in some environments — bypass it with a fetch
    // implementation Next never gets a chance to wrap.
    global: { fetch: undiciFetch as unknown as typeof fetch },
  });
}
