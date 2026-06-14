// backend/src/types/hangout.types.ts

export interface SignupBody {
  clerkId: string;
  name: string;
  email: string;
  bio?: string;
  lat: number;
  lng: number;
}

export interface NearbyUsersQuery {
  lat: string;
  lng: string;
  radius?: string; // metres, default 10000
}

export interface CreateHangoutBody {
  title: string;
  description?: string;
  category: string;
  scheduledAt: string; // ISO-8601
  radiusKm?: number;
  maxParticipants?: number;
  lat: number;
  lng: number;
}

export interface DiscoverHangoutsQuery {
  lat: string;
  lng: string;
  radius?: string;   // metres, default 10000
  category?: string; // optional filter
}

export interface JoinHangoutBody {
  message?: string;
}

export interface RespondJoinBody {
  status: 'ACCEPTED' | 'DECLINED';
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface UserRecord {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  bio: string | null;
  avatarColor: string;
  createdAt: Date;
}

export interface NearbyUser extends UserRecord {
  distanceMeters: number;
}

export interface HangoutRecord {
  id: number;
  title: string;
  description: string | null;
  category: string;
  scheduledAt: Date;
  radiusKm: number;
  status: string;
  maxParticipants: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatarColor: string;
  };
  joinCount: number;
}

export interface NearbyHangout extends HangoutRecord {
  distanceMeters: number;
}

export interface JoinRecord {
  id: number;
  status: string;
  message: string | null;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatarColor: string;
  };
}
