import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import MedicineForm from '@/components/medicine/MedicineForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function MedicineNewPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/medicines', values);
      toast.success('Medicine created');
      navigate('/medicines');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">New Medicine</CardTitle>
            <p className="text-sm text-muted-foreground">Add a new medicine to the catalog.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/medicines')}>
            Back
          </Button>
        </CardHeader>
        <CardContent>
          <MedicineForm
            initialValues={{}}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/medicines')}
            submitting={isSubmitting}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  );
}
