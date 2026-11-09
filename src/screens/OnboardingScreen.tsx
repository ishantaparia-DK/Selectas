import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { Bounce } from '../ui/Bounce';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { FadeSlide } from '../ui/FadeSlide';
import { Screen } from '../ui/Screen';
import { Txt } from '../ui/Txt';
import { Avatar } from '../ui/widgets';

const EMOJIS = ['😎', '🦋', '🎧', '🌵', '🍑', '🐙', '🌞', '🦊', '🐸', '🪩', '🎸', '🍕', '👾', '🌈', '🐼', '🔥'];
const COLORS = [colors.pink, colors.yellow, colors.mint, colors.sky, colors.grape, colors.orange];

export function OnboardingScreen() {
  const { saveProfile, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[1]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cleanUsername = username.trim().toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(cleanUsername) && name.trim().length > 0;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const err = await saveProfile({ username: cleanUsername, name, emoji, color });
    setBusy(false);
    if (err) setMessage(err);
  };

  return (
    <Screen tabBar={false}>
      <FadeSlide>
        <Txt v="label">Step 2 of 2</Txt>
        <Txt v="display" style={{ marginBottom: 16 }}>
          Make it yours
        </Txt>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Avatar friend={{ id: 'me', username: cleanUsername, name, emoji, color }} size={84} />
          <Txt v="bold" style={{ marginTop: 8 }}>
            {name.trim() || 'Your name'}
          </Txt>
          <Txt v="caption">@{cleanUsername || 'username'}</Txt>
        </View>
      </FadeSlide>

      <FadeSlide delay={100}>
        <Field
          label="Username"
          hint="Friends find you with this. Letters, numbers and underscores."
          value={username}
          onChangeText={setUsername}
          placeholder="maya_beats"
          autoCapitalize="none"
          maxLength={20}
        />
        <Field
          label="Display name"
          value={name}
          onChangeText={setName}
          placeholder="Maya"
          autoCapitalize="words"
          maxLength={30}
        />

        <Txt v="label" style={{ marginBottom: 8 }}>
          Pick an emoji
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {EMOJIS.map((e) => (
            <Bounce key={e} onPress={() => setEmoji(e)} scaleTo={0.85} wrapStyle={{ marginRight: 8, marginBottom: 8 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: e === emoji ? colors.yellow : colors.white,
                  borderWidth: 2.5,
                  borderColor: colors.ink,
                }}
              >
                <Txt style={{ fontSize: 24, lineHeight: 30 }}>{e}</Txt>
              </View>
            </Bounce>
          ))}
        </View>

        <Txt v="label" style={{ marginTop: 6, marginBottom: 8 }}>
          Pick a color
        </Txt>
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          {COLORS.map((c) => (
            <Bounce key={c} onPress={() => setColor(c)} scaleTo={0.85} wrapStyle={{ marginRight: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c,
                  borderWidth: c === color ? 5 : 2.5,
                  borderColor: colors.ink,
                }}
              />
            </Bounce>
          ))}
        </View>

        {message ? (
          <Txt v="caption" color={colors.red} style={{ fontWeight: '800', marginBottom: 12 }}>
            {message}
          </Txt>
        ) : null}
        <Button label={busy ? 'Saving...' : "Let's go"} color={colors.mint} disabled={!valid || busy} onPress={submit} />
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Bounce onPress={signOut}>
            <Txt v="bold" color={colors.inkSoft}>
              Use a different account
            </Txt>
          </Bounce>
        </View>
      </FadeSlide>
    </Screen>
  );
}
