import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DATA_TABLE_CLASS, DATA_TABLE_TH_CLASS, DATA_TABLE_TD_CLASS } from '@/components/common/dataTableStyles';
import SupplierDetailsDrawer from '@/components/supplier/SupplierDetailsDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const DEFAULT_LIMIT = 20;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function SuppliersPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadSuppliers = useCallback(
    async (controller) => {
      if (!controller) return;
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/suppliers', {
          params: {
            q: debouncedSearch || undefined,
            page,
            limit,
          },
          signal: controller.signal,
        });
        const data = response?.data?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || Math.max(1, Math.ceil((data.total || 0) / limit)));
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          setError(err?.response?.data?.message || 'Unable to load suppliers');
        }
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, limit, page, refreshKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadSuppliers(controller);
    return () => controller.abort();
  }, [loadSuppliers]);

  const refreshList = () => setRefreshKey((prev) => prev + 1);

  const openDrawer = (id) => {
    setSelectedSupplierId(id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedSupplierId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      if (selectedSupplierId === id) {
        closeDrawer();
      }
      refreshList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Unable to delete supplier');
    } finally {
      setDeletingId(null);
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-2xl">Suppliers</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers"
              className="max-w-xs"
            />
            <Button onClick={() => navigate('/suppliers/new')}>New Supplier</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadSuppliers(new AbortController())}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className={DATA_TABLE_CLASS}>
                <thead>
                  <tr className="border-b">
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Name</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Phone</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Email</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Status</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Created At</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          {['', '', '', '', '', ''].map((_, idx) => (
                            <td key={idx} className={`${DATA_TABLE_TD_CLASS} text-left`}>
                              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : rows.length > 0
                    ? rows.map((supplier) => (
                        <tr key={supplier.id} className="border-b hover:bg-muted/40">
                          <td className={`${DATA_TABLE_TD_CLASS} text-left font-semibold`}>{supplier.name}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{supplier.phone || '—'}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{supplier.email || '—'}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>
                            <Badge variant={supplier.status === 'active' ? 'success' : 'destructive'}>
                              {supplier.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{formatDate(supplier.created_at)}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDrawer(supplier.id)}>
                                View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(supplier.id)}
                                disabled={deletingId === supplier.id}
                              >
                                {deletingId === supplier.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          No suppliers found
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Page {page} of {Math.max(1, totalPages)} • {total} records
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SupplierDetailsDrawer
        open={drawerOpen}
        supplierId={selectedSupplierId}
        onClose={closeDrawer}
        onEdit={(id) => navigate(`/suppliers/${id}/edit`)}
        onDeleted={refreshList}
      />
    </div>
  );
}
