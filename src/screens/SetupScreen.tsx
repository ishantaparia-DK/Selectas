import React from 'react';
import { Card } from '../ui/Card';
import { Screen } from '../ui/Screen';
import { Txt } from '../ui/Txt';

/** Shown when the Supabase keys are missing from .env. */
export function SetupScreen() {
  return (
    <Screen tabBar={false}>
      <Txt style={{ fontSize: 56, lineHeight: 70 }}>🔌</Txt>
      <Txt v="display" style={{ marginBottom: 8 }}>
        Almost there
      </Txt>
      <Txt v="body" style={{ marginBottom: 16 }}>
        Tastemaker needs a backend before it can run. Create a free Supabase project and add its keys to a file called
        .env in the project folder.
      </Txt>
      <Card>
        <Txt v="bold">Add these two lines to .env</Txt>
        <Txt v="caption" style={{ marginTop: 6 }}>
          EXPO_PUBLIC_SUPABASE_URL=your project URL
        </Txt>
        <Txt v="caption">EXPO_PUBLIC_SUPABASE_ANON_KEY=your anon key</Txt>
      </Card>
      <Txt v="caption" style={{ marginTop: 16 }}>
        The full steps are in SETUP.md. Restart the Expo server after saving the file.
      </Txt>
    </Screen>
  );
}
