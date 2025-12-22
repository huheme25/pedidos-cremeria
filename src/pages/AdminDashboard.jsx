import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OrderCard from '../components/orders/OrderCard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    readyOrders: 0,
    totalClients: 0,
    totalProducts: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orders, clients, products] = await Promise.all([
        base44.entities.Order.list('-created_date'),
        base44.entities.Client.list(),
        base44.entities.Product.list()
      ]);

      const pendingOrders = orders.filter(o => 
        ['pendiente_revision', 'en_surtido'].includes(o.status)
      ).length;

      const readyOrders = orders.filter(o => o.status === 'listo_captura').length;

      const totalRevenue = orders
        .filter(o => o.status === 'listo_captura')
        .reduce((sum, o) => sum + (o.total_final || o.total_estimated || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        readyOrders,
        totalClients: clients.length,
        totalProducts: products.filter(p => p.is_active).length,
        totalRevenue
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Pedidos',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pendientes',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50'
    },
    {
      title: 'Listos para Captura',
      value: stats.readyOrders,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ventas Completadas',
      value: `$${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-slate-200 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`${stat.color.replace('bg-', 'text-')}`} size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Pedidos Recientes</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(createPageUrl('AdminOrders'))}
                className="text-amber-600 hover:text-amber-700"
              >
                Ver todos
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay pedidos aún</p>
              ) : (
                recentOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showClient={true}
                    onClick={() => navigate(createPageUrl('AdminOrderDetail') + `?id=${order.id}`)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} />
                Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-800">{stats.totalClients}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(createPageUrl('AdminClients'))}
                >
                  Gestionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package size={20} />
                Productos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-800">{stats.totalProducts}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(createPageUrl('AdminProducts'))}
                >
                  Gestionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm text-amber-700">Listos para Punto Zero</p>
                  <p className="text-2xl font-bold text-amber-800">{stats.readyOrders}</p>
                </div>
              </div>
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => navigate(createPageUrl('AdminOrders') + '?status=listo_captura')}
              >
                Ver y Exportar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}