import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function SupplierDetailsDrawer({ supplierId, open, onClose, onEdit, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/suppliers/${supplierId}`);
      setSupplier(response?.data?.data || null);
    } catch (err) {
      setSupplier(null);
      setError(err?.response?.data?.message || 'Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (open && supplierId) {
      fetchSupplier();
    }
  }, [open, supplierId, fetchSupplier]);

  const handleDelete = async () => {
    if (!supplierId) return;
    const confirmed = window.confirm('Delete this supplier?');
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await api.delete(`/suppliers/${supplierId}`);
      toast.success('Supplier deleted');
      onDeleted?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete supplier');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!supplierId) return;
    onEdit?.(supplierId);
  };

  const statusBadge = useMemo(() => {
    if (!supplier) return null;
    const color = supplier.status === 'active' ? 'success' : 'destructive';
    return <Badge variant={color}>{supplier.status?.toUpperCase() || 'UNKNOWN'}</Badge>;
  }, [supplier]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">Supplier details</p>
            <p className="text-sm font-mono text-muted-foreground">{supplier?.name || '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit} disabled={!supplier}>
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || !supplier}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
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
              <Button variant="outline" size="sm" onClick={fetchSupplier}>
                Retry
              </Button>
            </div>
          ) : supplier ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">Supplier ID: {supplier.id}</p>
                  </div>
                  {statusBadge}
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-semibold text-foreground">{supplier.phone || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-semibold text-foreground">{supplier.email || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Address</div>
                  <div className="font-semibold text-foreground">{supplier.address || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">PAN / VAT</div>
                  <div className="font-semibold text-foreground">{supplier.pan_vat || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Notes</div>
                  <div className="font-semibold text-foreground">{supplier.notes || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Created At</div>
                  <div className="font-semibold text-foreground">{formatDateTime(supplier.created_at)}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Updated At</div>
                  <div className="font-semibold text-foreground">{formatDateTime(supplier.updated_at)}</div>
                </div>
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
