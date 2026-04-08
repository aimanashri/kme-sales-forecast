import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Settings2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const USD_TO_AED_RATE = 3.67; 

const getNextMonthString = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

interface VisibleCols {
    bpName: boolean;
    category: boolean;
    group: boolean;
    itemCode: boolean;
    description: boolean;
    brand: boolean;
    cogs_price: boolean;
    cogs_currency: boolean;
    avg12m: boolean;
    avg6m: boolean;  
    avg3m: boolean   
}

type SortColumn = 'salesPerson' | 'bpName';
type SortDirection = 'asc' | 'desc';

export default function SummaryByBP({ dbLobs, dbProducts, dbPricing, dbEntries, searchTerm, user }: any) {
  const itemsPerPage = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(getNextMonthString());
  
  // sorting state
  const [sortConfig, setSortConfig] = useState<{ key: SortColumn, direction: SortDirection }>({ key: 'bpName', direction: 'asc' });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  
  const defaultVisibleCols: VisibleCols = {
      bpName: true, category: false, group: false, itemCode: false, description: false, brand: false,
      cogs_price: false, cogs_currency: false, avg12m: false, avg6m: false, avg3m: false   
  };

  const [visibleCols, setVisibleCols] = useState<VisibleCols>(() => {
      const saved = localStorage.getItem('kmePlannerBPColumnPrefs');
      return saved ? JSON.parse(saved) : defaultVisibleCols;
  });

  useEffect(() => {
      localStorage.setItem('kmePlannerBPColumnPrefs', JSON.stringify(visibleCols));
  }, [visibleCols]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsColumnMenuOpen(false);
      };
      if (isColumnMenuOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  const toggleColumn = (colName: keyof VisibleCols) => {
      setVisibleCols((prev: VisibleCols) => ({ ...prev, [colName]: !prev[colName] }));
  };

  const handleSort = (key: SortColumn) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const bpSummaryData = useMemo(() => {
      const monthEntries = dbEntries.filter((e: any) => e.planning_month === monthFilter && Number(e.planned_quantity) > 0);

      let activeData = monthEntries.map((entry: any) => {
          const prod = dbProducts.find((p: any) => p.product_id === entry.product_id) || {};
          const lob = dbLobs.find((l: any) => l.lob_id === entry.lob_id) || {};
          const basePrice = dbPricing.find((p: any) => p.product_id === entry.product_id && (p.lob_id === entry.lob_id || p.lob_id === null));

          return {
              ...prod,
              unique_key: `${entry.lob_id}-${entry.product_id}`,
              lob_name: lob.sold_to_bp_name || '-',
              lob_code: lob.sold_to_bp || '-',
              sales_rep_name: lob.sales_rep_name || lob.sales_representative_no || '-',
              forecast_qty: Number(entry.planned_quantity),
              ln_price: basePrice ? Number(basePrice.price) : null
          };
      });

      if (debouncedSearchTerm) {
          const lower = debouncedSearchTerm.toLowerCase();
          activeData = activeData.filter((item: any) => 
              (item.lob_name || '').toLowerCase().includes(lower) ||
              (item.lob_code || '').toLowerCase().includes(lower) ||
              (item.product_model || '').toLowerCase().includes(lower) ||
              (item.item_code || '').toLowerCase().includes(lower) ||
              (item.item_description || '').toLowerCase().includes(lower) ||
              (item.product_category || '').toLowerCase().includes(lower) ||
              (item.product_line || '').toLowerCase().includes(lower) ||
              (item.brand || '').toLowerCase().includes(lower) ||
              (item.sales_rep_name || '').toLowerCase().includes(lower)
          );
      }

      // --- dynamic sorting logic
      activeData.sort((a: any, b: any) => {
          const dir = sortConfig.direction === 'asc' ? 1 : -1;

          if (sortConfig.key === 'salesPerson') {
              const salesCompare = (a.sales_rep_name || '').localeCompare(b.sales_rep_name || '');
              if (salesCompare !== 0) return salesCompare * dir;
              
              // fallback to group  by BP Name if Sales Persons match
              const bpCompare = (a.lob_name || '').localeCompare(b.lob_name || '');
              if (bpCompare !== 0) return bpCompare; 
          } else {
              const bpCompare = (a.lob_name || '').localeCompare(b.lob_name || '');
              if (bpCompare !== 0) return bpCompare * dir;
          }

          // final fallback to product model
          return (a.product_model || '').localeCompare(b.product_model || '');
      });

      return activeData;
  }, [dbEntries, monthFilter, dbProducts, dbLobs, dbPricing, debouncedSearchTerm, sortConfig]);

  useEffect(() => setCurrentPage(1), [debouncedSearchTerm, sortConfig]);

  const totalPages = Math.ceil(bpSummaryData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return bpSummaryData.slice(startIndex, startIndex + itemsPerPage);
  }, [bpSummaryData, currentPage]);

  const exportToCSV = () => {
    if (bpSummaryData.length === 0) return;

    const headers = [
        'No', 'Sales Person', 'BP Name', 'BP Code', 'Product Category', 'Product Line', 'Product Group', 
        'Product Model', 'Item Code', 'Item Description', 'Brand', 'LN Price (AED)', 
        'COGS Price', 'COGS Currency', 'KMI On Hand', 'KME On Hand', 'Total On Hand', 
        '12M Avg (Sales)', '6M Avg (Sales)', '3M Avg (Sales)', 'Forecast Qty'
    ];

    const rows = bpSummaryData.map((item: any, index: number) => {
        const safeDescription = item.item_description ? `"${item.item_description.replace(/"/g, '""')}"` : '""';

        return [
            index + 1,
            `"${item.sales_rep_name}"`, 
            `"${item.lob_name}"`,
            `"${item.lob_code}"`,
            `"${item.product_category || '-'}"`,
            `"${item.product_line || '-'}"`,
            `"${item.item_group || '-'}"`,
            `"${item.product_model || '-'}"`,
            `"${item.item_code || '-'}"`,
            safeDescription,
            `"${item.brand || '-'}"`,
            item.ln_price !== null ? item.ln_price.toFixed(2) : '#N/A',
            item.cogs_price ? Number(item.cogs_price).toFixed(2) : '#N/A',
            item.cogs_currency || '-',
            item.kmi_qty || item.kmmi_qty || 0,
            item.kme_qty || 0,
            item.total_qty || 0,
            Number(item.avg_12m_sales || 0).toFixed(1),
            Number(item.avg_6m_sales || 0).toFixed(1),
            Number(item.avg_3m_sales || 0).toFixed(1),
            item.forecast_qty
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Summary_by_BP_${monthFilter}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const activeColCount = 9 + Object.values(visibleCols).filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px] animate-in fade-in duration-300">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Summary By Business Partner</h3>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Forecast View:</span>
                <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border-none text-xs font-black text-blue-600 focus:ring-0 cursor-pointer p-0 h-6" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-bold bg-slate-200 px-3 py-1.5 rounded-full">
                  {bpSummaryData.length} Items Found
              </div>
              
              <div className="relative" ref={dropdownRef}>
                  <button 
                      onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                      className={`flex items-center gap-2 text-xs font-bold border px-3 py-1.5 rounded-lg transition-colors shadow-sm ${isColumnMenuOpen ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  >
                      <Settings2 size={14} /> Columns
                  </button>
                  
                  {isColumnMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-50 animate-in slide-in-from-top-2 max-h-96 overflow-y-auto custom-scrollbar">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 pb-2 border-b border-slate-100">Toggle View</div>
                          <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.bpName} onChange={() => toggleColumn('bpName')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  BP Name
                              </label>
                              <div className="border-t border-slate-100 my-1 pt-1"></div>

                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.category} onChange={() => toggleColumn('category')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Product Category
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.group} onChange={() => toggleColumn('group')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Product Group
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.itemCode} onChange={() => toggleColumn('itemCode')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Item Code
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.description} onChange={() => toggleColumn('description')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Item Description
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.brand} onChange={() => toggleColumn('brand')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Brand
                              </label>
                              <div className="border-t border-slate-100 my-1 pt-1"></div>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-rose-600">
                                  <input type="checkbox" checked={visibleCols.cogs_price} onChange={() => toggleColumn('cogs_price')} className="rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                                  COGS Price
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-rose-600">
                                  <input type="checkbox" checked={visibleCols.cogs_currency} onChange={() => toggleColumn('cogs_currency')} className="rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                                  COGS Currency
                              </label>
                              <div className="border-t border-slate-100 my-1 pt-1"></div>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.avg12m} onChange={() => toggleColumn('avg12m')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  12M Avg (Sales)
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.avg6m} onChange={() => toggleColumn('avg6m')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  6M Avg (Sales)
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.avg3m} onChange={() => toggleColumn('avg3m')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  3M Avg (Sales)
                              </label>
                          </div>
                      </div>
                  )}
              </div>

              <button 
                  onClick={exportToCSV}
                  disabled={bpSummaryData.length === 0}
                  className="flex items-center gap-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                  <Download size={14} /> Export CSV
              </button>
          </div>
        </div>
        <div className="overflow-auto flex-1">
            <table className="w-full text-[12px] text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-center">No</th>
                        
                        {/* sortable headers*/}
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold hover:bg-[#cde4bf] transition-colors cursor-pointer group" onClick={() => handleSort('salesPerson')}>
                            <div className="flex items-center justify-between gap-2">
                                Sales Person
                                {sortConfig.key === 'salesPerson' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>) : <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100" />}
                            </div>
                        </th>
                        
                        {visibleCols.bpName && (
                            <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold hover:bg-[#cde4bf] transition-colors cursor-pointer group" onClick={() => handleSort('bpName')}>
                                <div className="flex items-center justify-between gap-2">
                                    BP Name
                                    {sortConfig.key === 'bpName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>) : <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100" />}
                                </div>
                            </th>
                        )}
                        
                        {visibleCols.category && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Product Category</th>}
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Product Line</th>
                        {visibleCols.group && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Product Group</th>}
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Product Model</th>
                        
                        {visibleCols.itemCode && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Item Code</th>}
                        {visibleCols.description && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Item Description</th>}
                        {visibleCols.brand && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold">Brand</th>}
                        
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-right">LN Price (AED)</th>
                        
                        {visibleCols.cogs_price && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-right">COGS Price</th>}
                        {visibleCols.cogs_currency && <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-center">COGS Currency</th>}
                        
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-center">KMI On Hand</th>
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-center">KME On Hand</th>
                        <th className="border border-slate-300 bg-[#e2f0d9] px-3 py-2 text-slate-800 font-bold text-center">Total On Hand</th>
                        
                        {visibleCols.avg12m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">12M Avg (Sales)</th>}
                        {visibleCols.avg6m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">6M Avg (Sales)</th>}
                        {visibleCols.avg3m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">3M Avg (Sales)</th>}
                        
                        <th className="border border-slate-300 bg-blue-600 px-3 py-2 text-white font-bold text-center shadow-lg">Forecast Qty</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item: any, idx: number) => {
                        const actualIdx = ((currentPage - 1) * itemsPerPage) + idx + 1;
                        const isCogsUsd = (item.cogs_currency || '').toUpperCase() === 'USD';
                        const cogsPriceAed = isCogsUsd && item.cogs_price ? (Number(item.cogs_price) * USD_TO_AED_RATE).toFixed(2) : null;

                        const isFirstOfBP = idx === 0 || item.lob_code !== paginatedData[idx - 1].lob_code;
                        
                        let bpRowSpan = 1;
                        if (isFirstOfBP) {
                            for (let i = idx + 1; i < paginatedData.length; i++) {
                                if (paginatedData[i].lob_code === item.lob_code) {
                                    bpRowSpan++;
                                } else {
                                    break;
                                }
                            }
                        }

                        return (
                            <tr key={item.unique_key} className="hover:bg-slate-50 transition-colors">
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">{actualIdx}</td>
                                
                                {isFirstOfBP && (
                                    <td rowSpan={bpRowSpan} className="border border-slate-200 px-3 py-2 text-slate-800 font-bold whitespace-nowrap align-top bg-white/50">
                                        {item.sales_rep_name}
                                    </td>
                                )}
                                
                                {visibleCols.bpName && isFirstOfBP && (
                                    <td rowSpan={bpRowSpan} className="border border-slate-200 px-3 py-2 text-blue-700 font-bold align-top max-w-[200px] whitespace-normal leading-relaxed bg-white/50" title={item.lob_name}>
                                        {item.lob_name}
                                    </td>
                                )}
                                
                                {visibleCols.category && <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.product_category}</td>}
                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.product_line}</td>
                                {visibleCols.group && <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.item_group}</td>}
                                <td className="border border-slate-200 px-3 py-2 text-slate-800 font-bold">{item.product_model}</td>
                                
                                {visibleCols.itemCode && <td className="border border-slate-200 px-3 py-2 text-slate-500 font-mono text-[10px]">{item.item_code}</td>}
                                {visibleCols.description && <td className="border border-slate-200 px-3 py-2 text-slate-600 truncate max-w-xs">{item.item_description}</td>}
                                {visibleCols.brand && <td className="border border-slate-200 px-3 py-2 text-slate-700 font-medium">{item.brand}</td>}
                                
                                <td className={`border border-slate-200 px-3 py-2 text-right font-black tracking-wider ${item.ln_price !== null ? 'text-emerald-600' : 'text-slate-300 italic'}`}>{item.ln_price !== null ? item.ln_price.toFixed(2) : '#N/A'}</td>
                                
                                {visibleCols.cogs_price && (
                                    <td className={`border border-slate-200 px-3 py-2 text-right font-black tracking-wider ${item.cogs_price ? 'text-rose-600' : 'text-slate-300 italic'}`}>
                                        {item.cogs_price ? (
                                            <div className="flex flex-col items-end">
                                                <span>{Number(item.cogs_price).toFixed(2)}</span>
                                                {isCogsUsd && <span className="text-[9px] text-slate-400 font-medium">(AED {cogsPriceAed})</span>}
                                            </div>
                                        ) : '#N/A'}
                                    </td>
                                )}

                                {visibleCols.cogs_currency && <td className="border border-slate-200 px-3 py-2 text-center text-slate-600 font-medium">{item.cogs_currency || '-'}</td>}
                                
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-700 font-medium">{item.kmi_qty || item.kmmi_qty || 0}</td>
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-700 font-medium">{item.kme_qty || 0}</td>
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-800 font-bold bg-slate-100/50">{item.total_qty || 0}</td>
                                
                                {visibleCols.avg12m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 font-medium bg-blue-50/30">{Number(item.avg_12m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg6m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 font-medium bg-blue-50/30">{Number(item.avg_6m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg3m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800 font-bold bg-blue-100/20">{Number(item.avg_3m_sales || 0).toFixed(1)}</td>}
                                
                                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 text-center font-black text-sm text-emerald-700">{item.forecast_qty}</td>
                            </tr>
                        );
                    })}
                    {bpSummaryData.length === 0 && (
                        <tr>
                            <td colSpan={activeColCount} className="p-10 text-center text-slate-400 italic">
                                {searchTerm ? 'No entries match your search.' : `No forecast entries found for ${monthFilter}.`}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-sm text-slate-500 font-medium">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, bpSummaryData.length)} of {bpSummaryData.length} items</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                    <span className="text-sm font-bold text-slate-700 px-2">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
                </div>
            </div>
        )}
    </div>
  );
}