import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Calendar, User, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from '../components/orders/StatusBadge';

export default function OrderDetail() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('id');
      
      if (!orderId) {
        navigate(-1);
        return;
      }

      const [orderData, lines] = await Promise.all([
        base44.entities.Order.filter({ id: orderId }),
        base44.entities.OrderLine.filter({ order_id: orderId })
      ]);

      if (orderData.length > 0) {
        setOrder(orderData[0]);
        setOrderLines(lines);
      }
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

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500">Pedido no encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          Volver
        </Button>
      </div>
    );
  }

  const showFulfilled = ['en_surtido', 'listo_revision', 'ajustado', 'listo_captura'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">
              Pedido #{order.order_number || order.id?.slice(-6).toUpperCase()}
            </h1>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-slate-600">
              <User size={18} />
              <div>
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="font-medium text-slate-800">{order.client_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar size={18} />
              <div>
                <p className="text-xs text-slate-500">Fecha de creación</p>
                <p className="font-medium text-slate-800">
                  {format(new Date(order.created_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {order.notes && (
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 mb-1">Notas</p>
                <p className="text-slate-700">{order.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package size={20} />
            Productos del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Producto</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Solicitado</th>
                  {showFulfilled && (
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Surtido</th>
                  )}
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Precio</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderLines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="py-3 px-2">
                      <p className="font-medium text-slate-800">{line.product_name}</p>
                      <p className="text-xs text-slate-500">{line.product_sku} · {line.unit}</p>
                    </td>
                    <td className="text-right py-3 px-2 text-slate-700">
                      {line.quantity_requested}
                    </td>
                    {showFulfilled && (
                      <td className="text-right py-3 px-2">
                        <span className={
                          line.quantity_fulfilled !== undefined && line.quantity_fulfilled !== line.quantity_requested
                            ? 'text-amber-600 font-medium'
                            : 'text-slate-700'
                        }>
                          {line.quantity_fulfilled ?? '-'}
                        </span>
                      </td>
                    )}
                    <td className="text-right py-3 px-2 text-slate-600">
                      ${line.unit_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-slate-800">
                      ${(showFulfilled && line.quantity_fulfilled !== undefined 
                        ? line.quantity_fulfilled * line.unit_price 
                        : line.subtotal
                      )?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={showFulfilled ? 4 : 3} className="py-4 px-2 text-right font-semibold text-slate-700">
                    Total:
                  </td>
                  <td className="py-4 px-2 text-right text-xl font-bold text-amber-600">
                    ${(order.total_final || order.total_estimated || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}