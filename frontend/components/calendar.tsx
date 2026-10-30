import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayButton, type DropdownProps, DayPicker, getDefaultClassNames } from 'react-day-picker';
function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3 [--cell-size:2rem]', className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('en-US', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-2', defaultClassNames.month),
        nav: cn('pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between', defaultClassNames.nav),
        button_previous: cn(
          'pointer-events-auto inline-flex size-8 items-center justify-center rounded-md text-[#616161] hover:bg-[#F4F6F9] aria-disabled:opacity-40',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          'pointer-events-auto inline-flex size-8 items-center justify-center rounded-md text-[#616161] hover:bg-[#F4F6F9] aria-disabled:opacity-40',
          defaultClassNames.button_next,
        ),
        month_caption: cn('flex h-8 w-full items-center justify-center px-8', defaultClassNames.month_caption),
        dropdowns: cn('relative z-20 flex h-8 items-center justify-center gap-1.5', defaultClassNames.dropdowns),
        dropdown_root: cn('relative', defaultClassNames.dropdown_root),
        dropdown: cn(
          'h-8 cursor-pointer appearance-auto rounded-md border border-[#E0E0E0] bg-white px-2 text-sm font-medium text-[#212121] outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/20',
          defaultClassNames.dropdown,
        ),
        caption_label: cn('hidden', defaultClassNames.caption_label),
        month_grid: cn('mx-auto mt-2 border-collapse', defaultClassNames.month_grid),
        weekdays: cn(defaultClassNames.weekdays),
        weekday: cn('w-8 pb-1 text-center text-[0.7rem] font-medium text-[#9E9E9E]', defaultClassNames.weekday),
        week: cn(defaultClassNames.week),
        day: cn('size-8 p-0 text-center align-middle', defaultClassNames.day),
        today: cn('rounded-md bg-[#F4F6F9]', defaultClassNames.today),
        outside: cn('text-[#BDBDBD]', defaultClassNames.outside),
        disabled: cn('text-[#BDBDBD] opacity-40', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClass, orientation, ...iconProps }) => {
          if (orientation === 'left') return <ChevronLeft className={cn('size-4', iconClass)} {...iconProps} />;
          if (orientation === 'right') return <ChevronRight className={cn('size-4', iconClass)} {...iconProps} />;
          return <ChevronDown className={cn('size-3.5', iconClass)} {...iconProps} />;
        },
        DayButton: CalendarDayButton,
        Dropdown: ShortDropdown,
        ...components,
      }}
      {...props}
    />
  );
}
function ShortDropdown({ options = [], value, onChange, disabled, 'aria-label': ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => String(option.value) === String(value));
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open]);
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center gap-1 rounded-md border border-[#E0E0E0] bg-white px-2 text-sm font-medium text-[#212121]"
      >
        {selected?.label}
        <ChevronDown className="size-3.5 text-[#616161]" />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-36 min-w-full overflow-y-auto rounded-md border border-[#E0E0E0] bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => {
                  onChange?.({ target: { value: String(option.value) } } as React.ChangeEvent<HTMLSelectElement>);
                  setOpen(false);
                }}
                className={cn(
                  'block w-full whitespace-nowrap px-2 py-1 text-left text-sm',
                  isSelected ? 'bg-[#FFEBEE] font-semibold text-[#E53935]' : 'text-[#212121] hover:bg-[#F4F6F9]',
                  option.disabled && 'cursor-not-allowed text-[#BDBDBD] hover:bg-transparent',
                )}
              >
                {option.label}
              </button>
              );
          })}
        </div>
      )}
    </div>
  );
}
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString('en-GB')}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      className={cn(
        'flex size-8 items-center justify-center rounded-md text-sm font-medium text-[#212121] hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:hover:bg-transparent',
        'data-[selected-single=true]:bg-[#E53935] data-[selected-single=true]:text-white data-[selected-single=true]:hover:bg-[#C62828]',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}