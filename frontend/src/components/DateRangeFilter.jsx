import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const formatDisplay = (from, to) => {
  if (from && to) {
    return `${from} → ${to}`;
  }

  if (from) {
    return `${from} →`;
  }

  if (to) {
    return `→ ${to}`;
  }

  return 'Date range';
};

export default function DateRangeFilter({
  from,
  to,
  onApply,
  onClear,
}) {
  const containerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from || '');
  const [draftTo, setDraftTo] = useState(to || '');

  useEffect(() => {
    setDraftFrom(from || '');
    setDraftTo(to || '');
  }, [from, to]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const displayValue = useMemo(() => formatDisplay(from, to), [from, to]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={from || to ? 'text-foreground' : 'text-muted-foreground'}>{displayValue}</span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border bg-white p-3 shadow-md">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
                className="h-9"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraftFrom('');
                  setDraftTo('');
                  onClear?.();
                  setOpen(false);
                }}
              >
                Clear
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApply?.({ from: draftFrom, to: draftTo });
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
