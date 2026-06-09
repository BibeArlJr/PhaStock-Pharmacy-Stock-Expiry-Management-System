import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DATA_TABLE_CLASS, DATA_TABLE_TH_CLASS, DATA_TABLE_TD_CLASS } from '@/components/common/dataTableStyles';
import MedicineDetailsDrawer from '@/components/medicine/MedicineDetailsDrawer';
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

export default function MedicinesPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadMedicines = useCallback(
    async (controller) => {
      if (!controller) return;
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/medicines', {
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
          setError(err?.response?.data?.message || 'Unable to load medicines');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, limit, page, refreshKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadMedicines(controller);
    return () => controller.abort();
  }, [loadMedicines]);

  const openDrawer = (id) => {
    setSelectedMedicineId(id);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedMedicineId(null);
  };

  const refreshList = () => setRefreshKey((prev) => prev + 1);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/medicines/${id}`);
      toast.success('Medicine deleted');
      if (selectedMedicineId === id) {
        closeDrawer();
      }
      refreshList();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Unable to delete medicine');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = () => {
    const controller = new AbortController();
    loadMedicines(controller);
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-2xl">Medicines</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search medicines"
              className="max-w-xs"
            />
            <Button onClick={() => navigate('/medicines/new')}>New Medicine</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className={DATA_TABLE_CLASS}>
                <thead>
                  <tr className="border-b">
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Name</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Strength</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Category</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Created At</th>
                    <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          {['', '', '', '', ''].map((_, idx) => (
                            <td key={idx} className={`${DATA_TABLE_TD_CLASS} text-left`}>
                              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : rows.length > 0
                    ? rows.map((medicine) => (
                        <tr key={medicine.id} className="border-b hover:bg-muted/40">
                          <td className={`${DATA_TABLE_TD_CLASS} text-left font-semibold`}>{medicine.name}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{medicine.strength || '—'}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{medicine.category || '—'}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-left`}>{formatDate(medicine.created_at)}</td>
                          <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDrawer(medicine.id)}>
                                View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/medicines/${medicine.id}/edit`)}>
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(medicine.id)}
                                disabled={deletingId === medicine.id}
                              >
                                {deletingId === medicine.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          No medicines found
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

      <MedicineDetailsDrawer
        open={isDrawerOpen}
        medicineId={selectedMedicineId}
        onClose={closeDrawer}
        onEdit={(id) => navigate(`/medicines/${id}/edit`)}
        onDeleted={() => {
          refreshList();
        }}
      />
    </div>
  );
}
