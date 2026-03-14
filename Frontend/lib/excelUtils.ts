import ExcelJS from 'exceljs';
import { toast } from 'sonner';

/**
 * Downloads data as a formatted Excel file.
 * Supports single data array or multiple grouped tables per sheet.
 * 
 * @param payload - Array of data objects OR Array of Sheet objects { name, tables: [{title, data}] }
 * @param filename - Name of the file to download
 */
export const downloadExcel = async (payload: any[], filename: string) => {
    if (!payload || !payload.length) {
        toast.warning("No hay datos para exportar")
        return
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'LAC POS System';
    workbook.created = new Date();

    // Helper to populate a sheet with multiple tables
    const populateSheet = (sheetName: string, tables: { title?: string, data: any[] }[]) => {
        if (!tables || !tables.length) return

        // Sanitize sheet name (Excel limit 31 chars, no special chars)
        const safeName = sheetName.replace(/[\\/?*[\]]/g, ' ').substring(0, 31) || 'Sheet1';
        const worksheet = workbook.addWorksheet(safeName)

        let currentRow = 1;

        tables.forEach(table => {
            if (!table.data || !table.data.length) return;

            // Add Title if exists
            if (table.title) {
                const titleRow = worksheet.getRow(currentRow);
                titleRow.getCell(1).value = table.title;
                titleRow.getCell(1).font = { bold: true, size: 14 };
                currentRow += 1;
            }

            // Add Table properly
            const keys = Object.keys(table.data[0]);
            const columns = keys.map(key => ({
                name: key,
                filterButton: true,
            }));

            // Prepare Rows
            const rows = table.data.map(d => keys.map(key => d[key]));

            // Add the table object
            worksheet.addTable({
                name: `Table_${currentRow}_${Math.floor(Math.random() * 1000)}`,
                ref: `A${currentRow}`,
                headerRow: true,
                totalsRow: false,
                style: {
                    theme: 'TableStyleMedium2',
                    showRowStripes: true,
                },
                columns: columns,
                rows: rows,
            });

            // Adjust Column Widths & Styles (Post-addTable)
            keys.forEach((key, index) => {
                const colIndex = index + 1;
                const col = worksheet.getColumn(colIndex);
                let maxLen = key.length + 5;

                // Sample some rows for data width
                table.data.slice(0, 50).forEach(d => {
                    const val = d[key] ? d[key].toString() : '';
                    if (val.length + 2 > maxLen) maxLen = val.length + 2;
                });

                col.width = Math.min(maxLen, 60);

                // Force Header Style (Professional Black & White)
                const headerCell = worksheet.getRow(currentRow).getCell(colIndex);
                headerCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF000000' } // Pure Black
                };
                headerCell.font = {
                    bold: true,
                    color: { argb: 'FFFFFFFF' }, // White Text
                    size: 11
                };
                headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

                col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });

            currentRow += rows.length + 2; // Move below the table

            // Spacer
            currentRow += 2;
        });
    }

    // Determine Input Format & Process
    const first = payload[0] as any;

    // Case 1: Multi-Sheet Payload (Already structured as sheets)
    if (first && first.name && (first.tables || first.data)) {
        (payload as any[]).forEach(sheet => {
            // Support both 'tables' array or direct 'data' array
            const tables = sheet.tables || (sheet.data ? [{ data: sheet.data }] : []);
            populateSheet(sheet.name, tables);
        });
    }
    // Case 2: Wraps single return in an object (e.g. from server action response)
    else if (first && first.sheets) {
        (first.sheets as any[]).forEach(sheet => {
            populateSheet(sheet.name, sheet.tables);
        });
    }
    // Case 3: Flat Data Array (Legacy/Simple Export)
    else {
        populateSheet('Datos', [{ data: payload }]);
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
}
