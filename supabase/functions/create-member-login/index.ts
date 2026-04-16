import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type RequestBody = {
  memberId?: string;
  email?: string;
  phone?: string;
  fullName?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        error: "Missing required Supabase environment variables.",
      });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Missing Authorization header." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse(401, {
        error: userError?.message || "Could not verify requesting user.",
      });
    }

    const { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfileError || requesterProfile?.role !== "admin") {
      return jsonResponse(403, {
        error: "Only admins can create member logins.",
      });
    }

    const body = (await request.json()) as RequestBody;
    const memberId = `${body.memberId || ""}`.trim();
    const email = `${body.email || ""}`.trim().toLowerCase();
    const phone = `${body.phone || ""}`.replace(/\D/g, "");
    const fullName = `${body.fullName || ""}`.trim();

    if (!memberId || !email || !phone || !fullName) {
      return jsonResponse(400, {
        error: "memberId, email, phone, and fullName are required.",
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, auth_user_id, member_code, full_name, phone, email")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return jsonResponse(404, {
        error: memberError?.message || "Member not found.",
      });
    }

    if (member.auth_user_id) {
      return jsonResponse(200, {
        authUserId: member.auth_user_id,
        memberCode: member.member_code,
        message: "Member already has a linked login.",
      });
    }

    const initialPassword = phone;

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createUserError || !createdUser.user) {
      return jsonResponse(400, {
        error: createUserError?.message || "Could not create member auth user.",
      });
    }

    const authUserId = createdUser.user.id;

    const { error: memberUpdateError } = await adminClient
      .from("members")
      .update({
        auth_user_id: authUserId,
        email,
        phone,
      })
      .eq("id", memberId);

    if (memberUpdateError) {
      return jsonResponse(500, {
        error: `Auth user created, but member link failed: ${memberUpdateError.message}`,
      });
    }

    const { error: profileUpsertError } = await adminClient.from("profiles").upsert({
      id: authUserId,
      full_name: fullName,
      role: "member",
      phone,
      email,
      member_id: memberId,
    });

    if (profileUpsertError) {
      return jsonResponse(500, {
        error: `Auth user created, but profile link failed: ${profileUpsertError.message}`,
      });
    }

    return jsonResponse(200, {
      authUserId,
      memberCode: member.member_code,
      email,
      initialPassword,
      message: "Member login created successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { error: message });
  }
});
