import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export default function AddMedicineModal({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}) {
  const [name, setName] = useState(initialName);
  const [strength, setStrength] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName || '');
      setStrength('');
      setCategory('');
      setError('');
      setIsSaving(false);
    }
  }, [open, initialName]);

  if (!open) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Medicine name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await api.post('/medicines', {
        medicine_name: name.trim(),
        name: name.trim(),
        strength: strength.trim(),
        category: category.trim(),
      });

      const medicine = response?.data?.data;
      const medicineId = medicine?._id || medicine?.id;
      const medicineName = medicine?.name || medicine?.medicine_name;

      if (!medicineId || !medicineName) {
        throw new Error('Invalid medicine response');
      }

      onCreated?.({
        id: medicineId,
        label: medicineName,
        subLabel: medicine.strength || '',
        raw: medicine,
      });

      toast.success('Medicine added');
      onOpenChange(false);
    } catch (submitError) {
      const code = submitError?.response?.data?.code;
      if (code === 'VALIDATION_ERROR') {
        setError('Please check medicine details');
      } else {
        setError('Failed to add medicine');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add Medicine</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Medicine name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Medicine name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Strength (optional)</label>
              <Input
                value={strength}
                onChange={(event) => setStrength(event.target.value)}
                placeholder="500mg"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Category (optional)</label>
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Tablet"
                disabled={isSaving}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Medicine'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
