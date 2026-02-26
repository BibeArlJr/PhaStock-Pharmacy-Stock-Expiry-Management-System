import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

import AsyncCombobox from '@/components/AsyncCombobox';
import { DATA_TABLE_CLASS, DATA_TABLE_TH_CLASS, DATA_TABLE_TD_CLASS } from '@/components/common/dataTableStyles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const createRow = (seed = {}) => ({
  id: crypto.randomUUID(),
  medicine: seed.medicine || null,
  batches: seed.batches || [],
  batch_stock_id: seed.batch_stock_id || '',
  batch_no: seed.batch_no || '',
  expiry_date: seed.expiry_date || '',
  available_boxes: seed.available_boxes ?? 0,
  qty_boxes: seed.qty_boxes ?? '',
  errors: {},
});

const fetchMedicineOptions = async (query, signal) => {
  const response = await api.get('/medicines', {
    params: { q: query, page: 1, limit: 20 },
    signal,
  });
  const rows = response?.data?.data?.items || [];
  return rows.map((item) => ({
    label: `${item.name}${item.strength ? ` ${item.strength}` : ''}`,
    value: item.id,
    raw: item,
  }));
};

const fetchBatchesForMedicine = async (medicineId) => {
  const response = await api.get('/batch-stocks', {
    params: {
      medicine_id: medicineId,
      expiry_status: 'valid',
      stock_status: 'in',
      sort: 'expiry',
      page: 1,
      limit: 50,
    },
  });
  return response?.data?.data?.items || [];
};

export default function StockIssueForm({
  mode = 'create',
  issueId,
  initialData,
  onSuccess,
  onCancel,
}) {
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([createRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialData) return;
    setIssueDate(initialData.issue_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setReference(initialData.reference || '');
    setNotes(initialData.notes || '');
    const filled = (initialData.items || []).map((item) =>
      createRow({
        medicine: {
          value: item.medicine_id,
          label: `${item.medicine_name_snapshot || item.medicine_name || ''}${item.strength_snapshot ? ` ${item.strength_snapshot}` : ''}`.trim(),
        },
        batches: [
          {
            _id: item.batch_stock_id,
            batch_no: item.batch_no_snapshot,
            expiry_date: item.expiry_date_snapshot,
            available_boxes: item.available_after ?? item.available_before ?? 0,
          },
        ],
        batch_stock_id: item.batch_stock_id,
        batch_no: item.batch_no_snapshot,
        expiry_date: item.expiry_date_snapshot,
        available_boxes: item.available_after ?? item.available_before ?? 0,
        qty_boxes: item.qty_boxes?.toString() || '',
      })
    );
    setRows(filled.length > 0 ? filled : [createRow()]);
  }, [initialData]);

  const totalQty = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.qty_boxes) || 0), 0), [rows]);

  const handleMedicineChange = async (index, option) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        medicine: option,
        batch_stock_id: '',
        batch_no: '',
        expiry_date: '',
        available_boxes: 0,
        batches: [],
        errors: { ...next[index].errors, medicine: '', batch: '' },
      };
      return next;
    });
    if (!option?.value) return;
    const batches = await fetchBatchesForMedicine(option.value);
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      row.batches = batches;
      if (batches.length > 0) {
        const first = batches[0];
        row.batch_stock_id = first.id || first._id;
        row.batch_no = first.batch_no || first.batchNo;
        row.expiry_date = first.expiry_date || first.expiryDate;
        row.available_boxes = first.available_boxes ?? first.availableBoxes ?? 0;
      }
      next[index] = row;
      return next;
    });
  };

  const handleBatchChange = (index, value) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      const batch = row.batches.find((b) => b.id === value || b._id === value);
      row.batch_stock_id = value || '';
      row.batch_no = batch?.batch_no ?? batch?.batchNo ?? '';
      row.expiry_date = batch?.expiry_date ?? batch?.expiryDate ?? '';
      row.available_boxes = batch?.available_boxes ?? batch?.availableBoxes ?? 0;
      row.errors = { ...row.errors, batch: '' };
      next[index] = row;
      return next;
    });
  };

  const handleQtyChange = (index, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty_boxes: value, errors: { ...next[index].errors, qty: '' } };
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);
  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    let valid = true;
    const next = rows.map((row) => {
      const errors = {};
      if (!row.medicine?.value) {
        valid = false;
        errors.medicine = 'Required';
      }
      if (!row.batch_stock_id) {
        valid = false;
        errors.batch = 'Required';
      }
      const qty = Number(row.qty_boxes);
      if (!Number.isFinite(qty) || qty <= 0) {
        valid = false;
        errors.qty = 'Qty must be at least 1';
      } else if (qty > (row.available_boxes || 0)) {
        valid = false;
        errors.qty = 'Qty exceeds available';
      }
      return { ...row, errors };
    });
    setRows(next);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        issue_date: issueDate,
        reference: reference || undefined,
        notes: notes || undefined,
        items: rows
          .filter((row) => row.medicine?.value && row.batch_stock_id && Number(row.qty_boxes))
          .map((row) => ({
            medicine_id: row.medicine.value,
            batch_stock_id: row.batch_stock_id,
            qty_boxes: Number(row.qty_boxes),
          })),
      };
      if (mode === 'edit') {
        await api.patch(`/stock-issues/${issueId}`, payload);
      } else {
        await api.post('/stock-issues', payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save stock issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{mode === 'edit' ? 'Edit Stock Issue' : 'New Stock Issue'}</div>
            <p className="text-sm text-muted-foreground">{mode === 'edit' ? 'Update existing issue' : 'Create new stock issue'}</p>
          </div>
          <div className="flex gap-2">
            {mode === 'edit' && (
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Confirm issue'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <label className="mb-1 block text-sm text-muted-foreground">Issue date</label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="col-span-4">
            <label className="mb-1 block text-sm text-muted-foreground">Reference (optional)</label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference"
            />
          </div>
          <div className="col-span-5">
            <label className="mb-1 block text-sm text-muted-foreground">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="text-lg font-semibold">Items</div>
          <Button variant="outline" size="sm" onClick={addRow}>
            Add row
          </Button>
        </CardHeader>
        <CardContent>
          <table className={DATA_TABLE_CLASS}>
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className={`${DATA_TABLE_TH_CLASS} text-left`}>Medicine</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Batch</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Expiry</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Available</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`}>Qty</th>
                <th className={`${DATA_TABLE_TH_CLASS} text-center`} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b align-top">
                  <td className={`${DATA_TABLE_TD_CLASS} text-left`}>
                    <AsyncCombobox
                      value={row.medicine}
                      onChange={(option) => handleMedicineChange(index, option)}
                      fetchOptions={fetchMedicineOptions}
                      placeholder="Select medicine"
                      searchPlaceholder="Search medicine"
                    />
                    {row.errors.medicine && <p className="text-xs text-red-600">{row.errors.medicine}</p>}
                  </td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}> 
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={row.batch_stock_id}
                      onChange={(event) => handleBatchChange(index, event.target.value)}
                    >
                      <option value="">Select batch</option>
                      {row.batches.map((batch) => (
                        <option key={batch._id} value={batch._id}>
                          {batch.batch_no} — {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : '—'}
                        </option>
                      ))}
                    </select>
                    {row.errors.batch && <p className="text-xs text-red-600">{row.errors.batch}</p>}
                  </td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '—'}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>{row.batch_stock_id ? row.available_boxes : '—'}</td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}> 
                    <Input
                      type="number"
                      min="1"
                      value={row.qty_boxes}
                      onChange={(event) => handleQtyChange(index, event.target.value)}
                    />
                    {row.errors.qty && <p className="text-xs text-red-600">{row.errors.qty}</p>}
                  </td>
                  <td className={`${DATA_TABLE_TD_CLASS} text-center`}>
                    <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end text-sm">
            <div className="rounded-md border border-border px-3 py-2">
              <span className="text-muted-foreground">Total Qty: </span>
              <span className="font-semibold">{totalQty}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
