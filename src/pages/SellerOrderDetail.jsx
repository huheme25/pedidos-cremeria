import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Calendar, User, FileText, Package, Check, Plus, Minus, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export default function SellerOrderDetail() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [adjustedQuantities, setAdjustedQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionType, setActionType] = useState('');

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
        
        const initialQuantities = {};
        lines.forEach(line => {
          initialQuantities[line.id] = line.quantity_fulfilled ?? line.quantity_requested;
        });
        setAdjustedQuantities(initialQuantities);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (lineId, delta) => {
    const current = adjustedQuantities[lineId] || 0;
    const newValue = Math.max(0, current + delta);
    setAdjustedQuantities({ ...adjustedQuantities, [lineId]: newValue });
  };

  const setQuantity = (lineId, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setAdjustedQuantities({ ...adjustedQuantities, [lineId]: numValue });
  };

  const calculateTotal = () => {
    return orderLines.reduce((sum, line) => {
      const qty = adjustedQuantities[line.id] || 0;
      return sum + (qty * line.unit_price);
    }, 0);
  };

  const saveAdjustments = async (finalStatus) => {
    setSaving(true);
    try {
      // Update all order lines with adjusted quantities
      const updatePromises = orderLines.map(line => 
        base44.entities.OrderLine.update(line.id, {
          quantity_fulfilled: adjustedQuantities[line.id] || 0
        })
      );
      await Promise.all(updatePromises);

      // Calculate and update total
      const totalFinal = calculateTotal();
      await base44.entities.Order.update(order.id, { 
        status: finalStatus,
        total_final: totalFinal
      });

      const statusMessages = {
        ajustado: 'Pedido ajustado correctamente',
        listo_captura: 'Pedido listo para captura en Punto Zero'
      };

      toast.success(statusMessages[finalStatus] || 'Pedido actualizado');
      navigate(createPageUrl('SellerOrders'));
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar el pedido');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const cancelOrder = async () => {
    setSaving(true);
    try {
      await base44.entities.Order.update(order.id, { status: 'cancelado' });
      toast.success('Pedido cancelado');
      navigate(createPageUrl('SellerOrders'));
    } catch (error) {
      console.error(error);
      toast.error('Error al cancelar el pedido');
    } finally {
      setSaving(false);
      setShowCancelDialog(false);
    }
  };

  const hasChanges = orderLines.some(line => {
    const adjusted = adjustedQuantities[line.id] || 0;
    const original = line.quantity_fulfilled ?? line.quantity_requested;
    return adjusted !== original;
  });

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

  const canEdit = ['listo_revision', 'ajustado'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('SellerOrders'))}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">
              Revisar Pedido #{order.order_number || order.id?.slice(-6).toUpperCase()}
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

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package size={20} />
            Productos del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderLines.map((line) => {
              const adjusted = adjustedQuantities[line.id] || 0;
              const requested = line.quantity_requested;
              const hasShortage = adjusted < requested;
              
              return (
                <div 
                  key={line.id} 
                  className={`p-4 rounded-xl border ${hasShortage ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{line.product_name}</p>
                      <p className="text-sm text-slate-500">{line.product_sku} · {line.unit}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-slate-600">
                          Solicitado: <span className="font-medium">{requested}</span>
                        </span>
                        <span className="text-slate-600">
                          Surtido: <span className={`font-medium ${hasShortage ? 'text-amber-600' : ''}`}>
                            {line.quantity_fulfilled ?? '-'}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(line.id, -1)}
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={adjusted}
                          onChange={(e) => setQuantity(line.id, e.target.value)}
                          className="w-20 text-center"
                        />
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(line.id, 1)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="font-medium text-slate-800">
                          Cantidad: {line.quantity_fulfilled ?? line.quantity_requested}
                        </p>
                        <p className="text-sm text-slate-500">
                          ${((line.quantity_fulfilled ?? line.quantity_requested) * line.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-slate-700">Total:</span>
              <span className="text-2xl font-bold text-amber-600">
                ${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle size={18} className="mr-2" />
                  Cancelar Pedido
                </Button>
                <div className="flex-1" />
                <Button 
                  variant="outline"
                  onClick={() => {
                    setActionType('ajustado');
                    setShowConfirmDialog(true);
                  }}
                  disabled={saving}
                >
                  Guardar Ajustes
                </Button>
                <Button 
                  onClick={() => {
                    setActionType('listo_captura');
                    setShowConfirmDialog(true);
                  }}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check size={18} className="mr-2" />
                  Listo para Captura
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'listo_captura' ? 'Confirmar Pedido' : 'Guardar Ajustes'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              {actionType === 'listo_captura' 
                ? '¿Confirmas que el pedido está listo para capturarse en Punto Zero?'
                : '¿Deseas guardar los ajustes realizados al pedido?'
              }
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Final:</span>
                <span className="text-amber-600">
                  ${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className={actionType === 'listo_captura' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => saveAdjustments(actionType)}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              ¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Volver
            </Button>
            <Button 
              variant="destructive"
              onClick={cancelOrder}
              disabled={saving}
            >
              {saving ? 'Cancelando...' : 'Sí, Cancelar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}