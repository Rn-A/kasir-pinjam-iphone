import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  BarChart3, 
  LogOut,
  Menu,
  Tag,
  Settings,
  Folder
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import AccountModal from './AccountModal';

export default function Layout() {
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Katalog Barang', to: '/items', icon: Package },
    { name: 'Kategori', to: '/categories', icon: Folder },
    { name: 'Pelanggan', to: '/customers', icon: Users },
    { name: 'Voucher Promo', to: '/vouchers', icon: Tag },
    { name: 'Transaksi', to: '/transactions', icon: Receipt },

    { name: 'Laporan', to: '/reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-[220px] bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col py-6",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center px-6 pb-8 mb-2">
          <div className="text-blue-600 mr-3 mt-[-2px]">
            <Package className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="text-[20px] font-bold text-blue-600">Pinjam Barang</span>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "group flex items-center px-6 py-3 text-[14px] font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-900")} />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center mb-4 w-full text-left p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex flex-shrink-0 items-center justify-center font-bold text-sm group-hover:bg-blue-100 transition-colors">
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="ml-3 truncate flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">Admin Kasir</p>
              <p className="text-[10px] font-semibold text-slate-400 truncate">{user?.email || 'admin@pinjamiphone.com'}</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 ml-1.5 transition-colors shrink-0" />
          </button>
          <button
            onClick={() => logout()}
            className="flex w-full items-center px-3 py-2.5 text-xs font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 lg:h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">
            <span>Beranda</span>
            <span>/</span>
            <span className="text-slate-900 font-medium">Dashboard Overview</span>
          </div>

          <div className="flex items-center lg:hidden">
            <div className="text-blue-600 mr-2">
              <Package className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-blue-600">Pinjam Barang</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="w-full h-full max-w-7xl mx-auto flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Account Management Modal */}
      <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
    </div>
  );
}
