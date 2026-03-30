import type { AppRouter } from "../../types/api";
import { createTRPCProxyClient, httpLink } from "@trpc/client";

/**
 * Shared tRPC client configuration
 *
 * Environment Configuration:
 * - Development: Uses relative path `/trpc`, proxied by Vite to localhost:3000
 * - Production: Uses relative path `/trpc`, proxied by Nginx to api:3000
 * - See vite.config.ts (dev) and nginx.conf (prod) for proxy configuration
 *
 * This client is used by both dataProvider and authProvider
 *
 * Note: The headers function is called on every request, so it always uses
 * the latest token from localStorage.
 */
export const createTrpcClient = () => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: import.meta.env.VITE_API_URL || "/trpc",
        // Headers are fetched on every request, ensuring fresh token is used
        headers: () => {
          const token = localStorage.getItem("accessToken");
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
        },
        fetch(url, options) {
          return fetch(url, options);
        },
      }),
    ],
  });
};

// Singleton instance
let clientInstance: ReturnType<typeof createTrpcClient> | null = null;

/**
 * Get the shared tRPC client
 * Note: The client uses dynamic headers, so the same instance can be used
 * even after token refresh.
 */
export const getTrpcClient = () => {
  if (!clientInstance) {
    clientInstance = createTrpcClient();
  }
  return clientInstance;
};

/**
 * Reset the client instance (useful after logout or major auth changes)
 */
export const resetTrpcClient = () => {
  clientInstance = null;
};
