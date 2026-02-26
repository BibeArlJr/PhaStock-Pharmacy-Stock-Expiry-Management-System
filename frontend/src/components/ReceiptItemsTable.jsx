import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

import AsyncCombobox from '@/components/AsyncCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ReceiptItemsTable({
  rows,
  errors,
  onChangeRow,
  onRemoveRow,
  onAddRow,
  fetchMedicineOptions,
  onRequestCreateMedicine,
  focusPackRowId,
  disabled,
}) {
  const packInputRefs = useRef({});

  const focusPackInput = (rowId) => {
    window.setTimeout(() => {
      packInputRefs.current[rowId]?.focus();
    }, 0);
  };

  useEffect(() => {
    if (focusPackRowId) {
      focusPackInput(focusPackRowId);
    }
  }, [focusPackRowId]);

  return (
    <div className="relative">
      <table className="w-full table-fixed border-collapse text-sm">
      <colgroup>
          <col style={{ width: '20%' }} /> {/* Medicine (reduced) */}
          <col style={{ width: '15%' }} /> {/* Pack */}
          <col style={{ width: '15%' }} /> {/* Batch */}
          <col style={{ width: '18%' }} /> {/* Expiry */}
          <col style={{ width: '10%' }} />  {/* Qty */}
          <col style={{ width: '17%' }} /> {/* Purchase */}
          <col style={{ width: '15%' }} /> {/* MRP */}
          <col style={{ width: '8%' }} /> {/* Action */}
        </colgroup>
        <thead>
          <tr className="border-b text-center text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Medicine</th>
            <th className="px-3 py-2">Pack</th>
            <th className="px-3 py-2">Batch no</th>
            <th className="px-3 py-2">Expiry date</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Purchase price</th>
            <th className="px-3 py-2">MRP</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const rowErrors = errors[index] || {};

            return (
              <tr key={row.local_id} className="border-b align-top">
                <td className="relative z-20 px-3 py-2 text-center align-middle">
                  <AsyncCombobox
                    value={row.medicine}
                    onChange={(option) => {
                      onChangeRow(index, { medicine: option });
                      if (option) {
                        focusPackInput(row.local_id);
                      }
                    }}
                    fetchOptions={fetchMedicineOptions}
                    placeholder="Select medicine"
                    searchPlaceholder="Search medicine"
                    noResultsActionLabel={(query) => `+ Add medicine: ${query}`}
                    onNoResultsAction={(query) => onRequestCreateMedicine?.(index, query)}
                    disabled={disabled}
                  />
                  {rowErrors.medicine ? <p className="mt-1 text-xs text-red-600">{rowErrors.medicine}</p> : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    ref={(element) => {
                      packInputRefs.current[row.local_id] = element;
                    }}
                    value={row.pack}
                    onChange={(event) => onChangeRow(index, { pack: event.target.value })}
                    placeholder="10SX10T"
                    disabled={disabled}
                  />
                  {rowErrors.pack ? <p className="mt-1 text-xs text-red-600">{rowErrors.pack}</p> : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    value={row.batch_no}
                    onChange={(event) => onChangeRow(index, { batch_no: event.target.value })}
                    placeholder="Batch"
                    disabled={disabled}
                  />
                  {rowErrors.batch_no ? <p className="mt-1 text-xs text-red-600">{rowErrors.batch_no}</p> : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    type="date"
                    value={row.expiry_date}
                    onChange={(event) => onChangeRow(index, { expiry_date: event.target.value })}
                    disabled={disabled}
                  />
                  {rowErrors.expiry_date ? (
                    <p className="mt-1 text-xs text-red-600">{rowErrors.expiry_date}</p>
                  ) : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    type="number"
                    min="1"
                    value={row.quantity_boxes}
                    onChange={(event) => onChangeRow(index, { quantity_boxes: event.target.value })}
                    disabled={disabled}
                  />
                  {rowErrors.quantity_boxes ? (
                    <p className="mt-1 text-xs text-red-600">{rowErrors.quantity_boxes}</p>
                  ) : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.purchase_price}
                    onChange={(event) => onChangeRow(index, { purchase_price: event.target.value })}
                    disabled={disabled}
                  />
                  {rowErrors.purchase_price ? (
                    <p className="mt-1 text-xs text-red-600">{rowErrors.purchase_price}</p>
                  ) : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.mrp}
                    onChange={(event) => onChangeRow(index, { mrp: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && index === rows.length - 1) {
                        event.preventDefault();
                        onAddRow();
                      }
                    }}
                    disabled={disabled}
                  />
                  {rowErrors.mrp ? <p className="mt-1 text-xs text-red-600">{rowErrors.mrp}</p> : null}
                </td>

                <td className="px-3 py-2 text-center align-middle">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveRow(index)}
                    disabled={disabled || rows.length === 1}
                    className="h-9 w-9 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
