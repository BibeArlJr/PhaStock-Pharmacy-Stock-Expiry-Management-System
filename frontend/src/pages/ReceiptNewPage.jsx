import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import AsyncCombobox from '@/components/AsyncCombobox';
import ReceiptItemsTable from '@/components/ReceiptItemsTable';
import AddMedicineModal from '@/components/modals/AddMedicineModal';
import AddSupplierModal from '@/components/modals/AddSupplierModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import numberToWordsNpr from '@/utils/numberToWordsNpr';

const createEmptyRow = () => ({
  local_id: crypto.randomUUID(),
  medicine: null,
  pack: '',
  batch_no: '',
  expiry_date: '',
  quantity_boxes: '',
  purchase_price: '',
  mrp: '',
});

const normalizeItems = (response) => response?.data?.data?.items || [];

const isRowEmpty = (row) =>
  !row.medicine &&
  !row.pack.trim() &&
  !row.batch_no.trim() &&
  !row.expiry_date &&
  !String(row.quantity_boxes).trim() &&
  !String(row.purchase_price).trim() &&
  !String(row.mrp).trim();

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'BANK', label: 'Bank' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReceiptNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id') || '';
  const isEditMode = Boolean(editId);

  const [supplier, setSupplier] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');

  const [rows, setRows] = useState([createEmptyRow()]);
  const [errors, setErrors] = useState({ header: {}, rows: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefillLoading, setIsPrefillLoading] = useState(false);
  const [focusPackRowId, setFocusPackRowId] = useState('');

  const [supplierModal, setSupplierModal] = useState({ open: false, initialName: '' });
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [medicineDraftName, setMedicineDraftName] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const paymentRef = useRef(null);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const controller = new AbortController();

    const fetchForEdit = async () => {
      setIsPrefillLoading(true);

      try {
        const response = await api.get(`/receipts/${editId}`, {
          signal: controller.signal,
        });

        const receipt = response?.data?.data?.receipt;
        const receiptItems = response?.data?.data?.items || [];

        if (!receipt) {
          throw new Error('Missing receipt');
        }

        setSupplier(
          receipt.supplier
            ? {
                id: receipt.supplier.id,
                label: receipt.supplier.name,
                subLabel: receipt.supplier.phone || '',
                raw: receipt.supplier,
              }
            : null
        );
        setInvoiceNumber(receipt.invoice_number || '');
        setInvoiceDate(receipt.invoice_date ? receipt.invoice_date.slice(0, 10) : '');
        setPaymentMode(receipt.payment_mode || 'CASH');
        setDiscountAmount(String(receipt.discount_amount ?? 0));

        if (receiptItems.length > 0) {
          setRows(
            receiptItems.map((item) => ({
              local_id: crypto.randomUUID(),
              medicine: item.medicine
                ? {
                    id: item.medicine.id,
                    label: item.medicine.name,
                    subLabel: item.medicine.strength || '',
                    raw: item.medicine,
                  }
                : null,
              pack: item.pack || '',
              batch_no: item.batch_no || '',
              expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
              quantity_boxes: String(item.quantity_boxes ?? ''),
              purchase_price: String(item.purchase_price ?? ''),
              mrp: String(item.mrp ?? ''),
            }))
          );
        } else {
          setRows([createEmptyRow()]);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          toast.error('Failed to load receipt for editing');
          navigate('/receipts', { replace: true });
        }
      } finally {
        setIsPrefillLoading(false);
      }
    };

    fetchForEdit();

    return () => controller.abort();
  }, [editId, isEditMode, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!paymentRef.current?.contains(event.target)) {
        setPaymentOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const computedTotalAmount = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const qty = Number(row.quantity_boxes || 0);
        const price = Number(row.purchase_price || 0);
        if (Number.isNaN(qty) || Number.isNaN(price)) {
          return sum;
        }
        return sum + qty * price;
      }, 0),
    [rows]
  );

  const computedDiscountAmount = useMemo(() => {
    const value = Number(discountAmount || 0);
    if (Number.isNaN(value) || value < 0) {
      return 0;
    }
    return value;
  }, [discountAmount]);

  const computedNetAmount = useMemo(
    () => Math.max(0, computedTotalAmount - computedDiscountAmount),
    [computedTotalAmount, computedDiscountAmount]
  );

  const netAmountWords = useMemo(
    () => numberToWordsNpr(Math.round(computedNetAmount)),
    [computedNetAmount]
  );

  const selectedPaymentLabel = useMemo(() => {
    const found = PAYMENT_OPTIONS.find((option) => option.value === paymentMode);
    return found?.label || 'Select payment mode';
  }, [paymentMode]);

  const fetchSupplierOptions = async (query, signal) => {
    const response = await api.get('/suppliers', {
      params: {
        q: query,
        page: 1,
        limit: 20,
      },
      signal,
    });

    return normalizeItems(response).map((item) => ({
      id: item.id,
      label: item.name,
      subLabel: item.phone || '',
      raw: item,
    }));
  };

  const fetchMedicineOptions = async (query, signal) => {
    const response = await api.get('/medicines', {
      params: {
        q: query,
        page: 1,
        limit: 20,
      },
      signal,
    });

    return normalizeItems(response).map((item) => ({
      id: item.id,
      label: item.name,
      subLabel: item.strength || '',
      raw: item,
    }));
  };

  const onChangeRow = (index, patch) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
      };
      return next;
    });
  };

  const onRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const onAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const validate = () => {
    const headerErrors = {};
    const rowErrors = {};

    if (!supplier?.id) {
      headerErrors.supplier = 'Supplier is required';
    }

    if (!invoiceNumber.trim()) {
      headerErrors.invoice_number = 'Invoice number is required';
    }

    if (!invoiceDate) {
      headerErrors.invoice_date = 'Invoice date is required';
    }

    if (computedDiscountAmount > computedTotalAmount) {
      headerErrors.discount_amount = 'Discount cannot exceed total amount';
    }

    const nonEmptyRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !isRowEmpty(row));

    if (nonEmptyRows.length === 0) {
      rowErrors[0] = {
        medicine: 'At least one item is required',
      };
    }

    nonEmptyRows.forEach(({ row, index }) => {
      const itemErrors = {};

      if (!row.medicine?.id) {
        itemErrors.medicine = 'Medicine is required';
      }

      if (!row.pack.trim()) {
        itemErrors.pack = 'Pack is required';
      }

      if (!row.batch_no.trim()) {
        itemErrors.batch_no = 'Batch no is required';
      }

      if (!row.expiry_date) {
        itemErrors.expiry_date = 'Expiry date is required';
      }

      if (!row.quantity_boxes || Number(row.quantity_boxes) < 1) {
        itemErrors.quantity_boxes = 'Qty must be at least 1';
      }

      if (row.purchase_price === '' || Number(row.purchase_price) < 0) {
        itemErrors.purchase_price = 'Purchase price must be 0 or more';
      }

      if (row.mrp === '' || Number(row.mrp) < 0) {
        itemErrors.mrp = 'MRP must be 0 or more';
      }

      if (Object.keys(itemErrors).length > 0) {
        rowErrors[index] = itemErrors;
      }
    });

    setErrors({ header: headerErrors, rows: rowErrors });

    return {
      valid: Object.keys(headerErrors).length === 0 && Object.keys(rowErrors).length === 0,
      nonEmptyRows,
    };
  };

  const onSubmit = async () => {
    const { valid, nonEmptyRows } = validate();

    if (!valid) {
      toast.error('Please fix validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supplier_id: supplier.id,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        payment_mode: paymentMode,
        receipt_type: 'NORMAL_PURCHASE',
        discount_amount: computedDiscountAmount,
        items: nonEmptyRows.map(({ row }) => ({
          medicine_id: row.medicine.id,
          pack: row.pack.trim(),
          batch_no: row.batch_no.trim(),
          expiry_date: row.expiry_date,
          quantity_boxes: Number(row.quantity_boxes),
          purchase_price: Number(row.purchase_price),
          mrp: Number(row.mrp),
        })),
      };

      const response = isEditMode
        ? await api.put(`/receipts/${editId}`, payload)
        : await api.post('/purchase-receipts', payload);
      const receiptId = response.data?.data?.receipt_id || editId;

      toast.success(isEditMode ? 'Receipt updated' : 'Receipt saved');

      if (receiptId) {
        navigate(`/receipts/${receiptId}`);
      } else {
        navigate('/receipts');
      }
    } catch (error) {
      const code = error.response?.data?.code;

      if (code === 'NEGATIVE_STOCK_AFTER_REBUILD') {
        toast.error('Cannot save because stock would become negative after rebuild');
      } else if (code === 'DUPLICATE_INVOICE') {
        toast.error('Invoice number already exists for this supplier');
      } else if (code === 'INVALID_DISCOUNT') {
        toast.error('Discount amount is invalid');
      } else if (code === 'VALIDATION_ERROR') {
        toast.error('Invalid receipt data');
      } else {
        toast.error('Failed to save receipt');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isPrefillLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit receipt' : 'Receipt details'}</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Supplier</label>
            <AsyncCombobox
              value={supplier}
              onChange={setSupplier}
              fetchOptions={fetchSupplierOptions}
              placeholder="Select supplier"
              searchPlaceholder="Search supplier"
              noResultsActionLabel={(query) => `+ Add supplier: ${query}`}
              onNoResultsAction={(query) =>
                setSupplierModal({
                  open: true,
                  initialName: query,
                })
              }
              disabled={isSubmitting}
            />
            {errors.header.supplier ? (
              <p className="text-xs text-red-600">{errors.header.supplier}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Invoice number</label>
            <Input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="Invoice number"
              disabled={isSubmitting}
              className="h-10"
            />
            {errors.header.invoice_number ? (
              <p className="text-xs text-red-600">{errors.header.invoice_number}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Invoice date</label>
            <div className="relative">
              <Input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                disabled={isSubmitting}
                className="h-10 pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {errors.header.invoice_date ? (
              <p className="text-xs text-red-600">{errors.header.invoice_date}</p>
            ) : null}
          </div>

          <div className="relative space-y-1" ref={paymentRef}>
            <label className="text-sm font-medium">Payment mode</label>
            <button
              type="button"
              onClick={() => !isSubmitting && setPaymentOpen((prev) => !prev)}
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{selectedPaymentLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {paymentOpen ? (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-md">
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPaymentMode(option.value);
                      setPaymentOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button type="button" variant="outline" onClick={onAddRow} disabled={isSubmitting}>
            Add row
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <ReceiptItemsTable
            focusPackRowId={focusPackRowId}
            rows={rows}
            errors={errors.rows}
            onChangeRow={onChangeRow}
            onRemoveRow={onRemoveRow}
            onAddRow={onAddRow}
            fetchMedicineOptions={fetchMedicineOptions}
            onRequestCreateMedicine={(rowIndex, query) => {
              setActiveRowIndex(rowIndex);
              setMedicineDraftName(query);
              setMedicineModalOpen(true);
            }}
            disabled={isSubmitting}
          />

          <div className="flex flex-col justify-between gap-4 rounded-md border bg-muted/20 p-4 md:flex-row md:items-end">
            <div className="max-w-xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">In words: </span>
              {netAmountWords}
            </div>

            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatMoney(computedTotalAmount)}</span>
              </div>

              <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                <label className="text-sm text-muted-foreground">Discount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                  disabled={isSubmitting}
                  className="h-9 text-right"
                />
              </div>
              {errors.header.discount_amount ? (
                <p className="text-xs text-red-600">{errors.header.discount_amount}</p>
              ) : null}

              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <span className="font-medium">Net total</span>
                <span className="text-base font-semibold">{formatMoney(computedNetAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/receipts')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Receipt' : 'Save Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddSupplierModal
        open={supplierModal.open}
        initialName={supplierModal.initialName}
        onOpenChange={(open) => setSupplierModal((prev) => ({ ...prev, open }))}
        onCreated={(createdSupplier) => setSupplier(createdSupplier)}
      />

      <AddMedicineModal
        open={medicineModalOpen}
        initialName={medicineDraftName}
        onOpenChange={setMedicineModalOpen}
        onCreated={(createdMedicine) => {
          const rowIndex = activeRowIndex;
          if (rowIndex === null || rowIndex === undefined) {
            return;
          }

          onChangeRow(rowIndex, {
            medicine: createdMedicine,
            medicine_id: createdMedicine.id,
          });
          const rowId = rows[rowIndex]?.local_id;
          if (rowId) {
            setFocusPackRowId(rowId);
            window.setTimeout(() => setFocusPackRowId(''), 0);
          }
          setMedicineModalOpen(false);
          setMedicineDraftName('');
          setActiveRowIndex(null);
        }}
      />
    </div>
  );
}
