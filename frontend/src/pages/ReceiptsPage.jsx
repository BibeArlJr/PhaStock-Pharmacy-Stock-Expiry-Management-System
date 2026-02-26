import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import AsyncCombobox from '@/components/AsyncCombobox';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_NUMERIC_CLASS,
  DATA_TABLE_TD_CLASS,
  DATA_TABLE_TH_CLASS,
} from '@/components/common/dataTableStyles';
import DateRangeFilter from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const DEFAULT_LIMIT = 20;

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

const normalizeItems = (response) => response?.data?.data?.items || [];

export default function ReceiptsPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [batchInput, setBatchInput] = useState('');
  const [debouncedBatch, setDebouncedBatch] = useState('');

  const [supplier, setSupplier] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedBatch(batchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [batchInput]);

  const fetchSupplierOptions = async (query, signal) => {
    const response = await api.get('/suppliers', {
      params: {
        q: query,
        page: 1,
        limit: 20,
      },
      signal,
    });

    return normalizeItems(response).map((item) => ({
      id: item.id,
      label: item.name,
      subLabel: item.phone || '',
      raw: item,
    }));
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchReceipts = async () => {
      setIsLoading(true);

      try {
        const response = await api.get('/purchase-receipts', {
          params: {
            page,
            limit,
            q: debouncedSearch || undefined,
            invoice_number: debouncedSearch || undefined,
            supplier_id: supplier?.id || undefined,
            batch: debouncedBatch || undefined,
            batch_no: debouncedBatch || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
          signal: controller.signal,
        });

        const data = response.data?.data || {};
        const nextItems = data.items || [];
        setItems(nextItems);
        setTotal(data.total || 0);
        setSelectedIds((prev) => {
          const next = new Set();
          const allowed = new Set(nextItems.map((item) => item.id));
          prev.forEach((id) => {
            if (allowed.has(id)) {
              next.add(id);
            }
          });
          return next;
        });
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipts();

    return () => controller.abort();
  }, [page, limit, debouncedSearch, debouncedBatch, supplier, dateFrom, dateTo]);

  const onClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setBatchInput('');
    setDebouncedBatch('');
    setSupplier(null);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const allRowsSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const onToggleSelectMode = () => {
    setSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  };

  const onToggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allRowsSelected) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  };

  const onToggleRowSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedIds.size} receipts?`);
    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      await api.delete('/receipts', {
        data: {
          ids: Array.from(selectedIds),
        },
      });
      toast.success('Selected receipts deleted');
      setSelectedIds(new Set());
      setPage(1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete selected receipts');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Receipts</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant={selectMode ? 'default' : 'outline'} onClick={onToggleSelectMode}>
              Select
            </Button>
            <Button
              type="button"
              onClick={onBulkDelete}
              disabled={selectedIds.size === 0 || isBulkDeleting}
              className={
                selectedIds.size === 0 || isBulkDeleting
                  ? 'border border-border bg-muted text-muted-foreground opacity-60'
                  : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </Button>
            <Button type="button" onClick={() => navigate('/receipts/new')}>
              Add Receipt
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(260px,2fr)_minmax(140px,1fr)_minmax(220px,1.3fr)_minmax(220px,1.3fr)_auto]">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search invoice or supplier"
              className="h-10"
            />

            <Input
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              placeholder="Batch no"
              className="h-10"
            />

            <AsyncCombobox
              value={supplier}
              onChange={(option) => {
                setSupplier(option);
                setPage(1);
              }}
              fetchOptions={fetchSupplierOptions}
              placeholder="Supplier"
              searchPlaceholder="Search supplier"
            />

            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onApply={({ from, to }) => {
                setDateFrom(from || '');
                setDateTo(to || '');
                setPage(1);
              }}
              onClear={() => {
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            />

            <Button variant="outline" size="sm" onClick={onClearFilters} className="h-10">
              Clear
            </Button>
          </div>

          <div className="w-full">
            <table className={DATA_TABLE_CLASS}>
              <colgroup>
                {(selectMode
                  ? ['4%', '13%', '17%', '26%', '10%', '17%', '13%']
                  : ['14%', '18%', '28%', '10%', '18%', '12%']
                ).map((width, index) => (
                  <col key={`receipts-col-${index}-${width}`} style={{ width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b">
                  {selectMode ? (
                    <th className={`${DATA_TABLE_TH_CLASS} text-center`}>
                      <input
                        type="checkbox"
                        checked={allRowsSelected}
                        onChange={onToggleSelectAll}
                        aria-label="Select all receipts"
                      />
                    </th>
                  ) : null}
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Invoice Date</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Invoice Number</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Supplier</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Items count</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Created by</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`receipt-row-skeleton-${index}`} className="border-b">
                        {Array.from({ length: selectMode ? 7 : 6 }).map((__, cellIndex) => (
                          <td key={cellIndex} className={DATA_TABLE_TD_CLASS}>
                            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}

                {!isLoading && items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectMode ? 7 : 6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No receipts found
                    </td>
                  </tr>
                ) : null}

                {!isLoading
                  ? items.map((receipt) => (
                      <tr
                        key={receipt.id}
                        className="cursor-pointer border-b hover:bg-muted/30"
                        onClick={() => navigate(`/receipts/${receipt.id}`)}
                      >
                        {selectMode ? (
                          <td className={`${DATA_TABLE_TD_CLASS} text-center`} onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(receipt.id)}
                              onChange={() => onToggleRowSelect(receipt.id)}
                              aria-label={`Select receipt ${receipt.invoice_number}`}
                            />
                          </td>
                        ) : null}
                        <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center`}>
                          {formatDate(receipt.invoice_date)}
                        </td>
                        <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center font-medium`}>
                          {receipt.invoice_number}
                        </td>
                        <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                          <div
                            className="mx-auto max-w-full break-words whitespace-normal leading-snug line-clamp-2"
                            title={receipt.supplier?.name || '-'}
                          >
                            {receipt.supplier?.name || '-'}
                          </div>
                        </td>
                        <td className={`${DATA_TABLE_TD_CLASS} text-center ${DATA_TABLE_NUMERIC_CLASS}`}>
                          {receipt.item_count ?? 0}
                        </td>
                        <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{receipt.created_by?.full_name || '-'}</td>
                        <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/receipts/${receipt.id}`);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>

            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
