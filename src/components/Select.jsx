import React, { Children, isValidElement, useId, useLayoutEffect, useRef, useState } from 'react';
import { CaretDown, Check, SlidersHorizontal } from '@phosphor-icons/react';
import { useApp } from '../context';
import { SubjectMark } from '../ui';
import { nextEnabledOption } from '../../shared/select-navigation';
import { searchText } from '../../shared/search';

function optionsFrom(children) {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === 'option')
      return [
        {
          value: String(child.props.value ?? child.props.children),
          label: child.props.children,
          disabled: child.props.disabled,
        },
      ];
    return optionsFrom(child.props.children);
  });
}
export default function Select({
  value,
  onChange,
  children,
  disabled,
  required,
  name,
  id,
  className = '',
  ...props
}) {
  const app = useApp();
  const uid = useId();
  const listId = uid + '-list';
  const trigger = useRef(null),
    menu = useRef(null),
    search = useRef(''),
    searchAt = useRef(0);
  const [expanded, setExpanded] = useState(false),
    [active, setActive] = useState(0);
  const options = optionsFrom(children),
    selected = options.findIndex((o) => o.value === String(value));
  const subjects = app?.data?.subjects || [];
  function icon(option) {
    const subject = subjects.find((s) => s.id === option?.value);
    return subject ? (
      <SubjectMark subject={subject} />
    ) : (
      <span className="select-glyph" aria-hidden="true">
        <SlidersHorizontal size={19} weight="duotone" />
      </span>
    );
  }
  function place() {
    if (!trigger.current || !menu.current) return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0,
      left = viewport?.offsetLeft || 0,
      right = left + (viewport?.width || innerWidth),
      bottom = top + (viewport?.height || innerHeight);
    const r = trigger.current.getBoundingClientRect(),
      below = Math.max(0, bottom - r.bottom - 12),
      above = Math.max(0, r.top - top - 12);
    const height = Math.max(44, Math.min(320, Math.max(below, above)));
    const width = Math.min(right - left - 24, Math.max(r.width, 260));
    const useBelow = below >= Math.min(menu.current.scrollHeight || 240, height) || below >= above;
    Object.assign(menu.current.style, {
      width: width + 'px',
      left: Math.max(left + 12, Math.min(r.left, right - width - 12)) + 'px',
      maxHeight: height + 'px',
      top: useBelow
        ? r.bottom + 6 + 'px'
        : Math.max(top + 6, r.top - Math.min(menu.current.scrollHeight || height, height) - 6) +
          'px',
      bottom: 'auto',
    });
  }
  useLayoutEffect(() => {
    if (!expanded) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [expanded]);
  useLayoutEffect(() => {
    if (expanded)
      menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded]);
  function show() {
    if (disabled || !options.some((option) => !option.disabled)) return;
    setActive(
      selected >= 0 && !options[selected].disabled
        ? selected
        : nextEnabledOption(options, 0, 'Home'),
    );
    place();
    menu.current.showPopover();
    trigger.current?.focus({ preventScroll: true });
    setExpanded(true);
  }
  const supportsPopover =
    typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  function hide() {
    menu.current?.hidePopover();
    setExpanded(false);
  }
  function choose(index) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name },
    });
    hide();
    trigger.current?.focus();
  }
  function keys(e) {
    if (e.key === 'Escape') {
      if (expanded) {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
      return;
    }
    if (e.key === 'Tab') {
      hide();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      if (!expanded) {
        show();
        return;
      }
      const next = nextEnabledOption(options, active, e.key);
      if (next >= 0) setActive(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expanded ? choose(active) : show();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      search.current = Date.now() - searchAt.current > 700 ? e.key : search.current + e.key;
      searchAt.current = Date.now();
      const index = options.findIndex(
        (o) => !o.disabled && searchText(o.label).startsWith(searchText(search.current)),
      );
      if (index >= 0) {
        if (!expanded) show();
        setActive(index);
      }
    }
  }
  if (!supportsPopover)
    return (
      <span className={'select-control select-native ' + className}>
        <span className="select-native-icon" aria-hidden="true">
          {icon(options[selected])}
        </span>
        <select
          {...props}
          id={id}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          required={required}
          disabled={disabled || !options.some((o) => !o.disabled)}
          className="select-trigger select-native-input"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <CaretDown className="select-native-caret" size={16} aria-hidden="true" />
      </span>
    );
  return (
    <span className={'select-control ' + className}>
      <button
        {...props}
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? uid + '-option-' + active : undefined}
        aria-required={required || undefined}
        disabled={disabled || !options.some((option) => !option.disabled)}
        className="select-trigger"
        onClick={() => (expanded ? hide() : show())}
        onKeyDown={keys}
      >
        {icon(options[selected])}
        <span className="select-value">{options[selected]?.label || 'Tria una opció'}</span>
        <CaretDown size={16} aria-hidden="true" />
      </button>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <span
        ref={menu}
        id={listId}
        popover="auto"
        role="listbox"
        aria-label={props['aria-label'] || 'Opcions'}
        className="select-menu"
        data-open={expanded}
        onToggle={(e) => setExpanded((e.newState || e.nativeEvent?.newState) === 'open')}
      >
        {options.map((option, index) => (
          <button
            type="button"
            role="option"
            tabIndex={-1}
            id={uid + '-option-' + index}
            key={option.value}
            data-index={index}
            aria-selected={index === selected}
            disabled={option.disabled}
            className={'select-option ' + (index === active ? 'highlighted' : '')}
            onPointerMove={() => setActive(index)}
            onClick={(e) => {
              e.preventDefault();
              choose(index);
            }}
          >
            {icon(option)}
            <span>{option.label}</span>
            {index === selected && <Check size={19} weight="bold" aria-hidden="true" />}
          </button>
        ))}
      </span>
    </span>
  );
}
