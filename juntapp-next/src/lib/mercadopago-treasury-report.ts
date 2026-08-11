import { createHash } from 'node:crypto';

export type SettlementRow = Record<string, string>;

const TRANSFER_TYPES = new Set(['WITHDRAWAL', 'WITHDRAWAL_CANCEL', 'PAYOUT']);

function parseDelimitedLine(line: string, delimiter = ';') {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

export function parseSettlementReport(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseDelimitedLine(lines[0]).map((header) => header.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])) as SettlementRow;
  });
}

function value(row: SettlementRow, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function money(raw: string) {
  if (!raw) return 0;
  const normalized = raw.includes(',') && !raw.includes('.')
    ? raw.replace(',', '.')
    : raw.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function settlementRowToMovement(row: SettlementRow) {
  const transactionType = value(row, 'TRANSACTION_TYPE', 'TIPO_DE_TRANSACCION').toUpperCase();
  const sourceId = value(row, 'SOURCE_ID', 'ID_DE_OPERACION');
  const externalReference = value(row, 'EXTERNAL_REFERENCE', 'REFERENCIA_EXTERNA');
  const transactionDate = value(row, 'TRANSACTION_DATE', 'FECHA_DE_TRANSACCION') || new Date().toISOString();
  const grossRaw = money(value(row, 'TRANSACTION_AMOUNT', 'MONTO_DE_TRANSACCION'));
  const feeRaw = money(value(row, 'FEE_AMOUNT', 'MONTO_DE_COMISION'));
  const netRaw = money(value(row, 'SETTLEMENT_NET_AMOUNT', 'MONTO_NETO_DE_LIQUIDACION', 'REAL_AMOUNT'));
  const gross = Math.abs(grossRaw || netRaw);
  const fee = Math.abs(feeRaw);
  const net = netRaw || (grossRaw + feeRaw);
  const isTransfer = TRANSFER_TYPES.has(transactionType);
  const accountingKind = isTransfer ? 'transfer' : net > 0 ? 'income' : net < 0 ? 'expense' : 'adjustment';
  const type = net >= 0 ? 'ingreso' : 'egreso';
  const category = externalReference.startsWith('juntapp-due:')
    ? 'cuota_social'
    : isTransfer
      ? 'transferencia_interna'
      : transactionType.includes('REFUND')
        ? 'reembolso'
        : transactionType.includes('CHARGEBACK') || transactionType.includes('DISPUTE')
          ? 'contracargo'
          : 'mercadopago';
  const description = externalReference.startsWith('juntapp-due:')
    ? 'Cuota domiciliaria verificada por Mercado Pago'
    : isTransfer
      ? transactionType === 'WITHDRAWAL_CANCEL'
        ? 'Reverso de transferencia bancaria verificado por Mercado Pago'
        : 'Transferencia desde Mercado Pago hacia cuenta bancaria'
      : transactionType.includes('REFUND')
        ? 'Devolución verificada por Mercado Pago'
        : transactionType.includes('CHARGEBACK') || transactionType.includes('DISPUTE')
          ? 'Contracargo o reclamo informado por Mercado Pago'
          : net >= 0
            ? 'Ingreso verificado por Mercado Pago'
            : 'Cargo verificado por Mercado Pago';
  const eventKey = createHash('sha256').update([
    sourceId,
    transactionType,
    transactionDate,
    String(grossRaw),
    String(feeRaw),
    String(netRaw),
    externalReference,
  ].join('|')).digest('hex');

  return { sourceId, externalReference, transactionType, transactionDate, gross, fee, net, accountingKind, type, category, description, eventKey };
}
