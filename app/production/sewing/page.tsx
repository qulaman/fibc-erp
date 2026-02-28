'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import {
  Spool, FileText, Users, CheckCircle2, Scissors,
  ChevronRight, TrendingUp, ClipboardList, Target
} from "lucide-react";

export default function SewingDashboardPage() {
  const router = useRouter();
  const [todayStats, setTodayStats] = useState({
    operations: 0,
    totalAmount: 0,
    finishedProducts: 0,
    qcInspections: 0
  });

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Операции пошива за сегодня
      const { data: operations } = await supabase
        .from('production_sewing')
        .select('quantity_good, operation_rate')
        .eq('date', today);

      const opsCount = operations?.length || 0;
      const totalAmount = operations?.reduce((sum, item) => {
        return sum + (item.quantity_good * item.operation_rate);
      }, 0) || 0;

      // Готовая продукция на складе
      const { data: finishedProducts } = await supabase
        .from('view_sewn_products_balance')
        .select('balance');

      const fpCount = finishedProducts?.reduce((sum, item) => sum + item.balance, 0) || 0;

      // Проверки ОТК за сегодня
      const { data: qcData } = await supabase
        .from('qc_journal')
        .select('id')
        .eq('inspection_date', today);

      const qcCount = qcData?.length || 0;

      setTodayStats({
        operations: opsCount,
        totalAmount: Math.round(totalAmount),
        finishedProducts: fpCount,
        qcInspections: qcCount
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const menuItems = [
    {
      title: 'Заказы',
      description: 'Заказы из планирования',
      icon: Target,
      color: 'from-indigo-600 to-indigo-700',
      borderColor: 'border-indigo-800',
      href: '/production/sewing/orders'
    },
    {
      title: 'Пошив Биг-Бэг',
      description: 'Операции пошива Биг-Бэг',
      icon: Spool,
      color: 'from-pink-600 to-pink-700',
      borderColor: 'border-pink-800',
      href: '/production/sewing/bigbag'
    },
    {
      title: 'Пошив Вкладышей',
      description: 'Операции пошива вкладышей',
      icon: Spool,
      color: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-800',
      href: '/production/sewing/liners'
    },
    {
      title: 'Приёмка ОТК',
      description: 'Контроль качества продукции',
      icon: CheckCircle2,
      color: 'from-red-600 to-red-700',
      borderColor: 'border-red-800',
      href: '/production/qc'
    },
    {
      title: 'Журнал Пошива',
      description: 'История операций пошива',
      icon: FileText,
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-800',
      href: '/production/sewing/history'
    },
    {
      title: 'Журнал ОТК',
      description: 'История проверок качества',
      icon: ClipboardList,
      color: 'from-orange-600 to-orange-700',
      borderColor: 'border-orange-800',
      href: '/production/qc/history'
    },
    {
      title: 'Спецификации (BOM)',
      description: 'Управление операциями и деталями',
      icon: Scissors,
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-800',
      href: '/production/sewing-specs'
    },
    {
      title: 'Персонал',
      description: 'Управление сотрудниками цеха',
      icon: Users,
      color: 'from-cyan-600 to-cyan-700',
      borderColor: 'border-cyan-800',
      href: '/production/sewing/personnel'
    }
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-pink-600 p-2 rounded-lg">
              <Spool size={24} className="text-white" />
            </div>
            Пошив и ОТК
          </h1>
          <p className="text-zinc-500 mt-2">Выберите нужный раздел</p>
        </div>
      </div>

      {/* Сетка меню */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Card
            key={item.title}
            onClick={() => router.push(item.href)}
            className={`
              bg-gradient-to-br ${item.color}
              border-2 ${item.borderColor}
              cursor-pointer
              hover:scale-105 hover:shadow-2xl
              transition-all duration-300
              group
              overflow-hidden
              relative
            `}
          >
            {/* Фоновая декорация */}
            <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <item.icon size={120} />
            </div>

            {/* Контент */}
            <div className="relative p-6 flex flex-col h-full">
              {/* Иконка */}
              <div className="mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                  <item.icon size={32} className="text-white" />
                </div>
              </div>

              {/* Текст */}
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">
                  {item.title}
                </h2>
                <p className="text-white/80 text-sm">
                  {item.description}
                </p>
              </div>

              {/* Стрелка */}
              <div className="flex justify-end mt-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-hover:translate-x-1 transition-all">
                  <ChevronRight size={20} className="text-white" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Быстрая статистика */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Сегодня
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Операций</div>
            <div className="text-3xl font-bold text-white">{todayStats.operations}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Сумма</div>
            <div className="text-3xl font-bold text-green-400">{todayStats.totalAmount.toLocaleString()}₸</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">На складе (шт)</div>
            <div className="text-3xl font-bold text-blue-400">{todayStats.finishedProducts}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Проверок ОТК</div>
            <div className="text-3xl font-bold text-red-400">{todayStats.qcInspections}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
