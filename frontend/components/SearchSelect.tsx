import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

export interface SearchSelectOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  id: string;
  name: string;
  options: SearchSelectOption[];
  emptyValue?: string;
  emptyLabel: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  invalid?: boolean;
}

const inputClassName =
  'h-10 w-full min-w-0 rounded-xl border border-[#E0E0E0] bg-white pl-9 pr-3 text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 disabled:cursor-wait disabled:bg-[#F4F6F9] sm:h-9 sm:text-sm';

const rowHeight = 40;

function searchable(value: string): string {
  return value.toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(option: SearchSelectOption, query: string): boolean {
  const terms = searchable(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${searchable(option.label)} ${searchable(option.value)}`;
  return terms.every((term) => haystack.includes(term));
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  id,
  name,
  options,
  emptyValue = '',
  emptyLabel,
  placeholder,
  disabled = false,
  loading = false,
  loadingLabel = 'Loading...',
  invalid = false,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<SearchSelectOption | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const closedLabel = loading ? loadingLabel : picked?.label ?? emptyLabel;

  const items = useMemo(() => {
    const emptyOption = { value: emptyValue, label: emptyLabel };
    const filtered = searchable(query)
      ? options.filter((option) => matches(option, query))
      : options;
    return matches(emptyOption, query) ? [emptyOption, ...filtered] : filtered;
  }, [emptyLabel, emptyValue, options, query]);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const visible = items.slice(start, start + 16);

  const placeMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gutter = 8;
    const maxWidth = Math.max(160, window.innerWidth - gutter * 2);
    const width = Math.min(Math.max(rect.width, Math.min(520, maxWidth)), maxWidth);
    const left = Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < 180 && rect.top > spaceBelow
      ? Math.max(gutter, rect.top - 256 - 4)
      : rect.bottom + 4;
    setMenuBox({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onLayout = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      placeMenu();
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setScrollTop(0);
    menuRef.current?.scrollTo(0, 0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const choose = (option: SearchSelectOption) => {
    setPicked(option.value === emptyValue ? null : option);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = items[activeIndex];
      if (option) choose(option);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <input type="hidden" name={name} value={picked?.value ?? emptyValue} />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#616161]" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        placeholder={open ? placeholder : closedLabel}
        value={open ? query : closedLabel}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          setActiveIndex(0);
          setOpen(true);
          if (!query) event.currentTarget.select();
        }}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && menuBox && createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
          className="fixed z-50 max-h-64 overflow-y-auto rounded-xl border border-[#E0E0E0] bg-white py-1 text-sm shadow-lg"
        >
          {items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#616161]">No matches</p>
          ) : (
            <div style={{ height: items.length * rowHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
                {visible.map((option, offset) => {
                  const index = start + offset;
                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      role="option"
                      aria-selected={picked?.value === option.value && picked?.label === option.label}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option)}
                      title={option.label}
                      style={{ height: rowHeight }}
                      className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap px-3 text-left leading-10 ${
                        index === activeIndex
                          ? 'bg-[#FFEBEE] text-[#E53935]'
                          : 'text-[#212121] hover:bg-[#F4F6F9]'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};
