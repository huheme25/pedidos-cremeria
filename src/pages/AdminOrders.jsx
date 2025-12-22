import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Search, 
  ClipboardList, 
  Package, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
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
import { toast } from 'sonner';
import OrderCard from '../components/orders/OrderCard';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    loadData();
    
    // Check for URL params
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, clientsData] = await Promise.all([
        base44.entities.Order.list('-created_date'),
        base44.entities.Client.list()
      ]);
      setOrders(ordersData);
      setClients(clientsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesClient = clientFilter === 'all' || order.client_id === clientFilter;
    const matchesSearch = !searchTerm || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateRange.from) {
      const orderDate = new Date(order.created_date);
      matchesDate = orderDate >= dateRange.from;
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59);
        matchesDate = matchesDate && orderDate <= endDate;
      }
    }
    
    return matchesStatus && matchesClient && matchesSearch && matchesDate;
  });

  const exportToCSV = async () => {
    try {
      const ordersToExport = filteredOrders.filter(o => o.status === 'listo_captura');
      
      if (ordersToExport.length === 0) {
        toast.error('No hay pedidos listos para exportar');
        return;
      }

      // Get all order lines for these orders
      const allLines = [];
      for (const order of ordersToExport) {
        const lines = await base44.entities.OrderLine.filter({ order_id: order.id });
        lines.forEach(line => {
          allLines.push({
            'Número de Pedido': order.order_number || order.id?.slice(-6).toUpperCase(),
            'Cliente': order.client_name,
            'Fecha': format(new Date(order.created_date), "dd/MM/yyyy HH:mm"),
            'Producto': line.product_name,
            'SKU': line.product_sku,
            'Unidad': line.unit,
            'Cantidad Surtida': line.quantity_fulfilled || line.quantity_requested,
            'Precio Unitario': line.unit_price,
            'Subtotal': (line.quantity_fulfilled || line.quantity_requested) * line.unit_price,
            'Notas': order.notes || ''
          });
        });
      }

      // Convert to CSV
      const headers = Object.keys(allLines[0]);
      const csvContent = [
        headers.join(','),
        ...allLines.map(row => 
          headers.map(h => {
            const value = row[h];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pedidos_punto_zero_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      link.click();

      toast.success(`${ordersToExport.length} pedido(s) exportado(s)`);
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const readyCount = filteredOrders.filter(o => o.status === 'listo_captura').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="text-slate-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Todos los Pedidos</h1>
            <p className="text-slate-500 text-sm">{filteredOrders.length} pedidos encontrados</p>
          </div>
        </div>
        
        {readyCount > 0 && (
          <Button 
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download size={18} className="mr-2" />
            Exportar Listos ({readyCount})
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estatus</SelectItem>
            <SelectItem value="pendiente_revision">Pendiente de revisión</SelectItem>
            <SelectItem value="en_surtido">En surtido</SelectItem>
            <SelectItem value="listo_revision">Listo para revisión</SelectItem>
            <SelectItem value="ajustado">Ajustado</SelectItem>
            <SelectItem value="listo_captura">Listo para captura</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.business_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
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
          <p className="text-slate-500">Ajusta los filtros para ver más resultados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showClient={true}
              showSeller={true}
              onClick={() => navigate(createPageUrl('AdminOrderDetail') + `?id=${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}