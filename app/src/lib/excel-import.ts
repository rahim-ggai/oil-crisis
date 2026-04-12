import * as XLSX from 'xlsx';
import type { M1State, Cargo, CargoStatus } from '@/types';

// ============================================================
// DSSP Parser — Daily Stock and Supply Position
// ============================================================

export interface DSSPResult {
  m1: Partial<M1State>;
  date: string;
  source: string;
}

/**
 * Parse an OCAC DSSP Excel file to extract M1 inventory data.
 * Looks for known sheet names and scans for labeled stock/consumption values.
 */
export function parseDSSP(workbook: XLSX.WorkBook): DSSPResult {
  const result: DSSPResult = {
    m1: {},
    date: '',
    source: 'OCAC DSSP Import',
  };

  // Try to extract date from the SUMMARY sheet
  const summarySheet = findSheet(workbook, ['SUMMARY', 'Summary', 'STOCK POSITION']);
  if (summarySheet) {
    const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as unknown[][];

    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      if (row) {
        for (const cell of row) {
          if (typeof cell === 'string' && cell.match(/stock.*date|as\s+on|position.*as/i)) {
            // Look for a date in adjacent cells
            for (const c2 of row) {
              if (c2 instanceof Date) {
                result.date = c2.toISOString().split('T')[0];
              } else if (typeof c2 === 'string' && c2.match(/\d{2}[-/]\w+[-/]\d{2,4}/)) {
                result.date = c2;
              }
            }
          }
        }
      }
    }
  }

  // Parse HSD sheet for stock and daily sales
  const hsdSheet = findSheet(workbook, ['HSD', 'hsd']);
  if (hsdSheet) {
    const parsed = extractStockAndDailySales(hsdSheet);
    if (parsed.totalStock > 0) result.m1.hsdStock = Math.round(parsed.totalStock);
    if (parsed.avgDailySales > 0) result.m1.hsdDailyConsumption = Math.round(parsed.avgDailySales);
  }

  // Parse MS sheet
  const msSheet = findSheet(workbook, ['MS', 'ms', 'MOGAS']);
  if (msSheet) {
    const parsed = extractStockAndDailySales(msSheet);
    if (parsed.totalStock > 0) result.m1.msStock = Math.round(parsed.totalStock);
    if (parsed.avgDailySales > 0) result.m1.msDailyConsumption = Math.round(parsed.avgDailySales);
  }

  // Parse SUMMARY for FO, JP-1, Crude
  if (summarySheet) {
    const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as unknown[][];
    const fo = extractSummaryValue(data, ['HSFO', 'LSFO', 'RFO']);
    if (fo.stock > 0) result.m1.foStock = Math.round(fo.stock);
    if (fo.dailySales > 0) result.m1.foDailyConsumption = Math.round(fo.dailySales);

    const jp1 = extractSummaryValue(data, ['JP-1', 'JP1']);
    if (jp1.stock > 0) result.m1.jp1Stock = Math.round(jp1.stock);
  }

  // Parse Refinery Stocks for crude oil
  const refSheet = findSheet(workbook, ['Refinery Stocks', 'REFINERY', 'Refinery']);
  if (refSheet) {
    const data = XLSX.utils.sheet_to_json(refSheet, { header: 1 }) as unknown[][];
    const crude = extractCrudeOilStock(data);
    if (crude > 0) {
      // Convert MT to barrels (1 MT crude ≈ 7.33 barrels)
      result.m1.crudeOilStock = Math.round(crude * 7.33);
    }
  }

  return result;
}

// ============================================================
// Tanker Plan Parser — Seaborne Supply Pipeline
// ============================================================

export interface TankerPlanResult {
  cargoes: Cargo[];
  month: string;
  source: string;
}

/**
 * Parse a Tanker Plan Excel file to extract M2 cargo data.
 * Looks for the most recent monthly sheet and extracts vessel records.
 */
export function parseTankerPlan(workbook: XLSX.WorkBook): TankerPlanResult {
  const result: TankerPlanResult = {
    cargoes: [],
    month: '',
    source: 'Ministry Tanker Plan Import',
  };

  // Find the most recent monthly sheet (prefer Apr 26, then latest available)
  const monthSheets = workbook.SheetNames.filter((n) =>
    n.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*2[56]/i)
  );

  const targetSheet = monthSheets.find((n) => n.match(/Apr\s*26/i))
    || monthSheets[monthSheets.length - 1];

  if (!targetSheet) return result;

  result.month = targetSheet;
  const ws = workbook.Sheets[targetSheet];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  // Find header row (look for "Vessel Name" or "Sr No")
  let headerRow = -1;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i];
    if (row) {
      const rowStr = row.map(String).join(' ').toLowerCase();
      if (rowStr.includes('vessel') && (rowStr.includes('name') || rowStr.includes('sr'))) {
        headerRow = i;
        break;
      }
    }
  }

  if (headerRow < 0) headerRow = 6; // Default: row 7 (0-indexed = 6)

  // Parse vessel records starting after headers
  let cargoId = 1;
  let currentVessel = '';

  for (let i = headerRow + 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

    // Column mapping (approximate — DSSP uses: A=Sr, B=Importer, C=Supplier, D=Vessel, E=Status, etc.)
    const srNo = row[0];
    const importer = String(row[1] || '');
    const supplier = String(row[2] || '');
    const vesselName = String(row[3] || '');
    const status = String(row[4] || '');
    const agent = String(row[5] || '');
    const productInfo = String(row[8] || '');

    // ETA date — column U (index 20)
    const etaRaw = row[20];

    // BL Quantity — column AC (index 28)
    const blQty = parseFloat(String(row[28] || '0')) || 0;

    // Load port — column AP (index 41)
    const loadPort = String(row[41] || row[39] || '');

    // Planned quantities — columns J-Q (indices 9-16)
    const hsdQty = parseFloat(String(row[9] || '0')) || 0;
    const mogasQty = parseFloat(String(row[10] || '0')) || 0;
    const mogas95Qty = parseFloat(String(row[11] || '0')) || 0;
    const lsfoQty = parseFloat(String(row[12] || '0')) || 0;
    const hsfoQty = parseFloat(String(row[13] || '0')) || 0;

    // Use vessel name from this row or carry forward
    const vessel = vesselName || currentVessel;
    if (vesselName) currentVessel = vesselName;

    // Skip rows with no meaningful data
    const totalQty = blQty || hsdQty || mogasQty || mogas95Qty || lsfoQty || hsfoQty;
    if (!vessel || totalQty === 0) continue;

    // Determine product
    let product = 'Mixed';
    if (hsdQty > 0) product = 'HSD';
    else if (mogasQty > 0 || mogas95Qty > 0) product = 'MOGAS';
    else if (hsfoQty > 0) product = 'HSFO';
    else if (lsfoQty > 0) product = 'LSFO';
    else if (productInfo) product = productInfo.split(/[,\s]/)[0] || 'Mixed';

    const quantityTonnes = blQty || totalQty;
    // Convert tonnes to barrels (rough: HSD ~7.46, MOGAS ~8.5, FO ~6.35 bbl/MT)
    const bblPerMT = product === 'HSD' ? 7.46 : product === 'MOGAS' ? 8.5 : 6.35;
    const quantityBarrels = Math.round(quantityTonnes * bblPerMT);

    // Map status
    const cargoStatus = mapTankerStatus(status, loadPort);

    // Parse ETA
    let eta = '';
    if (etaRaw instanceof Date) {
      eta = etaRaw.toISOString().split('T')[0];
    } else if (typeof etaRaw === 'number') {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(etaRaw);
      eta = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } else if (typeof etaRaw === 'string') {
      eta = etaRaw;
    }
    if (!eta) eta = '2026-04-30'; // fallback

    // Default loss probability based on status
    const lossProb = cargoStatus === 'docked' ? 0.02
      : cargoStatus === 'in_war_zone' ? 0.35
      : cargoStatus === 'outside_war_zone' ? 0.05
      : 0.15;

    result.cargoes.push({
      id: `tp-${cargoId++}`,
      vesselName: vessel,
      imoNumber: '', // Not in tanker plan
      product,
      quantityBarrels,
      quantityTonnes: Math.round(quantityTonnes),
      loadingPort: loadPort || 'Unknown',
      eta,
      insurer: agent || 'Unknown',
      flagState: 'Unknown',
      status: cargoStatus,
      lossProbability: lossProb,
    });
  }

  // Deduplicate by vessel name (keep the one with largest quantity)
  const byVessel = new Map<string, Cargo>();
  for (const c of result.cargoes) {
    const existing = byVessel.get(c.vesselName);
    if (!existing || c.quantityBarrels > existing.quantityBarrels) {
      byVessel.set(c.vesselName, c);
    }
  }
  result.cargoes = Array.from(byVessel.values());

  return result;
}

// ============================================================
// Helper: read file as XLSX workbook
// ============================================================
export async function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

// ============================================================
// Internal helpers
// ============================================================

function findSheet(wb: XLSX.WorkBook, names: string[]): XLSX.WorkSheet | null {
  for (const name of names) {
    // Exact match
    if (wb.Sheets[name]) return wb.Sheets[name];
    // Case-insensitive partial match
    const found = wb.SheetNames.find((s) => s.toLowerCase().includes(name.toLowerCase()));
    if (found) return wb.Sheets[found];
  }
  return null;
}

function extractStockAndDailySales(ws: XLSX.WorkSheet): { totalStock: number; avgDailySales: number } {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  let totalStock = 0;
  let avgDailySales = 0;

  for (const row of data) {
    if (!row) continue;
    const label = String(row[0] || '').toLowerCase();

    // Look for total stock row
    if (label.includes('total') && (label.includes('stock') || label.includes('current'))) {
      for (let j = 1; j < row.length; j++) {
        const val = parseFloat(String(row[j] || ''));
        if (val > 10_000 && val < 10_000_000) {
          totalStock = val;
          break;
        }
      }
    }

    // Look for average daily sales
    if (label.includes('average') && label.includes('daily')) {
      for (let j = 1; j < row.length; j++) {
        const val = parseFloat(String(row[j] || ''));
        if (val > 100 && val < 500_000) {
          avgDailySales = val;
          break;
        }
      }
    }
  }

  return { totalStock, avgDailySales };
}

function extractSummaryValue(data: unknown[][], productLabels: string[]): { stock: number; dailySales: number } {
  let stock = 0;
  let dailySales = 0;

  for (const row of data) {
    if (!row) continue;
    const label = String(row[0] || '').toUpperCase();
    if (productLabels.some((p) => label.includes(p))) {
      // Look for numeric values in subsequent columns
      for (let j = 1; j < Math.min((row as unknown[]).length, 15); j++) {
        const val = parseFloat(String(row[j] || ''));
        if (val > 1000 && stock === 0) {
          stock += val; // Accumulate for combined FO types
        }
      }
    }
  }

  // For FO: if we have stock, estimate daily from days cover (84 days typical)
  if (stock > 0 && dailySales === 0) {
    dailySales = Math.round(stock / 84);
  }

  return { stock, dailySales };
}

function extractCrudeOilStock(data: unknown[][]): number {
  for (const row of data) {
    if (!row) continue;
    const label = String(row[0] || '').toLowerCase();
    if (label.includes('crude') && (label.includes('total') || label.includes('oil'))) {
      for (let j = 1; j < Math.min((row as unknown[]).length, 20); j++) {
        const val = parseFloat(String(row[j] || ''));
        if (val > 50_000 && val < 5_000_000) return val;
      }
    }
  }
  // Fallback: sum refinery crude stocks
  let total = 0;
  let inCrudeSection = false;
  for (const row of data) {
    if (!row) continue;
    const label = String(row[0] || '').toLowerCase();
    if (label.includes('crude')) inCrudeSection = true;
    if (inCrudeSection && label.includes('total')) {
      for (let j = 1; j < Math.min((row as unknown[]).length, 20); j++) {
        const val = parseFloat(String(row[j] || ''));
        if (val > 50_000) return val;
      }
    }
    if (inCrudeSection && label === '') inCrudeSection = false;
  }
  return total;
}

const ME_PORTS = ['jeddah', 'jizan', 'ras tanura', 'jubail', 'fujairah', 'bandar abbas',
  'kharg', 'basra', 'mina', 'muscat', 'sohar', 'yanbu', 'shuaiba', 'aden'];

function mapTankerStatus(status: string, loadPort: string): CargoStatus {
  const s = status.toLowerCase();
  if (s.includes('sailed') || s.includes('discharged') || s.includes('at berth') || s.includes('loading completed')) {
    return 'docked';
  }
  if (s.includes('outer anchorage') || s.includes('on schedule')) {
    // Check if coming from Middle East
    const portLower = loadPort.toLowerCase();
    if (ME_PORTS.some((p) => portLower.includes(p))) {
      return 'in_war_zone';
    }
    return 'outside_war_zone';
  }
  if (s.includes('off schedule') || s.includes('eta')) {
    const portLower = loadPort.toLowerCase();
    if (ME_PORTS.some((p) => portLower.includes(p))) {
      return 'in_war_zone';
    }
    return 'contracted_not_dispatched';
  }
  return 'outside_war_zone';
}
