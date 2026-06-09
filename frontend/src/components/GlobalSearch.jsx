import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

const sectionOrder = ['Receipts', 'Batches', 'Medicines', 'Suppliers'];

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const normalizeArray = (response) => response?.data?.data?.items || [];

const buildGroupedItems = ({ receiptsByInvoice, receiptsByBatch, batches, medicines, suppliers }) => {
  const receiptMap = new Map();

  [...receiptsByInvoice, ...receiptsByBatch].forEach((item) => {
    const key = [item.receipt_id, item.batch_no, item.medicine?.id].join(':');

    if (!receiptMap.has(key)) {
      receiptMap.set(key, item);
    }
  });

  return {
    Receipts: Array.from(receiptMap.values()).map((item) => ({
      id: `receipt-${item.receipt_id}-${item.batch_no || 'none'}-${item.medicine?.id || 'none'}`,
      label: `${item.invoice_number || '-'} • ${item.supplier?.name || '-'} • ${item.medicine?.name || '-'}`,
      description: `Batch ${item.batch_no || '-'} • ${formatDate(item.invoice_date)}`,
      to: `/receipts/${item.receipt_id}`,
    })),
    Batches: batches.map((item) => ({
      id: `batch-${item.id}`,
      label: `${item.medicine?.name || '-'} ${item.medicine?.strength || ''}`.trim(),
      description: `Batch ${item.batch_no || '-'} • Exp ${formatDate(item.expiry_date)} • Stock ${item.available_boxes ?? 0}`,
      to: `/batch-stock?batch_no=${encodeURIComponent(item.batch_no || '')}`,
    })),
    Medicines: medicines.map((item) => ({
      id: `medicine-${item.id}`,
      label: `${item.name || '-'} ${item.strength || ''}`.trim(),
      description: 'Medicine',
      to: `/medicines?q=${encodeURIComponent(item.name || '')}`,
    })),
    Suppliers: suppliers.map((item) => ({
      id: `supplier-${item.id}`,
      label: item.name || '-',
      description: item.phone || 'Supplier',
      to: `/suppliers?q=${encodeURIComponent(item.name || '')}`,
    })),
  };
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [groupedItems, setGroupedItems] = useState({
    Receipts: [],
    Batches: [],
    Medicines: [],
    Suppliers: [],
  });
  const [activeIndex, setActiveIndex] = useState(-1);

  const flattenedItems = useMemo(
    () =>
      sectionOrder.flatMap((section) =>
        (groupedItems[section] || []).map((item) => ({
          ...item,
          section,
        }))
      ),
    [groupedItems]
  );

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setGroupedItems({ Receipts: [], Batches: [], Medicines: [], Suppliers: [] });
      setIsSearching(false);
      setActiveIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    const q = query.trim();

    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const [receiptByInvoiceRes, receiptByBatchRes, batchesRes, medicinesRes, suppliersRes] =
          await Promise.all([
            api.get('/receipt-search', {
              params: { invoice_number: q, page: 1, limit: 5 },
              signal: controller.signal,
            }),
            api.get('/receipt-search', {
              params: { batch_no: q, page: 1, limit: 5 },
              signal: controller.signal,
            }),
            api.get('/batch-stocks', {
              params: { q, page: 1, limit: 5 },
              signal: controller.signal,
            }),
            api.get('/medicines', {
              params: { q, page: 1, limit: 5 },
              signal: controller.signal,
            }),
            api.get('/suppliers', {
              params: { q, page: 1, limit: 5 },
              signal: controller.signal,
            }),
          ]);

        const nextGroups = buildGroupedItems({
          receiptsByInvoice: normalizeArray(receiptByInvoiceRes),
          receiptsByBatch: normalizeArray(receiptByBatchRes),
          batches: normalizeArray(batchesRes),
          medicines: normalizeArray(medicinesRes),
          suppliers: normalizeArray(suppliersRes),
        });

        setGroupedItems(nextGroups);
        setActiveIndex(-1);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setGroupedItems({ Receipts: [], Batches: [], Medicines: [], Suppliers: [] });
        }
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const openDropdown = () => {
    if (query.trim().length >= MIN_QUERY_LENGTH) {
      setIsOpen(true);
    }
  };

  const handleSelect = (item) => {
    navigate(item.to);
    closeDropdown();
  };

  const handleKeyDown = (event) => {
    if (!isOpen && event.key === 'ArrowDown' && query.trim().length >= MIN_QUERY_LENGTH) {
      setIsOpen(true);
      return;
    }

    if (event.key === 'Escape') {
      closeDropdown();
      return;
    }

    if (!flattenedItems.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flattenedItems.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flattenedItems.length - 1 : prev - 1));
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(flattenedItems[activeIndex]);
    }
  };

  const hasResults = flattenedItems.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-[520px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim().length >= MIN_QUERY_LENGTH) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder="Search receipts, batches, medicines, suppliers"
        className="h-10 rounded-xl border-primary/20 bg-slate-50 pl-9 pr-3 focus-visible:ring-2 focus-visible:ring-primary/30"
      />

      <div
        className={cn(
          'absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[420px] overflow-y-auto rounded-lg border border-primary/15 bg-white shadow-lg transition-all duration-150',
          isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        )}
      >
        {query.trim().length < MIN_QUERY_LENGTH ? (
          <div className="p-3 text-sm text-muted-foreground">Type at least 2 characters</div>
        ) : null}

        {query.trim().length >= MIN_QUERY_LENGTH && isSearching ? (
          <div className="p-3 text-sm text-muted-foreground">Searching...</div>
        ) : null}

        {query.trim().length >= MIN_QUERY_LENGTH && !isSearching && !hasResults ? (
          <div className="p-3 text-sm text-muted-foreground">No results</div>
        ) : null}

        {query.trim().length >= MIN_QUERY_LENGTH && !isSearching && hasResults
          ? sectionOrder.map((section) => {
              const sectionItems = groupedItems[section] || [];

              if (!sectionItems.length) {
                return null;
              }

              return (
                <div key={section} className="border-b last:border-b-0">
                  <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section}
                  </div>

                  <div className="py-1">
                    {sectionItems.map((item) => {
                      const flatIndex = flattenedItems.findIndex((flatItem) => flatItem.id === item.id);
                      const isActive = flatIndex === activeIndex;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={cn(
                            'block w-full px-3 py-2 text-left transition-colors',
                            isActive ? 'bg-surface' : 'hover:bg-slate-50'
                          )}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => handleSelect(item)}
                        >
                          <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
                          <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
