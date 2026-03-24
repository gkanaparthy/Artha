/**
 * CSV Broker Adapters for Manual Trade Import
 *
 * Each adapter knows how to detect and parse a specific broker's CSV export
 * format into Artha's canonical trade shape.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type TradeAction =
  | 'BUY'
  | 'SELL'
  | 'ASSIGNMENT'
  | 'OPTIONEXPIRATION'
  | 'EXERCISE'
  | 'EXERCISES'
  | 'SPLIT'
  | 'DIVIDEND';

export interface ParsedTrade {
  symbol: string;
  timestamp: Date;
  action: TradeAction;
  quantity: number;
  price: number;
  fees: number;
  type: 'STOCK' | 'OPTION' | 'FUTURE';
  currency: string;
  // Option fields
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  expiryDate?: Date;
  // Broker execution identifiers for better dedup when a CSV exposes fill-level IDs.
  brokerExecutionId?: string;
  // Account number extracted from CSV for per-account identity (Bug #1)
  accountNumber?: string;
}

export interface RowError {
  row: number;
  message: string;
  data?: Record<string, string>;
}

export interface BrokerAdapter {
  id: string;
  name: string;
  /** Return true if the CSV header row matches this broker */
  detect(headers: string[]): boolean;
  /** Parse a single row into a trade, or null to skip (e.g. non-trade rows) */
  parse(row: Record<string, string>, rowIndex: number): ParsedTrade | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => h.trim().toLowerCase());
}

function hasAllHeaders(actual: string[], required: string[]): boolean {
  const normalized = normalizeHeaders(actual);
  return required.every((r) => normalized.includes(r.toLowerCase()));
}

function parseFloat_(val: string | undefined): number {
  if (!val) return 0;
  // Remove $, commas, and whitespace
  const cleaned = val.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate_(val: string | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function firstPopulatedColumn(
  row: Record<string, string>,
  columns: string[]
): string | undefined {
  for (const column of columns) {
    const value = row[column]?.trim();
    if (value) return value;
  }

  return undefined;
}

function calculateRobinhoodFees(
  action: TradeAction,
  amount: number,
  quantity: number,
  price: number
): number {
  const grossAmount = quantity * price;
  const netAmount = Math.abs(amount);

  if (action === 'BUY') {
    return Math.max(0, netAmount - grossAmount);
  }

  if (action === 'SELL') {
    return Math.max(0, grossAmount - netAmount);
  }

  return 0;
}

function detectOptionFromSymbol(symbol: string): {
  isOption: boolean;
  underlying?: string;
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  expiryDate?: Date;
} {
  // OCC format: AAPL  230120C00150000  (underlying, date YYMMDD, C/P, strike * 1000)
  const occRegex = /^([A-Z]+)\s*(\d{6})([CP])(\d+)$/;
  const match = symbol.replace(/\s+/g, '').match(occRegex);
  if (match) {
    const [, underlying, dateStr, cp, strikeStr] = match;
    const year = 2000 + parseInt(dateStr.slice(0, 2));
    const month = parseInt(dateStr.slice(2, 4)) - 1;
    const day = parseInt(dateStr.slice(4, 6));
    return {
      isOption: true,
      underlying,
      optionType: cp === 'C' ? 'CALL' : 'PUT',
      strikePrice: parseInt(strikeStr) / 1000,
      expiryDate: new Date(year, month, day),
    };
  }
  return { isOption: false };
}

// ──────────────────────────────────────────────
// Robinhood Adapter
// ──────────────────────────────────────────────

const robinhoodAdapter: BrokerAdapter = {
  id: 'robinhood',
  name: 'Robinhood',

  detect(headers) {
    // Robinhood CSV has: Activity Date, Process Date, Settle Date, Instrument,
    // Description, Trans Code, Quantity, Price, Amount
    return hasAllHeaders(headers, [
      'Activity Date',
      'Instrument',
      'Trans Code',
      'Quantity',
      'Price',
    ]);
  },

  parse(row) {
    const transCode = (row['Trans Code'] || '').trim().toUpperCase();

    // Map broker trans codes to canonical actions
    const ACTION_MAP: Record<string, TradeAction> = {
      BUY: 'BUY',
      BTO: 'BUY',
      BTC: 'BUY',
      SELL: 'SELL',
      STO: 'SELL',
      STC: 'SELL',
      OEXP: 'OPTIONEXPIRATION',
      EXP: 'OPTIONEXPIRATION',
      ASSIGN: 'ASSIGNMENT',
      ASSIGNED: 'ASSIGNMENT',
      EXERCISE: 'EXERCISE',
      EXERCISED: 'EXERCISE',
      SPLIT: 'SPLIT',
      DIV: 'DIVIDEND',
      DIVIDEND: 'DIVIDEND',
    };
    const action = ACTION_MAP[transCode];
    if (!action) return null;

    const symbol = (row['Instrument'] || '').trim();
    if (!symbol) return null;

    const timestamp = parseDate_(row['Activity Date']);
    if (!timestamp) return null;

    const quantity = Math.abs(parseFloat_(row['Quantity']));
    const price = Math.abs(parseFloat_(row['Price']));
    const amount = parseFloat_(row['Amount']);
    // Allow zero price for expirations and assignments
    if (quantity === 0) return null;
    if (
      price === 0 &&
      action !== 'OPTIONEXPIRATION' &&
      action !== 'SPLIT' &&
      action !== 'DIVIDEND'
    )
      return null;

    // Option detection
    const optionInfo = detectOptionFromSymbol(symbol);

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees: calculateRobinhoodFees(action, amount, quantity, price),
      type: optionInfo.isOption ? 'OPTION' : 'STOCK',
      currency: 'USD',
      accountNumber:
        (row['Account'] || row['Account Number'] || '').trim() || undefined,
      ...(optionInfo.isOption
        ? {
            optionType: optionInfo.optionType,
            strikePrice: optionInfo.strikePrice,
            expiryDate: optionInfo.expiryDate,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// Charles Schwab Adapter
// ──────────────────────────────────────────────

const schwabAdapter: BrokerAdapter = {
  id: 'schwab',
  name: 'Charles Schwab',

  detect(headers) {
    return hasAllHeaders(headers, [
      'Date',
      'Action',
      'Symbol',
      'Quantity',
      'Price',
    ]);
  },

  parse(row) {
    const rawAction = (row['Action'] || '').trim().toUpperCase();

    // Schwab action mapping
    let action: TradeAction | null = null;
    if (rawAction.includes('BUY') || rawAction.includes('BOUGHT'))
      action = 'BUY';
    else if (rawAction.includes('SELL') || rawAction.includes('SOLD'))
      action = 'SELL';
    else if (rawAction.includes('ASSIGNED') || rawAction.includes('ASSIGNMENT'))
      action = 'ASSIGNMENT';
    else if (rawAction.includes('EXPIR')) action = 'OPTIONEXPIRATION';
    else if (rawAction.includes('EXERCIS')) action = 'EXERCISE';
    else if (rawAction.includes('SPLIT')) action = 'SPLIT';
    else if (rawAction.includes('DIVIDEND') || rawAction.includes('DIV'))
      action = 'DIVIDEND';
    if (!action) return null;

    const symbol = (row['Symbol'] || '').trim();
    if (!symbol) return null;

    const timestamp = parseDate_(row['Date']);
    if (!timestamp) return null;

    const quantity = Math.abs(parseFloat_(row['Quantity']));
    const price = Math.abs(parseFloat_(row['Price']));
    if (quantity === 0) return null;
    if (
      price === 0 &&
      action !== 'OPTIONEXPIRATION' &&
      action !== 'SPLIT' &&
      action !== 'DIVIDEND'
    )
      return null;

    const fees = Math.abs(
      parseFloat_(row['Fees & Comm'] || row['Commission'] || row['Fees'])
    );

    const optionInfo = detectOptionFromSymbol(symbol);

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees,
      type: optionInfo.isOption ? 'OPTION' : 'STOCK',
      currency: 'USD',
      accountNumber:
        (row['Account'] || row['Account Number'] || '').trim() || undefined,
      ...(optionInfo.isOption
        ? {
            optionType: optionInfo.optionType,
            strikePrice: optionInfo.strikePrice,
            expiryDate: optionInfo.expiryDate,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// Webull Adapter
// ──────────────────────────────────────────────

const webullAdapter: BrokerAdapter = {
  id: 'webull',
  name: 'Webull',

  detect(headers) {
    // Webull: Filled Time, Ticker/Symbol, Side, Filled Qty, Avg Price
    return (
      hasAllHeaders(headers, ['Side', 'Avg Price']) &&
      (hasAllHeaders(headers, ['Ticker']) || hasAllHeaders(headers, ['Symbol']))
    );
  },

  parse(row) {
    const side = (row['Side'] || '').trim().toUpperCase();
    if (side !== 'BUY' && side !== 'SELL') return null;

    const symbol = (row['Ticker'] || row['Symbol'] || '').trim();
    if (!symbol) return null;

    const timestamp = parseDate_(
      row['Filled Time'] || row['Create Time'] || row['Date']
    );
    if (!timestamp) return null;

    const quantity = Math.abs(
      parseFloat_(row['Filled Qty'] || row['Qty'] || row['Quantity'])
    );
    const price = Math.abs(parseFloat_(row['Avg Price'] || row['Price']));
    if (quantity === 0 || price === 0) return null;

    const fees = Math.abs(parseFloat_(row['Commission'] || row['Fees']));

    const optionInfo = detectOptionFromSymbol(symbol);

    return {
      symbol,
      timestamp,
      action: side as 'BUY' | 'SELL',
      quantity,
      price,
      fees,
      type: optionInfo.isOption ? 'OPTION' : 'STOCK',
      currency: 'USD',
      accountNumber: (row['Account'] || '').trim() || undefined,
      ...(optionInfo.isOption
        ? {
            optionType: optionInfo.optionType,
            strikePrice: optionInfo.strikePrice,
            expiryDate: optionInfo.expiryDate,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// thinkorswim (TD Ameritrade) Adapter
// ──────────────────────────────────────────────

const thinkorswimAdapter: BrokerAdapter = {
  id: 'thinkorswim',
  name: 'thinkorswim',

  detect(headers) {
    return hasAllHeaders(headers, [
      'Exec Time',
      'Side',
      'Qty',
      'Symbol',
      'Price',
    ]);
  },

  parse(row) {
    const side = (row['Side'] || '').trim().toUpperCase();
    const posEffect = (row['Pos Effect'] || '').trim().toUpperCase();

    let action: TradeAction | null = null;
    if (side === 'BUY' || side === 'BOT') action = 'BUY';
    else if (side === 'SELL' || side === 'SLD') action = 'SELL';
    else if (side === 'ASSIGNED' || posEffect === 'ASSIGNMENT')
      action = 'ASSIGNMENT';
    else if (side === 'EXPIRED' || posEffect === 'EXPIRATION')
      action = 'OPTIONEXPIRATION';
    else if (side === 'EXERCISE') action = 'EXERCISE';
    if (!action) return null;

    const symbol = (row['Symbol'] || '').trim();
    if (!symbol) return null;

    const timestamp = parseDate_(row['Exec Time']);
    if (!timestamp) return null;

    const quantity = Math.abs(parseFloat_(row['Qty']));
    const price = Math.abs(parseFloat_(row['Price'] || row['Net Price']));
    if (quantity === 0) return null;
    if (price === 0 && action !== 'OPTIONEXPIRATION') return null;

    // thinkorswim has Exp, Strike, Type columns for options
    const expiry = row['Exp'] ? parseDate_(row['Exp']) : null;
    const strike = parseFloat_(row['Strike']);
    const optType = (row['Type'] || '').trim().toUpperCase();
    const isOption =
      !!expiry || strike > 0 || optType === 'CALL' || optType === 'PUT';

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees: 0, // thinkorswim doesn't always include fees in CSV
      type: isOption ? 'OPTION' : 'STOCK',
      currency: 'USD',
      ...(isOption
        ? {
            optionType:
              optType === 'CALL' || optType === 'C'
                ? ('CALL' as const)
                : ('PUT' as const),
            strikePrice: strike || undefined,
            expiryDate: expiry || undefined,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// Fidelity Adapter
// ──────────────────────────────────────────────

const fidelityAdapter: BrokerAdapter = {
  id: 'fidelity',
  name: 'Fidelity',

  detect(headers) {
    return hasAllHeaders(headers, [
      'Run Date',
      'Action',
      'Symbol',
      'Quantity',
      'Price',
    ]);
  },

  parse(row) {
    const rawAction = (row['Action'] || '').trim().toUpperCase();

    let action: TradeAction | null = null;
    if (rawAction.includes('BOUGHT') || rawAction.includes('BUY'))
      action = 'BUY';
    else if (rawAction.includes('SOLD') || rawAction.includes('SELL'))
      action = 'SELL';
    else if (rawAction.includes('ASSIGNED') || rawAction.includes('ASSIGNMENT'))
      action = 'ASSIGNMENT';
    else if (rawAction.includes('EXPIR')) action = 'OPTIONEXPIRATION';
    else if (rawAction.includes('EXERCIS')) action = 'EXERCISE';
    else if (rawAction.includes('SPLIT')) action = 'SPLIT';
    else if (rawAction.includes('DIVIDEND')) action = 'DIVIDEND';
    if (!action) return null;

    const symbol = (row['Symbol'] || '').trim();
    if (!symbol || symbol === '') return null;

    const timestamp = parseDate_(row['Run Date'] || row['Settlement Date']);
    if (!timestamp) return null;

    const quantity = Math.abs(parseFloat_(row['Quantity']));
    const price = Math.abs(parseFloat_(row['Price']));
    if (quantity === 0) return null;
    if (
      price === 0 &&
      action !== 'OPTIONEXPIRATION' &&
      action !== 'SPLIT' &&
      action !== 'DIVIDEND'
    )
      return null;

    const fees = Math.abs(parseFloat_(row['Commission'] || row['Fees']));

    const optionInfo = detectOptionFromSymbol(symbol);

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees,
      type: optionInfo.isOption ? 'OPTION' : 'STOCK',
      currency: row['Currency'] || 'USD',
      accountNumber:
        (row['Account'] || row['Account Number'] || '').trim() || undefined,
      ...(optionInfo.isOption
        ? {
            optionType: optionInfo.optionType,
            strikePrice: optionInfo.strikePrice,
            expiryDate: optionInfo.expiryDate,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// Interactive Brokers (IBKR) Adapter
// ──────────────────────────────────────────────

const ibkrAdapter: BrokerAdapter = {
  id: 'ibkr',
  name: 'Interactive Brokers',

  detect(headers) {
    // IBKR Activity Statements have section-based CSV. Two common patterns:
    // 1. Flex Query: Symbol, Date/Time, Quantity, T. Price, ...
    // 2. Activity Statement: First col = section name (e.g. "Trades")
    return (
      hasAllHeaders(headers, ['Symbol', 'Date/Time', 'Quantity', 'T. Price']) ||
      hasAllHeaders(headers, ['Symbol', 'DateTime', 'Quantity', 'TradePrice'])
    );
  },

  parse(row) {
    // For activity statement CSVs, skip non-trade rows
    const section = row['Statement'] || row['Section'] || '';
    if (section && !section.toUpperCase().includes('TRADE')) return null;

    // Skip header/subtotal rows
    const headerCol = row['Header'] || row['DataDiscriminator'] || '';
    if (
      headerCol === 'Header' ||
      headerCol === 'SubTotal' ||
      headerCol === 'Total'
    ) {
      return null;
    }

    const symbol = (row['Symbol'] || '').trim();
    if (!symbol) return null;

    const timestamp = parseDate_(row['Date/Time'] || row['DateTime']);
    if (!timestamp) return null;

    const rawQty = parseFloat_(row['Quantity']);
    const quantity = Math.abs(rawQty);
    const price = Math.abs(parseFloat_(row['T. Price'] || row['TradePrice']));
    if (quantity === 0 || price === 0) return null;

    const isSell = rawQty < 0;
    const fees = Math.abs(
      parseFloat_(row['Comm/Fee'] || row['Commission'] || row['IBCommission'])
    );

    // IBKR asset class detection
    const assetClass = (
      row['Asset Class'] ||
      row['AssetClass'] ||
      ''
    ).toUpperCase();
    const isOption = assetClass === 'OPT' || assetClass === 'FOP';
    const isFuture = assetClass === 'FUT';

    // IBKR code column can contain lifecycle events
    const codeCol = (row['Code'] || row['Notes/Codes'] || '').toUpperCase();
    let action: TradeAction = isSell ? 'SELL' : 'BUY';
    if (codeCol.includes('A') && assetClass === 'OPT') action = 'ASSIGNMENT';
    if (codeCol.includes('Ep')) action = 'OPTIONEXPIRATION';
    if (codeCol.includes('Ex')) action = 'EXERCISE';

    const putCall = (row['Put/Call'] || '').trim().toUpperCase();
    const strike = parseFloat_(row['Strike']);
    const expiry = parseDate_(row['Expiry'] || row['Expiration']);

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees,
      type: isOption ? 'OPTION' : isFuture ? 'FUTURE' : 'STOCK',
      currency: (row['Currency'] || 'USD').trim(),
      brokerExecutionId: firstPopulatedColumn(row, [
        'TradeID',
        'TransactionID',
      ]),
      accountNumber:
        (row['Account'] || row['AccountId'] || '').trim() || undefined,
      ...(isOption
        ? {
            optionType:
              putCall === 'C' || putCall === 'CALL'
                ? ('CALL' as const)
                : ('PUT' as const),
            strikePrice: strike || undefined,
            expiryDate: expiry || undefined,
          }
        : {}),
    };
  },
};

// ──────────────────────────────────────────────
// Generic / Custom CSV Adapter
// ──────────────────────────────────────────────

const genericAdapter: BrokerAdapter = {
  id: 'generic',
  name: 'Generic CSV',

  detect(headers) {
    // Matches any CSV that has at minimum: symbol-like, date-like, quantity-like, price-like columns
    const norm = normalizeHeaders(headers);
    const hasSymbol = norm.some((h) =>
      ['symbol', 'ticker', 'instrument'].includes(h)
    );
    const hasDate = norm.some((h) =>
      [
        'date',
        'time',
        'datetime',
        'timestamp',
        'trade date',
        'exec time',
      ].includes(h)
    );
    const hasQty = norm.some((h) =>
      ['quantity', 'qty', 'shares', 'units', 'filled qty'].includes(h)
    );
    const hasPrice = norm.some((h) =>
      ['price', 'avg price', 'fill price', 'execution price'].includes(h)
    );
    return hasSymbol && hasDate && hasQty && hasPrice;
  },

  parse(row) {
    // Try common column name variants
    const symbol = (
      row['Symbol'] ||
      row['Ticker'] ||
      row['Instrument'] ||
      ''
    ).trim();
    if (!symbol) return null;

    const timestamp = parseDate_(
      row['Date'] ||
        row['Time'] ||
        row['DateTime'] ||
        row['Timestamp'] ||
        row['Trade Date'] ||
        row['Exec Time']
    );
    if (!timestamp) return null;

    const quantity = Math.abs(
      parseFloat_(
        row['Quantity'] ||
          row['Qty'] ||
          row['Shares'] ||
          row['Units'] ||
          row['Filled Qty']
      )
    );
    const price = Math.abs(
      parseFloat_(
        row['Price'] ||
          row['Avg Price'] ||
          row['Fill Price'] ||
          row['Execution Price']
      )
    );
    if (quantity === 0 || price === 0) return null;

    // Determine side
    const sideRaw = (
      row['Side'] ||
      row['Action'] ||
      row['Trans Code'] ||
      row['Type'] ||
      row['Transaction Type'] ||
      ''
    )
      .trim()
      .toUpperCase();

    let action: TradeAction | null = null;
    if (
      sideRaw.includes('SELL') ||
      sideRaw.includes('SOLD') ||
      sideRaw === 'S' ||
      sideRaw === 'SLD' ||
      sideRaw === 'STC' ||
      sideRaw === 'STO'
    ) {
      action = 'SELL';
    } else if (
      sideRaw.includes('BUY') ||
      sideRaw.includes('BOUGHT') ||
      sideRaw === 'B' ||
      sideRaw === 'BOT' ||
      sideRaw === 'BTO' ||
      sideRaw === 'BTC'
    ) {
      action = 'BUY';
    } else if (sideRaw.includes('ASSIGN')) {
      action = 'ASSIGNMENT';
    } else if (sideRaw.includes('EXPIR')) {
      action = 'OPTIONEXPIRATION';
    } else if (sideRaw.includes('EXERCIS')) {
      action = 'EXERCISE';
    } else if (sideRaw.includes('SPLIT')) {
      action = 'SPLIT';
    }
    if (!action) return null;

    const fees = Math.abs(
      parseFloat_(row['Fees'] || row['Commission'] || row['Comm/Fee'])
    );

    return {
      symbol,
      timestamp,
      action,
      quantity,
      price,
      fees,
      type: 'STOCK' as const,
      currency: (row['Currency'] || 'USD').trim(),
      brokerExecutionId: firstPopulatedColumn(row, [
        'Trade ID',
        'Execution ID',
        'Transaction ID',
      ]),
      accountNumber:
        (row['Account'] || row['Account Number'] || '').trim() || undefined,
    };
  },
};

// ──────────────────────────────────────────────
// Registry & Detection
// ──────────────────────────────────────────────

/** All broker adapters in detection priority order (specific first, generic last) */
export const BROKER_ADAPTERS: BrokerAdapter[] = [
  robinhoodAdapter,
  schwabAdapter,
  webullAdapter,
  thinkorswimAdapter,
  fidelityAdapter,
  ibkrAdapter,
  genericAdapter, // Fallback — must be last
];

/** Available broker choices for the UI dropdown */
export const SUPPORTED_BROKERS = BROKER_ADAPTERS.filter(
  (a) => a.id !== 'generic'
).map((a) => ({ id: a.id, name: a.name }));

/**
 * Auto-detect which broker a CSV is from based on its header row.
 * Returns the first matching adapter, or `genericAdapter` as fallback.
 */
export function detectBroker(headers: string[]): BrokerAdapter {
  for (const adapter of BROKER_ADAPTERS) {
    if (adapter.id === 'generic') continue; // try specific ones first
    if (adapter.detect(headers)) return adapter;
  }
  // Fallback to generic if it matches, otherwise return it anyway
  return genericAdapter;
}

/**
 * Get an adapter by broker ID.
 */
export function getAdapterById(id: string): BrokerAdapter | undefined {
  return BROKER_ADAPTERS.find((a) => a.id === id);
}

/**
 * Parse all rows through a broker adapter and return results.
 */
export function parseCSVRows(
  adapter: BrokerAdapter,
  rows: Record<string, string>[]
): { trades: ParsedTrade[]; errors: RowError[] } {
  const trades: ParsedTrade[] = [];
  const errors: RowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const trade = adapter.parse(rows[i], i);
      if (trade) {
        trades.push(trade);
      }
      // null = row intentionally skipped (non-trade row) — not an error
    } catch (err) {
      errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : 'Parse error',
        data: rows[i],
      });
    }
  }

  return { trades, errors };
}
