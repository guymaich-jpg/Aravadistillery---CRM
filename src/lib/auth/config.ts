// Auth0 configuration — reads from Vite environment variables.
// Values are injected at build time by GitHub Actions secrets.
// For local dev, copy .env.example → .env.local and fill in values.

export interface Auth0AppConfig {
  domain: string;
  clientId: string;
  authorizationParams: {
    redirect_uri: string;
  };
  cacheLocation: 'localstorage' | 'memory';
  useRefreshTokens: boolean;
}

/** Runtime check — guards against misconfigured deployments. */
export function isAuth0Configured(): boolean {
  return !!(
    import.meta.env.VITE_AUTH0_DOMAIN &&
    import.meta.env.VITE_AUTH0_CLIENT_ID
  );
}

/** Auth0Provider props — used in App.tsx. */
export function buildAuth0Config(): Auth0AppConfig {
  return {
    domain: import.meta.env.VITE_AUTH0_DOMAIN as string,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID as string,
    authorizationParams: {
      // BASE_URL is set by Vite from the `base` vite.config.ts option.
      // In production: "/Aravadistillery---CRM/"
      // In local dev:  "/"
      redirect_uri: window.location.origin + import.meta.env.BASE_URL,
    },
    // Persist login across page refreshes
    cacheLocation: 'localstorage',
    // Silent refresh via refresh tokens (requires Auth0 "Allow Offline Access" setting)
    useRefreshTokens: true,
  };
}
