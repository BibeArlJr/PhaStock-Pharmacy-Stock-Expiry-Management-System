import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export default function AddSupplierModal({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName || '');
      setPhone('');
      setAddress('');
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
      setError('Supplier name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await api.post('/suppliers', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      const supplier = response?.data?.data;
      if (!supplier?.id) {
        throw new Error('Invalid supplier response');
      }

      onCreated?.({
        id: supplier.id,
        label: supplier.name,
        subLabel: supplier.phone || '',
        raw: supplier,
      });

      toast.success('Supplier added');
      onOpenChange(false);
    } catch (submitError) {
      const code = submitError?.response?.data?.code;
      if (code === 'VALIDATION_ERROR') {
        setError('Please check supplier details');
      } else {
        setError('Failed to add supplier');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Supplier name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Supplier name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phone (optional)</label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Address (optional)</label>
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Address"
                disabled={isSaving}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Supplier'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
