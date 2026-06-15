// frontend/src/api/wango.api.ts

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  bio: string | null;
  avatarColor: string;
  createdAt: string;
}

export interface HangoutRecord {
  id: number;
  title: string;
  description: string | null;
  category: string;
  scheduledAt: string;
  radiusKm: number;
  status: string;
  maxParticipants: number;
  createdAt: string;
  lat: number;
  lng: number;
  joinCount: number;
  user: { id: number; name: string; avatarColor: string };
}

export interface NearbyHangout extends HangoutRecord {
  distanceMeters: number;
  myJoinStatus?: string | null;
  chatRoomId?: number | null;
}

export interface JoinRecord {
  id: number;
  status: string;
  message: string | null;
  createdAt: string;
  user: { id: number; name: string; avatarColor: string };
}

export interface HangoutDetail extends HangoutRecord {
  joins: JoinRecord[];
}

// ─── User Endpoints ───────────────────────────────────────────────────────────

export async function syncUser(
  payload: { name: string; email: string; bio?: string; lat: number; lng: number },
  token: string
): Promise<{ success: boolean; data: UserRecord }> {
  return apiFetch('/api/users/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function getMe(token: string): Promise<{ success: boolean; data: UserRecord }> {
  return apiFetch('/api/users/me', {}, token);
}

// ─── Hangout Endpoints ────────────────────────────────────────────────────────

export async function discoverHangouts(
  lat: number,
  lng: number,
  radius?: number,
  category?: string,
  token?: string
): Promise<{ success: boolean; count: number; data: NearbyHangout[] }> {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    ...(radius ? { radius: radius.toString() } : {}),
    ...(category ? { category } : {}),
  });
  return apiFetch(`/api/hangouts/discover?${query.toString()}`, {}, token);
}

export async function getHangoutDetail(id: number): Promise<{ success: boolean; data: HangoutDetail }> {
  return apiFetch(`/api/hangouts/${id}`);
}

export async function createHangout(
  payload: {
    title: string;
    description?: string;
    category: string;
    scheduledAt: string;
    radiusKm?: number;
    maxParticipants?: number;
    lat: number;
    lng: number;
  },
  token: string
): Promise<{ success: boolean; data: HangoutRecord }> {
  return apiFetch('/api/hangouts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function requestToJoin(
  hangoutId: number,
  message: string | undefined,
  token: string
): Promise<{ success: boolean; data: { id: number; status: string } }> {
  return apiFetch(`/api/hangouts/${hangoutId}/join`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, token);
}

export async function respondToJoin(
  joinId: number,
  status: 'ACCEPTED' | 'DECLINED',
  token: string
): Promise<{ success: boolean; data: { id: number; status: string; chatRoomId?: number } }> {
  return apiFetch(`/api/hangouts/joins/${joinId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, token);
}

export async function getHostedHangouts(token: string): Promise<{ success: boolean; count: number; data: HangoutDetail[] }> {
  return apiFetch('/api/hangouts/hosted', {}, token);
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export interface ChatRoomSummary {
  id: number;
  hangoutPostId: number;
  hangoutTitle: string;
  hangoutCategory: string;
  scheduledAt: string;
  expiresAt: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderName: string } | null;
}

export interface ChatMessage {
  id: number;
  body: string;
  createdAt: string;
  sender: { id: number; name: string; avatarColor: string };
}

export async function getChatRooms(token: string): Promise<{ success: boolean; data: ChatRoomSummary[] }> {
  return apiFetch('/api/chat/my-rooms', {}, token);
}

export async function getChatMessages(
  roomId: number,
  token: string,
  cursor?: number,
): Promise<{ success: boolean; data: ChatMessage[] }> {
  const params = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/chat/${roomId}/messages${params}`, {}, token);
}
