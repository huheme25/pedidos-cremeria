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
  Package,
  DollarSign,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import UpsellingSuggestions from '../components/orders/UpsellingSuggestions';

export default function NewOrder() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [productVariants, setProductVariants] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showUpselling, setShowUpselling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentUser, productsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Product.filter({ is_active: true })
      ]);
      setUser(currentUser);

      if (!currentUser.assigned_client_id) {
        setLoading(false);
        return;
      }

      const clientData = await base44.entities.Client.filter({ id: currentUser.assigned_client_id });
      const clientInfo = clientData[0];
      setClient(clientInfo);

      // Get client's price list
      const priceList = clientInfo?.assigned_price_list || 'price_list_1';

      // Separate master products, standalone products, and variants
      const variants = productsData.filter(p => p.master_product_id);
      
      // Group variants by master product
      const variantsMap = {};
      variants.forEach(variant => {
        if (!variantsMap[variant.master_product_id]) {
          variantsMap[variant.master_product_id] = [];
        }
        
        // Add price information to variant
        const clientPrice = variant[priceList] || variant.wholesale_price;
        const effectivePrice = (variant.is_on_offer && variant.offer_price && variant.offer_price < clientPrice) 
          ? variant.offer_price 
          : clientPrice;
        
        variantsMap[variant.master_product_id].push({
          ...variant,
          clientPrice: clientPrice,
          effectivePrice: effectivePrice,
          isDiscounted: effectivePrice < clientPrice
        });
      });
      
      // Sort variants by variant_order
      Object.keys(variantsMap).forEach(masterId => {
        variantsMap[masterId].sort((a, b) => (a.variant_order || 0) - (b.variant_order || 0));
      });
      
      setProductVariants(variantsMap);

      // Map all products with correct price based on client's price list
      const productsWithPrice = productsData.map(p => {
        const clientPrice = p[priceList] || p.wholesale_price;
        const effectivePrice = (p.is_on_offer && p.offer_price && p.offer_price < clientPrice) 
          ? p.offer_price 
          : clientPrice;
        
        return {
          ...p,
          clientPrice: clientPrice,
          effectivePrice: effectivePrice,
          isDiscounted: effectivePrice < clientPrice
        };
      });

      // Store all products for reference
      setProductsList(productsWithPrice);
      
      // Set main products to display (master products and standalone products)
      setProducts(productsWithPrice.filter(p => p.is_master_product || (!p.is_master_product && !p.master_product_id)));
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

  const categories = [...new Set(productsList.map(p => p.category))];

  const addToCart = (product) => {
    if (product.is_master_product) {
      toast.error('Selecciona una presentación primero');
      return;
    }

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
        unit_price: product.effectivePrice,
        quantity: 1,
        quantity_requested_unit: product.unit
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

  const handleContinueToUpselling = () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto al pedido');
      return;
    }
    setShowUpselling(true);
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
        quantity_requested_unit: item.quantity_requested_unit,
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
      setShowUpselling(false);
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
              const hasVariants = product.is_master_product && productVariants[product.id]?.length > 0;
              const variants = hasVariants ? productVariants[product.id] : null;
              const selectedVariantId = selectedVariants[product.id];
              
              let displayProduct = product;
              if (selectedVariantId) {
                const foundVariant = variants?.find(v => v.id === selectedVariantId);
                if (foundVariant) {
                  // Variant already has price info from variantsMap
                  displayProduct = foundVariant;
                }
              }

              const cartItem = cart.find(item => item.product_id === displayProduct.id);
              
              return (
                <Card key={product.id} className="border-slate-200 relative">
                  {displayProduct.is_on_offer && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                      <Tag size={12} className="mr-1" />
                      Oferta
                    </Badge>
                  )}
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {displayProduct.image_url ? (
                          <img src={displayProduct.image_url} alt={displayProduct.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">{displayProduct.sku} · {displayProduct.unit}</p>
                        
                        {hasVariants && (
                          <div className="mt-2">
                            <Select
                              value={selectedVariantId || ''}
                              onValueChange={(variantId) => {
                                setSelectedVariants({ ...selectedVariants, [product.id]: variantId });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Presentación" />
                              </SelectTrigger>
                              <SelectContent>
                                {variants.map(variant => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.variant_name} - ${variant.effectivePrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {(!hasVariants || selectedVariantId) && (
                          <div className="mt-1">
                            {displayProduct.isDiscounted ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs line-through text-slate-400">
                                  ${displayProduct.clientPrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-amber-600 font-semibold">
                                  ${displayProduct.effectivePrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ) : (
                              <p className="text-amber-600 font-semibold">
                                ${displayProduct.effectivePrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {displayProduct.offer_description && (
                              <p className="text-xs text-green-600 font-medium">{displayProduct.offer_description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(!hasVariants || selectedVariantId) && (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="icon" 
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(displayProduct.id, -1)}
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(displayProduct.id, 1)}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(displayProduct)}
                            className="border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Plus size={16} className="mr-1" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    )}
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
                onClick={handleContinueToUpselling}
              >
                Continuar
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
              onClick={handleContinueToUpselling}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      <UpsellingSuggestions
        open={showUpselling}
        onClose={() => setShowUpselling(false)}
        onConfirm={handleSubmit}
        cart={cart}
        products={products}
        client={client}
        onAddToCart={addToCart}
        submitting={submitting}
        totalAmount={getCartTotal()}
        itemCount={getCartItemCount()}
        notes={notes}
      />
    </div>
  );
}