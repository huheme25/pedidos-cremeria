import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Plus, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrderCard from '../components/orders/OrderCard';

export default function ClientOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser?.assigned_client_id) {
        const clientOrders = await base44.entities.Order.filter(
          { client_id: currentUser.assigned_client_id },
          '-created_date'
        );
        setOrders(clientOrders);
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
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!user?.assigned_client_id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Sin cliente asignado</h2>
        <p className="text-slate-500">Contacta al administrador para asignarte un cliente.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Pedidos</h1>
          <p className="text-slate-500 text-sm mt-1">{user?.assigned_client_name}</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('NewOrder'))}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar por número..."
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
            <SelectItem value="pendiente_revision">Pendiente de revisión</SelectItem>
            <SelectItem value="en_surtido">En surtido</SelectItem>
            <SelectItem value="listo_revision">Listo para revisión</SelectItem>
            <SelectItem value="ajustado">Ajustado</SelectItem>
            <SelectItem value="listo_captura">Listo para captura</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No hay pedidos</h3>
          <p className="text-slate-500 mb-4">Crea tu primer pedido para empezar</p>
          <Button 
            onClick={() => navigate(createPageUrl('NewOrder'))}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            Crear Pedido
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showClient={false}
              onClick={() => navigate(createPageUrl('OrderDetail') + `?id=${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}