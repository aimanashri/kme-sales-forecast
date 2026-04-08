import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Settings2 } from 'lucide-react';

const USD_TO_AED_RATE = 3.67; 

const getNextMonthString = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

interface VisibleCols {
    category: boolean;
    group: boolean;
    itemCode: boolean;
    description: boolean;
    brand: boolean;
    cogs_price: boolean;
    cogs_currency: boolean;
    avg12m: boolean;
    avg6m: boolean;
    avg3m: boolean;
}

export default function SummaryByItem({ dbLobs, dbProducts, dbPricing, dbEntries, searchTerm, user }: any) {
  const itemsPerPage = 50;
  const [masterCurrentPage, setMasterCurrentPage] = useState(1);
  const [masterMonthFilter, setMasterMonthFilter] = useState(getNextMonthString());
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  
  const defaultVisibleCols: VisibleCols = {
      category: false,
      group: false,
      itemCode: false,
      description: false,
      brand: false,
      cogs_price: false,   
      cogs_currency: false, 
      avg12m: false,
      avg6m: false,  
      avg3m: false   
  };

  const [visibleCols, setVisibleCols] = useState<VisibleCols>(() => {
      const saved = localStorage.getItem('kmePlannerMasterColumnPrefs');
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) {
              return defaultVisibleCols;
          }
      }
      return defaultVisibleCols;
  });

  useEffect(() => {
      localStorage.setItem('kmePlannerMasterColumnPrefs', JSON.stringify(visibleCols));
  }, [visibleCols]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsColumnMenuOpen(false);
          }
      };

      if (isColumnMenuOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  const toggleColumn = (colName: keyof VisibleCols) => {
      setVisibleCols((prev: VisibleCols) => ({ ...prev, [colName]: !prev[colName] }));
  };

  const forecastTotalsMap = useMemo(() => {
    const map: Record<number, number> = {};
    dbEntries.forEach((entry: any) => {
        if (entry.planning_month === masterMonthFilter) {
            const pid = Number(entry.product_id);
            map[pid] = (map[pid] || 0) + Number(entry.planned_quantity);
        }
    });
    return map;
  }, [dbEntries, masterMonthFilter]);

  const masterProducts = useMemo(() => {
      let activeProducts = dbProducts.filter((p: any) => forecastTotalsMap[p.product_id] > 0);

      if (debouncedSearchTerm) {
          const lower = debouncedSearchTerm.toLowerCase();
          activeProducts = activeProducts.filter((item: any) => 
              (item.product_model || '').toLowerCase().includes(lower) ||
              (item.item_code || '').toLowerCase().includes(lower) ||
              (item.item_description || '').toLowerCase().includes(lower) ||
              (item.product_category || '').toLowerCase().includes(lower) ||
              (item.item_group || '').toLowerCase().includes(lower) ||
              (item.product_line || '').toLowerCase().includes(lower) ||
              (item.brand || '').toLowerCase().includes(lower) ||
              (item.cogs_price ? item.cogs_price.toString().toLowerCase().includes(lower) : false) ||
              (item.cogs_currency || '').toLowerCase().includes(lower)
          );
      }

      activeProducts.sort((a: any, b: any) => {
          return (a.item_code || '').localeCompare(b.item_code || '');
      });

      return activeProducts;
  }, [dbProducts, debouncedSearchTerm, forecastTotalsMap]);

  useEffect(() => {
      setMasterCurrentPage(1);
  }, [debouncedSearchTerm]);

  const totalMasterPages = Math.ceil(masterProducts.length / itemsPerPage);
  const paginatedMasterProducts = useMemo(() => {
      const startIndex = (masterCurrentPage - 1) * itemsPerPage;
      return masterProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [masterProducts, masterCurrentPage]);

  const exportToCSV = () => {
    if (masterProducts.length === 0) return;

    const headers = [
        'No', 'Sales Person', 'Product Category', 'Product Line', 'Product Group', 
        'Product Model', 'Item Code', 'Item Description', 'Brand', 'LN Price (AED)', 
        'COGS Price', 'COGS Currency', 'KMI On Hand', 'KME On Hand', 'Total On Hand', 
        '12M Avg (Sales)', '6M Avg (Sales)', '3M Avg (Sales)', 'Total Forecast Qty'
    ];

    const rows = masterProducts.map((prod: any, index: number) => {
 
        let basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id && p.lob_id === null);
        if (!basePrice) basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id); // Fallback to first available price

        const totalForecast = forecastTotalsMap[prod.product_id] || 0;
        const safeDescription = prod.item_description ? `"${prod.item_description.replace(/"/g, '""')}"` : '""';

        return [
            index + 1,
            `"${user?.full_name || '-'}"`,
            `"${prod.product_category || '-'}"`,
            `"${prod.product_line || '-'}"`,
            `"${prod.item_group || '-'}"`,
            `"${prod.product_model || '-'}"`,
            `"${prod.item_code || '-'}"`,
            safeDescription,
            `"${prod.brand || '-'}"`,
            basePrice ? Number(basePrice.price).toFixed(2) : '#N/A',
            prod.cogs_price ? Number(prod.cogs_price).toFixed(2) : '#N/A',
            prod.cogs_currency || '-',
            prod.kmi_qty || prod.kmmi_qty || 0,
            prod.kme_qty || 0,
            prod.total_qty || 0,
            Number(prod.avg_12m_sales || 0).toFixed(1),
            Number(prod.avg_6m_sales || 0).toFixed(1),
            Number(prod.avg_3m_sales || 0).toFixed(1),
            totalForecast
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Summary_by_Items_${masterMonthFilter}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const activeColCount = 9 + Object.values(visibleCols).filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px] animate-in fade-in duration-300">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Summary By Item Code</h3>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Forecast View:</span>
                <input type="month" value={masterMonthFilter} onChange={(e) => setMasterMonthFilter(e.target.value)} className="border-none text-xs font-black text-emerald-600 focus:ring-0 cursor-pointer p-0 h-6" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-bold bg-slate-200 px-3 py-1.5 rounded-full">
                  {masterProducts.length} Items Found
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
                  disabled={masterProducts.length === 0}
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
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">No</th>
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Sales Person</th>
                        {visibleCols.category && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Category</th>}
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Line</th>
                        {visibleCols.group && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Group</th>}
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Model</th>
                        
                        {visibleCols.itemCode && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Item Code</th>}
                        {visibleCols.description && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Item Description</th>}
                        {visibleCols.brand && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Brand</th>}
                        
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-right">LN Price (AED)</th>
                        
                        {visibleCols.cogs_price && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-right">COGS Price</th>}
                        {visibleCols.cogs_currency && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">COGS Currency</th>}
                        
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">KMI On Hand</th>
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">KME On Hand</th>
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">Total On Hand</th>
                        
                        {visibleCols.avg12m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">12M Avg (Sales)</th>}
                        {visibleCols.avg6m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">6M Avg (Sales)</th>}
                        {visibleCols.avg3m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">3M Avg (Sales)</th>}
                        
                        <th className="border border-slate-300 bg-emerald-600 px-3 py-2 text-white font-bold text-center shadow-lg">Total Forecast Qty</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedMasterProducts.map((prod: any, idx: number) => {
                        
                        let basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id && p.lob_id === null);
                        if (!basePrice) basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id); // Fallback

                        const actualIdx = ((masterCurrentPage - 1) * itemsPerPage) + idx + 1;
                        const totalForecast = forecastTotalsMap[prod.product_id] || 0;
                        
                        const isCogsUsd = (prod.cogs_currency || '').toUpperCase() === 'USD';
                        const cogsPriceAed = isCogsUsd && prod.cogs_price ? (Number(prod.cogs_price) * USD_TO_AED_RATE).toFixed(2) : null;

                        return (
                            <tr key={prod.product_id} className="hover:bg-slate-50 transition-colors">
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-500 font-medium">{actualIdx}</td>
                                <td className="border border-slate-200 px-3 py-2 text-slate-800 font-bold whitespace-nowrap">{user?.full_name || '-'}</td>
                                
                                {visibleCols.category && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.product_category}</td>}
                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.product_line}</td>
                                {visibleCols.group && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.item_group}</td>}
                                <td className="border border-slate-200 px-3 py-2 text-slate-800 font-bold">{prod.product_model}</td>
                                
                                {visibleCols.itemCode && <td className="border border-slate-200 px-3 py-2 text-slate-500 font-mono text-[10px]">{prod.item_code}</td>}
                                {visibleCols.description && <td className="border border-slate-200 px-3 py-2 text-slate-600 truncate max-w-xs">{prod.item_description}</td>}
                                {visibleCols.brand && <td className="border border-slate-200 px-3 py-2 text-slate-700 font-medium">{prod.brand}</td>}
                                
                                <td className={`border border-slate-200 px-3 py-2 text-right font-black tracking-wider ${basePrice ? 'text-emerald-600' : 'text-slate-300 italic'}`}>{basePrice ? Number(basePrice.price).toFixed(2) : '#N/A'}</td>
                                
                                {visibleCols.cogs_price && (
                                    <td className={`border border-slate-200 px-3 py-2 text-right font-black tracking-wider ${prod.cogs_price ? 'text-rose-600' : 'text-slate-300 italic'}`}>
                                        {prod.cogs_price ? (
                                            <div className="flex flex-col items-end">
                                                <span>{Number(prod.cogs_price).toFixed(2)}</span>
                                                {isCogsUsd && (
                                                    <span className="text-[9px] text-slate-400 font-medium">
                                                        (AED {cogsPriceAed})
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            '#N/A'
                                        )}
                                    </td>
                                )}

                                {visibleCols.cogs_currency && <td className="border border-slate-200 px-3 py-2 text-center text-slate-600 font-medium">{prod.cogs_currency || '-'}</td>}
                                
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-700 font-medium">{prod.kmi_qty || prod.kmmi_qty || 0}</td>
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-700 font-medium">{prod.kme_qty || 0}</td>
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-800 font-bold bg-slate-100/50">{prod.total_qty || 0}</td>
                                
                                {visibleCols.avg12m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 font-medium bg-blue-50/30">{Number(prod.avg_12m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg6m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 font-medium bg-blue-50/30">{Number(prod.avg_6m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg3m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800 font-bold bg-blue-100/20">{Number(prod.avg_3m_sales || 0).toFixed(1)}</td>}
                                
                                <td className={`border border-slate-300 px-3 py-2 text-center font-black text-sm ${totalForecast > 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-300'}`}>{totalForecast}</td>
                            </tr>
                        );
                    })}
                    {masterProducts.length === 0 && (
                        <tr>
                            <td colSpan={activeColCount} className="p-10 text-center text-slate-400 italic">
                                {searchTerm ? 'No products match your search.' : `No forecast entries found for ${masterMonthFilter}. Add data in the Sales Forecast tab.`}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {totalMasterPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-sm text-slate-500 font-medium">Showing {((masterCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(masterCurrentPage * itemsPerPage, masterProducts.length)} of {masterProducts.length} items</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setMasterCurrentPage(prev => Math.max(prev - 1, 1))} disabled={masterCurrentPage === 1} className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                    <span className="text-sm font-bold text-slate-700 px-2">Page {masterCurrentPage} of {totalMasterPages}</span>
                    <button onClick={() => setMasterCurrentPage(prev => Math.min(prev + 1, totalMasterPages))} disabled={masterCurrentPage === totalMasterPages} className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
                </div>
            </div>
        )}
    </div>
  );
}