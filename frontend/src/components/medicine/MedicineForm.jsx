import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const baseFormState = {
  name: '',
  strength: '',
  category: '',
  notes: '',
};

export default function MedicineForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitting = false,
  error,
}) {
  const [form, setForm] = useState({ ...baseFormState, ...initialValues });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setForm({ ...baseFormState, ...initialValues });
  }, [initialValues]);

  const trimmedValues = useMemo(
    () => ({
      name: form.name.trim(),
      strength: form.strength.trim(),
      category: form.category.trim(),
      notes: form.notes.trim(),
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
          placeholder="Medicine name"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Strength (optional)</label>
        <Input
          value={form.strength}
          onChange={(event) => setForm((prev) => ({ ...prev, strength: event.target.value }))}
          placeholder="e.g., 500mg"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Category (optional)</label>
        <Input
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          placeholder="Category"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          rows={4}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Add optional notes"
        />
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
