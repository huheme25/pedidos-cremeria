import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function NewOrder() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentUser, productsList] = await Promise.all([
        base44.auth.me(),
        base44.entities.Product.filter({ is_active: true })
      ]);
      setUser(currentUser);
      setProducts(productsList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_sku: product.sku,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.wholesale_price,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto al pedido');
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;
      
      const order = await base44.entities.Order.create({
        order_number: orderNumber,
        client_id: user.assigned_client_id,
        client_name: user.assigned_client_name,
        status: 'pendiente_revision',
        notes: notes,
        total_estimated: getCartTotal()
      });

      const orderLines = cart.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_sku: item.product_sku,
        product_name: item.product_name,
        unit: item.unit,
        quantity_requested: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price
      }));

      await base44.entities.OrderLine.bulkCreate(orderLines);

      toast.success('Pedido creado exitosamente');
      navigate(createPageUrl('ClientOrders'));
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el pedido');
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      quesos: 'Quesos',
      cremas: 'Cremas',
      mantequillas: 'Mantequillas',
      yogures: 'Yogures',
      leches: 'Leches',
      otros: 'Otros'
    };
    return labels[cat] || cat;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('ClientOrders'))}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nuevo Pedido</h1>
          <p className="text-slate-500 text-sm">{user?.assigned_client_name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product_id === product.id);
              return (
                <Card key={product.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku} · {product.unit}</p>
                        <p className="text-amber-600 font-semibold mt-1">
                          ${product.wholesale_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-end gap-2">
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.id, -1)}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                          <Button 
                            size="icon" 
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.id, 1)}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(product)}
                          className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          <Plus size={16} className="mr-1" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Cart section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart size={20} />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No hay productos en el pedido
                </p>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                          <p className="text-xs text-slate-500">
                            {item.quantity} x ${item.unit_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            ${(item.quantity * item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-red-500"
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Estimado:</span>
                      <span className="text-amber-600">
                        ${getCartTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Notas del pedido
                </label>
                <Textarea
                  placeholder="Instrucciones especiales, comentarios..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={cart.length === 0}
                onClick={() => setShowConfirmDialog(true)}
              >
                Enviar Pedido
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile cart footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden z-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{getCartItemCount()} productos</p>
              <p className="text-lg font-semibold text-amber-600">
                ${getCartTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setShowConfirmDialog(true)}
            >
              Enviar Pedido
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              ¿Estás seguro de enviar este pedido con {getCartItemCount()} productos por un total de{' '}
              <span className="font-semibold text-amber-600">
                ${getCartTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>?
            </p>
            {notes && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Notas:</p>
                <p className="text-sm text-slate-700">{notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}