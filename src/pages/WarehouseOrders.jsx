import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Search, Warehouse, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderCard from '../components/orders/OrderCard';

export default function WarehouseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pendiente_revision');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const allOrders = await base44.entities.Order.list('-created_date');
      setOrders(allOrders.filter(o => 
        ['pendiente_revision', 'en_surtido'].includes(o.status)
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === 'pendiente_revision').length;
  const inProgressCount = orders.filter(o => o.status === 'en_surtido').length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Warehouse className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pedidos a Surtir</h1>
          <p className="text-slate-500 text-sm">Gestiona los pedidos desde bodega</p>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendiente_revision" className="relative">
            Pendientes
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="en_surtido" className="relative">
            En Surtido
            {inProgressCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {inProgressCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Buscar por número o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            {statusFilter === 'pendiente_revision' 
              ? 'No hay pedidos pendientes' 
              : 'No hay pedidos en surtido'}
          </h3>
          <p className="text-slate-500">Los pedidos aparecerán aquí cuando los clientes los creen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showClient={true}
              onClick={() => navigate(createPageUrl('WarehouseOrderDetail') + `?id=${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}