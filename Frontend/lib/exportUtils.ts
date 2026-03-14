
/**
 * Converts an array of objects to CSV and triggers download.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 */
export const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Extract headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                let val = row[fieldName];
                // Handle strings with commas or newlines
                if (typeof val === 'string') {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',')
        )
    ].join('\n');

    // Create Blob and Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
