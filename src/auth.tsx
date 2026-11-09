import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { friendlyError } from './lib/errors';
import { unregisterPush } from './lib/push';
import { isConfigured, supabase } from './lib/supabase';
import { Profile } from './types';

export interface ProfileInput {
  username: string;
  name: string;
  emoji: string;
  color: string;
}

interface AuthValue {
  /** True until we know whether someone is signed in and whether they have a profile. */
  loading: boolean;
  configured: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Each returns an error message, or null on success. */
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function toProfile(row: any): Profile {
  return { id: row.id, username: row.username, name: row.display_name, emoji: row.emoji, color: row.color };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(!isConfigured);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(true);
  const userId = session?.user.id;

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // Keep the token fresh while the app is open, and stop when it is backgrounded.
  useEffect(() => {
    if (!isConfigured) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    let cancelled = false;
    setProfileReady(false);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data ? toProfile(data) : null);
        setProfileReady(true);
        // The one-song-a-day rule uses this timezone, so keep it matching the phone.
        const tz = deviceTimeZone();
        if (data && data.timezone !== tz) {
          supabase.from('profiles').update({ timezone: tz }).eq('id', userId).then(() => {});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return friendlyError(error.message);
    if (!data.session) return 'Check your email to confirm your account, then sign in.';
    return null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendlyError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush().catch(() => {});
    await supabase.auth.signOut();
  }, []);

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!userId) return 'Please sign in again.';
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: input.username.trim().toLowerCase(),
          display_name: input.name.trim(),
          emoji: input.emoji,
          color: input.color,
          timezone: deviceTimeZone(),
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return 'That username is taken. Try another.';
        if (error.code === '23514') return 'Usernames are 3 to 20 letters, numbers or underscores.';
        return friendlyError(error.message);
      }
      setProfile(toProfile(data));
      return null;
    },
    [userId],
  );

  const value = useMemo<AuthValue>(
    () => ({
      loading: !sessionReady || !profileReady,
      configured: isConfigured,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      saveProfile,
    }),
    [sessionReady, profileReady, session, profile, signUp, signIn, signOut, saveProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
