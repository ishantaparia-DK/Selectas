import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth';
import { computeStats } from '../../src/lib/stats';
import { useStore } from '../../src/store';
import { BORDER, colors, radius } from '../../src/theme';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide } from '../../src/ui/FadeSlide';
import { Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Avatar } from '../../src/ui/widgets';

function streakCopy(n: number): string {
  if (n === 0) return 'Land an approved song to light the flame.';
  if (n === 1) return 'One in a row. Keep the heat going.';
  if (n < 5) return 'You are cooking. Do not overthink the next one.';
  return 'Unstoppable. Your friends fear your taste.';
}

function Tile({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) {
  return (
    <FadeSlide delay={delay} style={{ width: '48%', marginBottom: 14 }}>
      <Card color={color} style={{ paddingVertical: 14 }}>
        <Txt v="label" color={colors.ink}>
          {label}
        </Txt>
        <Txt style={{ fontSize: 36, lineHeight: 44, fontWeight: '900', letterSpacing: -1 }}>{value}</Txt>
      </Card>
    </FadeSlide>
  );
}

export default function ProfileScreen() {
  const { state, profileById, meId, me } = useStore();
  const { signOut } = useAuth();
  const stats = useMemo(() => computeStats(state.deliveries, meId), [state.deliveries, meId]);
  const earned = stats.badges.filter((b) => b.earned).length;

  return (
    <Screen>
      <FadeSlide>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Avatar friend={me} size={64} />
          <View style={{ marginLeft: 14 }}>
            <Txt v="label">Your taste report</Txt>
            <Txt v="display">{stats.approved} approved</Txt>
          </View>
        </View>
      </FadeSlide>

      <FadeSlide delay={60}>
        <Card color={colors.orange} style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
          <Txt style={{ fontSize: 56, lineHeight: 68 }}>🔥</Txt>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Txt v="label" color={colors.ink}>
              Approval streak
            </Txt>
            <Txt style={{ fontSize: 32, lineHeight: 40, fontWeight: '900' }}>
              {stats.currentStreak} in a row
            </Txt>
            <Txt v="caption" color={colors.ink}>
              Best: {stats.bestStreak} · {streakCopy(stats.currentStreak)}
            </Txt>
          </View>
        </Card>
      </FadeSlide>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Tile label="Songs sent" value={String(stats.sent)} color={colors.sky} delay={120} />
        <Tile
          label="Hit rate"
          value={stats.rated ? `${Math.round(stats.hitRate * 100)}%` : '--'}
          color={colors.mint}
          delay={160}
        />
        <Tile
          label="Avg score"
          value={stats.rated ? stats.avgScore.toFixed(1) : '--'}
          color={colors.yellow}
          delay={200}
        />
        <Tile label="Daily streak" value={`${stats.dailyStreak}d`} color={colors.pink} delay={240} />
      </View>

      <FadeSlide delay={280}>
        <Txt v="title" style={{ marginTop: 6, marginBottom: 10 }}>
          Badges · {earned}/{stats.badges.length}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {stats.badges.map((b) => (
            <View
              key={b.id}
              style={{
                width: '48%',
                marginBottom: 12,
                backgroundColor: b.earned ? colors.white : colors.locked,
                borderWidth: BORDER,
                borderColor: colors.ink,
                borderRadius: radius.md,
                padding: 12,
                opacity: b.earned ? 1 : 0.7,
              }}
            >
              <Txt style={{ fontSize: 30, lineHeight: 40 }}>{b.earned ? b.emoji : '🔒'}</Txt>
              <Txt v="bold" style={{ fontSize: 14 }}>
                {b.label}
              </Txt>
              <Txt v="caption">{b.desc}</Txt>
            </View>
          ))}
        </View>
      </FadeSlide>

      {stats.byFriend.length > 0 && (
        <FadeSlide delay={320}>
          <Txt v="title" style={{ marginTop: 8, marginBottom: 10 }}>
            Your fans
          </Txt>
          <Card>
            {stats.byFriend.map((row, i) => {
              const f = profileById(row.friendId);
              const pct = row.approved / row.sent;
              return (
                <View
                  key={row.friendId}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 12 }}
                >
                  <Avatar friend={f} size={36} />
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Txt v="bold" style={{ fontSize: 14 }}>
                      {f.name}
                    </Txt>
                    <View
                      style={{
                        height: 10,
                        borderRadius: 5,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        backgroundColor: colors.white,
                        overflow: 'hidden',
                        marginTop: 4,
                      }}
                    >
                      <View style={{ width: `${Math.round(pct * 100)}%`, flex: 0, height: '100%', backgroundColor: f.color }} />
                    </View>
                  </View>
                  <Txt v="caption">
                    {row.approved}/{row.sent}
                  </Txt>
                </View>
              );
            })}
          </Card>
        </FadeSlide>
      )}

      <View style={{ alignItems: 'center', marginTop: 28 }}>
        <Txt v="caption" style={{ textAlign: 'center', marginBottom: 10 }}>
          Signed in as @{me.username}
        </Txt>
        <Button small label="Sign out" color={colors.white} onPress={signOut} />
      </View>
    </Screen>
  );
}
