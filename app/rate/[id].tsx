import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  BUCKETS,
  BUCKET_ORDER,
  Probe,
  ProbeAnswer,
  answerProbe,
  comparisonsLeft,
  probeTarget,
  startProbe,
} from '../../src/lib/rating';
import { REACTIONS, verdictFor } from '../../src/lib/whimsy';
import { useStore } from '../../src/store';
import { colors } from '../../src/theme';
import { Bucket } from '../../src/types';
import { Bounce } from '../../src/ui/Bounce';
import { Burst } from '../../src/ui/Burst';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Chip } from '../../src/ui/Chip';
import { FadeSlide } from '../../src/ui/FadeSlide';
import { useCountUp } from '../../src/ui/hooks';
import { Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Artwork, Avatar, ScoreBadge } from '../../src/ui/widgets';

type Step = 'bucket' | 'compare' | 'result';

function ScoreReveal({ score, bucket }: { score: number; bucket: Bucket }) {
  const shown = useCountUp(score);
  return <ScoreBadge score={Math.min(shown, score)} bucket={bucket} size={120} />;
}

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, rateSong, profileById } = useStore();
  const d = state.deliveries.find((x) => x.id === id);

  const [step, setStep] = useState<Step>('bucket');
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [asked, setAsked] = useState(0);
  const [reaction, setReaction] = useState<string | undefined>();
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!d) {
    return (
      <Screen tabBar={false}>
        <Txt v="title">Song not found</Txt>
      </Screen>
    );
  }

  const sender = profileById(d.fromId);
  // Songs already ranked in the chosen bucket, best first. The new song is not in here yet.
  const ranked = bucket ? state.ranking[bucket].filter((x) => x !== d.id) : [];
  const targetIndex = probe ? probeTarget(probe) : null;
  const target = targetIndex !== null ? state.deliveries.find((x) => x.id === ranked[targetIndex]) : undefined;

  const commit = async (b: Bucket, index: number) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      setResult(await rateSong(d.id, b, index, reaction));
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your rating. Try again.');
      setStep('bucket');
      setProbe(null);
    } finally {
      setSaving(false);
    }
  };

  const pickBucket = (b: Bucket) => {
    setBucket(b);
    const list = state.ranking[b].filter((x) => x !== d.id);
    if (list.length === 0) {
      commit(b, 0);
      return;
    }
    setProbe(startProbe(list.length));
    setAsked(0);
    setStep('compare');
  };

  const answer = (a: ProbeAnswer) => {
    if (!probe || !bucket) return;
    const next = answerProbe(probe, a);
    setAsked(asked + 1);
    if (probeTarget(next) === null) {
      commit(bucket, next.lo);
    } else {
      setProbe(next);
    }
  };

  if (step === 'result' && result !== null && bucket) {
    const verdict = verdictFor(bucket, result);
    return (
      <Screen tabBar={false} scroll={false}>
        <Burst key="result" emojis={verdict.particles} mode={verdict.mode} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <FadeSlide>
            <View style={{ alignItems: 'center' }}>
              <ScoreReveal score={result} bucket={bucket} />
              <Txt style={{ fontSize: 56, lineHeight: 72, marginTop: 12 }}>{verdict.emoji}</Txt>
              <Txt v="display" style={{ textAlign: 'center' }}>
                {verdict.title}
              </Txt>
              <Txt v="body" style={{ textAlign: 'center', marginTop: 6, marginBottom: 8 }}>
                {verdict.blurb}
              </Txt>
              <Txt v="caption" style={{ textAlign: 'center', marginBottom: 28, paddingHorizontal: 16 }}>
                {sender.name} will see your score and reaction. Your ranking just got a little smarter.
              </Txt>
              <Button label="Done" color={colors.yellow} onPress={() => router.back()} />
            </View>
          </FadeSlide>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tabBar={false}>
      <FadeSlide>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Avatar friend={sender} size={44} />
          <Txt v="label" style={{ marginLeft: 10, flex: 1 }}>
            {sender.name} sent you
          </Txt>
          <Bounce onPress={() => router.back()} scaleTo={0.9}>
            <Txt v="bold" color={colors.inkSoft}>
              Cancel
            </Txt>
          </Bounce>
        </View>
      </FadeSlide>

      {step === 'bucket' && (
        <FadeSlide key="bucket">
          <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Artwork song={d.song} size={64} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt v="bold" numberOfLines={2}>
                {d.song.title}
              </Txt>
              <Txt v="caption">{d.song.artist}</Txt>
            </View>
          </Card>

          <Txt v="display" style={{ marginBottom: 14 }}>
            How did it hit?
          </Txt>
          {error ? (
            <Txt v="caption" color={colors.red} style={{ fontWeight: '800', marginBottom: 12 }}>
              {error}
            </Txt>
          ) : null}
          {BUCKET_ORDER.map((b) => (
            <Bounce key={b} onPress={() => pickBucket(b)} wrapStyle={{ marginBottom: 14 }} haptic="medium">
              <Card color={BUCKETS[b].color} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Txt style={{ fontSize: 40, lineHeight: 50 }}>{BUCKETS[b].emoji}</Txt>
                <View style={{ marginLeft: 14 }}>
                  <Txt v="title">{BUCKETS[b].label}</Txt>
                  <Txt v="caption" color={colors.ink}>
                    {BUCKETS[b].blurb}
                  </Txt>
                </View>
              </Card>
            </Bounce>
          ))}

          <Txt v="label" style={{ marginTop: 8, marginBottom: 8 }}>
            Leave a reaction (optional)
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {REACTIONS.map((r) => (
              <Chip
                key={r.emoji}
                label={`${r.emoji} ${r.label}`}
                selected={reaction === r.emoji}
                color={colors.yellow}
                onPress={() => setReaction(reaction === r.emoji ? undefined : r.emoji)}
              />
            ))}
          </View>
        </FadeSlide>
      )}

      {step === 'compare' && probe && bucket && target && (
        <FadeSlide key={`cmp-${asked}`}>
          <Txt v="label">
            Comparison {asked + 1} · about {comparisonsLeft(probe)} left
          </Txt>
          <Txt v="display" style={{ marginBottom: 18 }}>
            Which one do you like more?
          </Txt>

          <Card color={BUCKETS[bucket].color} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Artwork song={d.song} size={60} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt v="label" color={colors.ink}>
                New from {sender.name}
              </Txt>
              <Txt v="bold" numberOfLines={2}>
                {d.song.title}
              </Txt>
              <Txt v="caption" color={colors.ink}>
                {d.song.artist}
              </Txt>
            </View>
          </Card>

          <Txt v="title" style={{ textAlign: 'center', marginVertical: 12 }}>
            vs
          </Txt>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Artwork song={target.song} size={60} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt v="label">One you already rated</Txt>
                <Txt v="bold" numberOfLines={2}>
                  {target.song.title}
                </Txt>
                <Txt v="caption">{target.song.artist}</Txt>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', marginTop: 24 }}>
            <Button label="New one" color={colors.mint} onPress={() => answer('more')} style={{ flex: 1, marginRight: 10 }} />
            <Button label="Old one" color={colors.pink} onPress={() => answer('less')} style={{ flex: 1 }} />
          </View>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Button small label="Too close to call" color={colors.white} onPress={() => answer('same')} />
          </View>
        </FadeSlide>
      )}
    </Screen>
  );
}
