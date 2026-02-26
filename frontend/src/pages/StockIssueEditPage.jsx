import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import StockIssueForm from '@/components/stockIssue/StockIssueForm';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function StockIssueEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIssue = useCallback(
    async (signal) => {
      if (!id) return;

      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/stock-issues/${id}`, signal ? { signal } : undefined);
        const payload = response?.data?.data?.stock_issue || null;
        setInitialData(payload);
      } catch (err) {
        // axios cancel
        if (err?.code === 'ERR_CANCELED') return;
        setInitialData(null);
        setError(err?.response?.data?.message || 'Failed to load stock issue');
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    fetchIssue(controller.signal);
    return () => controller.abort();
  }, [id, fetchIssue]);

  const handleRetry = () => {
    const controller = new AbortController();
    fetchIssue(controller.signal);
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading stock issue…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/stock-issue')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        No stock issue found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StockIssueForm
        mode="edit"
        issueId={id}
        initialData={initialData}
        onSuccess={() => {
          toast.success('Stock issue updated');
          navigate('/stock-issue');
        }}
        onCancel={() => navigate('/stock-issue')}
      />
    </div>
  );
}