import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User, DollarSign, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order, onClick, showClient = true, showSeller = false }) {
  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-slate-200 hover:border-amber-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800">
                #{order.order_number || order.id?.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={order.status} size="sm" />
            </div>
            
            {showClient && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={14} />
                <span>{order.client_name}</span>
              </div>
            )}
            
            {showSeller && order.seller_name && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <User size={14} />
                <span>Vendedor: {order.seller_name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar size={14} />
                <span>
                  {format(new Date(order.created_date), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <DollarSign size={14} />
                <span>
                  ${(order.total_final || order.total_estimated || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          <ChevronRight className="text-slate-400" size={20} />
        </div>
      </CardContent>
    </Card>
  );
}