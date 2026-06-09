import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import MedicineForm from '@/components/medicine/MedicineForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function MedicineEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMedicine = useCallback(
    async (controller) => {
      if (!id || !controller) return;
      setLoading(true);
      setFetchError('');
      try {
        const response = await api.get(`/medicines/${id}`, {
          signal: controller.signal,
        });
        const payload = response?.data?.data;
        if (payload) {
          setInitialValues({
            name: payload.name,
            strength: payload.strength || '',
            category: payload.category || '',
            notes: payload.notes || '',
          });
        } else {
          setFetchError('Medicine not found');
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setFetchError(err?.response?.data?.message || 'Failed to load medicine');
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMedicine(controller);
    return () => controller.abort();
  }, [fetchMedicine]);

  const handleSubmit = async (values) => {
    if (!id) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.patch(`/medicines/${id}`, values);
      toast.success('Medicine updated');
      navigate('/medicines');
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to update medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    const controller = new AbortController();
    fetchMedicine(controller);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Edit Medicine</CardTitle>
            <p className="text-sm text-muted-foreground">Update medicine details.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/medicines')}>
            Back
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          ) : fetchError ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          ) : initialValues ? (
            <MedicineForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/medicines')}
              submitting={isSubmitting}
              error={submitError}
              submitLabel="Save changes"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load medicine details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
