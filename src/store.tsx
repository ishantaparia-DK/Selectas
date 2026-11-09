import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, View } from 'react-native';
import { useAuth } from './auth';
import { dayKey } from './lib/dates';
import { friendlyError } from './lib/errors';
import { EMPTY_RANKING } from './lib/rating';
import { supabase } from './lib/supabase';
import { colors } from './theme';
import { Button } from './ui/Button';
import { Screen } from './ui/Screen';
import { Txt } from './ui/Txt';
import { Bucket, Delivery, FriendRequest, Profile, Ranking, ServiceId, Song, SongNote } from './types';

const UNKNOWN: Profile = { id: '', username: 'unknown', name: 'Someone', emoji: '👤', color: colors.locked };

function toProfile(row: any): Profile {
  return { id: row.id, username: row.username, name: row.display_name, emoji: row.emoji, color: row.color };
}

function toDelivery(r: any): Delivery {
  return {
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    song: {
      title: r.song_title,
      artist: r.song_artist,
      url: r.song_url,
      service: r.song_service as ServiceId,
      artwork: r.song_artwork ?? undefined,
    },
    note: r.note as SongNote,
    sentAt: Date.parse(r.sent_at),
    sentDay: r.sent_day,
    rating:
      r.rated_at && r.bucket
        ? {
            bucket: r.bucket as Bucket,
            score: Number(r.score),
            reaction: r.reaction ?? undefined,
            ratedAt: Date.parse(r.rated_at),
          }
        : undefined,
    senderSeen: !!r.sender_seen_at,
  };
}

export interface SendInput {
  toId: string;
  song: Song;
  note: SongNote;
}

interface StoreValue {
  meId: string;
  me: Profile;
  state: { deliveries: Delivery[]; ranking: Ranking; reveals: string[] };
  profileById: (id: string) => Profile;
  friends: Profile[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  /** The song I already sent today, if any. */
  sentToday: Delivery | undefined;
  /** Each returns an error message, or null on success. */
  sendSong: (input: SendInput) => Promise<string | null>;
  requestFriend: (username: string) => Promise<string | null>;
  respondFriend: (requestId: string, accept: boolean) => Promise<string | null>;
  removeFriend: (profileId: string) => Promise<string | null>;
  /** Records my rating and resolves to the score. Rejects with a readable message. */
  rateSong: (id: string, bucket: Bucket, insertIndex: number, reaction?: string) => Promise<number>;
  dismissReveal: (id: string) => void;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Only mounted once someone is signed in and has a profile. Renders children after the first load. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const me = profile!;
  const meId = me.id;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [ranking, setRanking] = useState<Ranking>(EMPTY_RANKING);
  const fetching = useRef(false);

  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const [fr, pr, de, ra] = await Promise.all([
        supabase.from('friendships').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('deliveries').select('*').order('sent_at', { ascending: false }),
        supabase.from('rankings').select('*').order('position', { ascending: true }),
      ]);
      const failure = fr.error ?? pr.error ?? de.error ?? ra.error;
      if (failure) {
        setLoadError(friendlyError(failure.message));
        return;
      }
      setLoadError(null);
      setFriendships(fr.data ?? []);
      setProfiles((pr.data ?? []).map(toProfile));
      setDeliveries((de.data ?? []).map(toDelivery));
      const next: Ranking = { love: [], fine: [], nope: [] };
      for (const row of ra.data ?? []) next[row.bucket as Bucket].push(row.delivery_id);
      setRanking(next);
      setReady(true);
    } finally {
      fetching.current = false;
    }
  }, []);

  // Initial load, live updates, a slow safety poll, and a refresh when the app comes back.
  useEffect(() => {
    refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, 300);
    };
    const channel = supabase
      .channel(`tastemaker-${meId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, schedule)
      .subscribe();
    const poll = setInterval(refresh, 30000);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [meId, refresh]);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.id, p);
    m.set(meId, me);
    return m;
  }, [profiles, me, meId]);

  const profileById = useCallback((id: string) => profileMap.get(id) ?? UNKNOWN, [profileMap]);

  const friends = useMemo(
    () =>
      friendships
        .filter((f) => f.status === 'accepted')
        .map((f) => profileMap.get(f.requester_id === meId ? f.addressee_id : f.requester_id))
        .filter((p): p is Profile => !!p)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [friendships, profileMap, meId],
  );

  const incomingRequests = useMemo(
    () =>
      friendships
        .filter((f) => f.status === 'pending' && f.addressee_id === meId)
        .map((f) => ({ id: f.id as string, profile: profileMap.get(f.requester_id) }))
        .filter((r): r is FriendRequest => !!r.profile),
    [friendships, profileMap, meId],
  );

  const outgoingRequests = useMemo(
    () =>
      friendships
        .filter((f) => f.status === 'pending' && f.requester_id === meId)
        .map((f) => ({ id: f.id as string, profile: profileMap.get(f.addressee_id) }))
        .filter((r): r is FriendRequest => !!r.profile),
    [friendships, profileMap, meId],
  );

  const sentToday = useMemo(() => {
    const today = dayKey(Date.now());
    return deliveries.find((d) => d.fromId === meId && d.sentDay === today);
  }, [deliveries, meId]);

  const reveals = useMemo(
    () =>
      deliveries
        .filter((d) => d.fromId === meId && d.rating && !d.senderSeen)
        .sort((a, b) => a.rating!.ratedAt - b.rating!.ratedAt)
        .map((d) => d.id),
    [deliveries, meId],
  );

  const sendSong = useCallback(
    async (input: SendInput) => {
      const { error } = await supabase.rpc('send_song', {
        p_to: input.toId,
        p_title: input.song.title,
        p_artist: input.song.artist,
        p_url: input.song.url,
        p_service: input.song.service,
        p_artwork: input.song.artwork ?? null,
        p_note: input.note,
      });
      if (error) return friendlyError(error.message);
      await refresh();
      return null;
    },
    [refresh],
  );

  const requestFriend = useCallback(
    async (username: string) => {
      const { error } = await supabase.rpc('request_friend', { p_username: username });
      if (error) return friendlyError(error.message);
      await refresh();
      return null;
    },
    [refresh],
  );

  const respondFriend = useCallback(
    async (requestId: string, accept: boolean) => {
      const { error } = await supabase.rpc('respond_friend', { p_id: requestId, p_accept: accept });
      if (error) return friendlyError(error.message);
      await refresh();
      return null;
    },
    [refresh],
  );

  const removeFriend = useCallback(
    async (profileId: string) => {
      const row = friendships.find(
        (f) =>
          (f.requester_id === meId && f.addressee_id === profileId) ||
          (f.addressee_id === meId && f.requester_id === profileId),
      );
      if (!row) return null;
      const { error } = await supabase.from('friendships').delete().eq('id', row.id);
      if (error) return friendlyError(error.message);
      await refresh();
      return null;
    },
    [friendships, meId, refresh],
  );

  const rateSong = useCallback(
    async (id: string, bucket: Bucket, insertIndex: number, reaction?: string) => {
      const { data, error } = await supabase.rpc('rate_delivery', {
        p_id: id,
        p_bucket: bucket,
        p_index: insertIndex,
        p_reaction: reaction ?? null,
      });
      if (error) throw new Error(friendlyError(error.message));
      await refresh();
      return Number(data);
    },
    [refresh],
  );

  const dismissReveal = useCallback((id: string) => {
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, senderSeen: true } : d)));
    supabase.rpc('mark_seen', { p_id: id }).then(() => {});
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      meId,
      me,
      state: { deliveries, ranking, reveals },
      profileById,
      friends,
      incomingRequests,
      outgoingRequests,
      sentToday,
      sendSong,
      requestFriend,
      respondFriend,
      removeFriend,
      rateSong,
      dismissReveal,
      refresh,
    }),
    [
      meId, me, deliveries, ranking, reveals, profileById, friends, incomingRequests, outgoingRequests,
      sentToday, sendSong, requestFriend, respondFriend, removeFriend, rateSong, dismissReveal, refresh,
    ],
  );

  if (!ready) {
    return (
      <Screen tabBar={false} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loadError ? (
            <>
              <Txt style={{ fontSize: 56, lineHeight: 70 }}>📡</Txt>
              <Txt v="title" style={{ marginBottom: 6 }}>
                Could not load your songs
              </Txt>
              <Txt v="caption" style={{ textAlign: 'center', marginBottom: 20 }}>
                {loadError}
              </Txt>
              <Button label="Try again" color={colors.yellow} onPress={refresh} />
            </>
          ) : (
            <Txt style={{ fontSize: 56, lineHeight: 70 }}>🎶</Txt>
          )}
        </View>
      </Screen>
    );
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
