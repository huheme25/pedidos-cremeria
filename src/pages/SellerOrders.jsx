import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Search, ClipboardList, Package, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OrderCard from '../components/orders/OrderCard';

export default function SellerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const assignedClientIds = currentUser?.assigned_clients?.map(c => c.client_id) || [];
      
      if (assignedClientIds.length > 0) {
        const allOrders = await base44.entities.Order.list('-created_date');
        const sellerOrders = allOrders.filter(o => assignedClientIds.includes(o.client_id));
        setOrders(sellerOrders);
      } else {
        // If no assigned clients, show all orders for demo
        const allOrders = await base44.entities.Order.list('-created_date');
        setOrders(allOrders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateRange.from) {
      const orderDate = new Date(order.created_date);
      matchesDate = orderDate >= dateRange.from;
      if (dateRange.to) {
        matchesDate = matchesDate && orderDate <= dateRange.to;
      }
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <ClipboardList className="text-indigo-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pedidos de Clientes</h1>
          <p className="text-slate-500 text-sm">Revisa y ajusta los pedidos</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar por número o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estatus</SelectItem>
            <SelectItem value="listo_revision">Listo para revisión</SelectItem>
            <SelectItem value="ajustado">Ajustado</SelectItem>
            <SelectItem value="listo_captura">Listo para captura</SelectItem>
            <SelectItem value="pendiente_revision">Pendiente</SelectItem>
            <SelectItem value="en_surtido">En surtido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Calendar size={16} className="mr-2" />
              {dateRange.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy')
                )
              ) : (
                'Fechas'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              locale={es}
            />
            {(dateRange.from || dateRange.to) && (
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setDateRange({ from: null, to: null })}
                >
                  Limpiar filtro
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No hay pedidos</h3>
          <p className="text-slate-500">Los pedidos de tus clientes aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showClient={true}
              onClick={() => navigate(createPageUrl('SellerOrderDetail') + `?id=${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}