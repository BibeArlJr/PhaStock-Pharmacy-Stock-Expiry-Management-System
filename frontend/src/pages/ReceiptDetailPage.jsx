import { useEffect, useMemo, useState } from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import numberToWordsNpr from '@/utils/numberToWordsNpr';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [receipt, setReceipt] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDetail = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get(`/receipts/${id}`, {
          signal: controller.signal,
        });

        setReceipt(response.data?.data?.receipt || null);
        setItems(response.data?.data?.items || []);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setErrorMessage('Failed to load receipt detail');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();

    return () => controller.abort();
  }, [id]);

  const fallbackTotalAmount = useMemo(
    () =>
      items.reduce((sum, item) => sum + Number(item.quantity_boxes || 0) * Number(item.purchase_price || 0), 0),
    [items]
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="h-6 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (errorMessage || !receipt) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <p className="text-sm text-red-600">{errorMessage || 'Receipt not found'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/receipts')}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = Number(receipt.total_amount ?? fallbackTotalAmount);
  const discountAmount = Number(receipt.discount_amount ?? 0);
  const netAmount = Number(receipt.net_amount ?? totalAmount - discountAmount);
  const amountInWords = numberToWordsNpr(Math.round(netAmount || 0));

  const onDeleteReceipt = async () => {
    const confirmed = window.confirm('Delete this receipt? This will rebuild batch stock.');
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/receipts/${id}`);
      toast.success('Receipt deleted');
      navigate('/receipts', { replace: true });
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === 'NEGATIVE_STOCK_AFTER_REBUILD') {
        toast.error('Cannot delete because stock would become negative after rebuild');
      } else {
        toast.error('Failed to delete receipt');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/receipts/new?edit_id=${id}`)}
            className="gap-1"
          >
            <PenLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteReceipt}
            disabled={isDeleting}
            className="gap-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/receipts')}>
          Back to Receipts
        </Button>
        <Button size="sm" onClick={() => navigate('/receipts/new')}>
          Add Receipt
        </Button>
        </div>
      </div>

      <Card className="border-border bg-white">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold">Purchase Receipt</h2>
                <p className="text-sm text-muted-foreground">Receipt ID: {receipt.id}</p>
              </div>

              <div className="grid gap-1 text-sm">
                <p>
                  <span className="font-medium">Invoice no:</span> {receipt.invoice_number}
                </p>
                <p>
                  <span className="font-medium">Invoice date:</span> {formatDate(receipt.invoice_date)}
                </p>
                <p>
                  <span className="font-medium">Payment mode:</span> {receipt.payment_mode}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Supplier</p>
                <p>{receipt.supplier?.name || '-'}</p>
                <p className="text-muted-foreground">{receipt.supplier?.phone || '-'}</p>
                <p className="text-muted-foreground">{receipt.supplier?.address || '-'}</p>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Prepared by:</span> {receipt.created_by?.full_name || '-'}
                </p>
                <p>
                  <span className="font-medium">Created at:</span> {formatDate(receipt.created_at)}
                </p>
                <p>
                  <span className="font-medium">Items:</span> {items.length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">SN</th>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Pack</th>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Expiry</th>
                    <th className="px-3 py-2">Qty(boxes)</th>
                    <th className="px-3 py-2">Rate</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">MRP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = Number(item.quantity_boxes || 0) * Number(item.purchase_price || 0);

                    return (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">
                          {item.medicine?.name || '-'}
                          {item.medicine?.strength ? ` ${item.medicine.strength}` : ''}
                        </td>
                        <td className="px-3 py-2">{item.pack}</td>
                        <td className="px-3 py-2">{item.batch_no}</td>
                        <td className="px-3 py-2">{formatDate(item.expiry_date)}</td>
                        <td className="px-3 py-2">{item.quantity_boxes}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.purchase_price)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(amount)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.mrp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{formatMoney(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">{formatMoney(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Net total</span>
                  <span className="font-semibold">{formatMoney(netAmount)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">In words: </span>
              {amountInWords}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
