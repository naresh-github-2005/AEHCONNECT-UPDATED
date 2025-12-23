import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const demoUsers = [
      { email: "admin@hospital.com", password: "admin123", role: "admin" as const },
      { email: "doctor@hospital.com", password: "doctor123", role: "doctor" as const },
    ];

    const results: { email: string; status: string; userId?: string }[] = [];

    for (const demo of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === demo.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email: demo.email, status: "already exists", userId });
      } else {
        // Create user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: demo.email,
          password: demo.password,
          email_confirm: true,
        });

        if (authError) {
          results.push({ email: demo.email, status: `error: ${authError.message}` });
          continue;
        }

        userId = authData.user.id;
        results.push({ email: demo.email, status: "created", userId });
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingRole) {
        // Insert role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: demo.role });

        if (roleError) {
          console.error(`Error inserting role for ${demo.email}:`, roleError);
        }
      }

      // For doctor role, link to a doctor profile
      if (demo.role === "doctor") {
        // Get first doctor without a user_id linked
        const { data: doctor } = await supabase
          .from("doctors")
          .select("id")
          .is("user_id", null)
          .limit(1)
          .maybeSingle();

        if (doctor) {
          await supabase
            .from("doctors")
            .update({ user_id: userId })
            .eq("id", doctor.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error seeding demo users:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
