import { useEffect, useMemo, useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import StockIssueDetailsDrawer from '@/components/StockIssueDetailsDrawer';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_TH_CLASS,
  DATA_TABLE_TD_CLASS,
} from '@/components/common/dataTableStyles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const DEFAULT_LIMIT = 20;

function FilterSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{options.find((option) => option.value === value)?.label || placeholder}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

const summarizeMedicines = (items) => {
  if (!items || items.length === 0) return '—';
  const names = items
    .map((item) => item.medicine_name_snapshot || item.medicine_name || '—')
    .filter((name) => name && name.trim() !== '');
  if (names.length === 0) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
};

export default function StockIssuePage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerId, setDrawerId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/stock-issues', {
          params: {
            q: search || undefined,
            status: status === 'all' ? undefined : status,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page,
            limit,
          },
          signal: controller.signal,
        });
        const data = response?.data?.data || {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setSelectedIds((prev) => {
          const allowed = new Set((data.items || []).map((item) => item.id));
          return new Set([...prev].filter((id) => allowed.has(id)));
        });
      } catch (error) {
        if (error.name !== 'CanceledError') {
          setItems([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [search, status, dateFrom, dateTo, page, limit, refreshKey]);

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  };

  const toggleRowSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDrawer = (row) => {
    const issueId = row._id ?? row.id;
    if (!issueId) return;
    console.log('View clicked for', issueId);
    setDrawerId(issueId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerId(null);
  };

  const handleVoidBulk = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Void ${selectedIds.size} stock issue(s)?`)) return;
    try {
      await api.post('/stock-issues/void-bulk', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      window.alert(error?.response?.data?.message || 'Unable to void selected issues');
    }
  };

  const issueCount = useMemo(() => (items || []).length, [items]);

  const handleDetailSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Issues</h1>
        <div className="flex items-center gap-2">
          <Button variant={selectMode ? 'default' : 'outline'} onClick={toggleSelectMode}>
            Select
          </Button>
          <Button
            onClick={handleVoidBulk}
            disabled={selectedIds.size === 0}
            className={
              selectedIds.size === 0
                ? 'border border-border bg-muted text-muted-foreground'
                : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedIds.size})
          </Button>
          <Button onClick={() => navigate('/stock-issue/new')}>
            New Stock Issue
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(240px,2fr)_minmax(200px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search issue no or reference"
          className="h-10"
        />
        <div className="relative h-10">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="h-10 pl-10"
          />
        </div>
        <div className="relative h-10">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="h-10 pl-10"
          />
        </div>
        <FilterSelect
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'voided', label: 'Voided' },
          ]}
          placeholder="Status"
        />
        <Button variant="outline" size="sm" className="h-10" onClick={() => {
          setSearch('');
          setDateFrom('');
          setDateTo('');
          setStatus('all');
          setPage(1);
        }}>
          Clear
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className={DATA_TABLE_CLASS}>
          <colgroup>
            {(selectMode
              ? ['4%', '14%', '14%', '17%', '12%', '10%', '12%', '8%', '9%']
              : ['18%', '16%', '16%', '17%', '12%', '12%', '10%', '9%']
            ).map((width, index) => (
              <col key={`${width}-${index}`} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b">
              {selectMode && (
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>
                  <input type="checkbox" checked={allSelected} onChange={() => {
                    if (allSelected) setSelectedIds(new Set());
                    else setSelectedIds(new Set(items.map((item) => item.id)));
                  }} />
                </th>
              )}
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Issue date</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Issue no</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Medicines</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Items</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Total qty</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Created by</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Status</th>
              <th className={`${DATA_TABLE_TH_CLASS} text-center whitespace-nowrap`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b">
                    {(selectMode ? new Array(9) : new Array(8)).map((_, cellIndex) => (
                      <td key={cellIndex} className={DATA_TABLE_TD_CLASS}>
                        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/20">
                    {selectMode && (
                      <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleRowSelection(item.id)}
                        />
                      </td>
                    )}
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                      {item.issue_date
                        ? `${new Date(item.issue_date).toLocaleDateString(undefined, {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                          })} (${new Date(item.issue_date).toLocaleDateString(undefined, { weekday: 'short' })})`
                        : '—'}
                    </td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{item.issue_no}</td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{summarizeMedicines(item.items)}</td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{item.items_count ?? 0}</td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{item.total_qty ?? 0}</td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{item.created_by?.full_name || item.created_by?.username || '—'}</td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                      <Badge variant={item.status === 'active' ? 'success' : 'outline'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{/*action*/}
                      <Button size="sm" variant="outline" onClick={() => openDrawer(item)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={selectMode ? 8 : 7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No stock issues
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          Prev
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, totalPages)} • {total} records
        </div>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
          Next
        </Button>
      </div>

      <StockIssueDetailsDrawer
        id={drawerId}
        open={drawerOpen}
        onClose={closeDrawer}
        onVoidSuccess={() => {
          closeDrawer();
          setSelectedIds(new Set());
          handleDetailSuccess();
        }}
      />

    </div>
  );
}
