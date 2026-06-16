const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_URL = `${BACKEND_URL}/api`;

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...restOptions } = options;

  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (typeof window !== 'undefined') {
    const cachedToken = localStorage.getItem('auth_token');
    if (cachedToken) {
      headers.set('Authorization', `Bearer ${cachedToken}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    credentials: 'include',
    ...restOptions,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    signup: (data: any) => request<any>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    refresh: (refreshToken?: string) => request<any>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    me: () => request<any>('/auth/me'),
  },
  room: {
    create: (title?: string) => request<any>('/rooms', { method: 'POST', body: JSON.stringify({ title }) }),
    get: (code: string) => request<any>(`/rooms/${code}`),
  },
};
export { BACKEND_URL };
