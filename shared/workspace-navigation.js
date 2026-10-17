const COMMUNITY_TABS = ['notices', 'events', 'proposals', 'delegates', 'notifications'];
const DELEGATE_TABS = ['pending', 'mine', 'published', 'contacts'];

export function communityLocation(href) {
  const params = new URL(href).searchParams;
  return {
    tab: COMMUNITY_TABS.includes(params.get('community')) ? params.get('community') : 'notices',
    delegates: DELEGATE_TABS.includes(params.get('delegates'))
      ? params.get('delegates')
      : 'pending',
  };
}

export function communityURL(href, state) {
  const url = new URL(href);
  if (state.tab === 'notices' || !COMMUNITY_TABS.includes(state.tab))
    url.searchParams.delete('community');
  else url.searchParams.set('community', state.tab);
  if (
    state.tab === 'delegates' &&
    DELEGATE_TABS.includes(state.delegates) &&
    state.delegates !== 'pending'
  )
    url.searchParams.set('delegates', state.delegates);
  else url.searchParams.delete('delegates');
  return url;
}

// A date is session context, not a permanent preference: a new school day starts at today.
export function calendarSession(value, today) {
  const date = value?.date;
  const valid =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date + 'T12:00:00Z')) &&
    new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
  return value?.today === today && valid
    ? { today, date, showCompleted: value.showCompleted === true }
    : { today, date: today, showCompleted: false };
}
