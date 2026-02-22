# Pha-Stock Backend QA Checklist

## Setup
1. Run `npm install`.
2. Ensure `backend/.env` is configured with a valid MongoDB URI and JWT settings.
3. Run `npm run seed:demo`.
4. Start API with `npm run dev`.

## Auth
1. `POST /api/v1/auth/login` with `{"username":"admin","password":"admin123"}`.
2. Verify `200` and token in response.
3. Reuse token as `Authorization: Bearer <token>` for all remaining tests.

## Settings
1. `GET /api/v1/settings`.
2. Verify `200` and keys `low_stock_limit_boxes`, `expiry_alert_days`, `updated_at`.
3. `PATCH /api/v1/settings` with `{"low_stock_limit_boxes":3,"expiry_alert_days":45}`.
4. Verify `200` and message `Settings updated`.
5. `GET /api/v1/settings` again to confirm persisted values.

## Medicine CRUD
1. `POST /api/v1/medicines` with `{"name":"DemoMed","strength":"20mg","category":"Test"}`.
2. Verify `201` and returned medicine object.
3. `GET /api/v1/medicines?q=DemoMed&page=1&limit=20`.
4. Verify list includes created item.
5. `PATCH /api/v1/medicines/{id}` with `{"category":"Updated"}`.
6. Verify `200` and updated field.

## Supplier CRUD
1. `POST /api/v1/suppliers` with `{"name":"Demo Supplier","phone":"9800011111","address":"Kathmandu"}`.
2. Verify `201` and returned supplier object.
3. `GET /api/v1/suppliers?q=Demo&page=1&limit=20`.
4. Verify list includes created supplier.
5. `PATCH /api/v1/suppliers/{id}` with `{"address":"Pokhara"}`.
6. Verify `200` and updated field.

## Purchase Receipt
1. `POST /api/v1/purchase-receipts` with a valid payload including supplier, invoice, and multiple items.
2. Verify `201` and response includes `receipt_id` and `batch_updates`.
3. Repeat same request with same `supplier_id` + `invoice_number`.
4. Verify `409` with `DUPLICATE_INVOICE`.

## Batch List Filters
1. `GET /api/v1/batches?page=1&limit=20`.
2. Verify list returns expected shape and flags.
3. `GET /api/v1/batches?expiry_status=expiring_soon&page=1&limit=20`.
4. `GET /api/v1/batches?stock_status=low_stock&page=1&limit=20`.
5. `GET /api/v1/batches?stock_status=out_of_stock&page=1&limit=20`.
6. Verify each filter returns appropriate results.

## Batch Lookup
1. `GET /api/v1/batches/lookup?medicine_id={id}&pack=10x10&batch_no=PAR500A&expiry_date=2027-01-31`.
2. Verify `exists` and stock/price fields.

## FEFO Suggest
1. `GET /api/v1/stock-issues/fefo-suggest?medicine_id={id}`.
2. Verify `suggested` and `alternatives` sorted by expiry.

## Stock Issue
1. `POST /api/v1/stock-issues` with valid payload.
2. Verify `201` and `remaining_boxes` decreases.
3. `POST /api/v1/stock-issues` with `issued_boxes` larger than available.
4. Verify `400` with `INSUFFICIENT_STOCK`.

## Dashboard
1. `GET /api/v1/dashboard/summary`.
2. Verify keys: `total_medicines`, `expiring_soon_batches`, `expired_batches`, `low_stock_batches`, `out_of_stock_batches`.

## Alerts
1. `GET /api/v1/alerts/expiring-soon?page=1&limit=20`.
2. `GET /api/v1/alerts/expired?page=1&limit=20`.
3. `GET /api/v1/alerts/low-stock?page=1&limit=20`.
4. `GET /api/v1/alerts/out-of-stock?page=1&limit=20`.
5. Verify each returns paginated shape with flags.

## Receipt Search
1. `GET /api/v1/receipt-search?page=1&limit=20`.
2. `GET /api/v1/receipt-search?supplier_id={id}`.
3. `GET /api/v1/receipt-search?medicine_id={id}`.
4. `GET /api/v1/receipt-search?batch_no=PAR500A`.
5. Verify each returns item-level rows with receipt + item fields.

## Price History
1. `GET /api/v1/price-history?medicine_id={id}&limit=20`.
2. Verify `medicine`, `latest`, and `history` blocks.
3. Verify newest invoice appears as `latest`.
