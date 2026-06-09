import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import KpiCard from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

const initialSummary = {
  total_medicines: 0,
  expiring_soon_batches: 0,
  expired_batches: 0,
  low_stock_batches: 0,
  out_of_stock_batches: 0,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const greeting = useMemo(() => getGreeting(), []);
  const displayName = user?.fullName || user?.email || 'Staff';

  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSummary = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get('/dashboard/summary');
      setSummary(response.data?.data || initialSummary);
    } catch (error) {
      setErrorMessage('Failed to load dashboard summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const quickActions = [
    { label: 'Add Receipt', to: '/receipts/new' },
    { label: 'Stock Issue', to: '/stock-issue' },
    { label: 'Batch Stock', to: '/batch-stock' },
  ];

  const kpis = [
    {
      key: 'total_medicines',
      title: 'Total medicines',
      hint: 'Registered medicines',
      dotClassName: 'bg-primary',
      onClick: () => navigate('/medicines'),
    },
    {
      key: 'expiring_soon_batches',
      title: 'Expiring soon',
      hint: 'Batches expiring soon',
      dotClassName: 'bg-accent',
      onClick: () => navigate('/alerts?tab=expiring-soon'),
    },
    {
      key: 'expired_batches',
      title: 'Expired',
      hint: 'Expired batches',
      dotClassName: 'bg-red-500',
      onClick: () => navigate('/alerts?tab=expired'),
    },
    {
      key: 'low_stock_batches',
      title: 'Low stock',
      hint: 'Batches below threshold',
      dotClassName: 'bg-amber-500',
      onClick: () => navigate('/alerts?tab=low-stock'),
    },
    {
      key: 'out_of_stock_batches',
      title: 'Out of stock',
      hint: 'Batches with zero stock',
      dotClassName: 'bg-slate-500',
      onClick: () => navigate('/alerts?tab=out-of-stock'),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-2xl">
            {greeting}, {displayName}
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.to} size="sm" variant="outline" onClick={() => navigate(action.to)}>
                {action.label}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {errorMessage ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={fetchSummary}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={`kpi-skeleton-${index}`}>
                <CardHeader className="pb-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <KpiCard
                key={kpi.key}
                title={kpi.title}
                value={summary[kpi.key] ?? 0}
                hint={kpi.hint}
                dotClassName={kpi.dotClassName}
                onClick={kpi.onClick}
              />
            ))}
      </div>
    </div>
  );
}
