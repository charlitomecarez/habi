// Expo inlines EXPO_PUBLIC_* at build time only when each is read by its full name.
const values = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

function required(name: keyof typeof values): string {
  const value = values[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  googleWebClientId: required("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
};
