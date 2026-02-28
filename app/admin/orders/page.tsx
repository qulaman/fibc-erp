'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ClipboardList, Clock, Play, CheckCircle2,
  ExternalLink, ChevronDown, ChevronUp, Target
} from "lucide-react";

interface OrderTask {
  id: string;
  order_id: string;
  department: string;
  task_description: string;
  required_quantity: number;
  required_unit: string;
  status: string;
}

interface ProductionOrder {
  id: string;
  order_number: string;
  product_type: string;
  quantity: number;
  status: string;
  priority: string;
  deadline: string | null;
  customer_name: string | null;
  created_at: string;
  calculation: any;
  tasks: OrderTask[];
}

const PRODUCT_TYPE_MAP: Record<string, string> = {
  bigbag_4strap: '4х стропный ББ',
  bigbag_2strap: '2х стропный ББ',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'confirmed': { label: 'Подтверждён', color: 'text-amber-400', bg: 'bg-amber-900/30' },
  'in_progress': { label: 'В производстве', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  'completed': { label: 'Завершён', color: 'text-green-400', bg: 'bg-green-900/30' },
  'cancelled': { label: 'Отменён', color: 'text-red-400', bg: 'bg-red-900/30' },
};

const TASK_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'Новая': { label: 'Новая', color: 'text-zinc-400', bg: 'bg-zinc-800', icon: Clock },
  'Ожидает': { label: 'Ожидает', color: 'text-amber-400', bg: 'bg-amber-900/30', icon: Clock },
  'В работе': { label: 'В работе', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Play },
  'Выполнено': { label: 'Выполнено', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle2 },
};

const PRIORITY_COLOR: Record<string, string> = {
  'Высокий': 'text-red-400',
  'Средний': 'text-amber-400',
  'Низкий': 'text-green-400',
};

export default function AdminOrdersMonitoringPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Получаем заказы
      const { data: ordersData, error: ordersErr } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // Получаем все задачи
      const { data: tasksData, error: tasksErr } = await supabase
        .from('production_order_tasks')
        .select('*');

      if (tasksErr) throw tasksErr;

      // Группируем задачи по заказам
      const tasksByOrder = new Map<string, OrderTask[]>();
      (tasksData || []).forEach(task => {
        if (!tasksByOrder.has(task.order_id)) {
          tasksByOrder.set(task.order_id, []);
        }
        tasksByOrder.get(task.order_id)!.push(task);
      });

      const combined: ProductionOrder[] = (ordersData || []).map(order => ({
        ...order,
        tasks: tasksByOrder.get(order.id) || [],
      }));

      setOrders(combined);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'active') return o.status === 'in_progress';
    if (filter === 'confirmed') return o.status === 'confirmed';
    if (filter === 'completed') return o.status === 'completed';
    return true;
  });

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/admin')} variant="outline"
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="h1-bold">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <ClipboardList size={24} className="text-white" />
              </div>
              Мониторинг заказов
            </h1>
            <p className="text-zinc-500 mt-2">Статус выполнения заказов по цехам</p>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'active', label: 'В производстве' },
          { key: 'confirmed', label: 'Подтверждённые' },
          { key: 'completed', label: 'Завершённые' },
          { key: 'all', label: 'Все' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-20">Загрузка...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-lg">Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isExpanded = expandedOrders.has(order.id);
            const productName = PRODUCT_TYPE_MAP[order.product_type] || order.product_type;
            const statusInfo = STATUS_MAP[order.status] || STATUS_MAP['confirmed'];

            const totalTasks = order.tasks.length;
            const doneTasks = order.tasks.filter(t => t.status === 'Выполнено').length;
            const inProgressTasks = order.tasks.filter(t => t.status === 'В работе').length;
            const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return (
              <Card key={order.id} className="bg-zinc-900 border-2 border-zinc-800 overflow-hidden">
                {/* Шапка заказа */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">{order.order_number}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                          <span>{productName}</span>
                          <span>·</span>
                          <span>{order.quantity} шт</span>
                          {order.customer_name && (
                            <>
                              <span>·</span>
                              <span>{order.customer_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Прогресс */}
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          {order.deadline && (
                            <span className="text-xs text-zinc-500">
                              Срок: <span className="text-zinc-300">{new Date(order.deadline).toLocaleDateString('ru-RU')}</span>
                            </span>
                          )}
                          <span className={`text-xs font-medium ${PRIORITY_COLOR[order.priority] || 'text-zinc-400'}`}>
                            {order.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progressPercent === 100 ? 'bg-green-500' :
                                progressPercent > 0 ? 'bg-blue-500' : 'bg-zinc-700'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400 min-w-[60px] text-right">
                            {doneTasks}/{totalTasks} цехов
                          </span>
                        </div>
                      </div>

                      {isExpanded ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
                    </div>
                  </div>
                </div>

                {/* Развёрнутые задачи по цехам */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    <div className="px-6 py-3 flex items-center justify-between bg-zinc-800/30">
                      <span className="text-xs text-zinc-500 uppercase font-medium">Задачи по цехам</span>
                      <Button
                        onClick={(e) => { e.stopPropagation(); router.push(`/planning/${order.id}`); }}
                        variant="outline" size="sm"
                        className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 gap-1 text-xs">
                        <ExternalLink size={12} /> Детали заказа
                      </Button>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {order.tasks
                        .filter(t => t.status !== 'Новая')
                        .map(task => {
                        const ts = TASK_STATUS[task.status] || TASK_STATUS['Ожидает'];
                        const TsIcon = ts.icon;

                        // Детали из расчёта
                        const calcDept = order.calculation?.departments?.find(
                          (d: any) => d.department === task.department
                        );
                        const deptItems: { name: string; quantity: number; unit: string }[] = calcDept?.items || [];

                        return (
                          <div key={task.id} className="px-6 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-medium">{task.department}</span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-400 text-sm">{task.task_description}</span>
                                </div>
                                {task.required_quantity > 0 && (
                                  <p className="text-zinc-500 text-xs mt-0.5">
                                    Итого: {task.required_quantity.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} {task.required_unit}
                                  </p>
                                )}
                              </div>
                              <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${ts.bg} ${ts.color}`}>
                                <TsIcon size={12} />
                                {ts.label}
                              </span>
                            </div>
                            {/* Подробности items */}
                            {deptItems.length > 1 && (
                              <div className="mt-1.5 ml-2 space-y-0.5">
                                {deptItems.slice(1).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                                    <span>{item.name}</span>
                                    <span>—</span>
                                    <span className="text-zinc-400">
                                      {typeof item.quantity === 'number'
                                        ? item.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
                                        : item.quantity} {item.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
