export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");
export type User = { id: string; name?: string; email?: string };
export type Friend = { id: string; name?: string; email?: string };
export type ChatMessage = { id?: string; senderId?: string; recipientId?: string; content?: string; text?: string; createdAt?: string };

export async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) }
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return data as T;
}
export function normaliseUser(value: any): User {
  const user = value?.user ?? value?.data?.user ?? value?.data ?? value;
  return { id: String(user?.id ?? user?.userId ?? ""), name: user?.name ?? user?.username ?? user?.email ?? "You", email: user?.email };
}
export function normaliseList<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  for (const key of ["data", "friends", "requests", "messages"]) if (Array.isArray(value?.[key])) return value[key];
  return [];
}
