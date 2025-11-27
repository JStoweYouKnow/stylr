/**
 * API Client utility for handling API requests in both web and mobile (Capacitor) environments
 * 
 * Note: When using Capacitor with server.url configured, API calls will automatically
 * use the server URL. This utility is provided as a fallback if needed.
 */

// Get the API base URL
// In mobile app, this will point to your deployed server
// In web app, this will be empty (relative URLs)
export function getApiBaseUrl(): string {
  // Check if we're running in Capacitor (mobile app)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    // Use environment variable or default to your deployed Vercel URL
    // Note: If Capacitor server.url is configured, this may not be needed
    const apiUrl = process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL || 'https://stylr.vercel.app';
    return apiUrl;
  }
  
  // Web app - use relative URLs
  return '';
}

/**
 * Make an API request with proper base URL handling
 * 
 * Note: When Capacitor server.url is configured, relative URLs work automatically.
 * This function is useful if you need explicit control over the base URL.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Make a streaming API request (for chat, etc.)
 */
export async function apiStreamRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

