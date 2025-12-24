import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Calendar, User, FileText, Package, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import StatusBadge from '../components/orders/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function WarehouseOrderDetail() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [products, setProducts] = useState({});
  const [fulfilledQuantities, setFulfilledQuantities] = useState({});
  const [finalBilledQuantities, setFinalBilledQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [user, setUser] = useState(null);

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

      const [currentUser, orderData, lines] = await Promise.all([
        base44.auth.me(),
        base44.entities.Order.filter({ id: orderId }),
        base44.entities.OrderLine.filter({ order_id: orderId })
      ]);

      setUser(currentUser);

      if (orderData.length > 0) {
        setOrder(orderData[0]);
        
        // Load product details
        const productIds = [...new Set(lines.map(l => l.product_id))];
        const productsData = await base44.entities.Product.filter({ 
          id: { $in: productIds } 
        });
        const productsMap = {};
        productsData.forEach(p => {
          productsMap[p.id] = p;
        });
        setProducts(productsMap);

        // Filter lines based on user role
        let filteredLines = lines;
        if (currentUser.user_role === 'bodega_secos') {
          filteredLines = lines.filter(l => {
            const product = productsMap[l.product_id];
            return product?.warehouse_type === 'secos' || product?.warehouse_type === 'mixto';
          });
        } else if (currentUser.user_role === 'bodega_refrigerados') {
          filteredLines = lines.filter(l => {
            const product = productsMap[l.product_id];
            return product?.warehouse_type === 'refrigerados' || product?.warehouse_type === 'mixto';
          });
        } else if (currentUser.user_role === 'bodega_barra') {
          filteredLines = lines.filter(l => {
            const product = productsMap[l.product_id];
            return product?.warehouse_type === 'barra' || product?.warehouse_type === 'mixto';
          });
        }

        setOrderLines(filteredLines);
        
        const initialQuantities = {};
        const initialBilledQuantities = {};
        filteredLines.forEach(line => {
          initialQuantities[line.id] = line.quantity_fulfilled ?? line.quantity_requested;
          initialBilledQuantities[line.id] = line.final_billed_quantity ?? line.quantity_fulfilled ?? line.quantity_requested;
        });
        setFulfilledQuantities(initialQuantities);
        setFinalBilledQuantities(initialBilledQuantities);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startFulfillment = async () => {
    setSaving(true);
    try {
      await base44.entities.Order.update(order.id, { status: 'en_surtido' });
      setOrder({ ...order, status: 'en_surtido' });
      toast.success('Pedido marcado como "En surtido"');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar el pedido');
    } finally {
      setSaving(false);
    }
  };

  const completeFulfillment = async () => {
    setSaving(true);
    try {
      // Update order lines with fulfilled and final billed quantities
      const updatePromises = orderLines.map(line => {
        const product = products[line.product_id];
        const updateData = {
          quantity_fulfilled: fulfilledQuantities[line.id] || 0
        };

        // If product has final measurement, save final billed quantity
        if (product?.has_final_measurement) {
          updateData.final_billed_quantity = finalBilledQuantities[line.id] || 0;
        }

        return base44.entities.OrderLine.update(line.id, updateData);
      });
      await Promise.all(updatePromises);

      // Calculate final total based on final billed quantities or fulfilled quantities
      const totalFinal = orderLines.reduce((sum, line) => {
        const product = products[line.product_id];
        const qty = product?.has_final_measurement 
          ? (finalBilledQuantities[line.id] || 0)
          : (fulfilledQuantities[line.id] || 0);
        return sum + (qty * line.unit_price);
      }, 0);

      await base44.entities.Order.update(order.id, { 
        status: 'listo_revision',
        total_final: totalFinal
      });

      toast.success('Pedido completado y listo para revisión');
      navigate(createPageUrl('WarehouseOrders'));
    } catch (error) {
      console.error(error);
      toast.error('Error al completar el surtido');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const updateQuantity = (lineId, value) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setFulfilledQuantities({ ...fulfilledQuantities, [lineId]: numValue });
  };

  const updateFinalBilledQuantity = (lineId, value) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setFinalBilledQuantities({ ...finalBilledQuantities, [lineId]: numValue });
  };

  const hasShortages = orderLines.some(line => 
    (fulfilledQuantities[line.id] || 0) < line.quantity_requested
  );

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('WarehouseOrders'))}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">
              Surtir Pedido #{order.order_number || order.id?.slice(-6).toUpperCase()}
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
                <p className="text-xs text-slate-500 mb-1">Notas del cliente</p>
                <p className="text-slate-700">{order.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'pendiente_revision' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 mb-3">
            Este pedido está pendiente de surtido. Presiona el botón para iniciar.
          </p>
          <Button 
            onClick={startFulfillment}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Procesando...' : 'Iniciar Surtido'}
          </Button>
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package size={20} />
            Productos a Surtir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderLines.map((line) => {
              const product = products[line.product_id];
              const fulfilled = fulfilledQuantities[line.id] || 0;
              const finalBilled = finalBilledQuantities[line.id] || 0;
              const isShort = fulfilled < line.quantity_requested;
              
              return (
                <div 
                  key={line.id} 
                  className={`p-4 rounded-xl border ${isShort ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{line.product_name}</p>
                        <p className="text-sm text-slate-500">{line.product_sku} · {line.unit}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          Solicitado: <span className="font-medium">{line.quantity_requested} {line.quantity_requested_unit || line.unit}</span>
                        </p>
                      </div>
                    </div>
                    
                    {order.status === 'en_surtido' && (
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-600 mb-1.5 block">
                              Cantidad Surtida
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fulfilled}
                                onChange={(e) => updateQuantity(line.id, e.target.value)}
                                className="text-center"
                              />
                              {isShort && (
                                <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                              )}
                            </div>
                          </div>

                          {product?.has_final_measurement && (
                            <div>
                              <Label className="text-xs text-slate-600 mb-1.5 block">
                                Medición Final ({product.final_measurement_unit})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={finalBilled}
                                onChange={(e) => updateFinalBilledQuantity(line.id, e.target.value)}
                                className="text-center bg-blue-50"
                              />
                            </div>
                          )}
                        </div>

                        {product?.has_final_measurement && (
                          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            Se cobrará por: {finalBilled} {product.final_measurement_unit}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {order.status === 'en_surtido' && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              {hasShortages && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <p className="text-sm text-amber-700">
                    Hay productos con faltantes. El vendedor podrá ajustar las cantidades.
                  </p>
                </div>
              )}
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Check size={18} className="mr-2" />
                Completar Surtido
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Surtido</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              ¿Confirmas que has surtido todos los productos? El pedido pasará a revisión con el vendedor.
            </p>
            {hasShortages && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                <p className="text-sm text-amber-700">
                  Este pedido tiene productos con faltantes.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={completeFulfillment}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}