'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target, Plus, Package, Clock, CheckCircle2, XCircle,
  ChevronRight, TrendingUp, FileText, AlertTriangle, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductionOrder {
  id: string;
  order_number: string;
  product_type: string;
  quantity: number;
  status: string;
  priority: string;
  deadline: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  calculation: any;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', color: 'text-zinc-400', bg: 'bg-zinc-700' },
  confirmed: { label: 'Подтверждён', color: 'text-blue-400', bg: 'bg-blue-900/50' },
  in_progress: { label: 'В работе', color: 'text-amber-400', bg: 'bg-amber-900/50' },
  completed: { label: 'Завершён', color: 'text-green-400', bg: 'bg-green-900/50' },
  cancelled: { label: 'Отменён', color: 'text-red-400', bg: 'bg-red-900/50' },
};

const PRIORITY_MAP: Record<string, { color: string }> = {
  'Высокий': { color: 'text-red-400' },
  'Средний': { color: 'text-amber-400' },
  'Низкий': { color: 'text-green-400' },
};

const PRODUCT_TYPE_MAP: Record<string, string> = {
  bigbag_4strap: '4х стропный Биг-Бэг (рукав)',
  bigbag_4strap_u: '4х стропный Биг-Бэг (U-крой)',
  bigbag_2strap: '2х стропный Биг-Бэг',
};

export default function PlanningDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalQuantity: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersList = data || [];
      setOrders(ordersList);

      setStats({
        total: ordersList.length,
        draft: ordersList.filter(o => o.status === 'draft').length,
        confirmed: ordersList.filter(o => o.status === 'confirmed').length,
        inProgress: ordersList.filter(o => o.status === 'in_progress').length,
        completed: ordersList.filter(o => o.status === 'completed').length,
        cancelled: ordersList.filter(o => o.status === 'cancelled').length,
        totalQuantity: ordersList.reduce((sum, o) => sum + o.quantity, 0),
      });
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDeadline = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const isOverdue = d < now;
    const formatted = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return (
      <span className={isOverdue ? 'text-red-400' : ''}>
        {formatted}
        {isOverdue && ' (!!)'}
      </span>
    );
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-red-600 p-2 rounded-lg">
              <Target size={24} className="text-white" />
            </div>
            Планирование производства
          </h1>
          <p className="text-zinc-500 mt-2">Журнал заказов и расчёт потребностей</p>
        </div>
        <Button
          onClick={() => router.push('/planning/new')}
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
        >
          <Plus size={18} />
          Новый заказ
        </Button>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${!statusFilter ? 'ring-2 ring-red-600' : ''}`}
          onClick={() => setStatusFilter(null)}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">Всего</div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-zinc-500 mt-1">{stats.totalQuantity.toLocaleString()} шт</div>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${statusFilter === 'draft' ? 'ring-2 ring-zinc-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'draft' ? null : 'draft')}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">Черновики</div>
          <div className="text-3xl font-bold text-zinc-400">{stats.draft}</div>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${statusFilter === 'confirmed' ? 'ring-2 ring-blue-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? null : 'confirmed')}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">Подтверждены</div>
          <div className="text-3xl font-bold text-blue-400">{stats.confirmed}</div>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${statusFilter === 'in_progress' ? 'ring-2 ring-amber-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? null : 'in_progress')}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">В работе</div>
          <div className="text-3xl font-bold text-amber-400">{stats.inProgress}</div>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${statusFilter === 'completed' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? null : 'completed')}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">Завершены</div>
          <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
        </Card>
        <Card
          className={`bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:border-zinc-600 transition-colors ${statusFilter === 'cancelled' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'cancelled' ? null : 'cancelled')}
        >
          <div className="text-xs text-zinc-500 uppercase mb-1">Отменены</div>
          <div className="text-3xl font-bold text-red-400">{stats.cancelled}</div>
        </Card>
      </div>

      {/* ПОИСК */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Поиск по номеру заказа или заказчику..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white pl-10"
          />
        </div>
      </div>

      {/* ТАБЛИЦА ЗАКАЗОВ */}
      {loading ? (
        <div className="text-center text-zinc-500 py-20">Загрузка...</div>
      ) : filteredOrders.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 p-12 text-center">
          <Package size={48} className="mx-auto text-zinc-600 mb-4" />
          <p className="text-zinc-500 text-lg mb-2">
            {orders.length === 0 ? 'Заказов пока нет' : 'Ничего не найдено'}
          </p>
          {orders.length === 0 && (
            <Button
              onClick={() => router.push('/planning/new')}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Plus size={16} />
              Создать первый заказ
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const status = STATUS_MAP[order.status] || STATUS_MAP.draft;
            const priorityStyle = PRIORITY_MAP[order.priority] || PRIORITY_MAP['Средний'];
            const productName = PRODUCT_TYPE_MAP[order.product_type] || order.product_type;
            const totalKg = order.calculation?.unitWeight?.total_kg
              ? (order.calculation.unitWeight.total_kg * order.quantity).toFixed(1)
              : null;

            return (
              <Card
                key={order.id}
                onClick={() => router.push(`/planning/${order.id}`)}
                className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 cursor-pointer transition-all group"
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Номер и статус */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-bold text-lg">{order.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`text-xs font-medium ${priorityStyle.color}`}>
                        {order.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>{productName}</span>
                      <span className="text-white font-medium">{order.quantity.toLocaleString()} шт</span>
                      {totalKg && <span>{totalKg} кг</span>}
                      {order.customer_name && (
                        <span className="truncate">📋 {order.customer_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Дедлайн и дата */}
                  <div className="text-right text-sm shrink-0">
                    <div className="text-zinc-500">
                      {formatDeadline(order.deadline)}
                    </div>
                    <div className="text-zinc-600 text-xs mt-1">
                      {formatDate(order.created_at)}
                    </div>
                  </div>

                  {/* Стрелка */}
                  <ChevronRight size={20} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
