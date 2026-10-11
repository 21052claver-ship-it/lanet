import { useEffect, useState } from 'react';

// Narrow screens and phones turned sideways use the same drawer and bottom navigation.
export const COMPACT_LAYOUT_QUERY =
  '(max-width: 760px), (max-width: 960px) and (max-height: 500px) and (pointer: coarse)';

export function useCompactLayout() {
  return useMediaQuery(COMPACT_LAYOUT_QUERY);
}

export function useMediaQuery(queryText) {
  const [compact, setCompact] = useState(() => matchMedia(queryText).matches);
  useEffect(() => {
    const query = matchMedia(queryText);
    const update = () => setCompact(query.matches);
    if (query.addEventListener) {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, [queryText]);
  return compact;
}
