import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { formatCountdown, msUntilMidnight } from '../lib/dates';

/** Animates a number from 0 up to the target. Drives the score reveal. */
export function useCountUp(target: number, duration = 1100, delay = 350): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setVal(value));
    Animated.timing(v, {
      toValue: target,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      v.removeListener(id);
      v.stopAnimation();
    };
  }, [target, duration, delay]);
  return val;
}

/** HH:MM:SS until local midnight, when the next song unlocks. */
export function useMidnightCountdown(): string {
  const [text, setText] = useState(() => formatCountdown(msUntilMidnight()));
  useEffect(() => {
    const t = setInterval(() => setText(formatCountdown(msUntilMidnight())), 1000);
    return () => clearInterval(t);
  }, []);
  return text;
}
