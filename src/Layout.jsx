import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Warehouse, 
  ClipboardList,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const userRole = user?.user_role || 'cliente';

  const getNavItems = () => {
    const items = [];
    
    if (userRole === 'cliente') {
      items.push(
        { name: 'Mis Pedidos', icon: ShoppingCart, page: 'ClientOrders' },
        { name: 'Nuevo Pedido', icon: Package, page: 'NewOrder' }
      );
    }
    
    if (userRole === 'bodega') {
      items.push(
        { name: 'Pedidos a Surtir', icon: Warehouse, page: 'WarehouseOrders' }
      );
    }
    
    if (userRole === 'vendedor') {
      items.push(
        { name: 'Pedidos Clientes', icon: ClipboardList, page: 'SellerOrders' }
      );
    }
    
    if (userRole === 'admin') {
      items.push(
        { name: 'Dashboard', icon: Home, page: 'AdminDashboard' },
        { name: 'Pedidos', icon: ClipboardList, page: 'AdminOrders' },
        { name: 'Clientes', icon: Users, page: 'AdminClients' },
        { name: 'Productos', icon: Package, page: 'AdminProducts' },
        { name: 'Usuarios', icon: Settings, page: 'AdminUsers' }
      );
    }
    
    return items;
  };

  const navItems = getNavItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const getRoleLabel = (role) => {
    const labels = {
      cliente: 'Cliente',
      bodega: 'Bodega',
      vendedor: 'Vendedor',
      admin: 'Administrador'
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 217 91% 60%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <Package className="text-white" size={20} />
              </div>
              <span className="font-semibold text-slate-800 text-lg hidden sm:block">Cremería</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700">{user?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-slate-500">{getRoleLabel(userRole)}</p>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut size={16} className="mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0
        `}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-amber-50 text-amber-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }
                  `}
                >
                  <item.icon size={20} className={isActive ? 'text-amber-600' : ''} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}