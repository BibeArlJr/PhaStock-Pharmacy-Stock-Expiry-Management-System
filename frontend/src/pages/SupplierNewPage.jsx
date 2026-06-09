import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import SupplierForm from '@/components/supplier/SupplierForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function SupplierNewPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/suppliers', values);
      toast.success('Supplier created');
      navigate('/suppliers');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">New Supplier</CardTitle>
            <p className="text-sm text-muted-foreground">Add a new supplier to the system.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/suppliers')}>
            Back
          </Button>
        </CardHeader>
        <CardContent>
          <SupplierForm
            initialValues={{}}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/suppliers')}
            submitting={isSubmitting}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  );
}
