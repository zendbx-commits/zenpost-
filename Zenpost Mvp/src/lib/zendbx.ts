import { createClient } from "@zendbx/sdk";

// Create a single shared ZendBX client instance
// This is the single source of truth for all application data
export const zendbx = createClient({
  apiUrl: import.meta.env.VITE_ZENDBX_API_URL || "https://api.zendbx.in",
  anonKey: import.meta.env.VITE_ZENDBX_ANON_KEY,
  projectSlug: import.meta.env.VITE_ZENDBX_PROJECT_SLUG || "zen-smoking-post"
});

export default zendbx;
