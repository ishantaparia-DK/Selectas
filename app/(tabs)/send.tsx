import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SERVICES, fetchMeta, parseLink } from '../../src/lib/links';
import {
  BEST_FOR,
  BPM_PRESETS,
  FOUND_VIA,
  MOODS,
  TEMPLATES,
  formatNote,
  tempoLabel,
} from '../../src/lib/templates';
import { computeStats } from '../../src/lib/stats';
import { useStore } from '../../src/store';
import { colors, radius } from '../../src/theme';
import { Delivery, SongNote } from '../../src/types';
import { Field } from '../../src/ui/Field';
import { Bounce } from '../../src/ui/Bounce';
import { Burst } from '../../src/ui/Burst';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Chip, Tag } from '../../src/ui/Chip';
import { FadeSlide, Pulse } from '../../src/ui/FadeSlide';
import { useMidnightCountdown } from '../../src/ui/hooks';
import { Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Artwork, Avatar, NoteTags } from '../../src/ui/widgets';

const STEP_TITLES = ['Who is it for?', 'Pick the song', 'Say it with feeling', 'Ready to send?'];

function Progress({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 18 }}>
      {STEP_TITLES.map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 10,
            marginRight: i === STEP_TITLES.length - 1 ? 0 : 6,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: i <= step ? colors.pink : colors.white,
          }}
        />
      ))}
    </View>
  );
}

function LockedView({ delivery }: { delivery: Delivery }) {
  const router = useRouter();
  const { profileById } = useStore();
  const countdown = useMidnightCountdown();
  const friend = profileById(delivery.toId);
  return (
    <Screen>
      <FadeSlide>
        <Txt v="label">Today's song</Txt>
        <Txt v="display">Sent! 🎯</Txt>
        <Txt v="caption" style={{ marginBottom: 20 }}>
          One song a day. That is the whole game.
        </Txt>
      </FadeSlide>
      <FadeSlide delay={100}>
        <Card color={colors.yellow} style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Txt v="label" color={colors.ink}>
            Next song unlocks in
          </Txt>
          <Txt style={{ fontSize: 48, fontWeight: '900', letterSpacing: -1, marginTop: 4 }}>{countdown}</Txt>
        </Card>
      </FadeSlide>
      <FadeSlide delay={200} style={{ marginTop: 20 }}>
        <Bounce onPress={() => router.push(`/song/${delivery.id}`)} scaleTo={0.97}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Artwork song={delivery.song} size={56} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Txt v="label">To {friend.name}</Txt>
                <Txt v="bold" numberOfLines={1}>
                  {delivery.song.title}
                </Txt>
                <Txt v="caption" numberOfLines={1}>
                  {delivery.rating ? 'They have rated it. Tap to see.' : `Waiting on ${friend.name}...`}
                </Txt>
              </View>
              {delivery.rating ? <Txt style={{ fontSize: 28 }}>👀</Txt> : <Pulse><Txt style={{ fontSize: 28 }}>⏳</Txt></Pulse>}
            </View>
          </Card>
        </Bounce>
      </FadeSlide>
    </Screen>
  );
}

export default function SendScreen() {
  const router = useRouter();
  const { state, meId, friends, profileById, sendSong, sentToday } = useStore();
  const stats = useMemo(() => computeStats(state.deliveries, meId), [state.deliveries, meId]);

  const [step, setStep] = useState(0);
  const [toId, setToId] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [artwork, setArtwork] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [option, setOption] = useState<string | null>(null);
  const [mood, setMood] = useState<string | undefined>();
  const [bpm, setBpm] = useState<number | undefined>();
  const [bestFor, setBestFor] = useState<string | undefined>();
  const [foundVia, setFoundVia] = useState<string | undefined>();
  const [justSent, setJustSent] = useState<{ toId: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const parsed = useMemo(() => parseLink(link), [link]);
  const parsedUrl = parsed?.url;
  const parsedService = parsed?.service;

  useEffect(() => {
    setArtwork(undefined);
    if (!parsedUrl || !parsedService) return;
    let cancelled = false;
    fetchMeta(parsedUrl, parsedService).then((m) => {
      if (cancelled || !m) return;
      if (m.title) setTitle((t) => t || m.title!);
      if (m.artist) setArtist((a) => a || m.artist!);
      if (m.artwork) setArtwork(m.artwork);
    });
    return () => {
      cancelled = true;
    };
  }, [parsedUrl, parsedService]);

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const friend = toId ? profileById(toId) : null;
  const note: SongNote | null = option ? { templateId, option, mood, bpm, bestFor, foundVia } : null;

  const reset = () => {
    setStep(0);
    setToId(null);
    setLink('');
    setTitle('');
    setArtist('');
    setArtwork(undefined);
    setTemplateId(TEMPLATES[0].id);
    setOption(null);
    setMood(undefined);
    setBpm(undefined);
    setBestFor(undefined);
    setFoundVia(undefined);
  };

  const canNext =
    (step === 0 && !!toId) ||
    (step === 1 && !!parsed && title.trim().length > 0 && artist.trim().length > 0) ||
    (step === 2 && !!option);

  const doSend = async () => {
    if (!toId || !parsed || !note || sending) return;
    setSending(true);
    setSendError(null);
    const err = await sendSong({
      toId,
      song: { title: title.trim(), artist: artist.trim(), url: parsed.url, service: parsed.service, artwork },
      note,
    });
    setSending(false);
    if (err) {
      setSendError(err);
      return;
    }
    setJustSent({ toId });
    reset();
  };

  if (justSent) {
    const f = profileById(justSent.toId);
    return (
      <Screen scroll={false}>
        <Burst emojis={['🎵', '🎶', '✨', '💌', '🎧']} count={22} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <FadeSlide>
            <Txt style={{ fontSize: 72, lineHeight: 90, textAlign: 'center' }}>💌</Txt>
            <Txt v="display" style={{ textAlign: 'center' }}>
              Sent to {f.name}!
            </Txt>
            <Txt v="body" style={{ textAlign: 'center', marginTop: 8, marginBottom: 28, paddingHorizontal: 20 }}>
              {f.name} is about to have opinions. Come back tomorrow for your next song.
            </Txt>
            <Txt v="caption" style={{ textAlign: 'center', marginBottom: 24 }}>
              You will get a notification the moment they rate it.
            </Txt>
          </FadeSlide>
          <Button label="Nice" color={colors.mint} onPress={() => setJustSent(null)} />
        </View>
      </Screen>
    );
  }

  if (sentToday) return <LockedView delivery={sentToday} />;

  return (
    <Screen>
      <FadeSlide>
        <Txt v="label">Today's song · {stats.dailyStreak > 0 ? `${stats.dailyStreak} day streak 🔥` : 'start a streak'}</Txt>
        <Txt v="display" style={{ marginBottom: 14 }}>
          {STEP_TITLES[step]}
        </Txt>
        <Progress step={step} />
      </FadeSlide>

      <FadeSlide key={step}>
        {step === 0 && friends.length === 0 && (
          <Card color="#FFFDF5" style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Txt style={{ fontSize: 48, lineHeight: 60 }}>🫶</Txt>
            <Txt v="title" style={{ marginTop: 4 }}>
              Add a friend first
            </Txt>
            <Txt v="caption" style={{ textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              Songs go to friends. Add someone by username to send your first one.
            </Txt>
            <Button label="Go to Friends" color={colors.mint} onPress={() => router.push('/friends')} />
          </Card>
        )}

        {step === 0 && friends.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {friends.map((f) => {
              const sel = toId === f.id;
              const row = stats.byFriend.find((b) => b.friendId === f.id);
              return (
                <Bounce key={f.id} onPress={() => setToId(f.id)} wrapStyle={{ width: '48%', marginBottom: 14 }}>
                  <Card color={sel ? f.color : colors.white} style={{ alignItems: 'center', paddingVertical: 18 }}>
                    <Avatar friend={f} size={64} />
                    <Txt v="bold" style={{ marginTop: 8 }}>
                      {f.name}
                    </Txt>
                    <Txt v="caption" color={colors.ink}>
                      {row ? `${row.approved}/${row.sent} approved` : 'No songs yet'}
                    </Txt>
                  </Card>
                </Bounce>
              );
            })}
          </View>
        )}

        {step === 1 && (
          <View>
            <Field
              label="Link from any music app"
              value={link}
              onChangeText={setLink}
              placeholder="Paste a Spotify, Apple Music, YouTube link..."
              autoCapitalize="none"
            />
            {link.trim().length > 0 && !parsed ? (
              <Txt v="caption" color={colors.red} style={{ marginTop: -6, marginBottom: 12, fontWeight: '800' }}>
                That does not look like a music link. Try Spotify, Apple Music, YouTube, SoundCloud, Tidal, Bandcamp,
                Deezer or Amazon Music.
              </Txt>
            ) : null}
            {parsed ? (
              <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                <Tag text={`${SERVICES[parsed.service].emoji} ${SERVICES[parsed.service].name}`} color={colors.mint} />
              </View>
            ) : null}
            <Field label="Song title" value={title} onChangeText={setTitle} placeholder="Midnight City" autoCapitalize="words" />
            <Field label="Artist" value={artist} onChangeText={setArtist} placeholder="M83" autoCapitalize="words" />
          </View>
        )}

        {step === 2 && (
          <View>
            <Txt v="label" style={{ marginBottom: 8 }}>
              1. Pick how to start
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TEMPLATES.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  selected={t.id === templateId}
                  color={colors.sky}
                  onPress={() => {
                    setTemplateId(t.id);
                    setOption(null);
                  }}
                />
              ))}
            </View>

            <Card color={colors.yellow} style={{ marginVertical: 12 }}>
              <Txt v="title">
                {template.prompt}{' '}
                <Txt v="title" color={option ? colors.ink : colors.inkSoft} style={{ textDecorationLine: option ? 'none' : 'underline' }}>
                  {option ?? '_____'}
                </Txt>
              </Txt>
            </Card>

            <Txt v="label" style={{ marginBottom: 8 }}>
              2. Finish the sentence
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {template.options.map((o) => (
                <Chip key={o} label={o} selected={o === option} color={colors.mint} onPress={() => setOption(o)} />
              ))}
            </View>

            <Txt v="label" style={{ marginTop: 14, marginBottom: 8 }}>
              Mood (optional)
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.emoji} ${m.label}`}
                  selected={mood === m.id}
                  color={colors.pink}
                  onPress={() => setMood(mood === m.id ? undefined : m.id)}
                />
              ))}
            </View>

            <Txt v="label" style={{ marginTop: 10, marginBottom: 8 }}>
              BPM for the DJs (optional)
            </Txt>
            {bpm === undefined ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {BPM_PRESETS.map((p) => (
                  <Chip key={p.label} label={`${p.label} ${p.bpm}`} onPress={() => setBpm(p.bpm)} color={colors.orange} />
                ))}
              </View>
            ) : (
              <Card style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Button small label="-5" color={colors.white} onPress={() => setBpm(Math.max(40, bpm - 5))} style={{ marginRight: 6 }} />
                    <Button small label="-1" color={colors.white} onPress={() => setBpm(Math.max(40, bpm - 1))} />
                  </View>
                  <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
                    <Txt style={{ fontSize: 30, lineHeight: 36, fontWeight: '900' }}>{bpm}</Txt>
                    <Txt v="caption">{tempoLabel(bpm)}</Txt>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Button small label="+1" color={colors.white} onPress={() => setBpm(Math.min(220, bpm + 1))} style={{ marginRight: 6 }} />
                    <Button small label="+5" color={colors.white} onPress={() => setBpm(Math.min(220, bpm + 5))} />
                  </View>
                </View>
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <Button small label="Remove BPM" color={colors.locked} onPress={() => setBpm(undefined)} />
                </View>
              </Card>
            )}

            <Txt v="label" style={{ marginTop: 14, marginBottom: 8 }}>
              Best for (optional)
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {BEST_FOR.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.emoji} ${b.label}`}
                  selected={bestFor === b.id}
                  color={colors.sky}
                  onPress={() => setBestFor(bestFor === b.id ? undefined : b.id)}
                />
              ))}
            </View>

            <Txt v="label" style={{ marginTop: 6, marginBottom: 8 }}>
              Where I found it (optional)
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {FOUND_VIA.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.emoji} ${b.label}`}
                  selected={foundVia === b.id}
                  color={colors.grape}
                  onPress={() => setFoundVia(foundVia === b.id ? undefined : b.id)}
                />
              ))}
            </View>
          </View>
        )}

        {step === 3 && friend && note && parsed && (
          <View>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Avatar friend={friend} size={40} />
                <Txt v="bold" style={{ marginLeft: 10 }}>
                  To {friend.name}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Artwork song={{ title, artist, url: parsed.url, service: parsed.service, artwork }} size={64} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Txt v="bold" numberOfLines={2}>
                    {title}
                  </Txt>
                  <Txt v="caption">{artist}</Txt>
                  <Txt v="caption">{SERVICES[parsed.service].name}</Txt>
                </View>
              </View>
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: colors.yellow,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  padding: 12,
                }}
              >
                <Txt v="bold">{formatNote(note)}</Txt>
              </View>
              <NoteTags note={note} />
            </Card>
            {sendError ? (
              <Txt v="caption" color={colors.red} style={{ textAlign: 'center', marginTop: 12, fontWeight: '800' }}>
                {sendError}
              </Txt>
            ) : null}
            <Txt v="caption" style={{ textAlign: 'center', marginTop: 12 }}>
              One song a day and no take-backs. Choose wisely.
            </Txt>
          </View>
        )}
      </FadeSlide>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
        {step > 0 ? (
          <Button small label="Back" color={colors.white} onPress={() => setStep(step - 1)} />
        ) : (
          <View />
        )}
        {step < 3 ? (
          <Button label="Next" color={colors.pink} disabled={!canNext} onPress={() => setStep(step + 1)} />
        ) : (
          <Button label={sending ? 'Sending...' : 'Send it 🚀'} color={colors.mint} disabled={sending} onPress={doSend} />
        )}
      </View>
    </Screen>
  );
}
