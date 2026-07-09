import { checkDuplicate } from "../lead/duplicate";
import type {
  ImportResult,
  ProcessedLeadRow,
  DuplicateQueueItem,
  ImportRowError,
} from "../types";

// Raw row from Excel/CSV — all strings, all optional except rowIndex
export type ExcelRow = {
  rowIndex: number;
  // Godigitify field set
  name?: string;
  phone?: string;
  altPhone?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  email?: string;
  industry?: string;
  city?: string;
  leadPriority?: string;
  dealSizeEstimate?: string;
  remarks?: string;
  source?: string;
  // Legacy columns from old imports — tolerated, silently ignored
  // studentName, fatherName, email (kept above), dateOfBirth,
  // gender, maritalStatus, qualification, etc.
  [key: string]: unknown;
};

type ExistingLeadForCheck = {
  id: string;
  phone: string;
  email: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  status: any;
  isDuplicate: boolean;
  duplicateOfId: string | null;
};

// ─────────────────────────────────────────
// Process Excel rows against existing leads
//
// Clean leads   → returned as ProcessedLeadRow[]
// Duplicates    → returned as DuplicateQueueItem[]
// Invalid rows  → returned as ImportRowError[]
//
// API layer creates DB records for clean leads.
// API layer creates DuplicateQueue records for duplicates.
// Unknown columns (e.g. legacy "email", "studentName") are silently ignored.
// ─────────────────────────────────────────
// Spreadsheet URLs often arrive without a protocol (e.g. "business.com"),
// which later renders as a broken relative link in the UI instead of an
// external site.
function normalizeUrl(url: string | null): string | null {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function processImportRows(
  rows: ExcelRow[],
  existingLeads: ExistingLeadForCheck[],
): ImportResult {
  const imported: ProcessedLeadRow[] = [];
  const duplicateQueue: DuplicateQueueItem[] = [];
  const errors: ImportRowError[] = [];

  for (const row of rows) {
    // Phone is the only hard-required field
    if (!row.phone?.trim()) {
      errors.push({
        rowIndex: row.rowIndex,
        reason: "Phone number is required",
      });
      continue;
    }

    const processedRow: ProcessedLeadRow = {
      rowIndex: row.rowIndex,
      name: row.name?.trim() ?? null,
      phone: row.phone.trim(),
      altPhone: row.altPhone?.trim() ?? null,
      instagramUrl: normalizeUrl(row.instagramUrl?.trim() ?? null),
      websiteUrl: normalizeUrl(row.websiteUrl?.trim() ?? null),
      email: row.email?.trim() ?? null,
      industry: row.industry?.trim() ?? null,
      city: row.city?.trim() ?? null,
      leadPriority: row.leadPriority?.trim() ?? null,
      dealSizeEstimate: row.dealSizeEstimate?.trim() ?? null,
      remarks: row.remarks?.trim() ?? null,
      source: row.source?.trim() ?? null,
    };

    // Check for duplicates against existing DB leads
    // Also check against already-processed rows in this batch
    const alreadyProcessed = imported.map((r) => ({
      id: `import-${r.rowIndex}`,
      phone: r.phone,
      email: r.email,
      instagramUrl: r.instagramUrl,
      websiteUrl: r.websiteUrl,
      status: "NEW" as any,
      isDuplicate: false,
      duplicateOfId: null,
    }));

    const allLeads = [...existingLeads, ...alreadyProcessed];
    const duplicateCheck = checkDuplicate(
      {
        phone: processedRow.phone,
        email: processedRow.email,
        instagramUrl: processedRow.instagramUrl,
        websiteUrl: processedRow.websiteUrl,
      },
      allLeads,
    );

    if (duplicateCheck.isDuplicate) {
      duplicateQueue.push({
        rowIndex: row.rowIndex,
        rowData: processedRow,
        matchType: duplicateCheck.matchType,
        existingLeadId: duplicateCheck.existingLeadId,
        originalLeadId: duplicateCheck.originalLeadId,
      });
      continue;
    }

    imported.push(processedRow);
  }

  return { imported, duplicateQueue, errors };
}
