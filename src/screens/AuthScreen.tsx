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

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const err = mode === 'up' ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (err) setMessage(err);
  };

  return (
    <Screen tabBar={false}>
      <FadeSlide>
        <Txt style={{ fontSize: 64, lineHeight: 80 }}>🎶</Txt>
        <Txt v="display">Selectas</Txt>
        <Txt v="body" style={{ marginTop: 4, marginBottom: 24 }}>
          One song a day. Send the one you know they will love.
        </Txt>
      </FadeSlide>

      <FadeSlide delay={100}>
        <Txt v="title" style={{ marginBottom: 12 }}>
          {mode === 'up' ? 'Create your account' : 'Welcome back'}
        </Txt>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          autoCapitalize="none"
          secureTextEntry
          autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
          textContentType={mode === 'up' ? 'newPassword' : 'password'}
        />
        {message ? (
          <Txt v="caption" color={colors.red} style={{ fontWeight: '800', marginBottom: 12 }}>
            {message}
          </Txt>
        ) : null}
        <Button
          label={busy ? 'One moment...' : mode === 'up' ? 'Sign up' : 'Sign in'}
          color={colors.pink}
          disabled={!valid || busy}
          onPress={submit}
        />
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Bounce
            onPress={() => {
              setMode(mode === 'up' ? 'in' : 'up');
              setMessage(null);
            }}
          >
            <Txt v="bold" color={colors.inkSoft}>
              {mode === 'up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Txt>
          </Bounce>
        </View>
      </FadeSlide>
    </Screen>
  );
}
