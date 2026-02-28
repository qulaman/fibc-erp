'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Target, Clock, Play, CheckCircle2, ExternalLink
} from "lucide-react";

interface DepartmentOrdersProps {
  department: string;
  title: string;
  color: string;        // e.g. 'red', 'amber'
  borderColor: string;   // e.g. 'border-red-800'
  backHref: string;      // e.g. '/production/extrusion'
}

interface OrderTask {
  id: string;
  order_id: string;
  department: string;
  task_description: string;
  required_quantity: number;
  required_unit: string;
  status: string;
  created_at: string;
  production_orders: {
    id: string;
    order_number: string;
    product_type: string;
    quantity: number;
    status: string;
    priority: string;
    deadline: string | null;
    customer_name: string | null;
    calculation: any;
  };
}

const PRODUCT_TYPE_MAP: Record<string, string> = {
  bigbag_4strap: '4х стропный ББ',
  bigbag_2strap: '2х стропный ББ',
};

const TASK_STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'Ожидает': { label: 'Ожидает', color: 'text-amber-400', bg: 'bg-amber-900/30', icon: Clock },
  'В работе': { label: 'В работе', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Play },
  'Выполнено': { label: 'Выполнено', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle2 },
};

const PRIORITY_COLOR: Record<string, string> = {
  'Высокий': 'text-red-400',
  'Средний': 'text-amber-400',
  'Низкий': 'text-green-400',
};

export default function DepartmentOrdersPage({
  department, title, color, borderColor, backHref
}: DepartmentOrdersProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active'); // 'all' | 'active' | 'Ожидает' | 'В работе' | 'Выполнено'

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_order_tasks')
      .select('*, production_orders(*)')
      .eq('department', department)
      .neq('status', 'Новая')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Ошибка загрузки: ' + error.message);
    } else {
      setTasks((data || []) as unknown as OrderTask[]);
    }
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('production_order_tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    toast.success(`Статус: ${newStatus}`);
    fetchTasks();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status !== 'Выполнено';
    return t.status === filter;
  });

  // Group tasks by order
  const orderGroups = new Map<string, OrderTask[]>();
  filteredTasks.forEach(task => {
    const orderId = task.order_id;
    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, []);
    }
    orderGroups.get(orderId)!.push(task);
  });

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push(backHref)} variant="outline"
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="h1-bold">
              <div className={`bg-${color}-600 p-2 rounded-lg`}>
                <Target size={24} className="text-white" />
              </div>
              {title}
            </h1>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'active', label: 'Активные' },
          { key: 'Ожидает', label: 'Ожидает' },
          { key: 'В работе', label: 'В работе' },
          { key: 'Выполнено', label: 'Выполнено' },
          { key: 'all', label: 'Все' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? `bg-${color}-600 text-white`
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-20">Загрузка...</div>
      ) : orderGroups.size === 0 ? (
        <div className="text-center py-20">
          <Target size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-lg">Нет заказов</p>
          <p className="text-zinc-600 text-sm mt-1">Заказы появятся после отправки из модуля планирования</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(orderGroups.entries()).map(([orderId, orderTasks]) => {
            const order = orderTasks[0].production_orders;
            if (!order) return null;

            const productName = PRODUCT_TYPE_MAP[order.product_type] || order.product_type;
            const allDone = orderTasks.every(t => t.status === 'Выполнено');
            const anyInProgress = orderTasks.some(t => t.status === 'В работе');

            return (
              <Card key={orderId} className={`bg-zinc-900 border-2 ${borderColor} overflow-hidden`}>
                {/* Шапка заказа */}
                <div className={`bg-gradient-to-r from-${color}-900/40 to-${color}-950/40 px-6 py-4 flex items-center justify-between flex-wrap gap-3`}>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-lg">{order.order_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          allDone ? 'bg-green-900/50 text-green-400' :
                          anyInProgress ? 'bg-blue-900/50 text-blue-400' :
                          'bg-amber-900/50 text-amber-400'
                        }`}>
                          {allDone ? 'Выполнено' : anyInProgress ? 'В работе' : 'Ожидает'}
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
                  <div className="flex items-center gap-3">
                    {order.deadline && (
                      <span className="text-sm text-zinc-400">
                        Срок: <span className="text-white font-medium">
                          {new Date(order.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </span>
                    )}
                    <span className={`text-sm font-medium ${PRIORITY_COLOR[order.priority] || 'text-zinc-400'}`}>
                      {order.priority}
                    </span>
                    <Button
                      onClick={() => router.push(`/planning/${order.id}`)}
                      variant="outline" size="sm"
                      className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 gap-1">
                      <ExternalLink size={14} /> Детали
                    </Button>
                  </div>
                </div>

                {/* Задачи цеха */}
                <div className="divide-y divide-zinc-800">
                  {orderTasks.map(task => {
                    const statusInfo = TASK_STATUS_MAP[task.status] || TASK_STATUS_MAP['Ожидает'];
                    const StatusIcon = statusInfo.icon;

                    // Детали items из calculation
                    const calcDept = order.calculation?.departments?.find(
                      (d: any) => d.department === task.department
                    );
                    const deptItems: { name: string; quantity: number; unit: string }[] = calcDept?.items || [];

                    return (
                      <div key={task.id} className="px-6 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{task.task_description}</p>
                            {task.required_quantity > 0 && (
                              <p className="text-zinc-500 text-xs mt-0.5">
                                Итого: {task.required_quantity.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} {task.required_unit}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                              <StatusIcon size={12} />
                              {statusInfo.label}
                            </span>
                            {task.status === 'Ожидает' && (
                              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'В работе')}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3">
                                Начать
                              </Button>
                            )}
                            {task.status === 'В работе' && (
                              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'Выполнено')}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3">
                                Готово
                              </Button>
                            )}
                          </div>
                        </div>
                        {/* Детали потребностей из расчёта */}
                        {deptItems.length > 1 && (
                          <div className="mt-2 ml-2 space-y-0.5">
                            {deptItems.slice(1).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                                <span>{item.name}</span>
                                <span className="text-zinc-500">—</span>
                                <span className="text-zinc-300 font-medium">
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
