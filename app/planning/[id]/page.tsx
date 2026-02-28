'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target, ArrowLeft, Package, Cable, Grid3x3, Layers,
  Ribbon, Scissors, Spool, FlaskConical, CheckCircle2,
  AlertTriangle, Clock, XCircle, Play, Trash2, Send
} from "lucide-react";
import Link from 'next/link';

interface OrderTask {
  id: string;
  department: string;
  task_description: string;
  required_quantity: number;
  required_unit: string;
  current_stock: number;
  deficit: number;
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
  notes: string | null;
  params: any;
  calculation: any;
  created_at: string;
  updated_at: string;
}

const DEPT_STYLES: Record<string, { color: string; border: string; icon: any }> = {
  'Сырьё': { color: 'from-red-600 to-red-700', border: 'border-red-800', icon: FlaskConical },
  'Экструзия': { color: 'from-red-700 to-red-800', border: 'border-red-900', icon: Cable },
  'Ткачество': { color: 'from-amber-600 to-amber-700', border: 'border-amber-800', icon: Grid3x3 },
  'Ламинация': { color: 'from-orange-600 to-orange-700', border: 'border-orange-800', icon: Layers },
  'Стропы': { color: 'from-blue-600 to-blue-700', border: 'border-blue-800', icon: Ribbon },
  'Крой': { color: 'from-teal-600 to-teal-700', border: 'border-teal-800', icon: Scissors },
  'Пошив': { color: 'from-pink-600 to-pink-700', border: 'border-pink-800', icon: Spool },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', color: 'text-zinc-400', bg: 'bg-zinc-700' },
  confirmed: { label: 'Подтверждён', color: 'text-blue-400', bg: 'bg-blue-900/50' },
  in_progress: { label: 'В работе', color: 'text-amber-400', bg: 'bg-amber-900/50' },
  completed: { label: 'Завершён', color: 'text-green-400', bg: 'bg-green-900/50' },
  cancelled: { label: 'Отменён', color: 'text-red-400', bg: 'bg-red-900/50' },
};

const PRODUCT_TYPE_MAP: Record<string, string> = {
  bigbag_4strap: '4х стропный Биг-Бэг',
  bigbag_2strap: '2х стропный Биг-Бэг',
};

const TOP_TYPE_MAP: Record<string, string> = {
  spout: 'Люк',
  skirt: 'Юбка',
  open: 'Открытый',
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderErr) throw orderErr;
      setOrder(orderData);

      const { data: tasksData } = await supabase
        .from('production_order_tasks')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at');

      setTasks(tasksData || []);
    } catch (err: any) {
      toast.error('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    const { error } = await supabase
      .from('production_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    toast.success('Статус обновлён');
    fetchOrder();
  };

  const handleSendToProduction = async () => {
    if (!order) return;
    // 1. Статус заказа → in_progress
    const { error: orderErr } = await supabase
      .from('production_orders')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (orderErr) {
      toast.error('Ошибка: ' + orderErr.message);
      return;
    }

    // 2. Статус всех задач цехов → Ожидает
    const { error: tasksErr } = await supabase
      .from('production_order_tasks')
      .update({ status: 'Ожидает' })
      .eq('order_id', order.id);

    if (tasksErr) {
      toast.error('Ошибка обновления задач: ' + tasksErr.message);
      return;
    }

    toast.success('Заказ отправлен в производство');
    fetchOrder();
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm(`Удалить заказ ${order.order_number}? Это действие необратимо.`)) return;

    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', order.id);

    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    toast.success('Заказ удалён');
    router.push('/planning');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="text-center text-zinc-500 py-20">Загрузка...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="text-center py-20">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-zinc-400 text-lg">Заказ не найден</p>
          <Link href="/planning" className="text-blue-400 hover:underline mt-4 block">
            Вернуться к журналу
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_MAP[order.status] || STATUS_MAP.draft;
  const productName = PRODUCT_TYPE_MAP[order.product_type] || order.product_type;
  const p = order.params;
  const calc = order.calculation;

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/planning')} variant="outline"
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="h1-bold">
              <div className="bg-red-600 p-2 rounded-lg">
                <Target size={24} className="text-white" />
              </div>
              {order.order_number}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-sm px-3 py-1 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
              <span className="text-zinc-500">{productName}</span>
            </div>
          </div>
        </div>

        {/* Кнопки управления статусом */}
        <div className="flex gap-2 flex-wrap">
          {order.status === 'confirmed' && (
            <Button onClick={handleSendToProduction}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <Send size={16} /> Отправить в производство
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={() => updateStatus('completed')}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <CheckCircle2 size={16} /> Завершить
            </Button>
          )}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <Button onClick={() => updateStatus('cancelled')} variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/30 gap-2">
              <XCircle size={16} /> Отменить
            </Button>
          )}
          {(order.status === 'draft' || order.status === 'cancelled') && (
            <Button onClick={handleDelete} variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/30 gap-2">
              <Trash2 size={16} /> Удалить
            </Button>
          )}
        </div>
      </div>

      {/* СВОДКА */}
      <Card className="bg-gradient-to-r from-indigo-900/40 to-indigo-950/40 border-indigo-800 border-2 p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-indigo-300 text-sm">Количество</p>
            <p className="text-4xl font-bold text-white">{order.quantity.toLocaleString()} шт</p>
          </div>
          {calc?.unitWeight && (
            <>
              <div className="text-center">
                <p className="text-indigo-300 text-sm">Вес 1 шт</p>
                <p className="text-3xl font-bold text-indigo-300">{calc.unitWeight.total_kg} кг</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-300 text-sm">Общий вес</p>
                <p className="text-3xl font-bold text-white">
                  {(calc.unitWeight.total_kg * order.quantity).toFixed(1)} кг
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Информация о заказе */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Информация</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Приоритет</span>
              <span className={`font-medium ${
                order.priority === 'Высокий' ? 'text-red-400' :
                order.priority === 'Низкий' ? 'text-green-400' : 'text-amber-400'
              }`}>{order.priority}</span>
            </div>
            {order.customer_name && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Заказчик</span>
                <span className="text-white">{order.customer_name}</span>
              </div>
            )}
            {order.deadline && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Дедлайн</span>
                <span className="text-white">
                  {new Date(order.deadline).toLocaleDateString('ru-RU')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Создан</span>
              <span className="text-white">
                {new Date(order.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </Card>

        {/* Параметры изделия */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Параметры изделия</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Размер (В×Ш×Д)</div>
              <div className="text-white font-bold">{p.height}×{p.width}×{p.bottomSize} см</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Ткань</div>
              <div className="text-white font-bold">{p.tkanSpecName || `${p.mainDensity} г/м²`}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Верх</div>
              <div className="text-white font-bold">{TOP_TYPE_MAP[p.topType] || p.topType}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Нижний люк</div>
              <div className="text-white font-bold">{p.hasBottomSpout ? 'Да' : 'Нет'}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Стропа</div>
              <div className="text-white font-bold">{p.stropSpecName || 'Стандартная'}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500">Пришив строп</div>
              <div className="text-white font-bold">{p.strapRatioType} высоты</div>
            </div>
            {p.needsLamination && (
              <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-800">
                <div className="text-xs text-orange-400">Ламинация</div>
                <div className="text-white font-bold">Да</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ДЕТАЛЬНЫЙ РАСЧЁТ ВЕСА */}
      {calc?.unitWeight && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-400 uppercase">Расчёт веса 1 изделия</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase">
              <tr>
                <th className="p-3 text-left pl-6">Компонент</th>
                <th className="p-3 text-left">Формула</th>
                <th className="p-3 text-right pr-6">Граммы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {calc.unitWeight.formulas ? (
                <>
                  {[
                    { label: 'Тело (рукав)', formula: calc.unitWeight.formulas.body, value: calc.unitWeight.body_g, show: true },
                    { label: 'Дно', formula: calc.unitWeight.formulas.bottom, value: calc.unitWeight.bottom_g, show: true },
                    { label: p.topType === 'spout' ? 'Люк (верх)' : 'Юбка', formula: calc.unitWeight.formulas.top, value: calc.unitWeight.top_g, show: calc.unitWeight.top_g > 0 },
                    { label: 'Люк (низ)', formula: calc.unitWeight.formulas.bottomSpout, value: calc.unitWeight.bottomSpout_g, show: calc.unitWeight.bottomSpout_g > 0 },
                    { label: 'Завязки', formula: calc.unitWeight.formulas.ties, value: calc.unitWeight.ties_g, show: calc.unitWeight.ties_g > 0 },
                    { label: 'Стропа (4 шт)', formula: calc.unitWeight.formulas.straps, value: calc.unitWeight.straps_g, show: true },
                  ].filter(r => r.show).map((row) => (
                    <tr key={row.label}>
                      <td className="p-3 pl-6 font-bold text-white">{row.label}</td>
                      <td className="p-3 text-zinc-500 font-mono text-xs">{row.formula}</td>
                      <td className="p-3 text-right pr-6 font-bold text-white">{row.value.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-3 pl-6 font-bold text-white">Нить (швы)</td>
                    <td className="p-3 text-zinc-500 font-mono text-xs">
                      <div className="whitespace-pre-line text-[10px] text-zinc-600 mb-1">{calc.unitWeight.formulas.threadDetails}</div>
                      <div>{calc.unitWeight.formulas.thread}</div>
                    </td>
                    <td className="p-3 text-right pr-6 font-bold text-white">{calc.unitWeight.thread_g.toFixed(1)}</td>
                  </tr>
                </>
              ) : (
                /* Fallback для старых заказов без формул */
                <>
                  {[
                    { label: 'Тело', value: calc.unitWeight.body_g },
                    { label: 'Дно', value: calc.unitWeight.bottom_g },
                    { label: 'Верх', value: calc.unitWeight.top_g },
                    { label: 'Низ (люк)', value: calc.unitWeight.bottomSpout_g },
                    { label: 'Завязки', value: calc.unitWeight.ties_g },
                    { label: 'Стропы', value: calc.unitWeight.straps_g },
                    { label: 'Нить', value: calc.unitWeight.thread_g },
                  ].filter(i => i.value > 0).map((item) => (
                    <tr key={item.label}>
                      <td className="p-3 pl-6 font-bold text-white">{item.label}</td>
                      <td className="p-3 text-zinc-500">—</td>
                      <td className="p-3 text-right pr-6 font-bold text-white">{item.value.toFixed(1)}</td>
                    </tr>
                  ))}
                </>
              )}
              <tr className="bg-red-900/20 border-t-2 border-red-800">
                <td className="p-3 pl-6 font-bold text-red-400 text-base" colSpan={2}>ИТОГО</td>
                <td className="p-3 text-right pr-6 font-bold text-red-400 text-lg">
                  {calc.unitWeight.total_g.toFixed(1)} г = {calc.unitWeight.total_kg} кг
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* ПОТРЕБНОСТИ ПО ЦЕХАМ */}
      {calc?.departments && (
        <>
          <h2 className="text-xl font-bold mb-4">Потребности по цехам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {calc.departments.map((dept: any) => {
              const style = DEPT_STYLES[dept.department] || { color: 'from-zinc-600 to-zinc-700', border: 'border-zinc-800', icon: Package };
              const Icon = style.icon;
              return (
                <Card key={dept.department}
                  className={`bg-gradient-to-br ${style.color} border-2 ${style.border} overflow-hidden relative`}>
                  <div className="absolute top-0 right-0 opacity-10">
                    <Icon size={100} />
                  </div>
                  <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon size={20} className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white">{dept.department}</h3>
                    </div>
                    <p className="text-white/70 text-xs mb-3">{dept.description}</p>
                    <div className="space-y-1.5">
                      {dept.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-white/80 text-sm">{item.name}</span>
                          <span className="text-white font-bold">
                            {item.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ЗАДАНИЯ ЦЕХАМ */}
      {tasks.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4">Задания цехам</h2>
          <div className="space-y-3 mb-8">
            {tasks.map((task) => (
              <Card key={task.id} className="bg-zinc-900 border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'Выполнена' ? 'bg-green-500' :
                      task.status === 'В работе' ? 'bg-amber-500' : 'bg-zinc-500'
                    }`} />
                    <div>
                      <span className="text-white font-medium">{task.department}</span>
                      <p className="text-zinc-500 text-sm">{task.task_description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {task.required_quantity?.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} {task.required_unit}
                    </div>
                    <div className="text-xs text-zinc-500">{task.status}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
