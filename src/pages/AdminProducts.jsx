import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Search, 
  Plus, 
  Package, 
  Pencil,
  DollarSign
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'quesos',
    unit: 'pieza',
    wholesale_price: '',
    image_url: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['quesos', 'cremas', 'mantequillas', 'yogures', 'leches', 'otros'];

  const openNewDialog = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category: 'quesos',
      unit: 'pieza',
      wholesale_price: '',
      image_url: '',
      is_active: true
    });
    setShowDialog(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || 'quesos',
      unit: product.unit || 'pieza',
      wholesale_price: product.wholesale_price?.toString() || '',
      image_url: product.image_url || '',
      is_active: product.is_active !== false
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.sku || !formData.wholesale_price) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        wholesale_price: parseFloat(formData.wholesale_price)
      };

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, data);
        toast.success('Producto actualizado');
      } else {
        await base44.entities.Product.create(data);
        toast.success('Producto creado');
      }
      setShowDialog(false);
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
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

  const getCategoryColor = (cat) => {
    const colors = {
      quesos: 'bg-yellow-100 text-yellow-800',
      cremas: 'bg-orange-100 text-orange-800',
      mantequillas: 'bg-amber-100 text-amber-800',
      yogures: 'bg-pink-100 text-pink-800',
      leches: 'bg-blue-100 text-blue-800',
      otros: 'bg-gray-100 text-gray-800'
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Package className="text-amber-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
            <p className="text-slate-500 text-sm">{products.length} productos registrados</p>
          </div>
        </div>
        <Button 
          onClick={openNewDialog}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar por nombre o clave..."
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border-slate-200 hover:shadow-md transition-shadow">
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sku}</p>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getCategoryColor(product.category)} variant="secondary">
                      {getCategoryLabel(product.category)}
                    </Badge>
                    <span className="text-xs text-slate-500">{product.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-amber-600 font-semibold">
                    <DollarSign size={14} />
                    <span>{product.wholesale_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              
              {!product.is_active && (
                <Badge className="mt-3 bg-red-100 text-red-800" variant="secondary">
                  Inactivo
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Clave (SKU) *</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="QSO001"
                />
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Queso Oaxaca 1kg"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidad</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="paquete">Paquete</SelectItem>
                    <SelectItem value="kg">Kilogramo</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Precio Mayorista *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wholesale_price}
                  onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Producto activo</Label>
              </div>
              <div className="sm:col-span-2">
                <Label>URL de imagen (opcional)</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}