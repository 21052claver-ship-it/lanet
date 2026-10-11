export function nextEnabledOption(options, active, key) {
  if (!options.some((option) => !option.disabled)) return -1;
  const direction = key === 'ArrowUp' || key === 'End' ? -1 : 1;
  let index =
    key === 'Home'
      ? 0
      : key === 'End'
        ? options.length - 1
        : (active + direction + options.length) % options.length;
  for (let i = 0; i < options.length; i++) {
    if (!options[index].disabled) return index;
    index = (index + direction + options.length) % options.length;
  }
  return -1;
}
