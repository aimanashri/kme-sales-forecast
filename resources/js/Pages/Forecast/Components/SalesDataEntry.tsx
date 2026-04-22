import React, { useState, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react'; 
import Select from 'react-select'; 
import { Save, CheckCircle2, Download, Search, Loader2 } from 'lucide-react';

// shared  Utilities & Hooks
import { EXCHANGE_RATES, USD_TO_AED_RATE } from '../Utils/constants';
import { getNextMonthString, getPreviousMonthString } from '../Utils/helpers';
import { downloadCSV } from '../Utils/exportUtils';
import { usePagination } from '../Hooks/usePagination';
import Pagination from './Shared/Pagination';

const customSelectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any, state: any) => ({ 
        ...base, borderColor: '#e2e8f0', borderRadius: '0.5rem', minHeight: '36px', height: '36px', boxShadow: 'none', fontSize: '13px', backgroundColor: state.isDisabled ? '#f8fafc' : '#ffffff' 
    }),
    valueContainer: (base: any) => ({ ...base, padding: '0 8px' }),
    input: (base: any) => ({ ...base, margin: '0', padding: '0' }),
    indicatorsContainer: (base: any) => ({ ...base, height: '36px' }),
    option: (base: any) => ({ ...base, fontSize: '13px', padding: '6px 10px' })
};

export default function SalesDataEntry({ dbLobs, dbProducts, dbPricing, dbEntries }: any) {
  const user = usePage().props.auth.user as any; 

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // track loading state
  const [notification, setNotification] = useState<string | null>(null);
  
  const [selectedLob, setSelectedLob] = useState<number | null>(null);
  const [planningMonth, setPlanningMonth] = useState(getNextMonthString());
  const [productSearchInput, setProductSearchInput] = useState('');
  const [lobSearchInput, setLobSearchInput] = useState(''); 
  const [recentMonthFilter, setRecentMonthFilter] = useState(getNextMonthString());
  const [edits, setEdits] = useState<Record<number, { qty?: number | '', planPrice?: number | '', confirmedQty?: number | '' }>>({});

  const lobOptions = useMemo(() => {
    const lowerSearch = lobSearchInput.toLowerCase();
    return dbLobs
        .filter((l: any) => user.role_id === 2 || l.sales_representative_no === user.employee_id)
        .filter((l: any) => (l.sold_to_bp || '').toLowerCase().includes(lowerSearch) || (l.sold_to_bp_name || '').toLowerCase().includes(lowerSearch))
        .slice(0, 50) 
        .map((l: any) => {
            // if the user is an Admin, prefix the label with the Sales Rep's Name
            const repPrefix = user.role_id === 2 ? `[${l.sales_rep_name || l.sales_representative_no || 'Unassigned'}] ` : '';
            
            return { 
                value: l.lob_id, 
                label: `${repPrefix}${l.sold_to_bp} - ${l.sold_to_bp_name}`,
                repName: l.sales_rep_name 
            };
        });
  }, [dbLobs, lobSearchInput, user]);

  const currentLobName = useMemo(() => dbLobs.find((l: any) => l.lob_id === selectedLob)?.lob_name || '-', [dbLobs, selectedLob]);

  const baseGridProducts = useMemo(() => {
      if (!selectedLob || dbProducts.length === 0) return [];
      const prevMonthString = getPreviousMonthString(planningMonth);
      const priceMap = new Map();
      
      // makesure dbPricing is an array before iterating
      if (Array.isArray(dbPricing)) {
          dbPricing.forEach((p: any) => {
              if (p.lob_id === selectedLob) priceMap.set(p.product_id, p.price);
              else if (p.lob_id === null && !priceMap.has(p.product_id)) priceMap.set(p.product_id, p.price);
          });
      }

      const currentMonthEntries = new Map();
      const prevMonthEntries = new Map();
      
      if (Array.isArray(dbEntries)) {
          dbEntries.forEach((e: any) => {
              if (e.lob_id === selectedLob) {
                  if (e.planning_month === planningMonth) currentMonthEntries.set(e.product_id, e);
                  if (e.planning_month === prevMonthString) prevMonthEntries.set(e.product_id, e);
              }
          });
      }

      const validIds = new Set([...currentMonthEntries.keys(), ...priceMap.keys()]);
      const list = dbProducts.filter((p: any) => validIds.has(p.product_id));

      return list.map((prod: any) => {
          const masterPrice = priceMap.get(prod.product_id) || 0;
          const existingEntry = currentMonthEntries.get(prod.product_id);
          const previousEntry = prevMonthEntries.get(prod.product_id);

          const cogsRaw = Number(prod.cogs_price) || 0;
          const isCogsUsd = (prod.cogs_currency || '').toUpperCase() === 'USD';
          const cogsPriceAed = isCogsUsd ? (cogsRaw * USD_TO_AED_RATE) : cogsRaw;

          return { 
              ...prod, master_price_aed: Number(masterPrice), cogs_price_aed: cogsPriceAed, cogs_raw: cogsRaw, is_cogs_usd: isCogsUsd,
              saved_qty: existingEntry ? Number(existingEntry.planned_quantity) : '',
              saved_price: existingEntry && Number(existingEntry.planned_price_aed) !== Number(masterPrice) ? Number(existingEntry.planned_price_aed) : '',
              saved_confirmed_qty: existingEntry && existingEntry.confirmed_quantity != null ? Number(existingEntry.confirmed_quantity) : '', 
              prefill_qty: (!existingEntry && previousEntry) ? Number(previousEntry.planned_quantity) : '',
              prefill_price: (!existingEntry && previousEntry && Number(previousEntry.planned_price_aed) !== Number(masterPrice)) ? Number(previousEntry.planned_price_aed) : '',
              prefill_confirmed_qty: (!existingEntry && previousEntry && previousEntry.confirmed_quantity != null) ? Number(previousEntry.confirmed_quantity) : ''
          };
      });
  }, [selectedLob, planningMonth, dbProducts, dbPricing, dbEntries]);

  const filteredGridProducts = useMemo(() => {
      if (!productSearchInput.trim()) return baseGridProducts;
      const lower = productSearchInput.toLowerCase();
      return baseGridProducts.filter((p: any) => 
          (p.product_model || '').toLowerCase().includes(lower) || 
          (p.item_code || '').toLowerCase().includes(lower) ||
          (p.item_description || '').toLowerCase().includes(lower)
      );
  }, [baseGridProducts, productSearchInput]);

  //  Custom Pagination Hook
  const { currentPage, totalPages, paginatedData, goToNextPage, goToPrevPage, setCurrentPage } = usePagination(filteredGridProducts, 100);

  useEffect(() => {
      setCurrentPage(1);
  }, [selectedLob, productSearchInput, setCurrentPage]);

  const filteredEntries = useMemo(() => {
      if (!Array.isArray(dbEntries)) return [];
      return dbEntries.filter((entry: any) => entry.planning_month === recentMonthFilter);
  }, [dbEntries, recentMonthFilter]);

  const handleEdit = (productId: number, field: 'qty' | 'planPrice' | 'confirmedQty', value: any) => {
      setEdits(prev => {
          const current = prev[productId] || {}; 
          const parsedValue = value === '' ? '' : Number(value);
          return { ...prev, [productId]: { ...current, [field]: parsedValue } };
      });
  };

  const pendingSavesCount = useMemo(() => {
      let count = 0;
      baseGridProducts.forEach((prod: any) => {
          const editData = edits[prod.product_id];
          const hasEdit = editData !== undefined;
          const rowQty = hasEdit && editData.qty !== undefined ? editData.qty : (prod.saved_qty !== '' ? prod.saved_qty : prod.prefill_qty);
          const defaultPrice = prod.saved_price !== '' ? prod.saved_price : prod.prefill_price;
          const rowPlanPrice = hasEdit && editData.planPrice !== undefined ? editData.planPrice : defaultPrice;
          const rowConfirmedQty = hasEdit && editData.confirmedQty !== undefined ? editData.confirmedQty : (prod.saved_confirmed_qty !== '' ? prod.saved_confirmed_qty : prod.prefill_confirmed_qty);
          
          const activePrice = rowPlanPrice !== '' && Number(rowPlanPrice) > 0 ? Number(rowPlanPrice) : prod.master_price_aed;
          const isQtyChanged = Number(rowQty || 0) !== Number(prod.saved_qty || 0);
          const isPriceChanged = Number(activePrice) !== Number(prod.saved_price || prod.master_price_aed);
          const isConfirmedQtyChanged = Number(rowConfirmedQty || 0) !== Number(prod.saved_confirmed_qty || 0);
          const isUnsavedPrefill = prod.saved_qty === '' && prod.prefill_qty !== '';
          
          if ((isQtyChanged || isPriceChanged || isConfirmedQtyChanged || isUnsavedPrefill) && (rowQty !== '' && Number(rowQty) > 0)) count++;
      });
      return count;
  }, [baseGridProducts, edits]);

  const gridTotals = useMemo(() => {
      let totalFcastQty = 0, totalConfQty = 0, totalPlanPrice = 0, totalAed = 0, totalGp = 0;

      filteredGridProducts.forEach((prod: any) => {
          const editData = edits[prod.product_id];
          const isEditing = editData !== undefined;
          
          const rowQty = isEditing && editData.qty !== undefined ? editData.qty : (prod.saved_qty !== '' ? prod.saved_qty : prod.prefill_qty);
          const defaultPrice = prod.saved_price !== '' ? prod.saved_price : prod.prefill_price;
          const rowPlanPrice = isEditing && editData.planPrice !== undefined ? editData.planPrice : defaultPrice;
          const rowConfirmedQty = isEditing && editData.confirmedQty !== undefined ? editData.confirmedQty : (prod.saved_confirmed_qty !== '' ? prod.saved_confirmed_qty : prod.prefill_confirmed_qty);
          
          const activePrice = rowPlanPrice !== '' && Number(rowPlanPrice) > 0 ? Number(rowPlanPrice) : prod.master_price_aed;
          const qtyNum = rowQty !== '' ? Number(rowQty) : 0;
          const confQtyNum = rowConfirmedQty !== '' && !isNaN(Number(rowConfirmedQty)) ? Number(rowConfirmedQty) : 0;
          totalFcastQty += qtyNum;
          totalConfQty += confQtyNum;
          if (rowPlanPrice !== '') totalPlanPrice += Number(rowPlanPrice);
          totalAed += (qtyNum * activePrice);
          totalGp += ((activePrice - prod.cogs_price_aed) * qtyNum);
      });

      return { totalFcastQty, totalConfQty, totalPlanPrice, totalAed, totalGp };
  }, [filteredGridProducts, edits]);

  const handleSaveAll = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLob) return;

      const payloadEntries: any[] = [];
      baseGridProducts.forEach((prod: any) => {
          const editData = edits[prod.product_id];
          const hasEdit = editData !== undefined;
          const rowQty = hasEdit && editData.qty !== undefined ? editData.qty : (prod.saved_qty !== '' ? prod.saved_qty : prod.prefill_qty);
          const defaultPrice = prod.saved_price !== '' ? prod.saved_price : prod.prefill_price;
          const rowPlanPrice = hasEdit && editData.planPrice !== undefined ? editData.planPrice : defaultPrice;
          const rowConfirmedQty = hasEdit && editData.confirmedQty !== undefined ? editData.confirmedQty : (prod.saved_confirmed_qty !== '' ? prod.saved_confirmed_qty : prod.prefill_confirmed_qty);
          const activePrice = rowPlanPrice !== '' && Number(rowPlanPrice) > 0 ? Number(rowPlanPrice) : prod.master_price_aed;

          if ((Number(rowQty || 0) !== Number(prod.saved_qty || 0) || Number(activePrice) !== Number(prod.saved_price || prod.master_price_aed) || Number(rowConfirmedQty || 0) !== Number(prod.saved_confirmed_qty || 0) || (prod.saved_qty === '' && prod.prefill_qty !== '')) && (rowQty !== '' && Number(rowQty) > 0)) {
              payloadEntries.push({
                  lob_id: selectedLob, product_id: prod.product_id, planning_month: planningMonth, planned_quantity: Number(rowQty),
                  planned_price_aed: activePrice, planned_price_myr: Number((activePrice * EXCHANGE_RATES.MYR).toFixed(2)),
                  planned_price_usd: Number((activePrice / USD_TO_AED_RATE).toFixed(2)), total_amount: Number((Number(rowQty) * activePrice).toFixed(2)),
                  confirmed_quantity: Number(rowConfirmedQty || 0)
              });
          }
      });

      if (payloadEntries.length === 0) return showNotification('No pending updates found.');

      setIsSaving(true);
      router.post(route('forecast.store'), { entries: payloadEntries }, {
          preserveScroll: true,
          preserveState: true, 
          onSuccess: () => {
              showNotification(`Saved ${payloadEntries.length} entries successfully!`);
              setEdits({}); 
              setRecentMonthFilter(planningMonth); 
              setIsSaving(false);
          },
          onError: () => { showNotification('Error saving entries.'); setIsSaving(false); }
      });
  };

  const exportEntriesToCSV = () => {
    if (filteredEntries.length === 0) return showNotification('No entries to export.');
    const headers = ['Month', 'BP Code', 'Product Line', 'Product Model', 'Plan Qty', 'Confirmed Qty', 'Net Sales (AED)'];
    const rows = filteredEntries.map((entry: any) => {
        const bp = dbLobs.find((l:any) => l.lob_id === entry.lob_id)?.sold_to_bp || 'Unknown';
        const productMatch = dbProducts.find((p:any) => p.product_id === entry.product_id);
        return [
            entry.planning_month, bp, `"${productMatch?.product_line || 'Unknown'}"`, `"${productMatch?.product_model || 'Unknown'}"`, 
            entry.planned_quantity, entry.confirmed_quantity != null ? entry.confirmed_quantity : 0, Number(entry.total_amount).toFixed(2)
        ].join(',');
    });
    downloadCSV(`forecast_entries_${recentMonthFilter}.csv`, headers, rows);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="max-w-8xl mx-auto flex flex-col h-full space-y-4 relative animate-in fade-in duration-300">
        {notification && (
          <div className="fixed top-20 right-8 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top-4">
            <CheckCircle2 size={20} /> {notification}
          </div>
        )}

      {/* Header Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
          <div className="flex flex-wrap items-end gap-6">
              <div className="w-96 flex-shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Sold to BP</label>
                  <Select isClearable options={lobOptions} menuPortalTarget={document.body} styles={customSelectStyles} value={lobOptions.find((opt:any) => opt.value === selectedLob) || null} placeholder="Search BP Code or Name..." onInputChange={(val, a) => { if (a.action === 'input-change') setLobSearchInput(val); }} onChange={(opt: any) => { 
                        const newLobId = opt ? opt.value : null;
                        setSelectedLob(newLobId); 
                        setEdits({}); 
                        setProductSearchInput(''); 
                        
                        // ask backend for just this LOB's data
                        if (newLobId) {
                            setIsLoadingData(true);
                            router.reload({
                                only: ['dbProducts', 'dbPricingLob', 'dbEntriesLob'],
                                data: { lob_id: newLobId }, // Pass the selected LOB
                                onFinish: () => setIsLoadingData(false) // preserveState and preserveScroll are true by default!
                            });
                        }
                    }} 
                  />
              </div>
              <div className="w-48">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Forecast Month</label>
                  <input type="month" min={getNextMonthString()} value={planningMonth} onChange={(e) => setPlanningMonth(e.target.value)} className="w-full border-slate-300 rounded-lg h-[36px] text-sm focus:ring-blue-500" />
              </div>
              
              {/* show the Admin who owns this LOB */}
              {user.role_id === 2 && selectedLob && (
                  <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex flex-col justify-center">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider"></span>
                      <span className="text-xs font-bold text-amber-800">
                          {lobOptions.find((opt: any) => opt.value === selectedLob)?.repName || 'Unassigned'}
                      </span>
                  </div>
              )}
              
              <div className="flex-1"></div>
              
              <button onClick={handleSaveAll} disabled={pendingSavesCount === 0 || isSaving || isLoadingData} className="bg-blue-600 text-white h-[36px] px-6 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap">
                  <Save size={16} /> {isSaving ? 'Saving...' : `Save ${pendingSavesCount} Updates`}
              </button>
          </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col" style={{ minHeight: '600px', maxHeight: '60vh' }}>
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Mass Entry {filteredGridProducts.length > 0 && `(${filteredGridProducts.length} Products)`}</span>
                  {isLoadingData && <Loader2 size={14} className="animate-spin text-blue-500 ml-2" />}
              </div>
              <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Filter product based on BP..." value={productSearchInput} onChange={(e) => setProductSearchInput(e.target.value)} disabled={!selectedLob || isLoadingData} className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-full text-xs focus:ring-blue-500 w-64 shadow-inner disabled:bg-slate-100" />
              </div>
          </div>
          
          <div className="overflow-auto flex-1 relative">
            {!selectedLob ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic text-sm bg-slate-50/50">Please select a Business Partner to load the grid.</div>
            ) : isLoadingData ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 gap-3">
                    <Loader2 size={30} className="animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Fetching Pricing & Data...</span>
                </div>
            ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 shadow-sm text-[10px] uppercase tracking-wider text-slate-500 bg-white">
                        <tr>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100 w-12 text-center">No</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100">LOB</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100">Product Model</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100">Item Code</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100">Description</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100 text-right">Price AED</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-100 text-right">COGS AED</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-blue-50 text-blue-700 text-center border-l border-l-slate-200 w-32 shadow-[inset_2px_0_4px_-2px_rgba(0,0,0,0.05)]">Forecast Qty</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-blue-50 text-blue-700 text-center w-32">Plan Price AED</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-emerald-50 text-emerald-700 text-center w-32 border-x border-slate-200">Confirm Qty</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-slate-50 text-slate-800 text-right w-32">Total AED</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-bold bg-purple-50 text-purple-800 text-right w-32 border-l border-slate-200">GP (AED)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                        {paginatedData.map((prod: any, idx: number) => {
                            const editData = edits[prod.product_id];
                            const isEditing = editData !== undefined;
                            const rowQty = isEditing && editData.qty !== undefined ? editData.qty : (prod.saved_qty !== '' ? prod.saved_qty : prod.prefill_qty);
                            const defaultPrice = prod.saved_price !== '' ? prod.saved_price : prod.prefill_price;
                            const rowPlanPrice = isEditing && editData.planPrice !== undefined ? editData.planPrice : defaultPrice;
                            const rowConfirmedQty = isEditing && editData.confirmedQty !== undefined ? editData.confirmedQty : (prod.saved_confirmed_qty !== '' ? prod.saved_confirmed_qty : prod.prefill_confirmed_qty);
                            const isPrefilled = prod.saved_qty === '' && prod.prefill_qty !== '' && (!isEditing || editData.qty === undefined);
                            
                            const activePrice = rowPlanPrice !== '' && Number(rowPlanPrice) > 0 ? Number(rowPlanPrice) : prod.master_price_aed;
                            const qtyNum = rowQty !== '' ? Number(rowQty) : 0;
                            const totalVal = qtyNum * activePrice;
                            const gpVal = (activePrice - prod.cogs_price_aed) * qtyNum;
                            const actualIdx = ((currentPage - 1) * 100) + idx + 1;

                            const isQtyChanged = Number(rowQty || 0) !== Number(prod.saved_qty || 0);
                            const isPriceChanged = Number(activePrice) !== Number(prod.saved_price || prod.master_price_aed);
                            const isConfirmedQtyChanged = Number(rowConfirmedQty || 0) !== Number(prod.saved_confirmed_qty || 0);
                            const isRowModified = isQtyChanged || isPriceChanged || isConfirmedQtyChanged;

                            return (
                                <tr key={prod.product_id} className={`transition-colors ${isRowModified ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-2 font-mono text-slate-400 text-center">{actualIdx}</td>
                                    <td className="px-4 py-2 font-medium text-slate-700 truncate max-w-[120px]">{currentLobName}</td>
                                    <td className="px-4 py-2 font-bold text-slate-800">{prod.product_model}</td>
                                    <td className="px-4 py-2 font-mono text-slate-500">{prod.item_code}</td>
                                    <td className="px-4 py-2 text-slate-600 truncate max-w-[200px]" title={prod.item_description}>{prod.item_description}</td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-500">{prod.master_price_aed > 0 ? prod.master_price_aed.toFixed(2) : '-'}</td>
                                    
                                    <td className="px-4 py-2 text-right font-medium text-slate-500">
                                        <div className="flex flex-col">
                                            <span>{prod.cogs_price_aed > 0 ? prod.cogs_price_aed.toFixed(2) : '-'}</span>
                                            {prod.is_cogs_usd && prod.cogs_raw > 0 && <span className="text-[9px] text-slate-400">(${prod.cogs_raw.toFixed(2)})</span>}
                                        </div>
                                    </td>
                                    
                                    <td className="px-3 py-1.5 border-l border-l-slate-100 shadow-[inset_2px_0_4px_-2px_rgba(0,0,0,0.02)]">
                                        <input type="number" min="0" value={rowQty} onChange={(e) => handleEdit(prod.product_id, 'qty', e.target.value)} placeholder="0" className={`w-full border-slate-300 rounded text-center text-xs h-7 focus:ring-blue-500 font-bold transition-colors ${isPrefilled ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : ''}`} />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input type="number" step="0.01" min="0" value={rowPlanPrice} onChange={(e) => handleEdit(prod.product_id, 'planPrice', e.target.value)} placeholder={prod.master_price_aed.toFixed(2)} className={`w-full rounded text-right text-xs h-7 focus:ring-blue-500 font-medium transition-colors ${isPrefilled && rowPlanPrice !== '' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : rowPlanPrice !== '' && !isPrefilled ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-300'}`} />
                                    </td>
                                    <td className="px-3 py-1.5 border-x border-slate-200">
                                        <input type="number" min="0" value={rowConfirmedQty} onChange={(e) => handleEdit(prod.product_id, 'confirmedQty', e.target.value)} placeholder="0" className="w-full border-slate-300 rounded text-center text-xs h-7 focus:ring-emerald-500 font-bold transition-colors" />
                                    </td>
                                    <td className="px-4 py-2 text-right font-black text-slate-700">{totalVal > 0 ? totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                                    <td className={`px-4 py-2 text-right font-black border-l border-slate-100 ${gpVal > 0 ? 'text-purple-700' : gpVal < 0 ? 'text-red-600' : 'text-slate-400'}`}>{gpVal !== 0 ? gpVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                                </tr>
                            );
                        })}
                        {paginatedData.length === 0 && <tr><td colSpan={12} className="px-4 py-12 text-center text-slate-400 italic">No products found matching your filter.</td></tr>}
                    </tbody>
                    {filteredGridProducts.length > 0 && (
                        <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] bg-slate-100 font-bold text-[11px] text-slate-700">
                            <tr>
                                <td colSpan={7} className="px-4 py-3 text-right uppercase tracking-wider">Total (All Pages)</td>
                                <td className="px-3 py-3 text-center text-blue-700 border-l border-slate-200">{gridTotals.totalFcastQty}</td>
                                <td className="px-3 py-3 text-right text-slate-800 border-x border-slate-200">{gridTotals.totalPlanPrice > 0 ? gridTotals.totalPlanPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                                <td className="px-3 py-3 text-center text-emerald-700 border-r border-slate-200">{gridTotals.totalConfQty}</td>
                                <td className="px-4 py-3 text-right text-slate-800">{gridTotals.totalAed > 0 ? gridTotals.totalAed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                                <td className="px-4 py-3 text-right text-purple-700 border-l border-slate-200">{gridTotals.totalGp !== 0 ? gridTotals.totalGp.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            )}
          </div>
          
          {selectedLob && !isLoadingData && (
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredGridProducts.length} itemsPerPage={100} onPrev={goToPrevPage} onNext={goToNextPage} />
          )}
      </div>

      {/* Recent Entry Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0" style={{ minHeight: '400px', maxHeight: '60vh' }}>
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Recent Entries</h3>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">View Month:</span>
                  <input type="month" value={recentMonthFilter} onChange={(e) => setRecentMonthFilter(e.target.value)} className="border-none text-xs font-black text-blue-600 focus:ring-0 cursor-pointer p-0 h-6" />
              </div>
          </div>
          <button onClick={exportEntriesToCSV} disabled={filteredEntries.length === 0} className="flex items-center gap-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Download size={14} /> Export CSV</button>
        </div>
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase sticky top-0 shadow-sm z-20">
              <tr>
                <th className="px-6 py-4 bg-white">Month</th>
                <th className="px-6 py-4 bg-white">BP Code</th>
                <th className="px-6 py-4 bg-white">Product Line</th>
                <th className="px-6 py-4 bg-white">Product Model</th>
                <th className="px-6 py-4 text-center bg-white">Plan Qty</th>
                <th className="px-6 py-4 text-center bg-white text-emerald-700">Confirm Qty</th>
                <th className="px-6 py-4 text-right bg-white">Net Sales (AED)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredEntries.map((entry: any) => (
                <tr key={entry.user_planning_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{entry.planning_month}</td>
                  <td className="px-6 py-4 font-medium">{dbLobs.find((l:any) => l.lob_id === entry.lob_id)?.sold_to_bp}</td>
                  <td className="px-6 py-4 text-slate-600">{dbProducts.find((p:any) => p.product_id === entry.product_id)?.product_line || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{dbProducts.find((p:any) => p.product_id === entry.product_id)?.product_model}</td>
                  <td className="px-6 py-4 text-center font-bold">{entry.planned_quantity}</td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-600">{entry.confirmed_quantity != null ? entry.confirmed_quantity : 0}</td>
                  <td className="px-6 py-4 text-right font-black text-blue-600">{Number(entry.total_amount).toFixed(2)}</td>
                </tr>
              ))}
              {filteredEntries.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic font-medium">No entries found for {recentMonthFilter}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}