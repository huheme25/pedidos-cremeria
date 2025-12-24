import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, Tag, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function UpsellingSuggestions({ 
  open, 
  onClose, 
  onConfirm, 
  cart, 
  products, 
  client,
  onAddToCart,
  submitting,
  totalAmount,
  itemCount,
  notes
}) {
  const [suggestions, setSuggestions] = useState({ frequent: [], offers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      loadSuggestions();
    }
  }, [open, client]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // Get client's order history
      const orders = await base44.entities.Order.filter({ 
        client_id: client.id,
        status: { $ne: 'cancelado' }
      }, '-created_date', 50);

      // Get all order lines from past orders
      const orderIds = orders.map(o => o.id);
      let allOrderLines = [];
      
      for (const orderId of orderIds) {
        const lines = await base44.entities.OrderLine.filter({ order_id: orderId });
        allOrderLines = [...allOrderLines, ...lines];
      }

      // Count product frequency
      const productFrequency = {};
      allOrderLines.forEach(line => {
        if (!productFrequency[line.product_id]) {
          productFrequency[line.product_id] = 0;
        }
        productFrequency[line.product_id]++;
      });

      // Get products not in current cart
      const cartProductIds = cart.map(item => item.product_id);
      
      // Find frequently ordered products not in cart
      const frequentProducts = Object.entries(productFrequency)
        .filter(([productId]) => !cartProductIds.includes(productId))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([productId]) => products.find(p => p.id === productId))
        .filter(Boolean);

      // Find products on offer
      const offerProducts = products
        .filter(p => 
          p.is_on_offer && 
          p.offer_price && 
          !cartProductIds.includes(p.id)
        )
        .slice(0, 4);

      setSuggestions({
        frequent: frequentProducts,
        offers: offerProducts
      });
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAndContinue = (product) => {
    onAddToCart(product);
    toast.success(`${product.name} agregado al pedido`);
  };

  const hasSuggestions = suggestions.frequent.length > 0 || suggestions.offers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="text-amber-500" size={24} />
            ¿Algo más antes de enviar?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Order summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-600">Tu pedido actual:</p>
                <p className="text-lg font-semibold text-slate-800">{itemCount} productos</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Total:</p>
                <p className="text-xl font-bold text-amber-600">
                  ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {notes && (
              <p className="text-xs text-slate-500 mt-2">Notas: {notes}</p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <>
              {/* Offers section */}
              {suggestions.offers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="text-red-500" size={20} />
                    <h3 className="font-semibold text-slate-800">Ofertas Especiales</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {suggestions.offers.map(product => (
                      <Card key={product.id} className="border-red-200 bg-red-50/30">
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                              {product.image_url_offer || product.image_url ? (
                                <img 
                                  src={product.image_url_offer || product.image_url} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover rounded-lg" 
                                />
                              ) : (
                                <Package className="text-slate-400" size={20} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{product.name}</p>
                              <p className="text-xs text-slate-500">{product.sku}</p>
                              {product.offer_description && (
                                <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                                  {product.offer_description}
                                </Badge>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs line-through text-slate-400">
                                  ${product.clientPrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-sm font-bold text-red-600">
                                  ${product.offer_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleAddAndContinue(product)}
                          >
                            <Plus size={14} className="mr-1" />
                            Agregar Oferta
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Frequent products section */}
              {suggestions.frequent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="text-blue-500" size={20} />
                    <h3 className="font-semibold text-slate-800">Productos que sueles pedir</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {suggestions.frequent.map(product => (
                      <Card key={product.id} className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover rounded-lg" 
                                />
                              ) : (
                                <Package className="text-slate-400" size={20} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{product.name}</p>
                              <p className="text-xs text-slate-500">{product.sku}</p>
                              <p className="text-sm font-semibold text-amber-600 mt-1">
                                ${product.effectivePrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full mt-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleAddAndContinue(product)}
                          >
                            <Plus size={14} className="mr-1" />
                            Agregar
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {!hasSuggestions && (
                <div className="text-center py-8">
                  <Package size={48} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay sugerencias disponibles en este momento</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Seguir Comprando
          </Button>
          <Button 
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : 'Enviar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}