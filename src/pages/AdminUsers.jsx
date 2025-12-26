import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Search, 
  Users, 
  Pencil,
  Mail,
  Shield,
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    user_role: 'cliente',
    assigned_client_id: '',
    assigned_client_name: '',
    assigned_clients: [],
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, clientsData] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Client.list()
      ]);
      
      // Get all users including those without User entity data
      const allUsers = usersData.map(u => ({
        ...u,
        hasEntityData: true
      }));
      
      setUsers(allUsers);
      setClients(clientsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      user_role: user.user_role || 'cliente',
      assigned_client_id: user.assigned_client_id || '',
      assigned_client_name: user.assigned_client_name || '',
      assigned_clients: user.assigned_clients || [],
      phone: user.phone || ''
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...formData };
      
      // Handle client assignments based on role
      if (data.user_role === 'cliente') {
        // Cliente must have a client assigned
        if (!data.assigned_client_id) {
          toast.error('Selecciona un cliente para este usuario');
          setSaving(false);
          return;
        }
        if (data.assigned_client_id) {
          const client = clients.find(c => c.id === data.assigned_client_id);
          data.assigned_client_name = client?.business_name || '';
        }
        data.assigned_clients = []; // Client role has only one assigned client
      } else if (data.user_role === 'vendedor') {
        // Vendedor can have multiple clients
        data.assigned_client_id = null;
        data.assigned_client_name = null;
      } else { // Bodega roles and Admin should have NO client assignments
        data.assigned_client_id = null;
        data.assigned_client_name = null;
        data.assigned_clients = [];
      }

      await base44.entities.User.update(editingUser.id, data);
      toast.success('Usuario actualizado');
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignedClient = (clientId, clientName) => {
    const current = formData.assigned_clients || [];
    const exists = current.find(c => c.client_id === clientId);
    
    if (exists) {
      setFormData({
        ...formData,
        assigned_clients: current.filter(c => c.client_id !== clientId)
      });
    } else {
      setFormData({
        ...formData,
        assigned_clients: [...current, { client_id: clientId, client_name: clientName }]
      });
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      cliente: 'Cliente',
      bodega_secos: 'Bodega Secos',
      bodega_refrigerados: 'Bodega Refrigerados',
      bodega_barra: 'Bodega Barra',
      vendedor: 'Vendedor',
      admin: 'Administrador'
    };
    return labels[role] || role || 'Sin rol';
  };

  const getRoleColor = (role) => {
    const colors = {
      cliente: 'bg-blue-100 text-blue-800',
      bodega_secos: 'bg-teal-100 text-teal-800',
      bodega_refrigerados: 'bg-cyan-100 text-cyan-800',
      bodega_barra: 'bg-orange-100 text-orange-800',
      vendedor: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
            <p className="text-slate-500 text-sm">{users.length} usuarios registrados</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-amber-800 text-sm">
          <strong>Nota:</strong> Para agregar nuevos usuarios, invítalos desde la sección de configuración de la app. 
          Aquí puedes asignarles roles y clientes.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-slate-600">
                      {user.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{user.full_name || 'Sin nombre'}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail size={14} />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleColor(user.user_role)} variant="secondary">
                        <Shield size={12} className="mr-1" />
                        {getRoleLabel(user.user_role)}
                      </Badge>
                      {user.user_role === 'cliente' && user.assigned_client_name && (
                        <Badge variant="outline" className="text-slate-600">
                          <Building2 size={12} className="mr-1" />
                          {user.assigned_client_name}
                        </Badge>
                      )}
                      {user.user_role === 'vendedor' && user.assigned_clients?.length > 0 && (
                        <Badge variant="outline" className="text-slate-600">
                          <Building2 size={12} className="mr-1" />
                          {user.assigned_clients.length} clientes asignados
                        </Badge>
                      )}
                      {(user.user_role === 'bodega_secos' || user.user_role === 'bodega_refrigerados' || user.user_role === 'bodega_barra') && (
                        <Badge variant="outline" className="text-slate-600">
                          Todos los pedidos
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => openEditDialog(user)}
                >
                  <Pencil size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Usuario</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Usuario</p>
              <p className="font-medium">{editingUser?.full_name}</p>
              <p className="text-sm text-slate-500">{editingUser?.email}</p>
            </div>

            <div>
              <Label>Rol en la App</Label>
              <Select 
                value={formData.user_role} 
                onValueChange={(v) => {
                  const newFormData = { ...formData, user_role: v };
                  // Clear all client-related fields when changing role to ensure no leftover data
                  newFormData.assigned_client_id = '';
                  newFormData.assigned_client_name = '';
                  newFormData.assigned_clients = [];
                  setFormData(newFormData);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="bodega_secos">Bodega Secos</SelectItem>
                  <SelectItem value="bodega_refrigerados">Bodega Refrigerados</SelectItem>
                  <SelectItem value="bodega_barra">Bodega Barra</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.user_role === 'cliente' && (
              <div>
                <Label>Cliente Asignado</Label>
                <Select 
                  value={formData.assigned_client_id || ''}
                  onValueChange={(v) => {
                    const client = clients.find(c => c.id === v);
                    setFormData({ 
                      ...formData, 
                      assigned_client_id: v,
                      assigned_client_name: client?.business_name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ninguno</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.user_role === 'vendedor' && (
              <div>
                <Label className="mb-2 block">Clientes Asignados</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {clients.map(client => {
                    const isSelected = formData.assigned_clients?.some(c => c.client_id === client.id);
                    return (
                      <div 
                        key={client.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAssignedClient(client.id, client.business_name)}
                        />
                        <span className="text-sm">{client.business_name}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.assigned_clients?.length || 0} cliente(s) seleccionado(s)
                </p>
              </div>
            )}

            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Teléfono del usuario"
              />
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