import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { 
  LayoutDashboard, Database, Users, PackageSearch, 
  Settings, LogOut, Plus, Save, Calculator, Search, CheckCircle2
} from 'lucide-react';

// mock data
const mockLOBs = [
  { id: 101, sold_to_bp: 'CFABHU000', sold_to_bp_name: "ABDULKAREEM M. ABAHUSSAIN SONS' CO." },
  { id: 102, sold_to_bp: 'CFJAWH000', sold_to_bp_name: 'ABU JAWAHER SAFETY EQUIPMENT EST.' },
  { id: 103, sold_to_bp: 'CFBAHN000', sold_to_bp_name: 'BAHASSAN ELECTRIC STORES CO.' },
];

const mockProducts = [
  { id: 1, item_code: 'EL0811NMXXWEKD-XXXX', item_description: 'EM0811NM W/EXIT STK WE KD', product_model: 'EM0811NM', product_category: 'LIGHTING', product_line: 'LIGHTING SERIES', product_group: 'EMERGENCY LIGHTS', brand: 'KHIND' },
  { id: 2, item_code: 'EL2004MLXLWEKD-3PSO', item_description: 'EM2004GLED PRL WE KD', product_model: 'EM2004GLED', product_category: 'LIGHTING', product_line: 'LIGHTING SERIES', product_group: 'EMERGENCY LIGHTS', brand: 'KHIND' },
];

const mockPricing = [
  { product_id: 1, lob_id: 101, price: 45.00, currency: 'AED' },
  { product_id: 2, lob_id: 101, price: 52.00, currency: 'AED' },
  { product_id: 1, lob_id: null, price: 48.00, currency: 'AED' }, 
  { product_id: 2, lob_id: null, price: 55.00, currency: 'AED' },
];

const EXCHANGE_RATES = {
  AED_TO_MYR: 1.28,
  MYR_TO_AED: 0.78,
  MYR_TO_USD: 0.21,
  AED_TO_USD: 0.27
};

export default function Forecast() {
  // get authenticated user from Laravel
  const user = usePage().props.auth.user as any; 

  const [activeTab, setActiveTab] = useState('data-entry');
  const [formData, setFormData] = useState({
    lob_id: '',
    product_id: '',
    planning_month: '2026-04',
    planned_quantity: 1,
    planned_price_myr: 0,
    planned_price_usd: 0,
    planned_price_aed: 0,
  });

  const [entries, setEntries] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const selectedProduct = useMemo(() => 
    mockProducts.find(p => p.id === parseInt(formData.product_id)), 
  [formData.product_id]);

  useEffect(() => {
    if (formData.product_id) {
      const pId = parseInt(formData.product_id);
      const lId = formData.lob_id ? parseInt(formData.lob_id) : null;
      let matchedPrice = mockPricing.find(p => p.product_id === pId && p.lob_id === lId);
      
      if (!matchedPrice) {
        matchedPrice = mockPricing.find(p => p.product_id === pId && p.lob_id === null);
      }

      const baseAed = matchedPrice ? matchedPrice.price : 0;

      setFormData(prev => ({
        ...prev,
        planned_price_aed: baseAed,
        planned_price_myr: baseAed > 0 ? Number((baseAed * EXCHANGE_RATES.AED_TO_MYR).toFixed(2)) : 0,
        planned_price_usd: baseAed > 0 ? Number((baseAed * EXCHANGE_RATES.AED_TO_USD).toFixed(2)) : 0,
      }));
    } else {
      setFormData(prev => ({ ...prev, planned_price_aed: 0, planned_price_myr: 0, planned_price_usd: 0 }));
    }
  }, [formData.product_id, formData.lob_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMyrPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const myrValue = e.target.value;
    const parsedMyr = parseFloat(myrValue);
    
    if (isNaN(parsedMyr)) {
      setFormData(prev => ({ ...prev, planned_price_myr: myrValue as any, planned_price_usd: 0, planned_price_aed: 0 }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      planned_price_myr: parsedMyr,
      planned_price_usd: Number((parsedMyr * EXCHANGE_RATES.MYR_TO_USD).toFixed(2)),
      planned_price_aed: Number((parsedMyr * EXCHANGE_RATES.MYR_TO_AED).toFixed(2)),
    }));
  };

  const calculateTotal = () => {
    return (formData.planned_quantity * formData.planned_price_aed).toFixed(2);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lob_id || !formData.product_id || formData.planned_quantity <= 0) return;

    // TODO: In the future, wrap this in Inertia.post('/forecast/store', formData) to save to Database
    const newEntry = {
      id: Date.now(),
      lob_id: parseInt(formData.lob_id),
      product_id: parseInt(formData.product_id),
      planning_month: formData.planning_month,
      planned_quantity: formData.planned_quantity,
      planned_price_myr: formData.planned_price_myr || 0,
      planned_price_usd: formData.planned_price_usd || 0,
      planned_price_aed: formData.planned_price_aed || 0,
      total_amount: parseFloat(calculateTotal()),
    };

    setEntries([newEntry, ...entries]);
    showNotification('Entry saved successfully!');
    
    setFormData(prev => ({
      ...prev,
      product_id: '',
      planned_quantity: 1,
      planned_price_myr: 0,
      planned_price_usd: 0,
      planned_price_aed: 0,
    }));
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      <Head title="Sales Forecast" />
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <Link href={route('dashboard')} className="text-xl font-bold text-white flex items-center gap-2 hover:text-blue-400 transition-colors">
            <Database className="w-6 h-6 text-blue-500" />
            SalesPlan Pro
          </Link>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <button 
                onClick={() => setActiveTab('data-entry')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${activeTab === 'data-entry' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <Plus className="w-5 h-5" /> Sales Data Entry
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('master')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${activeTab === 'master' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" /> Master Dashboard
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-6 border-t border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold uppercase">
            {user.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-white truncate">{user.full_name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
          {/* Functional Logout Button */}
          <Link href={route('logout')} method="post" as="button" className="text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-semibold text-slate-800">
            {activeTab === 'data-entry' ? 'Sales Plan Data Entry' : 'Master Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </header>

        {/* TOAST */}
        {notification && (
          <div className="absolute top-20 right-8 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <CheckCircle2 className="w-5 h-5" /> {notification}
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'data-entry' ? (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* FORM */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSaveEntry} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Sold To BP <span className="text-red-500">*</span></label>
                      <select name="lob_id" value={formData.lob_id} onChange={handleInputChange} required className="w-full border-slate-300 rounded-lg">
                        <option value="">-- Select BP Code --</option>
                        {mockLOBs.map(lob => (
                          <option key={lob.id} value={lob.id}>{lob.sold_to_bp} - {lob.sold_to_bp_name.substring(0, 20)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Item Code <span className="text-red-500">*</span></label>
                      <select name="product_id" value={formData.product_id} onChange={handleInputChange} required className="w-full border-slate-300 rounded-lg">
                        <option value="">-- Select Item Code --</option>
                        {mockProducts.map(prod => (
                          <option key={prod.id} value={prod.id}>{prod.item_code} | {prod.product_model}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* AUTO-POPULATED DATA */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8 min-h-[100px] flex flex-col justify-center">
                    {!selectedProduct ? (
                      <div className="text-center text-slate-400 text-sm italic">Select an Item Code above to view auto-populated product mappings.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="block text-slate-500 text-xs uppercase mb-1">Description</span><span className="font-medium text-slate-800">{selectedProduct.item_description}</span></div>
                        <div><span className="block text-slate-500 text-xs uppercase mb-1">Category / Line</span><span className="font-medium text-slate-800">{selectedProduct.product_category} / {selectedProduct.product_line}</span></div>
                        <div><span className="block text-slate-500 text-xs uppercase mb-1">Product Group</span><span className="font-medium text-slate-800">{selectedProduct.product_group}</span></div>
                        <div><span className="block text-slate-500 text-xs uppercase mb-1">Brand</span><span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{selectedProduct.brand}</span></div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-end">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                      <input type="month" name="planning_month" value={formData.planning_month} onChange={handleInputChange} className="w-full border-slate-300 rounded-lg" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Planned Qty</label>
                      <input type="number" name="planned_quantity" min="1" value={formData.planned_quantity} onChange={handleInputChange} className="w-full border-slate-300 rounded-lg" />
                    </div>

                    <div className="col-span-3 grid grid-cols-3 gap-4 border border-slate-200 p-3 rounded-lg bg-slate-50">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Price (MYR)</label>
                        <input type="number" step="0.01" value={formData.planned_price_myr} onChange={handleMyrPriceChange} className="w-full border-slate-300 rounded-md p-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Price (USD)</label>
                        <input type="number" readOnly value={formData.planned_price_usd} className="w-full border-slate-200 rounded-md p-2 bg-slate-100 text-slate-500 text-sm cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Price (AED)</label>
                        <input type="number" readOnly value={formData.planned_price_aed} className="w-full border-slate-200 rounded-md p-2 bg-slate-100 text-slate-500 text-sm cursor-not-allowed" />
                      </div>
                    </div>

                    <div className="col-span-1 bg-slate-100 rounded-lg p-3 border border-slate-200 flex flex-col items-center justify-center h-[62px]">
                       <span className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Total (AED)</span>
                       <span className="font-bold text-slate-800 text-sm">AED {calculateTotal()}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end pt-5 border-t border-slate-100">
                    <button type="submit" disabled={!formData.lob_id || !formData.product_id} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save Entry
                    </button>
                  </div>
                </form>
              </div>

              {/* TABLE */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                  <h3 className="text-lg font-semibold text-slate-800">Your Recent Entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">BP Code</th>
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3 text-right">Net Sales (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="px-4 py-3">{mockLOBs.find(l => l.id === entry.lob_id)?.sold_to_bp}</td>
                          <td className="px-4 py-3">{mockProducts.find(p => p.id === entry.product_id)?.item_code}</td>
                          <td className="px-4 py-3">{entry.planned_quantity}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600">{entry.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <Calculator className="w-16 h-16 mb-4 text-slate-300" />
               <h2 className="text-xl font-medium text-slate-600 mb-2">Master Dashboard Generation</h2>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}