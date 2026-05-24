export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "";
  const appId = import.meta.env.VITE_APP_ID || "";
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/oauth/callback` : "";
  const state = typeof window !== "undefined" && redirectUri ? btoa(redirectUri) : "";

  try {
    if (!oauthPortalUrl) {
      throw new Error("VITE_OAUTH_PORTAL_URL is not defined");
    }
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (e) {
    console.warn("[Auth] Invalid login portal URL configuration:", e);
    return "#";
  }
};
