import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Package, 
  CheckCircle, 
  Pencil, 
  FileCheck, 
  XCircle 
} from 'lucide-react';

const statusConfig = {
  pendiente_revision: {
    label: 'Pendiente de revisión',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock
  },
  en_surtido: {
    label: 'En surtido',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package
  },
  listo_revision: {
    label: 'Listo para revisión',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: CheckCircle
  },
  ajustado: {
    label: 'Ajustado',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Pencil
  },
  listo_captura: {
    label: 'Listo para captura',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: FileCheck
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  }
};

export default function StatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.pendiente_revision;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.color} border font-medium ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-3 py-1'}`}
    >
      <Icon size={size === 'sm' ? 12 : 14} className="mr-1.5" />
      {config.label}
    </Badge>
  );
}