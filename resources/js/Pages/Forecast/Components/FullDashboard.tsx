import React, { useState, useMemo } from 'react';

const EXCHANGE_RATES = { AED: 1, MYR: 1.08, USD: 1 / 3.67 };

export default function FullDashboard({ dbLobs, dbProducts, dbEntries, user }: any) {
  const [dashCurrency, setDashCurrency] = useState<'AED' | 'MYR' | 'USD'>('AED');
  
  // --- dynamic sales person---
  const [dashFilters, setDashFilters] = useState({
      year: 'All', month: 'All', lob: 'All', 
      salesPerson: user.role_id === 2 ? 'All' : user.employee_id, 
      businessPartner: 'All',
      brand: 'All', productLine: 'All', productCategory: 'All', productGroup: 'All', productModel: 'All', itemCode: 'All'
  });

  const dashboardFilterOptions = useMemo(() => {
    const lobsMap = new Map<string, string>(); 
    const bps = new Set<string>();
    const brands = new Set<string>();
    const pLines = new Set<string>();
    const pCats = new Set<string>();
    const pGroups = new Set<string>();
    const pModels = new Set<string>();
    const itemCodes = new Set<string>();
    const salesReps = new Set<string>(); 

    dbEntries.forEach((entry: any) => {
        const lob = dbLobs.find((l: any) => l.lob_id === entry.lob_id);
        const prod = dbProducts.find((p: any) => p.product_id === entry.product_id);

        if (lob) {
            if (lob.lob_code) lobsMap.set(lob.lob_code, lob.lob_name || ''); 
            if (lob.sold_to_bp_name) bps.add(lob.sold_to_bp_name);
            if (lob.sales_representative_no) salesReps.add(lob.sales_representative_no);
        }
        if (prod) {
            if (prod.brand) brands.add(prod.brand); if (prod.product_line) pLines.add(prod.product_line);
            if (prod.product_category) pCats.add(prod.product_category); if (prod.item_group) pGroups.add(prod.item_group);
            if (prod.product_model) pModels.add(prod.product_model); if (prod.item_code) itemCodes.add(prod.item_code);
        }
    });

    return {
        lobs: Array.from(lobsMap.entries()).map(([code, name]) => ({ code, name })).sort((a,b) => a.code.localeCompare(b.code)),
        bps: Array.from(bps).sort(), brands: Array.from(brands).sort(), pLines: Array.from(pLines).sort(),
        pCats: Array.from(pCats).sort(), pGroups: Array.from(pGroups).sort(), pModels: Array.from(pModels).sort(), itemCodes: Array.from(itemCodes).sort(),
        salesReps: Array.from(salesReps).sort() // Send sorted reps to the dropdown
    };
  }, [dbEntries, dbLobs, dbProducts]);

  const fullDashboardData = useMemo(() => {
    let filteredForDash = dbEntries.filter((entry: any) => {
        const [y, m] = entry.planning_month.split('-');
        if (dashFilters.year !== 'All' && y !== dashFilters.year) return false;
        if (dashFilters.month !== 'All' && m !== dashFilters.month) return false;
        
        const lob = dbLobs.find((l: any) => l.lob_id === entry.lob_id);
        if (dashFilters.lob !== 'All' && lob?.lob_code !== dashFilters.lob) return false;
        if (dashFilters.businessPartner !== 'All' && lob?.sold_to_bp_name !== dashFilters.businessPartner) return false;
        
        //  sales person filter
        if (dashFilters.salesPerson !== 'All' && lob?.sales_representative_no !== dashFilters.salesPerson) return false;
        
        const product = dbProducts.find((p: any) => p.product_id === entry.product_id);
        if (dashFilters.brand !== 'All' && product?.brand !== dashFilters.brand) return false;
        if (dashFilters.productLine !== 'All' && product?.product_line !== dashFilters.productLine) return false;
        if (dashFilters.productCategory !== 'All' && product?.product_category !== dashFilters.productCategory) return false;
        if (dashFilters.productGroup !== 'All' && product?.item_group !== dashFilters.productGroup) return false;
        if (dashFilters.productModel !== 'All' && product?.product_model !== dashFilters.productModel) return false;
        if (dashFilters.itemCode !== 'All' && product?.item_code !== dashFilters.itemCode) return false;

        return true;
    });

    let forecastTotal = 0; let actualTotal = 0; let totalOnHand = 0;
    const tableGroups: Record<string, any> = {};

    filteredForDash.forEach((entry: any) => {
        const lob = dbLobs.find((l: any) => l.lob_id === entry.lob_id);
        const bpName = lob?.sold_to_bp_name || 'Unknown';
        const salesRep = lob?.sales_rep_name || lob?.sales_representative_no || '-'; 
        const baseAmount = Number(entry.total_amount);
        const currMult = EXCHANGE_RATES[dashCurrency as keyof typeof EXCHANGE_RATES];
        
        const convertedAmount = baseAmount * currMult;
        forecastTotal += convertedAmount;
        
        const mockActual = convertedAmount * 1.0572; 
        actualTotal += mockActual;

        // Add Sales Rep to the grouped table data 
        if (!tableGroups[bpName]) { tableGroups[bpName] = { bpName, lobName: lob?.lob_name || 'Unknown', salesRep, forecast: 0, actual: 0 }; }
        tableGroups[bpName].forecast += convertedAmount;
        tableGroups[bpName].actual += mockActual;
    });

    const uniqueProductIdsInView = new Set(filteredForDash.map((entry: any) => entry.product_id));
    uniqueProductIdsInView.forEach(pid => {
        const p = dbProducts.find((prod: any) => prod.product_id === pid);
        if (p) totalOnHand += Number(p.total_qty || 0);
    });

    return { forecastTotal, actualTotal, totalOnHand, tableData: Object.values(tableGroups).sort((a: any, b: any) => b.forecast - a.forecast) };
  }, [dbEntries, dbProducts, dbLobs, dashFilters, dashCurrency]);


  const maxChartValue = useMemo(() => {
    return Math.max(fullDashboardData.forecastTotal, fullDashboardData.actualTotal);
  }, [fullDashboardData.forecastTotal, fullDashboardData.actualTotal]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-6 gap-4 items-end mb-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Year</label>
                    <select value={dashFilters.year} onChange={(e) => setDashFilters({...dashFilters, year: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option><option>2025</option><option>2026</option><option>2027</option></select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Month</label>
                    <select value={dashFilters.month} onChange={(e) => setDashFilters({...dashFilters, month: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700">
                        <option value="All">All</option>
                        <option value="01">Jan</option><option value="02">Feb</option><option value="03">Mar</option>
                        <option value="04">Apr</option><option value="05">May</option><option value="06">Jun</option>
                        <option value="07">Jul</option><option value="08">Aug</option><option value="09">Sep</option>
                        <option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">LOB</label>
                    <select value={dashFilters.lob} onChange={(e) => setDashFilters({...dashFilters, lob: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700">
                        <option value="All">All</option>{dashboardFilterOptions.lobs.map((l: any) => <option key={l.code} value={l.code}>{l.code} {l.name ? `- ${l.name}` : ''}</option>)}
                    </select>
                </div>
                
                {/* dynamic admin sales person dropdown  */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Sales Rep ID</label>
                    <select 
                        disabled={user.role_id !== 2} 
                        value={dashFilters.salesPerson} 
                        onChange={(e) => setDashFilters({...dashFilters, salesPerson: e.target.value})}
                        className={`w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700 ${user.role_id !== 2 ? 'bg-slate-50 font-bold cursor-not-allowed' : ''}`}
                    >
                        {user.role_id === 2 && <option value="All">All Reps</option>}
                        {user.role_id !== 2 && <option value={user.employee_id}>{user.full_name}</option>}
                        {user.role_id === 2 && dashboardFilterOptions.salesReps.map((rep: any) => <option key={rep} value={rep}>{rep}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase truncate">Business Partner</label>
                    <select value={dashFilters.businessPartner} onChange={(e) => setDashFilters({...dashFilters, businessPartner: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.bps.map(bp => <option key={bp}>{bp}</option>)}</select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Brand</label>
                    <select value={dashFilters.brand} onChange={(e) => setDashFilters({...dashFilters, brand: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.brands.map(b => <option key={b}>{b}</option>)}</select>
                </div>
            </div>
            <div className="grid grid-cols-5 gap-4 items-end">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Product Line</label><select value={dashFilters.productLine} onChange={(e) => setDashFilters({...dashFilters, productLine: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.pLines.map(l => <option key={l}>{l}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Product Category</label><select value={dashFilters.productCategory} onChange={(e) => setDashFilters({...dashFilters, productCategory: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.pCats.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Product Group</label><select value={dashFilters.productGroup} onChange={(e) => setDashFilters({...dashFilters, productGroup: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.pGroups.map(g => <option key={g}>{g}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Product Model</label><select value={dashFilters.productModel} onChange={(e) => setDashFilters({...dashFilters, productModel: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.pModels.map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Item Code</label><select value={dashFilters.itemCode} onChange={(e) => setDashFilters({...dashFilters, itemCode: e.target.value})} className="w-full text-xs border-slate-200 rounded py-1.5 focus:ring-blue-500 text-slate-700"><option>All</option>{dashboardFilterOptions.itemCodes.map(i => <option key={i}>{i}</option>)}</select></div>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center border-b border-slate-100 pb-6 mb-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Currency</label>
                    <div className="flex border border-slate-300 rounded overflow-hidden shadow-sm">
                        {['AED', 'MYR', 'USD'].map((curr: any) => (
                            <button key={curr} onClick={() => setDashCurrency(curr)} className={`px-4 py-1.5 text-xs font-bold transition-colors ${dashCurrency === curr ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-200 last:border-0'}`}>{curr}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-5 gap-6 divide-x divide-slate-100">
                    <div className="text-center px-2"><p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Forecast Revenue</p><p className="text-3xl font-light text-slate-800">{fullDashboardData.forecastTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                    <div className="text-center px-2"><p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Actual Revenue</p><p className="text-3xl font-light text-slate-800">{fullDashboardData.actualTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                    <div className="text-center px-2"><p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Variance</p><p className={`text-3xl font-light ${(fullDashboardData.actualTotal - fullDashboardData.forecastTotal) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{((fullDashboardData.actualTotal - fullDashboardData.forecastTotal) > 0 ? '+' : '')}{(fullDashboardData.actualTotal - fullDashboardData.forecastTotal).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                    <div className="text-center px-2"><p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Achievement %</p><p className={`text-3xl font-light ${(fullDashboardData.forecastTotal > 0 && fullDashboardData.actualTotal >= fullDashboardData.forecastTotal) ? 'text-emerald-500' : 'text-slate-800'}`}>{fullDashboardData.forecastTotal > 0 ? ((fullDashboardData.actualTotal / fullDashboardData.forecastTotal) * 100).toFixed(2) : '0.00'}%</p></div>
                    <div className="text-center px-2"><p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Total On Hand</p><p className="text-3xl font-light text-slate-800">{fullDashboardData.totalOnHand.toLocaleString()}</p></div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-12 pt-4 pb-8">
                {/* donut chart  */}
                <div className="col-span-1 flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                    <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-inner" style={{ background: `conic-gradient(#3b82f6 0% ${fullDashboardData.forecastTotal > 0 ? Math.min((fullDashboardData.actualTotal / fullDashboardData.forecastTotal) * 100, 100) : 0}%, #e2e8f0 0% 100%)` }}>
                        <div className="absolute w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-md">
                            <span className="text-2xl font-light text-slate-800">
                                {fullDashboardData.forecastTotal > 0 ? ((fullDashboardData.actualTotal / fullDashboardData.forecastTotal) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-bold text-slate-600">Company Achievement</span>
                    </div>
                </div>

                
                <div className="col-span-3 flex flex-col justify-end relative h-64 pb-8 pl-12">
                    <div className="absolute top-0 right-0 flex gap-4 text-[10px] font-bold text-slate-500 uppercase z-20">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500"></div> Forecast</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500"></div> Actual</div>
                    </div>
                    <p className="absolute top-0 left-0 text-xs font-bold text-slate-500 uppercase tracking-widest z-20">Revenue Performance ({dashCurrency})</p>
                    
                    {/* background grid  */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pl-12 mt-8">
                        {[100, 75, 50, 25, 0].map(pct => {
                            const val = (maxChartValue * pct) / 100;
                            return (
                                <div key={pct} className="flex items-center w-full h-0 border-t border-slate-100 border-dashed">
                                    <span className="absolute left-0 text-[9px] font-medium text-slate-400 -translate-y-1/2 w-10 text-right pr-2">
                                        {val > 0 ? Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val) : '0'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                 
                    <div className="flex justify-center items-end h-full gap-16 z-10 relative w-full pt-8">
                        {fullDashboardData.forecastTotal > 0 || fullDashboardData.actualTotal > 0 ? (
                            <>
                       
                                <div className="flex flex-col items-center justify-end h-full relative group w-24">
                                    <div className="w-full bg-indigo-500 rounded-t shadow-sm hover:bg-indigo-400 transition-all relative" style={{ height: `${maxChartValue > 0 ? (fullDashboardData.forecastTotal / maxChartValue) * 100 : 0}%` }}>
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 transition-opacity font-mono">
                                            F: {fullDashboardData.forecastTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-6 text-center text-[10px] font-bold text-slate-600 truncate">Forecast</div>
                                </div>

                               
                                <div className="flex flex-col items-center justify-end h-full relative group w-24">
                                    <div className="w-full bg-purple-500 rounded-t shadow-sm hover:bg-purple-400 transition-all relative" style={{ height: `${maxChartValue > 0 ? (fullDashboardData.actualTotal / maxChartValue) * 100 : 0}%` }}>
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 transition-opacity font-mono">
                                            A: {fullDashboardData.actualTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-6 text-center text-[10px] font-bold text-slate-600 truncate">Actual</div>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <p className="text-slate-400 italic text-sm">No data available for the selected filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left">Sales Rep ID</th>
                            <th className="px-4 py-3 text-left">LOB</th>
                            <th className="px-4 py-3 text-left">Business Partner</th>
                            <th className="px-4 py-3">Forecast</th>
                            <th className="px-4 py-3">Actual Sales</th>
                            <th className="px-4 py-3">Variance</th>
                            <th className="px-4 py-3">Achievement %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {fullDashboardData.tableData.map((row: any) => {
                            const isPos = (row.actual - row.forecast) >= 0;
                            const pct = row.forecast > 0 ? ((row.actual / row.forecast) * 100).toFixed(2) : '0.00';
                            return (
                                <tr key={row.bpName} className="hover:bg-slate-50">
                                    {/* Display exact Sales Rep ID for the row  */}
                                    <td className="px-4 py-2.5 font-bold text-slate-500 text-left">{row.salesRep}</td>
                                    
                                    <td className="px-4 py-2.5 font-bold text-slate-700 text-left">{row.lobName}</td>
                                    <td className="px-4 py-2.5 text-slate-600 text-left truncate max-w-[250px]">{row.bpName}</td>
                                    <td className="px-4 py-2.5 font-mono">{row.forecast.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className="px-4 py-2.5 font-mono">{row.actual.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className={`px-4 py-2.5 font-mono ${isPos ? 'text-slate-700' : 'text-rose-500'}`}>{row.actual - row.forecast > 0 ? '+' : ''}{(row.actual - row.forecast).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className={`px-4 py-2.5 font-mono font-bold ${Number(pct) >= 100 ? 'text-emerald-500' : 'text-slate-600'}`}>{pct}%</td>
                                </tr>
                            );
                        })}
                        {fullDashboardData.tableData.length > 0 && (
                            <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                                <td colSpan={3} className="px-4 py-3 text-left">Total</td>
                                <td className="px-4 py-3 font-mono">{fullDashboardData.forecastTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="px-4 py-3 font-mono">{fullDashboardData.actualTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="px-4 py-3 font-mono">{((fullDashboardData.actualTotal - fullDashboardData.forecastTotal) > 0 ? '+' : '')}{(fullDashboardData.actualTotal - fullDashboardData.forecastTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="px-4 py-3 font-mono">{fullDashboardData.forecastTotal > 0 ? ((fullDashboardData.actualTotal / fullDashboardData.forecastTotal) * 100).toFixed(2) : '0.00'}%</td>
                            </tr>
                        )}
                        {fullDashboardData.tableData.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">No forecast data matches the selected filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

