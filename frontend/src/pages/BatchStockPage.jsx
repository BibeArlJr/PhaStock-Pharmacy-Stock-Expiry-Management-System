import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Eye, Pencil, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import AsyncCombobox from '@/components/AsyncCombobox';
import AddMedicineModal from '@/components/modals/AddMedicineModal';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_NUMERIC_CLASS,
  DATA_TABLE_TD_CLASS,
  DATA_TABLE_TH_CLASS,
} from '@/components/common/dataTableStyles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const DEFAULT_LIMIT = 20;

const createManualFormState = () => ({
  medicine: null,
  pack: '',
  batch_no: '',
  expiry_date: '',
  available_boxes: '',
  purchase_price: '',
  mrp: '',
});

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

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const computeDaysLeft = (expiryDateIso) => {
  const todayStart = startOfToday();
  const expiryDate = new Date(expiryDateIso);
  if (Number.isNaN(expiryDate.getTime())) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((expiryDate.getTime() - todayStart.getTime()) / msPerDay);
  return days;
};

const computeFlags = (item, settings) => {
  if (item.flags) {
    return item.flags;
  }

  const expiryAlertDays = settings?.expiry_alert_days ?? 30;
  const lowStockLimit = settings?.low_stock_limit ?? 2;
  const daysLeft = computeDaysLeft(item.expiry_date) ?? 0;

  return {
    expired: daysLeft <= 0,
    expiring_soon: daysLeft > 0 && daysLeft <= expiryAlertDays,
    low_stock: item.available_boxes > 0 && item.available_boxes <= lowStockLimit,
    out_of_stock: item.available_boxes <= 0,
  };
};

function FilterSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const selected = options.find((item) => item.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-white shadow-md">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function BatchStockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [expiryStatus, setExpiryStatus] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [sort, setSort] = useState('expiry_stock');

  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [refreshKey, setRefreshKey] = useState(0);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [settings, setSettings] = useState({
    expiry_alert_days: 30,
    low_stock_limit: 2,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchDetail, setBatchDetail] = useState(null);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [manualEditSaving, setManualEditSaving] = useState(false);
  const [manualEditForm, setManualEditForm] = useState(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(createManualFormState());
  const [manualErrors, setManualErrors] = useState({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [medicineDraftName, setMedicineDraftName] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const shouldOpenByQuery = searchParams.get('open') === 'manual';
    const shouldOpenByState = Boolean(location.state?.openManual);

    if (!shouldOpenByQuery && !shouldOpenByState) {
      return;
    }

    setManualErrors({});
    setManualForm(createManualFormState());
    setManualOpen(true);
    navigate('/batch-stock', { replace: true, state: null });
  }, [location.state, navigate, searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBatchStocks = async () => {
      setIsLoading(true);

      try {
        const response = await api.get('/batch-stocks', {
          params: {
            q: debouncedSearch || undefined,
            expiry_status: expiryStatus,
            stock_status: stockStatus,
            sort,
            page,
            limit,
          },
          signal: controller.signal,
        });

        const data = response?.data?.data || {};
        const nextItems = data.items || [];
        setItems(nextItems);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setSettings(
          data.settings || {
            expiry_alert_days: 30,
            low_stock_limit: 2,
          }
        );
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
          setTotalPages(1);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchStocks();

    return () => controller.abort();
  }, [debouncedSearch, expiryStatus, stockStatus, sort, page, limit, refreshKey]);

  useEffect(() => {
    if (!drawerOpen || !selectedBatchId) {
      return;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await api.get(`/batch-stocks/${selectedBatchId}`, {
          signal: controller.signal,
        });

        const data = response?.data?.data || {};
        setBatchDetail(
          data.batch
            ? {
                ...data.batch,
                receipt: data.receipt || null,
              }
            : null
        );
        setManualEditOpen(false);
        if (data.batch?.source_type === 'manual') {
          setManualEditForm({
            medicine: data.batch.medicine,
            pack: data.batch.pack || '',
            batch_no: data.batch.batch_no || '',
            expiry_date: data.batch.expiry_date ? data.batch.expiry_date.slice(0, 10) : '',
            available_boxes: String(data.batch.available_boxes ?? 0),
            purchase_price: String(data.batch.latest_purchase_price ?? 0),
            mrp: String(data.batch.latest_mrp ?? 0),
          });
        } else {
          setManualEditForm(null);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setBatchDetail(null);
          setManualEditForm(null);
        }
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();

    return () => controller.abort();
  }, [drawerOpen, selectedBatchId]);

  const fetchMedicineOptions = async (query, signal) => {
    const response = await api.get('/medicines', {
      params: {
        q: query,
        page: 1,
        limit: 20,
      },
      signal,
    });

    const rows = response?.data?.data?.items || [];

    return rows.map((item) => ({
      id: item.id,
      label: item.name,
      subLabel: item.strength || '',
      raw: item,
    }));
  };

  const rows = useMemo(
    () =>
      items.map((item) => {
        const computedFlags = computeFlags(item, settings);
        const daysLeft = computeDaysLeft(item.expiry_date);
        const batchValue = Number(item.available_boxes || 0) * Number(item.latest_purchase_price || 0);

        return {
          ...item,
          computedFlags,
          daysLeft,
          batchValue,
          source_type: item.source_type || (item.source === 'manual' ? 'manual' : 'receipt'),
        };
      }),
    [items, settings]
  );

  const onClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setExpiryStatus('all');
    setStockStatus('all');
    setSort('expiry_stock');
    setPage(1);
  };

  const openDrawer = (batchId) => {
    setSelectedBatchId(batchId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedBatchId('');
    setBatchDetail(null);
    setManualEditOpen(false);
    setManualEditForm(null);
  };

  const onView = async (row) => {
    openDrawer(row.id);
  };

  const allRowsSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  const onToggleSelectOne = (row) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  };

  const onToggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allRowsSelected) {
        return new Set();
      }
      return new Set(rows.map((row) => row.id));
    });
  };

  const runDeleteWithConcurrency = async (ids, concurrency = 3) => {
    const queue = [...ids];
    const failures = [];

    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) {
          continue;
        }
        try {
          await api.delete(`/batch-stocks/${id}`);
        } catch (error) {
          failures.push(error);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));

    if (failures.length > 0) {
      throw failures[0];
    }
  };

  const onBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedIds.size} batch(es)?`);
    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await runDeleteWithConcurrency(ids, 3);
      toast.success('Selected batches deleted');
      setSelectedIds(new Set());
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete selected batches');
    } finally {
      setIsBulkDeleting(false);
    }
  };


  const openManualModal = () => {
    setManualErrors({});
    setManualForm(createManualFormState());
    setManualOpen(true);
  };

  const closeManualModal = () => {
    setManualOpen(false);
    setManualSubmitting(false);
    setManualErrors({});
    setManualForm(createManualFormState());
    setMedicineModalOpen(false);
    setMedicineDraftName('');
  };

  const validateManualForm = () => {
    const nextErrors = {};

    if (!manualForm.medicine?.id) {
      nextErrors.medicine_id = 'Medicine is required';
    }

    if (!manualForm.pack.trim()) {
      nextErrors.pack = 'Pack is required';
    }

    if (!manualForm.batch_no.trim()) {
      nextErrors.batch_no = 'Batch no is required';
    }

    if (!manualForm.expiry_date) {
      nextErrors.expiry_date = 'Expiry date is required';
    }

    const boxes = Number(manualForm.available_boxes);
    if (!manualForm.available_boxes || Number.isNaN(boxes) || boxes < 1 || !Number.isInteger(boxes)) {
      nextErrors.available_boxes = 'Boxes must be an integer of at least 1';
    }

    if (manualForm.purchase_price !== '') {
      const purchasePrice = Number(manualForm.purchase_price);
      if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
        nextErrors.purchase_price = 'Purchase price must be 0 or more';
      }
    }

    if (manualForm.mrp !== '') {
      const mrp = Number(manualForm.mrp);
      if (Number.isNaN(mrp) || mrp < 0) {
        nextErrors.mrp = 'MRP must be 0 or more';
      }
    }

    setManualErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const onSubmitManual = async () => {
    if (!validateManualForm()) {
      return;
    }

    setManualSubmitting(true);

    try {
      const payload = {
        medicine_id: manualForm.medicine.id,
        pack: manualForm.pack.trim(),
        batch_no: manualForm.batch_no.trim(),
        expiry_date: manualForm.expiry_date,
        available_boxes: Number(manualForm.available_boxes),
        ...(manualForm.purchase_price !== ''
          ? { purchase_price: Number(manualForm.purchase_price) }
          : {}),
        ...(manualForm.mrp !== '' ? { mrp: Number(manualForm.mrp) } : {}),
      };

      await api.post('/batch-stocks/manual', payload);

      toast.success('Stock added successfully');
      closeManualModal();
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const code = error?.response?.data?.code;

      if (code === 'VALIDATION_ERROR') {
        toast.error('Please check manual stock details');
      } else {
        toast.error('Failed to add manual stock');
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  const onSaveManualEdit = async () => {
    if (!batchDetail || !manualEditForm?.medicine?.id) {
      return;
    }

    const payload = {
      medicine_id: manualEditForm.medicine.id,
      pack: manualEditForm.pack.trim(),
      batch_no: manualEditForm.batch_no.trim(),
      expiry_date: manualEditForm.expiry_date,
      available_boxes: Number(manualEditForm.available_boxes),
      purchase_price: Number(manualEditForm.purchase_price),
      mrp: Number(manualEditForm.mrp),
    };

    if (
      !payload.pack ||
      !payload.batch_no ||
      !payload.expiry_date ||
      !Number.isFinite(payload.available_boxes) ||
      payload.available_boxes < 0
    ) {
      toast.error('Please complete manual batch fields');
      return;
    }

    setManualEditSaving(true);
    try {
      await api.put(`/batch-stocks/${batchDetail.id}`, payload);
      toast.success('Manual batch updated');
      setManualEditOpen(false);
      setRefreshKey((prev) => prev + 1);
      openDrawer(batchDetail.id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update manual batch');
    } finally {
      setManualEditSaving(false);
    }
  };

  const onDeleteManualFromDrawer = async () => {
    if (!batchDetail) {
      return;
    }

    const confirmed = window.confirm('Delete this manual batch?');
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/batch-stocks/${batchDetail.id}`);
      toast.success('Manual batch deleted');
      closeDrawer();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete manual batch');
    }
  };

  const drawerDaysLeft = batchDetail ? computeDaysLeft(batchDetail.expiry_date) : null;
  const drawerBatchValue = batchDetail
    ? Number(batchDetail.available_boxes || 0) * Number(batchDetail.latest_purchase_price || 0)
    : 0;
  const drawerFlags = batchDetail ? computeFlags(batchDetail, settings) : null;
  const drawerStatusText = drawerFlags
    ? drawerFlags.expired
      ? 'Expired'
      : drawerFlags.expiring_soon
        ? 'Expiring soon'
        : 'Valid'
    : '—';
  const drawerStockText = drawerFlags
    ? drawerFlags.out_of_stock
      ? 'Out of stock'
      : drawerFlags.low_stock
        ? 'Low stock'
        : 'In stock'
    : '—';

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Batch Stock</CardTitle>

          <div className="flex items-center gap-2">
            <Button type="button" variant={selectMode ? 'default' : 'outline'} onClick={toggleSelectMode}>
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
            <Button type="button" onClick={openManualModal}>
              Manual Stock Add
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(280px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(220px,1fr)_auto]">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search medicine, batch, pack"
              className="h-10"
            />

            <FilterSelect
              value={expiryStatus}
              onChange={(value) => {
                setExpiryStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All expiry' },
                { value: 'valid', label: 'Valid' },
                { value: 'expiring', label: 'Expiring soon' },
                { value: 'expired', label: 'Expired' },
              ]}
              placeholder="Expiry"
            />

            <FilterSelect
              value={stockStatus}
              onChange={(value) => {
                setStockStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All stock' },
                { value: 'in', label: 'In stock' },
                { value: 'low', label: 'Low stock' },
                { value: 'out', label: 'Out of stock' },
              ]}
              placeholder="Stock"
            />

            <FilterSelect
              value={sort}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
              options={[
                { value: 'expiry_stock', label: 'Expiry → Stock' },
                { value: 'stock_expiry', label: 'Stock → Expiry' },
                { value: 'expiry', label: 'Expiry only' },
                { value: 'stock', label: 'Stock only' },
                { value: 'medicine', label: 'Medicine (A–Z)' },
                { value: 'updated', label: 'Recently updated' },
              ]}
              placeholder="Sort"
            />

            <Button variant="outline" size="sm" onClick={onClearFilters} className="h-10">
              Clear
            </Button>
          </div>

          <div>
            <table className={DATA_TABLE_CLASS}>
              <colgroup>
                {(selectMode
                  ? ['3.5%', '18%', '14%', '16%', '16%', '12%', '12%']
                  : ['20%', '16%', '18%', '18%', '14%', '14%']
                ).map((width, index) => (
                  <col key={`batch-col-${width}-${index}`} style={{ width }} />
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
                        aria-label="Select all batches"
                      />
                    </th>
                  ) : null}
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Medicine</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Batch no</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Expiry date</th>
                  <th
                    className={`${DATA_TABLE_TH_CLASS} text-center whitespace-normal leading-tight`}
                  >
                    Available Boxes
                  </th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Status</th>
                  <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, index) => (
                      <tr key={`batch-stock-skeleton-${index}`} className="border-b">
                        {Array.from({ length: selectMode ? 7 : 6 }).map((__, cellIndex) => (
                          <td key={cellIndex} className={DATA_TABLE_TD_CLASS}>
                            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}

                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectMode ? 7 : 6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No batches found
                    </td>
                  </tr>
                ) : null}

                {!isLoading
                  ? rows.map((row) => {
                      const { computedFlags } = row;

                      return (
                        <tr
                          key={row.id}
                          className={`border-b ${computedFlags.expired ? 'bg-red-50/40' : 'hover:bg-muted/20'}`}
                        >
                          {selectMode ? (
                            <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.id)}
                                onChange={() => onToggleSelectOne(row)}
                                aria-label={`Select ${row.batch_no}`}
                              />
                            </td>
                          ) : null}
                          <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                            <div className="truncate font-medium leading-tight text-foreground">
                              {row.medicine?.name || '-'}
                            </div>
                            <div className="truncate text-xs leading-tight text-muted-foreground">
                              {row.medicine?.strength || '-'}
                            </div>
                          </td>
                          <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center`}>
                            {row.batch_no || '-'}
                          </td>
                          <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center`}>
                            {formatDate(row.expiry_date)}
                          </td>
                          <td
                            className={`${DATA_TABLE_TD_CLASS} ${DATA_TABLE_NUMERIC_CLASS} whitespace-nowrap text-center font-medium`}
                          >
                            {row.available_boxes ?? 0}
                          </td>
                          <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center`}>
                            {computedFlags.expired ? (
                              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                                Expired
                              </Badge>
                            ) : computedFlags.expiring_soon ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap text-xs">
                                Expiring soon
                              </Badge>
                            ) : computedFlags.out_of_stock ? (
                              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                                Out
                              </Badge>
                            ) : computedFlags.low_stock ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                Low
                              </Badge>
                            ) : (
                              <Badge variant="success">OK</Badge>
                            )}
                          </td>
                          <td className={`${DATA_TABLE_TD_CLASS} whitespace-nowrap text-center`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-w-[68px]"
                              onClick={() => onView(row)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
              Page {page} of {Math.max(1, totalPages)} • {total} items
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

      {drawerOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeDrawer} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
              <h3 className="text-base font-semibold">Batch Details</h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-5 w-52 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                </div>
              ) : batchDetail ? (
                <>
                  <div className="space-y-2 border-b pb-4">
                    <p className="text-lg font-semibold leading-tight">
                      {batchDetail.medicine?.name || '—'}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        {batchDetail.medicine?.strength || ''}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Batch no: </span>
                      <span className="text-foreground">{batchDetail.batch_no || '—'}</span>
                      <span className="mx-1.5 text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Source: </span>
                      <span className="capitalize text-foreground">{batchDetail.source_type || '—'}</span>
                    </p>
                  </div>

                  <div className="space-y-4 border-b py-4 text-sm">
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Expiry date</div>
                      <div className="text-sm font-medium text-foreground">{formatDate(batchDetail.expiry_date)}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Available boxes</div>
                      <div className="text-sm font-medium text-foreground">{batchDetail.available_boxes ?? 0}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="text-sm font-medium text-foreground">
                        {drawerFlags?.expired ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                            Expired
                          </Badge>
                        ) : drawerFlags?.expiring_soon ? (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            Expiring soon
                          </Badge>
                        ) : (
                          <Badge variant="success">Valid</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Days left</div>
                      <div className="text-sm font-medium text-foreground">
                        {drawerDaysLeft === null ? '—' : drawerDaysLeft <= 0 ? 'Expired' : `${drawerDaysLeft} days`}
                      </div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Created at</div>
                      <div className="text-sm font-medium text-foreground">{formatDateTime(batchDetail.created_at)}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Created by</div>
                      <div className="text-sm font-medium text-foreground">
                        {batchDetail.created_by?.full_name || batchDetail.created_by?.username || '—'}
                      </div>
                    </div>
                  </div>

                  {batchDetail.source_type === 'manual' ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setManualEditOpen((prev) => !prev)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        {manualEditOpen ? 'Close Edit' : 'Edit Manual Batch'}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="text-red-600" onClick={onDeleteManualFromDrawer}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ) : null}

                  {manualEditOpen && manualEditForm ? (
                    <div className="grid gap-4 rounded-md border p-3 text-sm">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Medicine</label>
                        <AsyncCombobox
                          value={manualEditForm.medicine
                            ? {
                                id: manualEditForm.medicine.id,
                                label: manualEditForm.medicine.name,
                                subLabel: manualEditForm.medicine.strength || '',
                              }
                            : null}
                          onChange={(value) =>
                            setManualEditForm((prev) => ({
                              ...prev,
                              medicine: value ? { id: value.id, name: value.label, strength: value.subLabel || '' } : null,
                            }))
                          }
                          fetchOptions={fetchMedicineOptions}
                          placeholder="Select medicine"
                          searchPlaceholder="Search medicine"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Pack</label>
                          <Input
                            value={manualEditForm.pack}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, pack: e.target.value }))}
                            placeholder="Pack"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Batch No</label>
                          <Input
                            value={manualEditForm.batch_no}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, batch_no: e.target.value }))}
                            placeholder="Batch"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                          <Input
                            type="date"
                            value={manualEditForm.expiry_date}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, expiry_date: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Available Boxes</label>
                          <Input
                            type="number"
                            min="0"
                            value={manualEditForm.available_boxes}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, available_boxes: e.target.value }))}
                            placeholder="Boxes"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Purchase Price / Box</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={manualEditForm.purchase_price}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, purchase_price: e.target.value }))}
                            placeholder="Purchase price"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">MRP</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={manualEditForm.mrp}
                            onChange={(e) => setManualEditForm((p) => ({ ...p, mrp: e.target.value }))}
                            placeholder="MRP"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" onClick={onSaveManualEdit} disabled={manualEditSaving}>
                          {manualEditSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-md border py-4 pl-3 pr-3 text-sm">
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Pack</div>
                      <div className="text-sm font-medium text-foreground">{batchDetail.pack || '—'}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Stock status</div>
                      <div className="text-sm font-medium text-foreground">{drawerStockText}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Purchase price / box</div>
                      <div className="text-sm font-medium text-foreground">{formatMoney(batchDetail.latest_purchase_price)}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">MRP</div>
                      <div className="text-sm font-medium text-foreground">{formatMoney(batchDetail.latest_mrp)}</div>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-4">
                      <div className="text-sm text-muted-foreground">Batch value</div>
                      <div className="text-sm font-medium text-foreground">{formatMoney(drawerBatchValue)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border py-4 pl-3 pr-3 text-sm">
                    <p className="text-sm font-semibold">Receipt</p>
                    {batchDetail.source_type === 'receipt' && (batchDetail.receipt?.id || batchDetail.source_receipt_id) ? (
                      <>
                        <p className="text-sm text-muted-foreground">Linked receipt</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <div className="rounded-md border px-2 py-1 text-sm">
                            <span className="text-muted-foreground">Invoice: </span>
                            <span className="font-medium text-foreground">{batchDetail.receipt?.invoice_number || '—'}</span>
                          </div>
                          <div className="max-w-full rounded-md border px-2 py-1 text-sm">
                            <span className="text-muted-foreground">Supplier: </span>
                            <span className="break-words font-medium text-foreground">
                              {batchDetail.receipt?.supplier?.name || '—'}
                            </span>
                          </div>
                          <div className="rounded-md border px-2 py-1 text-sm">
                            <span className="text-muted-foreground">Date: </span>
                            <span className="font-medium text-foreground">{formatDate(batchDetail.receipt?.invoice_date)}</span>
                          </div>
                        </div>
                        <div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3 inline-flex items-center rounded-md border border-green-600 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                            onClick={() => {
                              const receiptId = batchDetail.receipt?.id || batchDetail.source_receipt_id;
                              if (!receiptId) {
                                return;
                              }
                              closeDrawer();
                              navigate(`/receipts/${receiptId}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4 text-green-700" />
                            View receipt
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        This batch was added manually.
                        <br />
                        No receipt is linked to this stock.
                      </p>
                    )}
                  </div>

                </>
              ) : (
                <p className="text-sm text-muted-foreground">Batch details not available.</p>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {manualOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={closeManualModal} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manual Stock Add</CardTitle>
                <button
                  type="button"
                  onClick={closeManualModal}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">Medicine</label>
                    <AsyncCombobox
                      value={manualForm.medicine}
                      onChange={(option) => {
                        setManualForm((prev) => ({ ...prev, medicine: option }));
                        setManualErrors((prev) => ({ ...prev, medicine_id: '' }));
                      }}
                      fetchOptions={fetchMedicineOptions}
                      placeholder="Select medicine"
                      searchPlaceholder="Search medicine"
                      noResultsActionLabel={(query) => `+ Add medicine: ${query}`}
                      onNoResultsAction={(query) => {
                        setMedicineDraftName(query);
                        setMedicineModalOpen(true);
                      }}
                      disabled={manualSubmitting}
                    />
                    {manualErrors.medicine_id ? (
                      <p className="text-xs text-red-600">{manualErrors.medicine_id}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Pack</label>
                    <Input
                      value={manualForm.pack}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, pack: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, pack: '' }));
                      }}
                      placeholder="10SX10T"
                      disabled={manualSubmitting}
                    />
                    {manualErrors.pack ? <p className="text-xs text-red-600">{manualErrors.pack}</p> : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Batch no</label>
                    <Input
                      value={manualForm.batch_no}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, batch_no: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, batch_no: '' }));
                      }}
                      placeholder="BATCH-001"
                      disabled={manualSubmitting}
                    />
                    {manualErrors.batch_no ? (
                      <p className="text-xs text-red-600">{manualErrors.batch_no}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Expiry date</label>
                    <Input
                      type="date"
                      value={manualForm.expiry_date}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, expiry_date: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, expiry_date: '' }));
                      }}
                      disabled={manualSubmitting}
                    />
                    {manualErrors.expiry_date ? (
                      <p className="text-xs text-red-600">{manualErrors.expiry_date}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Boxes</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={manualForm.available_boxes}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, available_boxes: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, available_boxes: '' }));
                      }}
                      placeholder="0"
                      disabled={manualSubmitting}
                    />
                    {manualErrors.available_boxes ? (
                      <p className="text-xs text-red-600">{manualErrors.available_boxes}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Purchase price/box (optional)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualForm.purchase_price}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, purchase_price: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, purchase_price: '' }));
                      }}
                      placeholder="0.00"
                      disabled={manualSubmitting}
                    />
                    {manualErrors.purchase_price ? (
                      <p className="text-xs text-red-600">{manualErrors.purchase_price}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">MRP (optional)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualForm.mrp}
                      onChange={(event) => {
                        setManualForm((prev) => ({ ...prev, mrp: event.target.value }));
                        setManualErrors((prev) => ({ ...prev, mrp: '' }));
                      }}
                      placeholder="0.00"
                      disabled={manualSubmitting}
                    />
                    {manualErrors.mrp ? <p className="text-xs text-red-600">{manualErrors.mrp}</p> : null}
                  </div>

                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeManualModal} disabled={manualSubmitting}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={onSubmitManual} disabled={manualSubmitting}>
                    {manualSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <AddMedicineModal
        open={medicineModalOpen}
        initialName={medicineDraftName}
        onOpenChange={setMedicineModalOpen}
        onCreated={(createdMedicine) => {
          setManualForm((prev) => ({
            ...prev,
            medicine: createdMedicine,
          }));
          setManualErrors((prev) => ({ ...prev, medicine_id: '' }));
          setMedicineModalOpen(false);
          setMedicineDraftName('');
        }}
      />
    </div>
  );
}
