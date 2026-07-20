export const config = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  hubUrl: process.env.NEXT_PUBLIC_HUB_URL,
  appUrl: process.env.NEXT_PUBLIC_EXCHANGE_URL,
};
