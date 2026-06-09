import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function MedicineDetailsDrawer({ medicineId, open, onClose, onEdit, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [medicine, setMedicine] = useState(null);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMedicine = useCallback(async () => {
    if (!medicineId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/medicines/${medicineId}`);
      setMedicine(response?.data?.data || null);
    } catch (err) {
      setMedicine(null);
      setError(err?.response?.data?.message || 'Failed to load medicine details');
    } finally {
      setLoading(false);
    }
  }, [medicineId]);

  useEffect(() => {
    if (open && medicineId) {
      fetchMedicine();
    }
  }, [open, medicineId, fetchMedicine]);

  const handleDelete = async () => {
    if (!medicineId) return;
    const confirmed = window.confirm('Delete this medicine?');
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete(`/medicines/${medicineId}`);
      toast.success('Medicine deleted');
      onDeleted?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete medicine');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!medicineId) return;
    onEdit?.(medicineId);
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">Medicine details</p>
            <p className="text-sm font-mono text-muted-foreground">{medicine?.name || '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit} disabled={!medicine}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting || !medicine}>
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
              <Button variant="outline" size="sm" onClick={fetchMedicine}>
                Retry
              </Button>
            </div>
          ) : medicine ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Name</div>
                  <div className="font-semibold text-foreground">{medicine.name}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Strength</div>
                  <div className="font-semibold text-foreground">{medicine.strength || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Category</div>
                  <div className="font-semibold text-foreground">{medicine.category || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Notes</div>
                  <div className="font-semibold text-foreground">{medicine.notes || '—'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Created By</div>
                  <div className="font-semibold text-foreground">—</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Created At</div>
                  <div className="font-semibold text-foreground">{formatDateTime(medicine.created_at)}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Updated At</div>
                  <div className="font-semibold text-foreground">{formatDateTime(medicine.updated_at)}</div>
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
