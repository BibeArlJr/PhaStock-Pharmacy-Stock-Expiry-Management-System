import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const DEFAULT_SETTINGS = {
  expiry_alert_days: 30,
  low_stock_limit: 2,
  fefo_mode: 'STRICT',
  default_page_size: 20,
};

const toFormState = (settings = {}) => ({
  expiry_alert_days: String(settings.expiry_alert_days ?? DEFAULT_SETTINGS.expiry_alert_days),
  low_stock_limit: String(settings.low_stock_limit ?? DEFAULT_SETTINGS.low_stock_limit),
  fefo_mode: settings.fefo_mode ?? DEFAULT_SETTINGS.fefo_mode,
  default_page_size: String(settings.default_page_size ?? DEFAULT_SETTINGS.default_page_size),
});

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function SettingsPage() {
  const [form, setForm] = useState(toFormState(DEFAULT_SETTINGS));
  const [initialForm, setInitialForm] = useState(toFormState(DEFAULT_SETTINGS));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadSettings = async () => {
      try {
        const response = await api.get('/settings', { signal: controller.signal });
        const settings = response?.data?.data?.settings;
        const nextForm = toFormState(settings);
        if (mounted) {
          setForm(nextForm);
          setInitialForm(nextForm);
          setApiError('');
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          if (mounted) {
            setApiError(error?.response?.data?.message || 'Failed to load settings.');
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const handleReset = () => {
    setForm(initialForm);
    setValidationError('');
    setApiError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError('');
    setApiError('');

    const expiryDays = parseNumber(form.expiry_alert_days);
    const lowStockLimit = parseNumber(form.low_stock_limit);
    const pageSize = parseNumber(form.default_page_size);

    if (expiryDays === null || expiryDays < 1) {
      setValidationError('Expiry alert days must be at least 1 day.');
      return;
    }

    if (lowStockLimit === null || lowStockLimit < 0) {
      setValidationError('Low stock limit must be 0 or greater.');
      return;
    }

    if (pageSize === null || pageSize < 5 || pageSize > 200) {
      setValidationError('Default page size must be between 5 and 200.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.patch('/settings', {
        expiry_alert_days: expiryDays,
        low_stock_limit: lowStockLimit,
        fefo_mode: form.fefo_mode,
        default_page_size: pageSize,
      });

      const updated = toFormState(response?.data?.data?.settings);
      setForm(updated);
      setInitialForm(updated);
      toast.success('Settings saved');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to update settings.';
      setApiError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bannerMessage = validationError || apiError;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system thresholds and defaults</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading current settings…</p>
      )}

      {bannerMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {bannerMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Inventory Alerts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Control when batches show up in alerts and low stock workflows.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Expiry alert days</label>
              <Input
                type="number"
                min={1}
                value={form.expiry_alert_days}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    expiry_alert_days: event.target.value,
                  }));
                  setValidationError('');
                  setApiError('');
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Batches expiring within this many days appear in Alerts.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Low stock limit</label>
              <Input
                type="number"
                min={0}
                value={form.low_stock_limit}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, low_stock_limit: event.target.value }));
                  setValidationError('');
                  setApiError('');
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Batches with available boxes at or below this number are flagged as Low Stock.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Workflow defaults</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adjust how issuing and listing workflows behave.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">FEFO mode</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.fefo_mode}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, fefo_mode: event.target.value }));
                  setValidationError('');
                  setApiError('');
                }}
              >
                <option value="STRICT">STRICT</option>
                <option value="RELAXED">RELAXED</option>
              </select>
              <p className="text-xs text-muted-foreground">
                STRICT blocks expired/invalid batches and prefers the earliest expiry. RELAXED allows manual override when supported.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Default page size</label>
              <Input
                type="number"
                min={5}
                max={200}
                value={form.default_page_size}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, default_page_size: event.target.value }));
                  setValidationError('');
                  setApiError('');
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">Used to determine how many rows appear in lists by default.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || isLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
