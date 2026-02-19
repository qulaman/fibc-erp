'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import {
  Package, FileText, Users, CheckCircle2, Scissors,
  ChevronRight, TrendingUp, ClipboardList
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
      title: 'Пошив Биг-Бэг',
      description: 'Операции пошива Биг-Бэг',
      icon: Package,
      color: 'from-pink-600 to-pink-700',
      borderColor: 'border-pink-800',
      href: '/production/sewing/bigbag'
    },
    {
      title: 'Пошив Вкладышей',
      description: 'Операции пошива вкладышей',
      icon: Package,
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
    <div className="p-8 font-sans bg-black min-h-screen text-white">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pink-500 flex items-center gap-2 mb-2">
          <Package size={32} /> Пошив и ОТК
        </h1>
        <p className="text-zinc-400 text-sm">Центр управления производством пошива и контроля качества</p>
      </div>

      {/* Статистика за сегодня */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-pink-900/30 to-pink-950/30 border-pink-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Операций за сегодня</p>
              <p className="text-3xl font-bold text-pink-400 mt-2">{todayStats.operations}</p>
            </div>
            <Package size={40} className="text-pink-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Сумма за сегодня</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{todayStats.totalAmount.toLocaleString()}₸</p>
            </div>
            <TrendingUp size={40} className="text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Готовых изделий на складе</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{todayStats.finishedProducts}</p>
            </div>
            <ClipboardList size={40} className="text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/30 to-red-950/30 border-red-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Проверок ОТК за сегодня</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{todayStats.qcInspections}</p>
            </div>
            <CheckCircle2 size={40} className="text-red-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Меню разделов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.href}
              className={`bg-zinc-900 ${item.borderColor} border-2 cursor-pointer hover:scale-105 transition-transform duration-200`}
              onClick={() => router.push(item.href)}
            >
              <div className="p-6">
                <div className={`bg-gradient-to-br ${item.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm mb-4">{item.description}</p>
                <div className="flex items-center text-pink-400 font-medium">
                  <span>Открыть</span>
                  <ChevronRight size={20} className="ml-1" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
