'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import {
  Layers, FileText, Users, Calendar,
  ChevronRight, TrendingUp, Wrench, Package, Target
} from "lucide-react";

export default function LaminationDashboardPage() {
  const router = useRouter();
  const [todayStats, setTodayStats] = useState({
    shiftsCount: 0,
    rollsProcessed: 0,
    totalOutputWeight: 0,
    totalWaste: 0,
  });

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: shifts } = await supabase
        .from('production_lamination_shifts')
        .select('*, production_lamination_rolls(*)')
        .eq('date', today);

      if (!shifts) return;

      const shiftsCount = shifts.length;
      let rollsProcessed = 0;
      let totalOutputWeight = 0;
      let totalWaste = 0;

      shifts.forEach(shift => {
        const rolls = shift.production_lamination_rolls || [];
        rollsProcessed += rolls.length;
        totalOutputWeight += rolls.reduce((s: number, r: any) => s + (Number(r.output_weight_kg) || 0), 0);
        totalWaste += (Number(shift.waste_oploy_kg) || 0) + (Number(shift.waste_shift_kg) || 0) + (Number(shift.waste_trim_kg) || 0);
      });

      setTodayStats({
        shiftsCount,
        rollsProcessed,
        totalOutputWeight: Math.round(totalOutputWeight * 10) / 10,
        totalWaste: Math.round(totalWaste * 10) / 10,
      });
    } catch (err) {
      console.error('Error fetching today stats:', err);
    }
  };

  const menuItems = [
    {
      title: 'Заказы',
      description: 'Заказы из планирования',
      icon: Target,
      color: 'from-indigo-600 to-indigo-700',
      borderColor: 'border-indigo-800',
      href: '/production/lamination/orders'
    },
    {
      title: 'Внести Производство',
      description: 'Обработка рулонов за смену',
      icon: Layers,
      color: 'from-orange-600 to-orange-700',
      borderColor: 'border-orange-800',
      href: '/production/lamination/input'
    },
    {
      title: 'Журнал Производства',
      description: 'История смен и рулонов',
      icon: FileText,
      color: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-800',
      href: '/production/lamination/history'
    },
    {
      title: 'Персонал',
      description: 'Управление операторами',
      icon: Users,
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-800',
      href: '/production/lamination/personnel'
    },
    {
      title: 'Табель',
      description: 'Учет рабочего времени',
      icon: Calendar,
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-800',
      href: '/production/lamination/timesheet'
    },
    {
      title: 'Обслуживание оборудования',
      description: 'ТО и ремонт ламинаторов',
      icon: Wrench,
      color: 'from-cyan-600 to-cyan-700',
      borderColor: 'border-cyan-800',
      href: '/production/lamination/maintenance'
    },
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Layers size={24} className="text-white" />
            </div>
            Цех Ламинации
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
            <div className="text-xs text-zinc-500 uppercase mb-1">Сдано смен</div>
            <div className="text-3xl font-bold text-white">{todayStats.shiftsCount}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Обработано рулонов</div>
            <div className="text-3xl font-bold text-blue-400">{todayStats.rollsProcessed}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Выход (кг)</div>
            <div className="text-3xl font-bold text-green-400">{todayStats.totalOutputWeight}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Отходы (кг)</div>
            <div className="text-3xl font-bold text-red-400">{todayStats.totalWaste}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
