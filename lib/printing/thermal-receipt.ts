export type ThermalPaperWidth = 58 | 80;

export type ThermalReceiptItem = {
  description: string;
  quantity: string;
  amount: string;
  details?: string[];
};

export type ThermalReceiptRow = { label: string; amount: string };

export type ThermalReceiptModel = {
  version: 1;
  businessName: string;
  logoUrl?: string;
  contactLines: string[];
  title: string;
  metadata: string[];
  items: ThermalReceiptItem[];
  totals: ThermalReceiptRow[];
  total: ThermalReceiptRow;
  itemCountLabel: string;
  paymentLines: string[];
  notices?: string[];
  qrCodes?: Array<{ value: string; label: string }>;
  footer: string;
  transactionId: string;
};

export const THERMAL_RECEIPT_DATA_ATTRIBUTE = 'data-thermal-receipt';

export function encodeThermalReceiptModel(model: ThermalReceiptModel) {
  return encodeURIComponent(JSON.stringify(model));
}

export function decodeThermalReceiptModel(value: string) {
  const parsed = JSON.parse(decodeURIComponent(value)) as ThermalReceiptModel;
  if (parsed.version !== 1 || !Array.isArray(parsed.items))
    throw new Error('Unsupported thermal receipt data');
  return parsed;
}

export function thermalColumns(width: ThermalPaperWidth) {
  return width === 58 ? 32 : 48;
}

/** ESC/POS text is deliberately reduced to printable ASCII (PC437-safe). */
export function thermalText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wrapThermalText(value: string, width: number) {
  const text = thermalText(value);
  if (!text) return [''];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > width) {
    let split = remaining.lastIndexOf(' ', width);
    if (split < Math.floor(width / 2)) split = width;
    lines.push(remaining.slice(0, split).trimEnd());
    remaining = remaining.slice(split).trimStart();
  }
  lines.push(remaining);
  return lines;
}

export function receiptItemLines(
  item: ThermalReceiptItem,
  paperWidth: ThermalPaperWidth
) {
  const columns = thermalColumns(paperWidth);
  const quantityWidth = paperWidth === 58 ? 3 : 5;
  const amountWidth = paperWidth === 58 ? 12 : 14;
  const descriptionWidth = columns - quantityWidth - amountWidth - 2;
  const descriptions = wrapThermalText(item.description, descriptionWidth);
  const lines = descriptions.map((description, index) =>
    `${description.padEnd(descriptionWidth)} ${index === 0 ? thermalText(item.quantity).slice(0, quantityWidth).padStart(quantityWidth) : ' '.repeat(quantityWidth)} ${index === 0 ? thermalText(item.amount).slice(-amountWidth).padStart(amountWidth) : ' '.repeat(amountWidth)}`
  );
  for (const detail of item.details ?? [])
    for (const line of wrapThermalText(detail, columns - 2))
      lines.push(`  ${line}`);
  return lines;
}

export function receiptValueLines(
  row: ThermalReceiptRow,
  paperWidth: ThermalPaperWidth
) {
  const columns = thermalColumns(paperWidth);
  const amount = thermalText(row.amount);
  const maxLabel = Math.max(1, columns - amount.length - 1);
  const labels = wrapThermalText(row.label, maxLabel);
  return labels.map((label, index) =>
    index === labels.length - 1
      ? `${label}${' '.repeat(Math.max(1, columns - label.length - amount.length))}${amount}`
      : label
  );
}

function asciiBytes(value: string) {
  return Array.from(thermalText(value), (character) => character.charCodeAt(0));
}

function rawAsciiBytes(value: string) {
  return Array.from(value, (character) => character.charCodeAt(0));
}

function center(value: string, columns: number) {
  return value.length >= columns
    ? value
    : `${' '.repeat(Math.floor((columns - value.length) / 2))}${value}`;
}

function qrCommands(value: string, moduleSize: number) {
  const data = asciiBytes(value).slice(0, 7000);
  const storeLength = data.length + 3;
  return [
    0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize,
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
    0x1d, 0x28, 0x6b, storeLength & 0xff, storeLength >> 8, 0x31, 0x50, 0x30,
    ...data,
    0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
  ];
}

export type MonochromeRaster = { width: number; height: number; bytes: Uint8Array };

export function buildEscPosReceipt(
  model: ThermalReceiptModel,
  paperWidth: ThermalPaperWidth,
  logo?: MonochromeRaster
) {
  const columns = thermalColumns(paperWidth);
  const bytes: number[] = [0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x4d, 0x00];
  const command = (...values: number[]) => bytes.push(...values);
  const line = (value = '') => bytes.push(...rawAsciiBytes(value), 0x0a);
  const centeredLines = (value: string) => {
    for (const wrapped of wrapThermalText(value, columns)) line(center(wrapped, columns));
  };
  const divider = () => line('-'.repeat(columns));
  const bold = (enabled: boolean) => command(0x1b, 0x45, enabled ? 1 : 0);

  command(0x1b, 0x61, 1);
  if (logo) {
    const widthBytes = Math.ceil(logo.width / 8);
    command(0x1d, 0x76, 0x30, 0x00, widthBytes & 0xff, widthBytes >> 8, logo.height & 0xff, logo.height >> 8);
    command(...logo.bytes);
    line();
  }
  bold(true);
  centeredLines(model.businessName.toUpperCase());
  bold(false);
  for (const contact of model.contactLines) centeredLines(contact);
  line();
  divider();
  bold(true);
  centeredLines(model.title.toUpperCase());
  bold(false);
  for (const metadata of model.metadata) centeredLines(metadata);
  divider();

  command(0x1b, 0x61, 0);
  bold(true);
  line(
    `${'DESCRIPTION'.padEnd(columns - (paperWidth === 58 ? 17 : 21))} ${'QTY'.padStart(paperWidth === 58 ? 3 : 5)} ${'AMOUNT'.padStart(paperWidth === 58 ? 12 : 14)}`
  );
  bold(false);
  for (const item of model.items) {
    for (const itemLine of receiptItemLines(item, paperWidth)) line(itemLine);
  }
  divider();
  for (const row of model.totals)
    for (const valueLine of receiptValueLines(row, paperWidth)) line(valueLine);
  bold(true);
  command(0x1b, 0x2d, 1);
  for (const totalLine of receiptValueLines(model.total, paperWidth)) line(totalLine);
  command(0x1b, 0x2d, 0);
  bold(false);
  divider();

  command(0x1b, 0x61, 1);
  bold(true);
  centeredLines(model.itemCountLabel.toUpperCase());
  bold(false);
  if (model.paymentLines.length) {
    line();
    for (const paymentLine of model.paymentLines) centeredLines(paymentLine);
  }
  for (const notice of model.notices ?? []) {
    line();
    bold(true);
    centeredLines(notice);
    bold(false);
  }
  for (const qr of model.qrCodes ?? []) {
    line();
    command(...qrCommands(qr.value, paperWidth === 58 ? 4 : 5));
    line();
    centeredLines(qr.label);
  }
  line();
  divider();
  bold(true);
  centeredLines(model.footer);
  bold(false);
  centeredLines(`Transaction: ${model.transactionId}`);
  command(0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x41, 0x03);
  return Uint8Array.from(bytes);
}

