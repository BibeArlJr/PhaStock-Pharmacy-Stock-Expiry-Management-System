import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const baseState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  panVat: '',
  notes: '',
  status: 'active',
};

export default function SupplierForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitting = false,
  error,
}) {
  const [form, setForm] = useState({ ...baseState, ...initialValues });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setForm({ ...baseState, ...initialValues });
  }, [initialValues]);

  const trimmedValues = useMemo(
    () => ({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      panVat: form.panVat.trim(),
      notes: form.notes.trim(),
      status: form.status,
    }),
    [form]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!trimmedValues.name) {
      setLocalError('Name is required');
      return;
    }
    setLocalError('');
    await onSubmit(trimmedValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Name</label>
        <Input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Supplier name"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Phone (optional)</label>
        <Input
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="Phone number"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Email (optional)</label>
        <Input
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="Email address"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Address (optional)</label>
        <textarea
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          rows={3}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Address"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">PAN/VAT (optional)</label>
        <Input
          value={form.panVat}
          onChange={(event) => setForm((prev) => ({ ...prev, panVat: event.target.value }))}
          placeholder="PAN or VAT number"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          rows={3}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Additional notes"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Status</label>
        <select
          value={form.status}
          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {(localError || error) && (
        <p className="text-sm text-red-600">{localError || error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
