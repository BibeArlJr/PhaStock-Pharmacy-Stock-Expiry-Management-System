import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import SupplierForm from '@/components/supplier/SupplierForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function SupplierEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSupplier = useCallback(
    async (controller) => {
      if (!id || !controller) return;
      setLoading(true);
      setFetchError('');
      try {
        const response = await api.get(`/suppliers/${id}`, {
          signal: controller.signal,
        });
        const payload = response?.data?.data;
        if (payload) {
          setInitialValues({
            name: payload.name,
            phone: payload.phone || '',
            email: payload.email || '',
            address: payload.address || '',
            panVat: payload.pan_vat || '',
            notes: payload.notes || '',
            status: payload.status || 'active',
          });
        } else {
          setFetchError('Supplier not found');
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setFetchError(err?.response?.data?.message || 'Failed to load supplier');
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchSupplier(controller);
    return () => controller.abort();
  }, [fetchSupplier]);

  const handleSubmit = async (values) => {
    if (!id) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.patch(`/suppliers/${id}`, values);
      toast.success('Supplier updated');
      navigate('/suppliers');
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to update supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    const controller = new AbortController();
    fetchSupplier(controller);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Edit Supplier</CardTitle>
            <p className="text-sm text-muted-foreground">Update supplier information.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/suppliers')}>
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
            <SupplierForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/suppliers')}
              submitting={isSubmitting}
              error={submitError}
              submitLabel="Save changes"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load supplier details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
