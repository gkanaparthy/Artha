'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TradeAction } from '@/lib/services/csv-parsers';

interface ManualTradeFormProps {
  onTradeAdded?: () => void;
  children?: React.ReactNode;
}

export function ManualTradeForm({
  onTradeAdded,
  children,
}: ManualTradeFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [side, setSide] = useState<TradeAction>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [type, setType] = useState<'STOCK' | 'OPTION'>('STOCK');

  // Option fields
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const resetForm = useCallback(() => {
    setSymbol('');
    setDate('');
    setTime('09:30');
    setSide('BUY');
    setQuantity('');
    setPrice('');
    setFees('0');
    setType('STOCK');
    setOptionType('CALL');
    setStrikePrice('');
    setExpiryDate('');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!symbol || !date || !quantity || !price) {
        toast.error('Please fill in all required fields');
        return;
      }

      const timestamp = new Date(`${date}T${time || '09:30'}:00`);
      if (isNaN(timestamp.getTime())) {
        toast.error('Invalid date/time');
        return;
      }

      const qty = parseFloat(quantity);
      const px = parseFloat(price);
      const fee = parseFloat(fees || '0');

      if (isNaN(qty) || qty <= 0) {
        toast.error('Quantity must be a positive number');
        return;
      }
      if (isNaN(px) || px < 0) {
        toast.error('Price must be zero or a positive number');
        return;
      }
      // Require non-zero price for regular trades
      const zeropriceAllowed = ['OPTIONEXPIRATION', 'ASSIGNMENT', 'SPLIT', 'DIVIDEND'].includes(side);
      if (px === 0 && !zeropriceAllowed) {
        toast.error('Price must be a positive number for buy/sell trades');
        return;
      }

      setSubmitting(true);

      try {
        const trade = {
          symbol: symbol.toUpperCase().trim(),
          timestamp: timestamp.toISOString(),
          action: side,
          quantity: qty,
          price: px,
          fees: isNaN(fee) ? 0 : fee,
          type,
          currency: 'USD',
          ...(type === 'OPTION'
            ? {
                optionType,
                strikePrice: parseFloat(strikePrice) || undefined,
                expiryDate: expiryDate
                  ? new Date(expiryDate).toISOString()
                  : undefined,
              }
            : {}),
        };

        const res = await fetch('/api/trades/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brokerId: 'manual',
            trades: [trade],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to add trade');
          return;
        }

        if (data.imported > 0) {
          toast.success(
            `Added ${side} ${qty} ${symbol.toUpperCase()} @ $${px.toFixed(2)}`
          );
          resetForm();
          onTradeAdded?.();
          setOpen(false);
        } else if (data.duplicates > 0) {
          toast.warning('This trade already exists (duplicate detected)');
        } else {
          toast.error('Trade was not imported. Check your data.');
        }
      } catch (err) {
        console.error('Manual trade error:', err);
        toast.error('Failed to add trade');
      } finally {
        setSubmitting(false);
      }
    },
    [
      symbol,
      date,
      time,
      side,
      quantity,
      price,
      fees,
      type,
      optionType,
      strikePrice,
      expiryDate,
      resetForm,
      onTradeAdded,
    ]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Trade Manually
          </DialogTitle>
          <DialogDescription>
            Enter the details of a single trade.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Row 1: Symbol + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-symbol">
                Symbol <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manual-symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'STOCK' | 'OPTION')}
              >
                <SelectTrigger id="manual-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK">Stock</SelectItem>
                  <SelectItem value="OPTION">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manual-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-time">Time</Label>
              <Input
                id="manual-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Side + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-side">
                Side <span className="text-destructive">*</span>
              </Label>
              <Select
                value={side}
                onValueChange={(v) => setSide(v as TradeAction)}
              >
                <SelectTrigger id="manual-side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                  <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                  <SelectItem value="OPTIONEXPIRATION">Expiration</SelectItem>
                  <SelectItem value="EXERCISE">Exercise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manual-quantity"
                type="number"
                min="0"
                step="any"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Price + Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-price">
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manual-price"
                type="number"
                min="0"
                step="any"
                placeholder="150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-fees">Fees</Label>
              <Input
                id="manual-fees"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>
          </div>

          {/* Option fields (conditional) */}
          {type === 'OPTION' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Option Details
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-option-type">Call/Put</Label>
                  <Select
                    value={optionType}
                    onValueChange={(v) =>
                      setOptionType(v as 'CALL' | 'PUT')
                    }
                  >
                    <SelectTrigger id="manual-option-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">Call</SelectItem>
                      <SelectItem value="PUT">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-strike">Strike</Label>
                  <Input
                    id="manual-strike"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="150"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-expiry">Expiry</Label>
                  <Input
                    id="manual-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Trade
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
