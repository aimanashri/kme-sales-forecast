export const downloadCSV = (filename: string, headers: string[], rows: string[]) => {
    if (rows.length === 0) return;
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
};