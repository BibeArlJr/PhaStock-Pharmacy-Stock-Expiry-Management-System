import { useEffect, useMemo, useState } from 'react';

import BatchStockDetailsDrawer from '@/components/BatchStockDetailsDrawer';
import { DATA_TABLE_CLASS, DATA_TABLE_TD_CLASS, DATA_TABLE_TH_CLASS } from '@/components/common/dataTableStyles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import api from '@/lib/api';

const formatExpiry = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString()} (${date.toLocaleDateString(undefined, { weekday: 'short' })})`;
};

const SEVERITY_LABELS = {
  expired: { text: 'Expired', color: 'border-red-200 bg-red-50 text-red-700' },
  expiringSoon: { text: 'Expiring soon', color: 'border-amber-200 bg-amber-50 text-amber-700' },
  lowStock: { text: 'Low stock', color: 'border-amber-200 bg-amber-50 text-amber-700' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState({ expired: [], expiringSoon: [], lowStock: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/alerts');
      setAlerts(response?.data?.data || { expired: [], expiringSoon: [], lowStock: [], meta: {} });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const rows = useMemo(() => {
    const build = (items, severity) =>
      items
        .map((item) => ({ ...item, severity }))
        .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

    return [...build(alerts.expired, 'expired'), ...build(alerts.expiringSoon, 'expiringSoon'), ...build(alerts.lowStock, 'lowStock')];
  }, [alerts]);

  const openDrawer = (batchStockId) => {
    setSelectedBatchId(batchStockId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedBatchId('');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Expired', value: alerts.expired.length },
          { title: 'Expiring soon', value: alerts.expiringSoon.length },
          { title: 'Low stock', value: alerts.lowStock.length },
        ].map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader>
              <p className="text-sm font-semibold text-muted-foreground">{card.title}</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">as of {new Date(alerts.meta.generated_at || Date.now()).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={fetchAlerts}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-sm">
          <table className={DATA_TABLE_CLASS}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Severity</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Medicine</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Batch No</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Expiry</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Available</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Source</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.batchStockId}-${row.medicineId}`} className="border-b last:border-none">
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_LABELS[row.severity]?.color}`}>
                      {SEVERITY_LABELS[row.severity]?.text}
                    </span>
                  </td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{row.displayName || '—'}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{row.batchNo || '—'}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{formatExpiry(row.expiryDate)}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{row.availableBoxes ?? 0}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{row.sourceType || '—'}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                    <Button size="sm" variant="outline" onClick={() => openDrawer(row.batchStockId)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BatchStockDetailsDrawer batchStockId={selectedBatchId} open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
