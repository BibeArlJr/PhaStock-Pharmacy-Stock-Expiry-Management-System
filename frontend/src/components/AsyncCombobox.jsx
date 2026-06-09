import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

export default function AsyncCombobox({
  value,
  onChange,
  fetchOptions,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  inputClassName,
  onQueryChange,
  noResultsActionLabel,
  onNoResultsAction,
}) {
  const containerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.label || '');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedQuery = query.trim();
  const normalizedQueryLower = normalizedQuery.toLowerCase();

  useEffect(() => {
    if (!open) {
      setQuery(value?.label || '');
    }
  }, [value, open]);

  useEffect(() => {
    onQueryChange?.(normalizedQuery);
  }, [normalizedQuery, onQueryChange]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery(value?.label || '');
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [value]);

  useEffect(() => {
    if (!open || !fetchOptions) {
      return undefined;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const options = await fetchOptions(normalizedQuery, controller.signal);
        setItems(Array.isArray(options) ? options : []);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setItems([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, normalizedQuery, fetchOptions]);

  const visibleItems = normalizedQueryLower
    ? items.filter((item) =>
        `${item.label || ''} ${item.subLabel || ''}`
          .toLowerCase()
          .includes(normalizedQueryLower)
      )
    : items;

  const hasCreateAction =
    !isLoading &&
    visibleItems.length === 0 &&
    normalizedQuery.length > 0 &&
    typeof onNoResultsAction === 'function';

  const resolvedNoResultsActionLabel =
    typeof noResultsActionLabel === 'function'
      ? noResultsActionLabel(normalizedQuery)
      : noResultsActionLabel;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={open ? searchPlaceholder : placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-16 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            inputClassName
          )}
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery('');
              setItems([]);
              setOpen(false);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
          tabIndex={-1}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-md">
          {isLoading ? <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div> : null}

          {!isLoading && visibleItems.length === 0 && !hasCreateAction ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : null}

          {!isLoading
          ? visibleItems.map((item, idx) => (
              <button
                key={item.value ?? item.id ?? `${item.label}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(item);
                  setQuery(item.label);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-muted"
              >
                <div className="truncate text-sm text-foreground">{item.label}</div>
                {item.subLabel ? (
                  <div className="truncate text-xs text-muted-foreground">{item.subLabel}</div>
                ) : null}
              </button>
            ))
            : null}

          {hasCreateAction ? (
            <button
              type="button"
              onClick={() => {
                onNoResultsAction(normalizedQuery);
                setOpen(false);
              }}
              className="w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-muted"
            >
              <span>{resolvedNoResultsActionLabel || `Add: ${normalizedQuery}`}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
