import { useEffect, useRef, useState } from 'react';
import { readLocalJSON, writeLocalJSON } from '../shared/local-state';
import { createRouletteSound } from './roulette-sound';

const preference = 'lanet.roulette.sound.v1';
export function useRouletteSound() {
  const [enabled, setEnabled] = useState(() => readLocalJSON(preference, true) !== false);
  const ref = useRef(null);
  if (!ref.current) ref.current = createRouletteSound({ enabled });
  const sound = ref.current;
  useEffect(() => {
    const hide = () => {
      if (document.hidden) sound.stop();
    };
    const sync = (event) => {
      if (event.key !== preference) return;
      const next = readLocalJSON(preference, true) !== false;
      sound.setEnabled(next);
      setEnabled(next);
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('storage', sync);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('storage', sync);
      sound.dispose();
    };
  }, [sound]);
  function toggle() {
    const next = !enabled;
    sound.setEnabled(next);
    setEnabled(next);
    writeLocalJSON(preference, next);
    if (next) sound.prepare();
  }
  return { sound, enabled, supported: sound.supported, toggle };
}
