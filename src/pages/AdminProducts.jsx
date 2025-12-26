import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Search, 
  Plus, 
  Package, 
  Pencil,
  DollarSign,
  Upload,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const navigate = useNavigate();
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
    warehouse_type: 'refrigerados',
    has_final_measurement: false,
    final_measurement_unit: '',
    price_list_1: '',
    price_list_2: '',
    price_list_3: '',
    price_list_4: '',
    price_list_5: '',
    is_master_product: false,
    master_product_id: '',
    variant_name: '',
    variant_order: '',
    image_url: '',
    is_active: true
  });
  const [masterProducts, setMasterProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData);
      // Load master products for variant selection
      const masters = productsData.filter(p => p.is_master_product === true);
      setMasterProducts(masters);
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
      warehouse_type: 'refrigerados',
      has_final_measurement: false,
      final_measurement_unit: '',
      price_list_1: '',
      price_list_2: '',
      price_list_3: '',
      price_list_4: '',
      price_list_5: '',
      is_master_product: false,
      master_product_id: '',
      variant_name: '',
      variant_order: '',
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
      warehouse_type: product.warehouse_type || 'refrigerados',
      has_final_measurement: product.has_final_measurement || false,
      final_measurement_unit: product.final_measurement_unit || '',
      price_list_1: product.price_list_1?.toString() || '',
      price_list_2: product.price_list_2?.toString() || '',
      price_list_3: product.price_list_3?.toString() || '',
      price_list_4: product.price_list_4?.toString() || '',
      price_list_5: product.price_list_5?.toString() || '',
      is_master_product: product.is_master_product || false,
      master_product_id: product.master_product_id || '',
      variant_name: product.variant_name || '',
      variant_order: product.variant_order?.toString() || '',
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

    // Validación de variantes
    if (formData.is_master_product && formData.master_product_id) {
      toast.error('Un producto maestro no puede ser variante de otro');
      return;
    }

    if (!formData.is_master_product && formData.master_product_id && !formData.variant_name) {
      toast.error('Las variantes deben tener un nombre de variante');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        wholesale_price: parseFloat(formData.wholesale_price) || 0,
        price_list_1: formData.price_list_1 ? parseFloat(formData.price_list_1) : undefined,
        price_list_2: formData.price_list_2 ? parseFloat(formData.price_list_2) : undefined,
        price_list_3: formData.price_list_3 ? parseFloat(formData.price_list_3) : undefined,
        price_list_4: formData.price_list_4 ? parseFloat(formData.price_list_4) : undefined,
        price_list_5: formData.price_list_5 ? parseFloat(formData.price_list_5) : undefined,
        variant_order: formData.variant_order ? parseInt(formData.variant_order) : undefined,
        master_product_id: formData.master_product_id || undefined,
        variant_name: formData.variant_name || undefined,
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(createPageUrl('AdminProductsImport'))}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <Upload size={18} className="mr-2" />
            Importar CSV
          </Button>
          <Button 
            onClick={openNewDialog}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            Nuevo Producto
          </Button>
        </div>
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

      <TooltipProvider>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4 relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8 absolute top-2 right-2"
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(product)}>
                      <Pencil size={14} className="mr-2" />
                      Editar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex gap-3 pr-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="text-slate-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-semibold text-slate-800 truncate cursor-help">{product.name}</p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{product.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-slate-500">{product.sku}</p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={getCategoryColor(product.category)} variant="secondary">
                        {getCategoryLabel(product.category)}
                      </Badge>
                      <span className="text-xs text-slate-500">{product.unit}</span>
                      {product.is_master_product && (
                        <Badge className="bg-purple-100 text-purple-800" variant="secondary">
                          Maestro
                        </Badge>
                      )}
                      {product.master_product_id && (
                        <Badge className="bg-indigo-100 text-indigo-800" variant="secondary">
                          {product.variant_name}
                        </Badge>
                      )}
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
      </TooltipProvider>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div>
                <Label>Tipo de Bodega</Label>
                <Select 
                  value={formData.warehouse_type} 
                  onValueChange={(v) => setFormData({ ...formData, warehouse_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secos">Secos</SelectItem>
                    <SelectItem value="refrigerados">Refrigerados</SelectItem>
                    <SelectItem value="barra">Barra</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Listas de Precios (opcional)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <Label className="text-xs">Lista 1</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_list_1}
                      onChange={(e) => setFormData({ ...formData, price_list_1: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lista 2</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_list_2}
                      onChange={(e) => setFormData({ ...formData, price_list_2: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lista 3</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_list_3}
                      onChange={(e) => setFormData({ ...formData, price_list_3: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lista 4</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_list_4}
                      onChange={(e) => setFormData({ ...formData, price_list_4: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lista 5</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_list_5}
                      onChange={(e) => setFormData({ ...formData, price_list_5: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.has_final_measurement}
                    onCheckedChange={(v) => setFormData({ ...formData, has_final_measurement: v })}
                  />
                  <Label>Requiere medición final diferente</Label>
                </div>
                {formData.has_final_measurement && (
                  <div>
                    <Label className="text-xs">Unidad de medición final</Label>
                    <Input
                      value={formData.final_measurement_unit}
                      onChange={(e) => setFormData({ ...formData, final_measurement_unit: e.target.value })}
                      placeholder="kg, litros, etc."
                    />
                  </div>
                )}
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
              <div className="sm:col-span-2 border-t pt-4 space-y-4">
                <Label className="text-sm font-semibold">Gestión de Variantes</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_master_product}
                    onCheckedChange={(v) => {
                      setFormData({ 
                        ...formData, 
                        is_master_product: v,
                        master_product_id: v ? '' : formData.master_product_id
                      });
                    }}
                  />
                  <Label>Es producto maestro (tiene variantes)</Label>
                </div>
                
                {!formData.is_master_product && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Producto Maestro</Label>
                      <Select 
                        value={formData.master_product_id} 
                        onValueChange={(v) => setFormData({ ...formData, master_product_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto maestro (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sin producto maestro</SelectItem>
                          {masterProducts.map(mp => (
                            <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.master_product_id && (
                      <>
                        <div>
                          <Label className="text-xs">Nombre de Variante *</Label>
                          <Input
                            value={formData.variant_name}
                            onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                            placeholder="ej: 1kg, 500g, Media Pieza"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Orden (opcional)</Label>
                          <Input
                            type="number"
                            value={formData.variant_order !== undefined ? formData.variant_order : ''}
                            onChange={(e) => setFormData({ ...formData, variant_order: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="1, 2, 3..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
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