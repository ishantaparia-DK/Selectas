import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { useStore } from '../../src/store';
import { colors } from '../../src/theme';
import { Profile } from '../../src/types';
import { Bounce } from '../../src/ui/Bounce';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide } from '../../src/ui/FadeSlide';
import { Field } from '../../src/ui/Field';
import { Screen } from '../../src/ui/Screen';
import { Txt } from '../../src/ui/Txt';
import { Avatar } from '../../src/ui/widgets';

function PersonRow({ person, children }: { person: Profile; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
      <Avatar friend={person} size={42} />
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Txt v="bold" numberOfLines={1}>
          {person.name}
        </Txt>
        <Txt v="caption" numberOfLines={1}>
          @{person.username}
        </Txt>
      </View>
      {children}
    </View>
  );
}

function RemoveButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <Bounce
      onPress={() => {
        if (armed) onConfirm();
        else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
        }
      }}
    >
      <Txt v="bold" color={armed ? colors.red : colors.inkSoft} style={{ fontSize: 13 }}>
        {armed ? 'Tap to confirm' : 'Remove'}
      </Txt>
    </Bounce>
  );
}

export default function FriendsScreen() {
  const { me, friends, incomingRequests, outgoingRequests, requestFriend, respondFriend, removeFriend } = useStore();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const clean = username.trim().replace(/^@/, '').toLowerCase();

  const add = async () => {
    setBusy(true);
    setResult(null);
    const err = await requestFriend(clean);
    setBusy(false);
    if (err) {
      setResult({ ok: false, text: err });
    } else {
      setResult({ ok: true, text: `Request sent to @${clean}.` });
      setUsername('');
    }
  };

  const invite = () =>
    Share.share({
      message: `Swap one song a day with me on Tastemaker. My username is @${me.username}.`,
    }).catch(() => {});

  return (
    <Screen>
      <FadeSlide>
        <Txt v="label">Your people</Txt>
        <Txt v="display" style={{ marginBottom: 16 }}>
          Friends 🫶
        </Txt>
      </FadeSlide>

      <FadeSlide delay={60}>
        <Card color={colors.yellow} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar friend={me} size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt v="label" color={colors.ink}>
                Your username
              </Txt>
              <Txt v="title">@{me.username}</Txt>
            </View>
            <Button small label="Invite" color={colors.white} onPress={invite} />
          </View>
        </Card>
      </FadeSlide>

      <FadeSlide delay={120}>
        <Txt v="title" style={{ marginBottom: 8 }}>
          Add a friend
        </Txt>
        <Field
          label="Their username"
          value={username}
          onChangeText={setUsername}
          placeholder="@maya_beats"
          autoCapitalize="none"
        />
        {result ? (
          <Txt
            v="caption"
            color={result.ok ? colors.ink : colors.red}
            style={{ fontWeight: '800', marginTop: -6, marginBottom: 10 }}
          >
            {result.text}
          </Txt>
        ) : null}
        <Button
          label={busy ? 'Sending...' : 'Send request'}
          color={colors.pink}
          disabled={busy || clean.length < 3}
          onPress={add}
        />
      </FadeSlide>

      {incomingRequests.length > 0 && (
        <FadeSlide delay={180} style={{ marginTop: 24 }}>
          <Txt v="title">Requests ({incomingRequests.length})</Txt>
          <Card color="#FFFDF5" style={{ marginTop: 10 }}>
            {incomingRequests.map((r, i) => (
              <View key={r.id} style={{ marginTop: i === 0 ? -12 : 0 }}>
                <PersonRow person={r.profile}>
                  <Button small label="Accept" color={colors.mint} onPress={() => respondFriend(r.id, true)} />
                  <View style={{ width: 8 }} />
                  <RemoveButton onConfirm={() => respondFriend(r.id, false)} />
                </PersonRow>
              </View>
            ))}
          </Card>
        </FadeSlide>
      )}

      <FadeSlide delay={240} style={{ marginTop: 24 }}>
        <Txt v="title">Your friends ({friends.length})</Txt>
        <Card style={{ marginTop: 10 }}>
          {friends.length === 0 ? (
            <Txt v="caption">No friends yet. Add someone by username, or tap Invite to share yours.</Txt>
          ) : (
            friends.map((f, i) => (
              <View key={f.id} style={{ marginTop: i === 0 ? -12 : 0 }}>
                <PersonRow person={f}>
                  <RemoveButton onConfirm={() => removeFriend(f.id)} />
                </PersonRow>
              </View>
            ))
          )}
        </Card>
      </FadeSlide>

      {outgoingRequests.length > 0 && (
        <FadeSlide delay={300} style={{ marginTop: 24 }}>
          <Txt v="title">Waiting on</Txt>
          <Card style={{ marginTop: 10 }}>
            {outgoingRequests.map((r, i) => (
              <View key={r.id} style={{ marginTop: i === 0 ? -12 : 0 }}>
                <PersonRow person={r.profile}>
                  <RemoveButton onConfirm={() => removeFriend(r.profile.id)} />
                </PersonRow>
              </View>
            ))}
          </Card>
        </FadeSlide>
      )}
    </Screen>
  );
}
