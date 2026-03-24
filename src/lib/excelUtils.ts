/**
 * Excel/Spreadsheet utilities using ExcelJS (secure alternative to xlsx)
 * Provides simple helper functions for reading and writing Excel files
 */
import ExcelJS from 'exceljs';

// ============= TYPES =============

export interface SheetData {
  headers: string[];
  rows: Record<string, unknown>[];
}

// ============= READ FUNCTIONS =============

/**
 * Read an Excel file from a File object
 */
export async function readExcelFile(file: File): Promise<SheetData> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return { headers: [], rows: [] };
  }

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });

  // Get data rows
  const rows: Record<string, unknown>[] = [];
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, unknown> = {};
    let hasData = false;
    
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.value;
      
      if (value !== null && value !== undefined && value !== '') {
        hasData = true;
        // Handle ExcelJS cell value types
        if (typeof value === 'object' && value !== null) {
          if ('result' in value) {
            // Formula result
            rowData[header] = value.result;
          } else if ('richText' in value) {
            // Rich text
            rowData[header] = (value.richText as Array<{text: string}>).map(rt => rt.text).join('');
          } else if ('text' in value) {
            // Hyperlink or other
            rowData[header] = value.text;
          } else {
            rowData[header] = String(value);
          }
        } else {
          rowData[header] = value;
        }
      } else {
        rowData[header] = null;
      }
    });
    
    if (hasData) {
      rows.push(rowData);
    }
  }

  return { headers, rows };
}

/**
 * Read an Excel file from binary string (for FileReader results)
 */
export async function readExcelFromBinary(binaryString: string): Promise<SheetData> {
  // Convert binary string to ArrayBuffer
  const buffer = new ArrayBuffer(binaryString.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binaryString.length; i++) {
    view[i] = binaryString.charCodeAt(i) & 0xFF;
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return { headers: [], rows: [] };
  }

  // Get headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });

  // Get rows
  const rows: Record<string, unknown>[] = [];
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, unknown> = {};
    let hasData = false;
    
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.value;
      
      if (value !== null && value !== undefined && value !== '') {
        hasData = true;
        if (typeof value === 'object' && value !== null && 'result' in value) {
          rowData[header] = value.result;
        } else {
          rowData[header] = value;
        }
      } else {
        rowData[header] = null;
      }
    });
    
    if (hasData) {
      rows.push(rowData);
    }
  }

  return { headers, rows };
}

// ============= WRITE FUNCTIONS =============

/**
 * Create and download an Excel file from data
 */
export async function writeExcelFile(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    // Empty file with no headers
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBuffer(buffer, filename);
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Add header row with styling
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Auto-size columns based on header length
  headers.forEach((header, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = Math.max(header.length + 2, 12);
  });

  // Add data rows
  data.forEach(row => {
    const values = headers.map(h => row[h] ?? '');
    worksheet.addRow(values);
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

/**
 * Create an Excel file from array of arrays (for templates)
 */
export async function writeExcelFromArrays(
  rows: unknown[][],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  rows.forEach((row, index) => {
    worksheet.addRow(row);
    if (index === 0) {
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
    }
  });

  // Auto-size columns
  if (rows.length > 0) {
    rows[0].forEach((_, colIndex) => {
      const column = worksheet.getColumn(colIndex + 1);
      let maxLength = 10;
      rows.forEach(row => {
        const cellValue = String(row[colIndex] ?? '');
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

// ============= MULTI-SHEET WRITE =============

export interface SheetDefinition {
  name: string;
  headers: string[];
  rows: unknown[][];
}

/**
 * Create and download an Excel file with multiple sheets
 */
export async function writeExcelMultiSheet(
  sheets: SheetDefinition[],
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);

    // Header row
    worksheet.addRow(sheet.headers);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Auto-size columns
    sheet.headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      let maxLength = header.length;
      sheet.rows.forEach(row => {
        const val = String(row[index] ?? '');
        if (val.length > maxLength) maxLength = val.length;
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Data rows
    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

// ============= CSV EXPORT =============

/**
 * Create and download a CSV file from data
 */
export function writeCsvFile(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) {
    downloadString('', filename, 'text/csv');
    return;
  }

  const headers = Object.keys(data[0]);
  const lines = [
    headers.map(escapeCsv).join(';'),
    ...data.map(row =>
      headers.map(h => escapeCsv(row[h])).join(';')
    ),
  ];
  downloadString(lines.join('\r\n'), filename, 'text/csv;charset=utf-8');
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============= MULTI-SHEET READ =============

/**
 * Read all sheets from an Excel file
 */
export async function readExcelFileMultiSheet(file: File): Promise<Record<string, SheetData>> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: Record<string, SheetData> = {};

  for (const worksheet of workbook.worksheets) {
    if (worksheet.rowCount === 0) continue;

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').trim();
    });

    const rows: Record<string, unknown>[] = [];
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData: Record<string, unknown> = {};
      let hasData = false;

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        const value = cell.value;
        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
          if (typeof value === 'object' && value !== null) {
            if ('result' in value) rowData[header] = value.result;
            else if ('richText' in value) rowData[header] = (value.richText as Array<{ text: string }>).map(rt => rt.text).join('');
            else if ('text' in value) rowData[header] = value.text;
            else rowData[header] = String(value);
          } else {
            rowData[header] = value;
          }
        } else {
          rowData[header] = null;
        }
      });

      if (hasData) rows.push(rowData);
    }

    result[worksheet.name] = { headers, rows };
  }

  return result;
}

// ============= HELPER FUNCTIONS =============

function downloadBuffer(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert JSON data to sheet format (compatibility helper)
 */
export function jsonToSheetData(data: Record<string, unknown>[]): { headers: string[]; values: unknown[][] } {
  if (data.length === 0) return { headers: [], values: [] };
  
  const headers = Object.keys(data[0]);
  const values = data.map(row => headers.map(h => row[h]));
  
  return { headers, values };
}
