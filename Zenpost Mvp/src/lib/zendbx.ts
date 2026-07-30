import { createClient } from "@zendbx/sdk";

// Create a single shared ZendBX client instance
// This is the single source of truth for all application data
export const zendbx = createClient({
  apiUrl: "https://api.zendbx.in",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6ZW5kYngiLCJwcm9qZWN0X2lkIjoiYjE0N2Q4ODctNDVlYi00NTBjLWEyNDEtY2ZkNzk1NGNmMDBmIiwicHJvamVjdF9zbHVnIjoiemVuLXNtb2tpbmctcG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzNzY3MTAwfQ.Idw4vjy4D3zoCctme6w_Xjk1z7iSdA6Ct4Gwacnvsn8",
  projectSlug: "zen-smoking-post"
});

export default zendbx;
