'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import {
  Ribbon, FileText, Users, Calendar, Factory,
  ChevronRight, TrendingUp
} from "lucide-react";

export default function StrapsDashboardPage() {
  const router = useRouter();
  const [todayStats, setTodayStats] = useState({
    sessionsCompleted: 0,
    totalMeters: 0,
    totalWeight: 0,
    activeMachines: 0,
  });

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Записи производства за сегодня
      const { data: production } = await supabase
        .from('production_straps')
        .select('produced_length, produced_weight')
        .eq('date', today);

      let totalMeters = 0;
      let totalWeight = 0;
      production?.forEach(r => {
        totalMeters += Number(r.produced_length) || 0;
        totalWeight += Number(r.produced_weight) || 0;
      });

      // Завершённые сессии за сегодня
      const { data: completed } = await supabase
        .from('straps_machine_sessions')
        .select('id')
        .eq('status', 'completed')
        .gte('ended_at', `${today}T00:00:00`)
        .lte('ended_at', `${today}T23:59:59`);

      // Активные станки прямо сейчас
      const { data: active } = await supabase
        .from('straps_machine_sessions')
        .select('id')
        .eq('status', 'active');

      setTodayStats({
        sessionsCompleted: completed?.length || 0,
        totalMeters: Math.round(totalMeters * 10) / 10,
        totalWeight: Math.round(totalWeight * 10) / 10,
        activeMachines: active?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching today stats:', err);
    }
  };

  const menuItems = [
    {
      title: 'Статус станков',
      description: 'Начать производство строп',
      icon: Factory,
      color: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-800',
      href: '/production/straps/machines',
    },
    {
      title: 'Журнал производства',
      description: 'История выпуска строп',
      icon: FileText,
      color: 'from-indigo-600 to-indigo-700',
      borderColor: 'border-indigo-800',
      href: '/production/straps/history',
    },
    {
      title: 'Персонал',
      description: 'Управление операторами',
      icon: Users,
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-800',
      href: '/production/straps/personnel',
    },
    {
      title: 'Табель',
      description: 'Учёт рабочего времени',
      icon: Calendar,
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-800',
      href: '/production/straps/timesheet',
    },
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Ribbon size={24} className="text-white" />
            </div>
            Цех Строп
          </h1>
          <p className="text-zinc-500 mt-2">Выберите нужный раздел</p>
        </div>
      </div>

      {/* Сетка меню */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
              <div className="mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                  <item.icon size={32} className="text-white" />
                </div>
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">
                  {item.title}
                </h2>
                <p className="text-white/80 text-sm">{item.description}</p>
              </div>
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
            <div className="text-xs text-zinc-500 uppercase mb-1">Станков в работе</div>
            <div className="text-3xl font-bold text-blue-400">{todayStats.activeMachines}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Завершено сессий</div>
            <div className="text-3xl font-bold text-white">{todayStats.sessionsCompleted}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Метров произведено</div>
            <div className="text-3xl font-bold text-blue-400">{todayStats.totalMeters}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Вес (кг)</div>
            <div className="text-3xl font-bold text-green-400">{todayStats.totalWeight}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
