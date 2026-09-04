// ── Shared API fetch wrapper — all lanes import from here ──

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Thin wrapper around fetch that:
 *  1. Prepends the API base URL
 *  2. Attaches Bearer token from localStorage (if present)
 *  3. Auto-parses JSON responses
 *  4. Throws a structured error on non-2xx status
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = { ...options.headers };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return res.json();
}
