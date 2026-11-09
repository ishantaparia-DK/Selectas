export type ServiceId =
  | 'spotify'
  | 'apple'
  | 'youtube'
  | 'soundcloud'
  | 'tidal'
  | 'bandcamp'
  | 'deezer'
  | 'amazon';

export type Bucket = 'love' | 'fine' | 'nope';

/** A person: me, a friend, or someone who sent me a request. */
export interface Profile {
  id: string;
  username: string;
  name: string;
  emoji: string;
  color: string;
}

export interface Song {
  title: string;
  artist: string;
  url: string;
  service: ServiceId;
  artwork?: string;
}

/** The only message a sender can attach. Every value comes from src/lib/noteOptions.json. */
export interface SongNote {
  templateId: string;
  option: string;
  mood?: string;
  bpm?: number;
  bestFor?: string;
  foundVia?: string;
}

export interface Rating {
  bucket: Bucket;
  score: number;
  reaction?: string;
  ratedAt: number;
}

export interface Delivery {
  id: string;
  fromId: string;
  toId: string;
  song: Song;
  note: SongNote;
  sentAt: number;
  /** Sender's local calendar day, YYYY-MM-DD. The server enforces one song per sender per day. */
  sentDay: string;
  rating?: Rating;
  /** True once the sender has been shown the friend's reaction. */
  senderSeen: boolean;
}

/** Songs I have rated, best to worst within each bucket. Holds delivery ids. */
export type Ranking = Record<Bucket, string[]>;

export interface FriendRequest {
  /** Friendship row id. */
  id: string;
  profile: Profile;
}
