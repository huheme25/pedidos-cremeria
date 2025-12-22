import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Search, 
  Plus, 
  Users, 
  Pencil,
  Phone,
  Mail,
  MapPin,
  Building2
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    rfc: '',
    delivery_address: '',
    phone: '',
    email: '',
    route_zone: '',
    client_type: 'mayorista_b',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await base44.entities.Client.list();
      setClients(clientsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.route_zone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewDialog = () => {
    setEditingClient(null);
    setFormData({
      business_name: '',
      legal_name: '',
      rfc: '',
      delivery_address: '',
      phone: '',
      email: '',
      route_zone: '',
      client_type: 'mayorista_b',
      is_active: true
    });
    setShowDialog(true);
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setFormData({
      business_name: client.business_name || '',
      legal_name: client.legal_name || '',
      rfc: client.rfc || '',
      delivery_address: client.delivery_address || '',
      phone: client.phone || '',
      email: client.email || '',
      route_zone: client.route_zone || '',
      client_type: client.client_type || 'mayorista_b',
      is_active: client.is_active !== false
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.business_name) {
      toast.error('El nombre comercial es requerido');
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await base44.entities.Client.update(editingClient.id, formData);
        toast.success('Cliente actualizado');
      } else {
        await base44.entities.Client.create(formData);
        toast.success('Cliente creado');
      }
      setShowDialog(false);
      loadClients();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      mayorista_a: 'Mayorista A',
      mayorista_b: 'Mayorista B',
      mayorista_c: 'Mayorista C'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      mayorista_a: 'bg-green-100 text-green-800',
      mayorista_b: 'bg-blue-100 text-blue-800',
      mayorista_c: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Users className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
            <p className="text-slate-500 text-sm">{clients.length} clientes registrados</p>
          </div>
        </div>
        <Button 
          onClick={openNewDialog}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Buscar por nombre, RFC o zona..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Building2 className="text-slate-500" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{client.business_name}</p>
                    <Badge className={getTypeColor(client.client_type)} variant="secondary">
                      {getTypeLabel(client.client_type)}
                    </Badge>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => openEditDialog(client)}
                >
                  <Pencil size={16} />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.route_zone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} />
                    <span>{client.route_zone}</span>
                  </div>
                )}
              </div>

              {!client.is_active && (
                <Badge className="mt-3 bg-red-100 text-red-800" variant="secondary">
                  Inactivo
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nombre Comercial *</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Nombre del negocio"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Razón Social</Label>
                <Input
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="Razón social"
                />
              </div>
              <div>
                <Label>RFC</Label>
                <Input
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  placeholder="RFC"
                />
              </div>
              <div>
                <Label>Tipo de Cliente</Label>
                <Select 
                  value={formData.client_type} 
                  onValueChange={(v) => setFormData({ ...formData, client_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mayorista_a">Mayorista A</SelectItem>
                    <SelectItem value="mayorista_b">Mayorista B</SelectItem>
                    <SelectItem value="mayorista_c">Mayorista C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Teléfono"
                />
              </div>
              <div>
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <Label>Ruta/Zona</Label>
                <Input
                  value={formData.route_zone}
                  onChange={(e) => setFormData({ ...formData, route_zone: e.target.value })}
                  placeholder="Zona de reparto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Cliente activo</Label>
              </div>
              <div className="sm:col-span-2">
                <Label>Dirección de Entrega</Label>
                <Textarea
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="Dirección completa"
                  rows={2}
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