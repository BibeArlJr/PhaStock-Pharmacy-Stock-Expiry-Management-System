import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const computeDaysLeft = (expiry) => {
  if (!expiry) return null;
  const expiryDate = new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const diff = expiryDate.getTime() - startOfToday().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const computeFlags = (item) => {
  const expiryAlertDays = 30;
  const lowStockLimit = 2;
  const daysLeft = computeDaysLeft(item?.expiry_date);
  return {
    expired: typeof daysLeft === 'number' ? daysLeft <= 0 : false,
    expiring_soon: typeof daysLeft === 'number' && daysLeft > 0 && daysLeft <= expiryAlertDays,
    low_stock: (item?.available_boxes ?? 0) > 0 && (item?.available_boxes ?? 0) <= lowStockLimit,
  };
};

const formatExpiry = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString()} (${date.toLocaleDateString(undefined, { weekday: 'short' })})`;
};

export default function BatchStockDetailsDrawer({ batchStockId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');

  const fetchBatch = useCallback(async () => {
    if (!batchStockId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/batch-stocks/${batchStockId}`);
      setBatch(response?.data?.data || null);
    } catch (err) {
      setBatch(null);
      setError(err?.response?.data?.message || 'Failed to load batch details');
    } finally {
      setLoading(false);
    }
  }, [batchStockId]);

  useEffect(() => {
    if (open && batchStockId) {
      fetchBatch();
    }
  }, [open, batchStockId, fetchBatch]);

  const flags = useMemo(() => (batch ? computeFlags(batch) : null), [batch]);
  const daysLeft = useMemo(() => (batch ? computeDaysLeft(batch.expiry_date) : null), [batch]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">Batch details</p>
            <p className="text-sm font-mono text-muted-foreground">{batch?.batch_no || '—'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-background p-4">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchBatch}>
                Retry
              </Button>
            </div>
          ) : batch ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{batch.medicine?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.medicine?.strength ? batch.medicine.strength : '—'}
                    </p>
                  </div>
                  <Badge variant={flags?.expired ? 'destructive' : flags?.expiring_soon ? 'outline' : 'success'}>
                    {flags?.expired ? 'Expired' : flags?.expiring_soon ? 'Expiring soon' : 'Valid'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <div className="text-muted-foreground">Expiry</div>
                    <div className="font-semibold text-foreground">{formatExpiry(batch.expiry_date)}</div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <div className="text-muted-foreground">Available boxes</div>
                    <div className="font-semibold text-foreground">{batch.available_boxes ?? 0}</div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <div className="text-muted-foreground">Days left</div>
                    <div className="font-semibold text-foreground">
                      {daysLeft === null ? '—' : daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <div className="text-muted-foreground">Source</div>
                    <div className="font-semibold text-foreground">{batch.source_type || batch.sourceType || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Receipt</p>
                <p className="text-xs text-muted-foreground">
                  {batch.receipt?.invoice_number ? `Invoice ${batch.receipt.invoice_number}` : 'No invoice data'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supplier: {batch.receipt?.supplier?.name || '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </div>
      </aside>
    </>
  );
}
