'use client';

import { useState, useCallback } from 'react';
import * as Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  detectBroker,
  parseCSVRows,
  getAdapterById,
  SUPPORTED_BROKERS,
  type ParsedTrade,
  type RowError,
} from '@/lib/services/csv-parsers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: { row: number; message: string }[];
  brokerName: string;
}

interface CSVImportDialogProps {
  onImportComplete?: () => void;
  children?: React.ReactNode;
}

export function CSVImportDialog({
  onImportComplete,
  children,
}: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [detectedBrokerId, setDetectedBrokerId] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [accountLabel, setAccountLabel] = useState('');

  const reset = useCallback(() => {
    setStep('upload');
    setFileName('');
    setDetectedBrokerId('');
    setSelectedBrokerId('');
    setParsedTrades([]);
    setParseErrors([]);
    setRawRows([]);
    setTotalRows(0);
    setImporting(false);
    setResult(null);
    setAccountLabel('');
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset();
      }
    },
    [reset]
  );

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        setRawRows(rows);
        setTotalRows(rows.length);

        // Auto-detect broker
        const adapter = detectBroker(headers);
        setDetectedBrokerId(adapter.id);
        setSelectedBrokerId(adapter.id);

        // Parse rows
        const { trades, errors } = parseCSVRows(adapter, rows);
        setParsedTrades(trades);
        setParseErrors(errors);
        setStep('preview');
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.name.endsWith('.csv')) {
        processFile(file);
      } else {
        toast.error('Please drop a .csv file');
      }
    },
    [processFile]
  );

  const handleBrokerChange = useCallback(
    (brokerId: string) => {
      setSelectedBrokerId(brokerId);
      // Re-parse raw rows with the new adapter (Bug #4 fix)
      const adapter = getAdapterById(brokerId);
      if (!adapter || rawRows.length === 0) return;
      const { trades, errors } = parseCSVRows(adapter, rawRows);
      setParsedTrades(trades);
      setParseErrors(errors);
    },
    [rawRows]
  );

  const handleImport = useCallback(async () => {
    if (parsedTrades.length === 0) return;

    setImporting(true);
    setStep('importing');

    try {
      const res = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerId: selectedBrokerId || detectedBrokerId,
          trades: parsedTrades,
          accountLabel: accountLabel.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Import failed');
        setStep('preview');
        return;
      }

      setResult(data);
      setStep('done');

      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} trades`);
        onImportComplete?.();
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed. Please try again.');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  }, [parsedTrades, selectedBrokerId, detectedBrokerId, accountLabel, onImportComplete]);

  const previewTrades = parsedTrades.slice(0, 15);
  const activeBrokerId = selectedBrokerId || detectedBrokerId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Trades from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' &&
              'Upload a CSV export from your broker to import trades.'}
            {step === 'preview' && 'Review parsed trades before importing.'}
            {step === 'importing' && 'Importing your trades...'}
            {step === 'done' && 'Import complete!'}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step 1: Upload ─── */}
        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-all',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">
                Drop your CSV file here, or{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .csv files up to 5,000 trades
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Supported brokers:</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_BROKERS.map((b) => (
                  <Badge key={b.id} variant="secondary" className="text-xs">
                    {b.name}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  + Any CSV with standard columns
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Preview ─── */}
        {step === 'preview' && (
          <div className="space-y-4 pt-2">
            {/* File info bar */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalRows} rows parsed →{' '}
                    <span className="text-emerald-600 font-medium">
                      {parsedTrades.length} valid trades
                    </span>
                    {parseErrors.length > 0 && (
                      <span className="text-amber-600 ml-1">
                        ({parseErrors.length} errors)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Broker selector + account label */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Broker:
              </span>
              <Select
                value={activeBrokerId}
                onValueChange={handleBrokerChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_BROKERS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="generic">Generic CSV</SelectItem>
                </SelectContent>
              </Select>
              {detectedBrokerId && detectedBrokerId !== 'generic' && activeBrokerId === detectedBrokerId && (
                <Badge variant="outline" className="text-xs text-emerald-600">
                  Auto-detected
                </Badge>
              )}
            </div>

            {/* Account label */}
            <div className="space-y-1.5">
              <Label htmlFor="csv-account-label" className="text-xs text-muted-foreground">
                Account label (optional — helps distinguish if you have multiple accounts at the same broker)
              </Label>
              <Input
                id="csv-account-label"
                placeholder="e.g. Schwab IRA, Robinhood Main"
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Preview table */}
            {parsedTrades.length > 0 && (
              <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="w-[60px]">Side</TableHead>
                      <TableHead className="text-right w-[80px]">
                        Qty
                      </TableHead>
                      <TableHead className="text-right w-[100px]">
                        Price
                      </TableHead>
                      <TableHead className="text-right w-[80px]">
                        Fees
                      </TableHead>
                      <TableHead className="w-[80px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewTrades.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {t.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-mono',
                              t.action === 'BUY'
                                ? 'border-emerald-500 text-emerald-500'
                                : t.action === 'SELL'
                                  ? 'border-rose-500 text-rose-500'
                                  : 'border-amber-500 text-amber-500'
                            )}
                          >
                            {t.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {t.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${t.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          ${t.fees.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {t.type}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {parsedTrades.length > 15 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 15 of {parsedTrades.length} trades
              </p>
            )}

            {/* Errors */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">
                    {parseErrors.length} rows had errors and will be skipped
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 max-h-[100px] overflow-auto">
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <p key={i}>
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                  {parseErrors.length > 5 && (
                    <p className="text-amber-600">
                      ...and {parseErrors.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={reset}>
                Upload Different File
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedTrades.length === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import {parsedTrades.length} Trades
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Importing ─── */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Importing {parsedTrades.length} trades...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a moment for large imports
            </p>
          </div>
        )}

        {/* ─── Step 4: Done ─── */}
        {step === 'done' && result && (
          <div className="space-y-4 pt-2">
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Import Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {result.brokerName}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">
                  {result.imported}
                </p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">
                  {result.duplicates}
                </p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
              <div className="text-center p-3 bg-rose-500/10 rounded-lg">
                <p className="text-2xl font-bold text-rose-600">
                  {result.errors.length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={reset}>
                Import More
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
