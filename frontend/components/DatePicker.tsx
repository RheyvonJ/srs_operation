import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './calendar';

interface DatePickerProps {
  id: string;
  name: string;
  defaultValue?: string;
}

const earliest = new Date(1975, 0, 1);

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIso(value: string | undefined): Date {
  const today = startOfToday();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return today;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime()) || date < earliest) return new Date(1975, 0, 1);
  if (date > today) return today;
  return date;
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({ id, name, defaultValue }) => {
  const today = startOfToday();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(() => parseIso(defaultValue));
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number } | null>(null);

  const placeMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 292;
    const height = 360;
    const gutter = 8;
    const left = Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < height && rect.top > spaceBelow
      ? Math.max(gutter, rect.top - height - 6)
      : rect.bottom + 6;
    setMenuBox({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onLayout = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      placeMenu();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <input type="hidden" name={name} value={toIso(selected)} />
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[#E0E0E0] bg-white px-3 text-left text-base font-medium text-[#212121] shadow-xs focus:border-[#E53935] focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 sm:h-9 sm:text-sm ${open ? 'border-[#E53935] ring-2 ring-[#E53935]/20' : ''}`}
      >
        <span>{formatDisplay(selected)}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-[#616161]" />
      </button>
      {open && menuBox && createPortal(
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Choose a date"
          style={{ top: menuBox.top, left: menuBox.left }}
          className="fixed z-50 rounded-xl border border-[#E0E0E0] bg-white shadow-lg"
        >
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            reverseYears
            startMonth={earliest}
            endMonth={new Date(today.getFullYear(), today.getMonth())}
            disabled={{ after: today }}
            onSelect={(date) => {
              setSelected(date);
              setOpen(false);
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
};
