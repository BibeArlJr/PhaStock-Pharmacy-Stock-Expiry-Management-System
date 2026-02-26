import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, X, Pencil, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';

const formatMediumDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString()} (${date.toLocaleDateString(undefined, { weekday: 'short' })})`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const safeText = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function StockIssueDetailsDrawer({ id, open, onClose, onVoidSuccess }) {
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchIssue = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/stock-issues/${id}`);
      const payload = response?.data?.data?.stock_issue || null;
      setIssue(payload);
    } catch (err) {
      setIssue(null);
      setError(err?.response?.data?.message || 'Failed to load stock issue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!open || !id) return undefined;
    fetchIssue();
    return undefined;
  }, [id, open, fetchIssue]);

  const issueId = issue?.id ?? issue?._id;

  const handleEdit = () => {
    if (!issueId) return;
    onClose?.();
    navigate(`/stock-issue/${issueId}/edit`);
  };

  const handleVoid = () => {
    setVoidModalOpen(true);
    setVoidError('');
    setVoidReason('');
  };

  const confirmVoid = async () => {
    if (!issueId) {
      setVoidError('Missing issue id');
      return;
    }
    if (voidReason.trim().length < 3) {
      setVoidError('Provide at least 3 characters');
      return;
    }
    setVoidSubmitting(true);
    try {
      await api.post(`/stock-issues/${issueId}/void`, { reason: voidReason.trim() });
      toast.success('Issue voided');
      setVoidModalOpen(false);
      onVoidSuccess?.();
    } catch (err) {
      setVoidError(err?.response?.data?.message || 'Failed to void issue');
    } finally {
      setVoidSubmitting(false);
    }
  };

  const statusBadge = () => {
    if (issue?.status === 'voided') {
      return (
        <Badge variant="outline" className="border-red-200 text-red-700">
          Voided
        </Badge>
      );
    }
    return <Badge variant="success">Active</Badge>;
  };

  const summaryData = useMemo(() => {
    if (!issue) return [];
    return [
      { label: 'Issue date', value: formatMediumDate(issue.issue_date) },
      { label: 'Reference', value: issue.reference || '—' },
      { label: 'Notes', value: issue.notes || '—' },
      { label: 'Created by', value: issue.created_by?.full_name || issue.created_by?.username || '—' },
      { label: 'Total items', value: (issue.items?.length ?? 0).toString() },
      { label: 'Total qty', value: (issue.total_qty ?? 0).toString() },
    ];
  }, [issue]);

  const openMedicine = (medicineId) => {
    if (!medicineId) return;
    onClose?.();
    // adjust later if your real route is different
    navigate(`/medicines/${medicineId}`);
  };

  const openBatch = (batchStockId) => {
    if (!batchStockId) return;
    onClose?.();
    // adjust later if your real route is different
    navigate(`/batch-stock/${batchStockId}`);
  };

  const renderError = () => (
    <div className="rounded-xl border border-border bg-background p-4 text-sm">
      <p className="text-sm font-medium text-red-700">{error}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={fetchIssue}>
        Retry
      </Button>
    </div>
  );

  const renderLoading = () => (
    <div className="space-y-4">
      {[0, 1, 2].map((k) => (
        <div key={k} className="rounded-xl border border-border bg-background p-5">
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
      No data found.
    </div>
  );

  const renderItems = () => {
    const items = issue?.items || [];
    return (
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Items</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Medicines issued in this transaction
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{items.length} entries</span>
        </div>

        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items</p>
          ) : (
            items.map((item, index) => {
              const medicineName = item.medicine_name_snapshot || item.medicine_name || '—';
              const strength = item.medicine_strength_snapshot || item.strength_snapshot || item.strength || '';
              const batchNo = item.batch_no_snapshot || item.batch_no || '—';
              const expiry = formatDate(item.expiry_date_snapshot || item.expiry_date);
              const qty = item.qty_boxes ?? '—';

              const before = item.available_before ?? '—';
              const after = item.available_after ?? '—';
              const issued = item.qty_boxes ?? '—';

              const medicineId = item.medicine_id;
              const batchStockId = item.batch_stock_id;

              return (
                <Card
                  key={`${item.batch_stock_id || 'bs'}-${item.medicine_id || 'med'}-${index}`}
                  className="rounded-xl border border-border bg-background shadow-sm"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openMedicine(medicineId)}
                          className={`group flex items-center gap-2 text-left ${
                            medicineId ? 'cursor-pointer' : 'cursor-default'
                          }`}
                          title={medicineId ? 'Open medicine details' : ''}
                        >
                          <span className="truncate text-base font-semibold text-foreground group-hover:underline">
                            {medicineName}
                          </span>
                          {medicineId ? (
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                          ) : null}
                        </button>

                        {strength ? (
                          <p className="mt-1 text-sm text-muted-foreground">{strength}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => openBatch(batchStockId)}
                            className={`rounded-full border border-border px-2 py-0.5 ${
                              batchStockId ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'
                            }`}
                            title={batchStockId ? 'Open batch details' : ''}
                          >
                            Batch <span className="font-medium text-foreground">{batchNo}</span>
                          </button>

                          <span className="text-muted-foreground">•</span>

                          <span className="rounded-full border border-border px-2 py-0.5">
                            Exp <span className="font-medium text-foreground">{expiry}</span>
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full border border-border bg-muted/20 px-3 py-1 text-xs font-semibold text-foreground">
                        Qty {safeText(qty)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/25 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Before</div>
                        <div className="mt-0.5 text-base font-semibold text-foreground">{safeText(before)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/25 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">After</div>
                        <div className="mt-0.5 text-base font-semibold text-foreground">{safeText(after)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/25 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Issued</div>
                        <div className="mt-0.5 text-base font-semibold text-foreground">{safeText(issued)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="rounded-xl border border-border bg-background p-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Summary</p>
        <p className="mt-1 text-xs text-muted-foreground">Issue metadata</p>
      </div>

      <div className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 gap-x-4">
        {summaryData.map((item) => (
          <Fragment key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="text-sm font-semibold text-foreground">{item.value}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );

  const renderBody = () => {
    if (error) return renderError();
    if (loading) return renderLoading();
    if (!issue) return renderEmpty();

    // Items first, summary later (as requested)
    return (
      <div className="space-y-4">
        {renderItems()}
        {renderSummary()}
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl">
        {/* Header */}
        <div className="border-b bg-muted/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-tight text-foreground">Stock Issue</p>
              <p className="mt-1 truncate text-sm font-mono text-muted-foreground">
                {issue?.issue_no || '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatMediumDate(issue?.issue_date)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {statusBadge()}
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 px-4 py-2"
                onClick={handleEdit}
                disabled={issue?.status === 'voided'}
              >
                <Pencil className="h-4 w-4" />
                Edit Stock Issue
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 border-red-200 px-4 py-2 text-red-700 hover:bg-red-50"
                onClick={handleVoid}
                disabled={issue?.status === 'voided'}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>

            {issue?.status === 'voided' && (
              <p className="text-xs text-muted-foreground">This issue has been voided.</p>
            )}
          </div>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderBody()}
        </div>

        {/* Void modal */}
        {voidModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl">
              <p className="text-lg font-semibold">Void stock issue</p>
              <p className="text-sm text-muted-foreground">Provide a reason (min 3 characters).</p>

              <textarea
                className="mt-4 w-full rounded-md border border-input px-3 py-2 text-sm"
                rows={3}
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
              />

              {voidError && <p className="mt-2 text-xs text-red-600">{voidError}</p>}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setVoidModalOpen(false)} disabled={voidSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={confirmVoid}
                  disabled={voidSubmitting}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}