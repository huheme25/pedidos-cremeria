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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Package, Plus } from 'lucide-react';

export default function AddProductDialog({ open, onClose, onAdd, clientPriceList }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await base44.entities.Product.filter({ is_active: true });
      const productsWithPrice = productsData.map(p => ({
        ...p,
        clientPrice: p[clientPriceList] || p.wholesale_price
      }));
      setProducts(productsWithPrice);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd({
        product_id: selectedProduct.id,
        product_sku: selectedProduct.sku,
        product_name: selectedProduct.name,
        unit: selectedProduct.unit,
        quantity_requested: quantity,
        quantity_requested_unit: selectedProduct.unit,
        unit_price: selectedProduct.clientPrice,
        subtotal: selectedProduct.clientPrice * quantity
      });
      setSelectedProduct(null);
      setQuantity(1);
      setSearchTerm('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Agregar Producto al Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Buscar producto por nombre o clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedProduct ? (
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-slate-800">{selectedProduct.name}</p>
                    <p className="text-sm text-slate-500">{selectedProduct.sku} · {selectedProduct.unit}</p>
                    <p className="text-lg font-semibold text-amber-600 mt-1">
                      ${selectedProduct.clientPrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cambiar
                  </Button>
                </div>

                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>

                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Subtotal:</span>
                    <span className="text-lg font-bold text-slate-800">
                      ${(selectedProduct.clientPrice * quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No se encontraron productos</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:border-amber-200 hover:bg-amber-50 transition-colors"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sku} · {product.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-600">
                            ${product.clientPrice?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {selectedProduct && (
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleAdd}
            >
              <Plus size={18} className="mr-2" />
              Agregar Producto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}