# PhaStock Backend

## Migration: Backfill Batch Pharmacy IDs

Use these commands to backfill legacy `batchstocks` records missing `pharmacyId`.

### 1) Preview only (no DB writes)

```bash
npm run backfill:batch-pharmacy -- --dry-run
```

### 2) Run inferred backfill (writes DB)

```bash
npm run backfill:batch-pharmacy
```

### 3) Force unresolved rows to a pharmacy (writes DB)

```bash
npm run backfill:batch-pharmacy -- --force-pharmacy=<PHARMACY_OBJECT_ID>
```

### 4) Combine dry-run + force

```bash
npm run backfill:batch-pharmacy -- --dry-run --force-pharmacy=<PHARMACY_OBJECT_ID>
```

The script prints summary counters:
- `Updated`
- `Unresolved`
- `Conflicts`
- `Failed`
- `ForcedByFlag`
