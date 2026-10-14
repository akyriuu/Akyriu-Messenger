const PRODUCTION_API_URL = 'https://ryuto-messenger.onrender.com';

export const API_URL = (
  import.meta.env.VITE_API_URL || PRODUCTION_API_URL
).replace(/\/$/, '');
export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL || API_URL
).replace(/\/$/, '');

export type User = { id: string; username: string };
export type Friend = { id: string; username: string };
export type FriendRequest = {
  id: string;
  requester: { id: string; username: string };
};
export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

export async function request<T>(
  path: string,
  token?: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const body =
      data && typeof data === 'object'
        ? (data as { message?: string | string[]; error?: string })
        : null;
    const message =
      typeof data === 'string'
        ? data
        : Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message ||
            body?.error ||
            `Falha na requisição (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
