import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PieChart, Search, Car, FileText as InvoiceIcon, UserCircle, 
  Plus, Bell, RefreshCw, Sun, Moon 
} from 'lucide-react';
import { useData } from '../context/DataContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    theme, toggleTheme, notifications, refreshData, userProfile, 
    setIsDrawerOpen, setIsNotificationModalOpen 
  } = useData();
  const location = useLocation();

  const getTitle = () => {
      switch(location.pathname) {
          case '/': return `Welcome back, ${userProfile?.full_name?.split(' ')[0] || 'User'}`;
          case '/analytics': return 'Analytics';
          case '/expenses': return 'Expenses';
          case '/mileage': return 'Mileage';
          case '/invoices': return 'Invoices';
          case '/profile': return 'Profile';
          default: return 'RealLedger';
      }
  };

  const bgGradient = theme === 'dark' ? 'from-rose-900/20' : 'from-rose-500/10';

  return (
    <div className={`min-h-screen font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors duration-300 overflow-hidden flex`}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 flex-col border-r border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/50 backdrop-blur-xl h-screen fixed left-0 top-0 z-50 transition-colors">
           <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-gradient-to-tr dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-sm">
                  <span className="text-lg font-bold text-white tracking-tighter">RL</span>
              </div>
              <span className="font-bold text-lg text-zinc-900 dark:text-white">RealLedger</span>
           </div>
           
           <nav className="flex-1 px-4 space-y-2">
              <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Home" />
              <SidebarLink to="/analytics" icon={<PieChart size={20} />} label="Analytics" />
              <SidebarLink to="/expenses" icon={<Search size={20} />} label="Expenses" />
              <SidebarLink to="/mileage" icon={<Car size={20} />} label="Mileage" />
              <SidebarLink to="/invoices" icon={<InvoiceIcon size={20} />} label="Invoices" />
              <div className="h-px bg-zinc-200 dark:bg-white/5 my-4 mx-2" />
              <SidebarLink to="/profile" icon={<UserCircle size={20} />} label="Profile" />
           </nav>

           <div className="p-4">
              <button onClick={() => setIsDrawerOpen(true)} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg">
                  <Plus size={20} /> New Entry
              </button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full lg:pl-64 transition-colors bg-zinc-50 dark:bg-zinc-950">
             <div className={`absolute inset-x-0 top-0 h-96 bg-gradient-to-b ${bgGradient} to-transparent transition-all duration-500 pointer-events-none`}></div>
             
             <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 w-full">
                {/* Mobile Header */}
                <header className="pt-8 pb-6 flex justify-between items-center lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-gradient-to-tr dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-sm">
                            <span className="text-sm font-bold text-white tracking-tighter">RL</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                                {getTitle()}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsNotificationModalOpen(true)} className="relative p-2.5 bg-white dark:bg-zinc-800 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                            <Bell size={16} className="text-zinc-600 dark:text-zinc-300"/>
                            {notifications.length > 0 && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900"></div>}
                        </button>
                        <button onClick={refreshData} className="p-2.5 bg-white dark:bg-zinc-800 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                            <RefreshCw size={16} className="text-zinc-600 dark:text-zinc-300"/>
                        </button>
                    </div>
                </header>

                {/* Desktop Header Actions */}
                <header className="hidden lg:flex justify-between items-center py-8">
                     <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        {getTitle()}
                     </h1>
                     <div className="flex items-center gap-3">
                         <button onClick={toggleTheme} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                            {theme === 'dark' ? <Sun size={20} className="text-zinc-400"/> : <Moon size={20} className="text-zinc-600"/>}
                         </button>
                         <button onClick={() => setIsNotificationModalOpen(true)} className="relative p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                            <Bell size={20} className="text-zinc-600 dark:text-zinc-400"/>
                            {notifications.length > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></div>}
                        </button>
                     </div>
                </header>
                
                {children}

             </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto p-4">
            <div className="bg-zinc-900 dark:bg-zinc-900/80 backdrop-blur-xl rounded-full flex items-center justify-around p-2 border border-zinc-200/20 dark:border-white/10 shadow-2xl transition-colors">
                <NavButton to="/" icon={<LayoutDashboard size={24} />} label="Home" />
                <NavButton to="/analytics" icon={<PieChart size={24} />} label="Analytics" />
                <NavButton to="/mileage" icon={<Car size={24} />} label="Mileage" />
                <div className="relative">
                    <button onClick={() => setIsDrawerOpen(true)} className="w-16 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-rose-500/20 -translate-y-4 ring-4 ring-zinc-50 dark:ring-zinc-900 transition-all">
                        <Plus size={28} />
                    </button>
                </div>
                <NavButton to="/expenses" icon={<Search size={24} />} label="Expenses" />
                <NavButton to="/invoices" icon={<InvoiceIcon size={24} />} label="Invoices" />
                <NavButton to="/profile" icon={<UserCircle size={24} />} label="Profile" />
            </div>
        </div>
    </div>
  );
};

const SidebarLink = ({ label, icon, to }: { label: string, icon: React.ReactNode, to: string }) => (
    <NavLink 
        to={to} 
        className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-white/5' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white border border-transparent'}`}
    >
        {({ isActive }) => (
            <>
                <span className={isActive ? 'text-rose-500' : ''}>{icon}</span>
                {label}
            </>
        )}
    </NavLink>
);

const NavButton = ({ label, icon, to }: { label: string, icon: React.ReactNode, to: string }) => (
    <NavLink 
        to={to} 
        className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-12 transition-colors rounded-full ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
    >
        {icon}
        <span className="text-[10px] font-bold mt-1">{label}</span>
    </NavLink>
);