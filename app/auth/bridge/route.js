import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getSafeRedirectPath(value) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function getStringValue(value) {
  return typeof value === "string" ? value : null;
}

export async function POST(request) {
  const requestUrl = new URL(request.url);
  console.log("[exchange-bridge] POST received", requestUrl.href);

  const formData = await request.formData();
  const accessToken = getStringValue(formData.get("access_token"));
  const refreshToken = getStringValue(formData.get("refresh_token"));
  const redirectPath = getSafeRedirectPath(getStringValue(formData.get("redirect")));

  console.log("[exchange-bridge] has tokens:", !!accessToken, !!refreshToken, "redirect:", redirectPath);

  if (!accessToken || !refreshToken) {
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || "https://lifelens-web.vercel.app";
    const loginUrl = new URL("/login", hubUrl);
    loginUrl.searchParams.set("redirect", new URL(redirectPath, requestUrl.origin).toString());
    console.log("[exchange-bridge] MISSING TOKENS → redirect to hub login:", loginUrl.href);
    return NextResponse.redirect(loginUrl, 303);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log("[exchange-bridge] supabaseUrl:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "MISSING");
  console.log("[exchange-bridge] supabaseAnonKey:", supabaseAnonKey ? "present" : "MISSING");

  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin), 303);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.log("[exchange-bridge] setSession ERROR:", error.message);
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || "https://lifelens-web.vercel.app";
    const loginUrl = new URL("/login", hubUrl);
    loginUrl.searchParams.set("redirect", new URL(redirectPath, requestUrl.origin).toString());
    return NextResponse.redirect(loginUrl, 303);
  }

  console.log("[exchange-bridge] setSession SUCCESS, user:", data?.user?.id);
  return response;
}
