import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Database, LogOut, Calculator, Search, Menu, FileEdit, PieChart, Calendar, TrendingUp, Building2 } from 'lucide-react';
import SalesDataEntry from './Components/SalesDataEntry';
import SummaryByItem from './Components/SummaryByItem';
import SummaryByBP from './Components/SummaryByBP'; 
import FullDashboard from './Components/FullDashboard';
import ActualSales from './Components/ActualSales';

export default function Forecast({ dbLobs, dbProducts, dbPricing, dbEntries = [], dbBudgets = [] }: any) {
  const user = usePage().props.auth.user as any; 

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('data-entry'); 
  
  // Shared Header States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const NavButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => { setActiveTab(id); setSearchTerm(''); }} 
      title={!isSidebarOpen ? label : ""} 
      className={`w-full flex items-center ${isSidebarOpen ? 'px-4 justify-start gap-3' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all duration-200 ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        <Icon size={20} className="shrink-0" />
        {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden animate-in fade-in duration-300">
      <Head title="Sales Forecast" />
      
      {/* side bar */}
      <aside className={`bg-slate-900 text-white flex flex-col shadow-xl transition-all duration-300 ease-in-out shrink-0 z-20 ${isSidebarOpen ? 'w-64' : 'w-20'}`} style={{ zoom: 0.80 }}>
        <div className={`p-6 border-b border-slate-800 flex items-center h-20 transition-all ${isSidebarOpen ? 'gap-3 justify-start' : 'px-0 justify-center'}`}>
            <Link href={route('dashboard')}>
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shrink-0 hover:bg-blue-500 transition-colors">K</div>
            </Link>
            {isSidebarOpen && (
                <div className="whitespace-nowrap overflow-hidden">
                    <h1 className="font-bold text-lg tracking-tight">KME Planner</h1>
                    <p className="text-xs text-slate-400">Forecast system</p>
                </div>
            )}
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {isSidebarOpen ? <div className="px-4 pb-2 pt-2 text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-80 whitespace-nowrap">Data Management</div> : <div className="w-8 mx-auto border-t border-slate-700 my-4"></div>}
          <NavButton id="data-entry" label="Sales Forecast" icon={FileEdit} />
          <NavButton id="summary-item" label="Summary by Item" icon={Database} />
          <NavButton id="summary-bp" label="Summary by BP" icon={Building2} />
          
          {isSidebarOpen ? <div className="px-4 pb-2 pt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-80 whitespace-nowrap">Analytics & Reports</div> : <div className="w-8 mx-auto border-t border-slate-700 my-4"></div>}
          <NavButton id="dashboard-full" label="Full Dashboard" icon={PieChart} />
          {/* <NavButton id="actual-sales" label="Actual Sales (Weekly)" icon={TrendingUp} /> */}
        </nav>

        <div className={`p-4 border-t border-slate-800 flex items-center ${isSidebarOpen ? 'gap-3' : 'flex-col gap-3 justify-center'}`}>
          <div className="w-10 h-10 shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold uppercase">{user.full_name?.charAt(0) || 'U'}</div>
          {isSidebarOpen && (
            <div className="flex-1 overflow-hidden">
              {/*   Admin Badge --- */}
              <div className="text-sm font-medium text-white truncate">
                  {user.full_name} 
                  {user.role_id === 2 && <span className="text-emerald-400 text-xs ml-1 font-bold">(Admin)</span>}
              </div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
          )}
          <Link href={route('logout')} method="post" as="button" className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"><LogOut size={20} /></Link>
        </div>
      </aside>

      {/* main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm shrink-0" style={{ zoom: 0.80 }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><Menu size={20} /></button>
            <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'actual-sales' && (
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 font-bold focus:ring-blue-500">
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                </select>
            )}
            {(activeTab === 'summary-item' || activeTab === 'summary-bp') && (
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64 bg-slate-50" />
                </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6" style={{ zoom: 0.80 }}>
          {activeTab === 'data-entry' && <SalesDataEntry dbLobs={dbLobs} dbProducts={dbProducts} dbPricing={dbPricing} dbEntries={dbEntries} />}
          {activeTab === 'summary-item' && <SummaryByItem dbLobs={dbLobs} dbProducts={dbProducts} dbPricing={dbPricing} dbEntries={dbEntries} searchTerm={searchTerm} user={user} />}
          
          {activeTab === 'summary-bp' && <SummaryByBP dbLobs={dbLobs} dbProducts={dbProducts} dbPricing={dbPricing} dbEntries={dbEntries} searchTerm={searchTerm} user={user} />}
          
          {activeTab === 'dashboard-full' && <FullDashboard dbLobs={dbLobs} dbProducts={dbProducts} dbEntries={dbEntries} user={user} />}
          {activeTab === 'actual-sales' && <ActualSales dbProducts={dbProducts} dbEntries={dbEntries} dbBudgets={dbBudgets} selectedYear={selectedYear} user={user} />}
        </div>
      </main>
    </div>
  );
}