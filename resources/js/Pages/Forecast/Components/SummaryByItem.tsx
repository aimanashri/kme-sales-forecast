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
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

interface VisibleCols {
    category: boolean;
    line: boolean;
    group: boolean;
    itemCode: boolean;
    description: boolean;
    brand: boolean;
    ln_price: boolean; 
    cogs_price: boolean;
    cogs_currency: boolean;
    kmi_qty: boolean;
    kme_qty: boolean;
    total_qty: boolean;
    avg12m: boolean;
    avg6m: boolean;
    avg3m: boolean;
}

type SortColumn = 'itemCode' | 'category';
type SortDirection = 'asc' | 'desc';

export default function SummaryByItem({ dbLobs, dbProducts, dbPricing, dbEntries, searchTerm, user }: any) {
  const itemsPerPage = 50;
  const [masterCurrentPage, setMasterCurrentPage] = useState(1);
  const [masterMonthFilter, setMasterMonthFilter] = useState(getNextMonthString());
  
  const [sortConfig, setSortConfig] = useState<{ key: SortColumn, direction: SortDirection }>({ key: 'category', direction: 'asc' });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  
  const defaultVisibleCols: VisibleCols = {
      category: true,
      line: false,
      group: false,
      itemCode: true,
      description: false,
      brand: false,
      ln_price: false,
      cogs_price: false,   
      cogs_currency: false, 
      kmi_qty: true,
      kme_qty: true,
      total_qty: false,
      avg12m: false,
      avg6m: false,  
      avg3m: false   
  };

  const [visibleCols, setVisibleCols] = useState<VisibleCols>(() => {
      const saved = localStorage.getItem('kmePlannerMasterColumnPrefs');
      if (saved) {
          try {
              return { ...defaultVisibleCols, ...JSON.parse(saved) }; 
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

  const handleSort = (key: SortColumn) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const activeReps = useMemo(() => {
      const reps = new Set<string>();
      dbEntries.forEach((e: any) => {
          if (e.planning_month === masterMonthFilter && Number(e.planned_quantity) > 0) {
              const lob = dbLobs?.find((l: any) => l.lob_id === e.lob_id);
              if (lob) {
                  reps.add(lob.sales_rep_name || lob.sales_representative_no || 'Unknown');
              }
          }
      });
      return Array.from(reps).sort(); 
  }, [dbEntries, masterMonthFilter, dbLobs]);

  const forecastStatsMap = useMemo(() => {
    const map: Record<number, { totalQty: number, totalNetSales: number, reps: Record<string, { qty: number, netSales: number }> }> = {};
    
    dbEntries.forEach((entry: any) => {
        if (entry.planning_month === masterMonthFilter && Number(entry.planned_quantity) > 0) {
            const pid = Number(entry.product_id);
            if (!map[pid]) map[pid] = { totalQty: 0, totalNetSales: 0, reps: {} };
            
            const lob = dbLobs?.find((l: any) => l.lob_id === entry.lob_id);
            const repName = lob ? (lob.sales_rep_name || lob.sales_representative_no || 'Unknown') : 'Unknown';
            
            if (!map[pid].reps[repName]) map[pid].reps[repName] = { qty: 0, netSales: 0 };
            
            const qty = Number(entry.planned_quantity);
            const amount = Number(entry.total_amount);

            map[pid].reps[repName].qty += qty;
            map[pid].reps[repName].netSales += amount;

            map[pid].totalQty += qty;
            map[pid].totalNetSales += amount; 
        }
    });
    return map;
  }, [dbEntries, masterMonthFilter, dbLobs]);

  const masterProducts = useMemo(() => {
      let activeProducts = dbProducts.filter((p: any) => forecastStatsMap[p.product_id] !== undefined);

      activeProducts = activeProducts.map((prod: any) => {
          const stats = forecastStatsMap[prod.product_id];
          
          let basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id && p.lob_id === null);
          if (!basePrice) basePrice = dbPricing.find((p: any) => p.product_id === prod.product_id);

          const cogsRaw = Number(prod.cogs_price) || 0;
          const isCogsUsd = (prod.cogs_currency || '').toUpperCase() === 'USD';
          const cogsAed = isCogsUsd ? (cogsRaw * USD_TO_AED_RATE) : cogsRaw;

          return { 
              ...prod, 
              forecast_qty: stats.totalQty,
              net_sales: stats.totalNetSales, 
              rep_data: stats.reps, 
              ln_price: basePrice ? Number(basePrice.price) : 0,
              cogs_aed_value: cogsAed,
              is_cogs_usd: isCogsUsd
          };
      });

      if (debouncedSearchTerm) {
          const lower = debouncedSearchTerm.toLowerCase();
          activeProducts = activeProducts.filter((item: any) => 
              (item.product_model || '').toLowerCase().includes(lower) ||
              (item.item_code || '').toLowerCase().includes(lower) ||
              (item.item_description || '').toLowerCase().includes(lower) ||
              (item.product_category || '').toLowerCase().includes(lower) ||
              (item.item_group || '').toLowerCase().includes(lower) ||
              (item.product_line || '').toLowerCase().includes(lower) ||
              (item.brand || '').toLowerCase().includes(lower)
          );
      }

      activeProducts.sort((a: any, b: any) => {
          const dir = sortConfig.direction === 'asc' ? 1 : -1;

          if (sortConfig.key === 'category') {
              const catCompare = (a.product_category || '').localeCompare(b.product_category || '');
              if (catCompare !== 0) return catCompare * dir;
              return (a.item_code || '').localeCompare(b.item_code || '');
          } else {
              const catCompare = (a.product_category || '').localeCompare(b.product_category || '');
              if (catCompare !== 0) return catCompare; 
              return (a.item_code || '').localeCompare(b.item_code || '') * dir;
          }
      });

      const dataWithSubtotals: any[] = [];
      let currentGroup: any[] = [];
      let actualItemNumber = 1;

      for (let i = 0; i < activeProducts.length; i++) {
          const row = activeProducts[i];
          
          row.display_index = actualItemNumber++;
          
          dataWithSubtotals.push(row);
          currentGroup.push(row);

          const nextRow = activeProducts[i + 1];
          const isLastInGroup = !nextRow || nextRow.product_category !== row.product_category;

          if (isLastInGroup) {
              const sumCogsAed = currentGroup.reduce((sum, r) => sum + (r.cogs_aed_value || 0), 0);
              
              const repSubtotals: Record<string, { qty: number, netSales: number }> = {};
              activeReps.forEach(rep => {
                  repSubtotals[rep] = {
                      qty: currentGroup.reduce((sum, r) => sum + (r.rep_data[rep]?.qty || 0), 0),
                      netSales: currentGroup.reduce((sum, r) => sum + (r.rep_data[rep]?.netSales || 0), 0)
                  };
              });
              
              dataWithSubtotals.push({
                  isSubtotal: true,
                  unique_key: `subtotal-cat-${row.product_category}`,
                  product_category: row.product_category || 'Uncategorized',
                  
                  ln_price: currentGroup.reduce((sum, r) => sum + (r.ln_price || 0), 0),
                  cogs_aed_value: sumCogsAed,
                  cogs_usd_value: sumCogsAed / USD_TO_AED_RATE,
                  kmi_qty: currentGroup.reduce((sum, r) => sum + (Number(r.kmi_qty || r.kmmi_qty) || 0), 0),
                  kme_qty: currentGroup.reduce((sum, r) => sum + (Number(r.kme_qty) || 0), 0),
                  total_qty: currentGroup.reduce((sum, r) => sum + (Number(r.total_qty) || 0), 0),
                  avg_12m_sales: currentGroup.reduce((sum, r) => sum + (Number(r.avg_12m_sales) || 0), 0),
                  avg_6m_sales: currentGroup.reduce((sum, r) => sum + (Number(r.avg_6m_sales) || 0), 0),
                  avg_3m_sales: currentGroup.reduce((sum, r) => sum + (Number(r.avg_3m_sales) || 0), 0),
                  forecast_qty: currentGroup.reduce((sum, r) => sum + (r.forecast_qty || 0), 0),
                  net_sales: currentGroup.reduce((sum, r) => sum + (r.net_sales || 0), 0),
                  
                  rep_subtotals: repSubtotals
              });
              currentGroup = [];
          }
      }

      return dataWithSubtotals;
  }, [dbProducts, debouncedSearchTerm, forecastStatsMap, sortConfig, activeReps]);

  useEffect(() => {
      setMasterCurrentPage(1);
  }, [debouncedSearchTerm, sortConfig]);

  const totalMasterPages = Math.ceil(masterProducts.length / itemsPerPage);
  const paginatedMasterProducts = useMemo(() => {
      const startIndex = (masterCurrentPage - 1) * itemsPerPage;
      return masterProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [masterProducts, masterCurrentPage]);

  // --- FIX: Global Totals exactly like SummaryByBP ---
  const gridTotals = useMemo(() => {
      const totals = { 
          forecast_qty: 0, 
          net_sales: 0, 
          kmi_qty: 0,  
          kme_qty: 0,  
          total_qty: 0,  
          reps: {} as Record<string, {qty: number, netSales: number}> 
      };
      activeReps.forEach(r => totals.reps[r] = {qty: 0, netSales: 0});

      masterProducts.forEach((row: any) => {
          if (!row.isSubtotal) {
              totals.forecast_qty += row.forecast_qty;
              totals.net_sales += row.net_sales;

              totals.kmi_qty += Number(row.kmi_qty || row.kmmi_qty || 0);
              totals.kme_qty += Number(row.kme_qty || 0);
              totals.total_qty += Number(row.total_qty || 0);

              activeReps.forEach(rep => {
                  totals.reps[rep].qty += (row.rep_data[rep]?.qty || 0);
                  totals.reps[rep].netSales += (row.rep_data[rep]?.netSales || 0);
              });
          }
      });
      return totals;
  }, [masterProducts, activeReps]);

  // --- FIX: Updated Export Function to export pure Master Data ---
  const exportToCSV = () => {
    if (masterProducts.length === 0) return;

    // We export ALL columns unconditionally.
    const headers = [
        'No', 
        'Product Category',
        'Product Line',
        'Product Group',
        'Product Model', 
        'Item Code',
        'Item Description',
        'Brand',
        'LN Price (AED)',
        'COGS Price',
        'COGS Currency',
        'KMI On Hand',
        'KME On Hand',
        'Total On Hand',
        '12M Avg (Sales)',
        '6M Avg (Sales)',
        '3M Avg (Sales)',
        ...activeReps.flatMap(rep => [`${rep} (Qty)`, `${rep} (Price AED)`]),
        'Total Forecast Qty',
        'Total Net Sales (AED)'
    ];

    // Filter out subtotals to produce purely raw master data
    const exportData = masterProducts.filter((prod: any) => !prod.isSubtotal);

    const rows = exportData.map((prod: any) => {
        const safeDescription = prod.item_description ? `"${prod.item_description.replace(/"/g, '""')}"` : '""';
        
        const repExportCols = activeReps.flatMap(rep => {
            const repData = prod.rep_data[rep] || { qty: 0, netSales: 0 };
            return [repData.qty, repData.netSales.toFixed(2)];
        });

        return [
            prod.display_index, 
            `"${prod.product_category || '-'}"`,
            `"${prod.product_line || '-'}"`,
            `"${prod.item_group || '-'}"`,
            `"${prod.product_model || '-'}"`,
            `"${prod.item_code || '-'}"`,
            safeDescription,
            `"${prod.brand || '-'}"`,
            prod.ln_price > 0 ? prod.ln_price.toFixed(2) : '#N/A',
            prod.cogs_price ? Number(prod.cogs_price).toFixed(2) : '#N/A',
            prod.cogs_currency || '-',
            prod.kmi_qty || prod.kmmi_qty || 0,
            prod.kme_qty || 0,
            prod.total_qty || 0,
            Number(prod.avg_12m_sales || 0).toFixed(1),
            Number(prod.avg_6m_sales || 0).toFixed(1),
            Number(prod.avg_3m_sales || 0).toFixed(1),
            ...repExportCols,
            prod.forecast_qty || 0,
            (prod.net_sales || 0).toFixed(2)
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

  const activeColCount = 4 + Object.values(visibleCols).filter(Boolean).length + (activeReps.length * 2);

  // Pre-calculate subtotal offset for reusability (used in body and footer)
  let colSpanOffset = 1; // Base for Product Model (Always visible)
  if (visibleCols.category) colSpanOffset++;
  if (visibleCols.line) colSpanOffset++;
  if (visibleCols.group) colSpanOffset++;
  if (visibleCols.itemCode) colSpanOffset++;
  if (visibleCols.description) colSpanOffset++;
  if (visibleCols.brand) colSpanOffset++;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px] animate-in fade-in duration-300">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Summary By Item Code</h3>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Forecast View:</span>
                <input type="month" value={masterMonthFilter} onChange={(e) => setMasterMonthFilter(e.target.value)} className="border-none text-xs font-black text-emerald-600 focus:ring-0 cursor-pointer p-0 h-6" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-bold bg-slate-200 px-3 py-1.5 rounded-full">
                  {masterProducts.filter(p => !p.isSubtotal).length} Rows
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
                                  <input type="checkbox" checked={visibleCols.line} onChange={() => toggleColumn('line')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Product Line
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
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-emerald-600">
                                  <input type="checkbox" checked={visibleCols.ln_price} onChange={() => toggleColumn('ln_price')} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                  LN Price (AED)
                              </label>
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
                                  <input type="checkbox" checked={visibleCols.kmi_qty} onChange={() => toggleColumn('kmi_qty')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  KMI On Hand
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.kme_qty} onChange={() => toggleColumn('kme_qty')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  KME On Hand
                              </label>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                  <input type="checkbox" checked={visibleCols.total_qty} onChange={() => toggleColumn('total_qty')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                  Total On Hand
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
                        
                        {visibleCols.category && (
                            <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold hover:bg-[#fad0b9] transition-colors cursor-pointer group" onClick={() => handleSort('category')}>
                                <div className="flex items-center justify-between gap-2">
                                    Product Category
                                    {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>) : <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100" />}
                                </div>
                            </th>
                        )}
                        {visibleCols.line && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Line</th>}
                        {visibleCols.group && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Group</th>}
                        <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Product Model</th>
                        
                        {visibleCols.itemCode && (
                            <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold hover:bg-[#fad0b9] transition-colors cursor-pointer group" onClick={() => handleSort('itemCode')}>
                                <div className="flex items-center justify-between gap-2">
                                    Item Code
                                    {sortConfig.key === 'itemCode' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>) : <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100" />}
                                </div>
                            </th>
                        )}
                        
                        {visibleCols.description && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Item Description</th>}
                        {visibleCols.brand && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold">Brand</th>}
                        
                        {visibleCols.ln_price && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-right">LN Price (AED)</th>}
                        
                        {visibleCols.cogs_price && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-right">COGS Price</th>}
                        {visibleCols.cogs_currency && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">COGS Currency</th>}
                        
                        {visibleCols.kmi_qty && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">KMI On Hand</th>}
                        {visibleCols.kme_qty && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">KME On Hand</th>}
                        {visibleCols.total_qty && <th className="border border-slate-300 bg-[#fce4d6] px-3 py-2 text-slate-800 font-bold text-center">Total On Hand</th>}
                        
                        {visibleCols.avg12m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">12M Avg (Sales)</th>}
                        {visibleCols.avg6m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">6M Avg (Sales)</th>}
                        {visibleCols.avg3m && <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center">3M Avg (Sales)</th>}
                        
                        {activeReps.map(rep => (
                            <React.Fragment key={rep}>
                                <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center shadow-[inset_2px_0_4px_-2px_rgba(0,0,0,0.05)] border-l-slate-400">
                                    <div>{rep}</div>
                                    <div className="font-normal opacity-80">Qty</div>
                                </th>
                                <th className="border border-slate-300 bg-blue-100 px-3 py-2 text-blue-800 font-bold text-center shadow-[inset_2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                                    <div>{rep}</div>
                                    <div className="font-normal opacity-80">Price (AED)</div>
                                </th>
                            </React.Fragment>
                        ))}

                        <th className="border border-slate-300 bg-emerald-600 px-3 py-2 text-white font-bold text-center shadow-lg border-l-slate-400">
                            <div>Total Forecast</div>
                            <div className="font-normal opacity-80">Qty</div>
                        </th>
                        <th className="border border-slate-300 bg-emerald-600 px-3 py-2 text-white font-bold text-center shadow-lg">
                            <div>Total Forecast</div>
                            <div className="font-normal opacity-80">Net Sales (AED)</div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedMasterProducts.map((prod: any, idx: number) => {
                        
                        if (prod.isSubtotal) {
                            return (
                                <tr key={prod.unique_key} className="bg-slate-100/80 transition-colors border-y border-slate-300">
                                    <td className="border border-slate-200 px-3 py-2"></td>

                                    <td colSpan={colSpanOffset} className="border border-slate-200 px-3 py-2 text-right text-slate-700 font-bold uppercase tracking-wider">
                                        Total {prod.product_category}
                                    </td>

                                    {visibleCols.ln_price && <td className="border border-slate-200 px-3 py-2 text-right text-emerald-700">{prod.ln_price.toFixed(2)}</td>}
                                    
                                    {visibleCols.cogs_price && (
                                        <td className="border border-slate-200 px-3 py-2 text-right text-rose-700">
                                            <div className="flex flex-col items-end">
                                                <span>{prod.cogs_usd_value.toFixed(2)}</span>
                                                <span className="text-slate-500">(AED {prod.cogs_aed_value.toFixed(2)})</span>
                                            </div>
                                        </td>
                                    )}
                                    {visibleCols.cogs_currency && <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">USD</td>}
                                    
                                    {visibleCols.kmi_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-800">{prod.kmi_qty}</td>}
                                    {visibleCols.kme_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-800">{prod.kme_qty}</td>}
                                    {visibleCols.total_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-900 bg-slate-200/50">{prod.total_qty}</td>}
                                    
                                    {visibleCols.avg12m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{prod.avg_12m_sales.toFixed(1)}</td>}
                                    {visibleCols.avg6m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{prod.avg_6m_sales.toFixed(1)}</td>}
                                    {visibleCols.avg3m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{prod.avg_3m_sales.toFixed(1)}</td>}
                                    
                                    {activeReps.map(rep => {
                                        const repData = prod.rep_subtotals[rep] || { qty: 0, netSales: 0 };
                                        return (
                                            <React.Fragment key={rep}>
                                                <td className={`border border-slate-300 bg-blue-100/60 px-3 py-2 text-center border-l-slate-300 ${repData.qty > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {repData.qty > 0 ? repData.qty : '-'}
                                                </td>
                                                <td className={`border border-slate-300 bg-blue-100/60 px-3 py-2 text-right ${repData.qty > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {repData.qty > 0 ? repData.netSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}

                                    <td className="border border-slate-300 bg-emerald-200/60 px-3 py-2 text-center text-slate-900 shadow-inner border-l-slate-400">
                                        {prod.forecast_qty > 0 ? prod.forecast_qty : '-'}
                                    </td>
                                    <td className="border border-slate-300 bg-emerald-200/60 px-3 py-2 text-right text-slate-900 shadow-inner">
                                        {prod.forecast_qty > 0 ? prod.net_sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                    </td>
                                </tr>
                            );
                        }

                        return (
                            <tr key={prod.product_id} className="hover:bg-slate-50 transition-colors">
                                <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">{prod.display_index}</td>
                                
                                {visibleCols.category && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.product_category}</td>}
                                {visibleCols.line && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.product_line}</td>}
                                {visibleCols.group && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.item_group}</td>}
                                <td className="border border-slate-200 px-3 py-2 text-slate-800 font-bold">{prod.product_model}</td>
                                
                                {visibleCols.itemCode && <td className="border border-slate-200 px-3 py-2 text-slate-500 font-mono">{prod.item_code}</td>}
                                
                                {visibleCols.description && <td className="border border-slate-200 px-3 py-2 text-slate-600 truncate max-w-xs">{prod.item_description}</td>}
                                {visibleCols.brand && <td className="border border-slate-200 px-3 py-2 text-slate-700">{prod.brand}</td>}
                                
                                {visibleCols.ln_price && (
                                    <td className={`border border-slate-200 px-3 py-2 text-right tracking-wider ${prod.ln_price > 0 ? 'text-emerald-600' : 'text-slate-300 italic'}`}>
                                        {prod.ln_price > 0 ? prod.ln_price.toFixed(2) : '#N/A'}
                                    </td>
                                )}
                                
                                {visibleCols.cogs_price && (
                                    <td className={`border border-slate-200 px-3 py-2 text-right tracking-wider ${prod.cogs_price ? 'text-rose-600' : 'text-slate-300 italic'}`}>
                                        {prod.cogs_price ? (
                                            <div className="flex flex-col items-end">
                                                <span>{Number(prod.cogs_price).toFixed(2)}</span>
                                                {prod.is_cogs_usd && <span className="text-slate-400">(AED {prod.cogs_aed_value.toFixed(2)})</span>}
                                            </div>
                                        ) : (
                                            '#N/A'
                                        )}
                                    </td>
                                )}

                                {visibleCols.cogs_currency && <td className="border border-slate-200 px-3 py-2 text-center text-slate-600">{prod.cogs_currency || '-'}</td>}
                                
                                {visibleCols.kmi_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-700">{prod.kmi_qty || prod.kmmi_qty || 0}</td>}
                                {visibleCols.kme_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-700">{prod.kme_qty || 0}</td>}
                                {visibleCols.total_qty && <td className="border border-slate-200 px-3 py-2 text-center text-slate-800 bg-slate-100/50">{prod.total_qty || 0}</td>}
                                
                                {visibleCols.avg12m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 bg-blue-50/30">{Number(prod.avg_12m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg6m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-700 bg-blue-50/30">{Number(prod.avg_6m_sales || 0).toFixed(1)}</td>}
                                {visibleCols.avg3m && <td className="border border-slate-200 px-3 py-2 text-center text-blue-800 bg-blue-100/20">{Number(prod.avg_3m_sales || 0).toFixed(1)}</td>}
                                
                                {activeReps.map(rep => {
                                    const repData = prod.rep_data[rep] || { qty: 0, netSales: 0 };
                                    return (
                                        <React.Fragment key={rep}>
                                            <td className={`border border-slate-200 px-3 py-2 text-center border-l-slate-300 ${repData.qty > 0 ? 'bg-blue-50 text-slate-900' : 'text-slate-300'}`}>
                                                {repData.qty > 0 ? repData.qty : '-'}
                                            </td>
                                            <td className={`border border-slate-200 px-3 py-2 text-right ${repData.qty > 0 ? 'bg-blue-50 text-slate-900' : 'text-slate-300'}`}>
                                                {repData.qty > 0 ? repData.netSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}

                                <td className={`border border-slate-300 px-3 py-2 text-center border-l-slate-400 ${prod.forecast_qty > 0 ? 'bg-emerald-50 text-slate-900' : 'text-slate-300'}`}>
                                    {prod.forecast_qty > 0 ? prod.forecast_qty : '-'}
                                </td>
                                <td className={`border border-slate-300 px-3 py-2 text-right ${prod.forecast_qty > 0 ? 'bg-emerald-50 text-slate-900' : 'text-slate-300'}`}>
                                    {prod.forecast_qty > 0 ? prod.net_sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                </td>
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
                
                {masterProducts.length > 0 && (
                    <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] bg-slate-100 font-bold text-slate-700">
                        <tr>
                            <td colSpan={colSpanOffset + 1} className="px-4 py-3 text-right uppercase tracking-wider">Total (All Pages)</td>
                            
                            {visibleCols.ln_price && <td className="px-3 py-3 text-center border-l border-slate-200">-</td>}
                            {visibleCols.cogs_price && <td className="px-3 py-3 text-center">-</td>}
                            {visibleCols.cogs_currency && <td className="px-3 py-3 text-center">-</td>}
                            
                            {visibleCols.kmi_qty && <td className="px-3 py-3 text-center text-slate-800">{gridTotals.kmi_qty}</td>}
                            {visibleCols.kme_qty && <td className="px-3 py-3 text-center text-slate-800">{gridTotals.kme_qty}</td>}
                            {visibleCols.total_qty && <td className="px-3 py-3 text-center text-slate-900">{gridTotals.total_qty}</td>}
                            
                            {visibleCols.avg12m && <td className="px-3 py-3 text-center">-</td>}
                            {visibleCols.avg6m && <td className="px-3 py-3 text-center">-</td>}
                            {visibleCols.avg3m && <td className="px-3 py-3 text-center">-</td>}
                            
                            {activeReps.map(rep => (
                                <React.Fragment key={rep}>
                                    <td className={`border border-slate-300 px-3 py-2 text-center border-l-slate-300 ${gridTotals.reps[rep].qty > 0 ? 'bg-blue-100/60 text-slate-900' : 'text-slate-400'}`}>
                                        {gridTotals.reps[rep].qty > 0 ? gridTotals.reps[rep].qty : '-'}
                                    </td>
                                    <td className={`border border-slate-300 px-3 py-2 text-right ${gridTotals.reps[rep].qty > 0 ? 'bg-blue-100/60 text-slate-900' : 'text-slate-400'}`}>
                                        {gridTotals.reps[rep].qty > 0 ? gridTotals.reps[rep].netSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                                    </td>
                                </React.Fragment>
                            ))}

                            <td className={`border border-slate-300 px-3 py-2 text-center border-l-slate-400 ${gridTotals.forecast_qty > 0 ? 'bg-emerald-200/60 text-slate-900 shadow-inner' : 'text-slate-400'}`}>
                                {gridTotals.forecast_qty > 0 ? gridTotals.forecast_qty : '-'}
                            </td>
                            <td className={`border border-slate-300 px-3 py-2 text-right ${gridTotals.forecast_qty > 0 ? 'bg-emerald-200/60 text-slate-900 shadow-inner' : 'text-slate-400'}`}>
                                {gridTotals.forecast_qty > 0 ? gridTotals.net_sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
        
        {totalMasterPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-sm text-slate-500 font-medium">Showing {((masterCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(masterCurrentPage * itemsPerPage, masterProducts.filter(p => !p.isSubtotal).length)} of {masterProducts.filter(p => !p.isSubtotal).length} items</span>
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