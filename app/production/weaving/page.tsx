'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DowntimeDialog from "@/components/DowntimeDialog";
import {
  Factory, FileText, Users, Calendar, AlertTriangle,
  ChevronRight, TrendingUp, Settings, Wrench, Target
} from "lucide-react";

export default function WeavingDashboardPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [showMachineSelect, setShowMachineSelect] = useState(false);
  const [todayStats, setTodayStats] = useState({
    rollsCompleted: 0,
    totalMeters: 0,
    totalWeight: 0,
    downtime: 0
  });

  useEffect(() => {
    const fetchMachines = async () => {
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .or('type.eq.loom,type.eq.weaving,type.eq.loom_round')
        .order('name');
      if (data) setMachines(data);
    };
    fetchMachines();
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Получаем записи производства за сегодня
      const { data: production, error: prodError } = await supabase
        .from('production_weaving')
        .select('*')
        .eq('date', today);

      if (prodError) throw prodError;

      // Подсчитываем метры и вес из записей смен
      let totalMeters = 0;
      let totalWeight = 0;

      production?.forEach(record => {
        totalMeters += Number(record.produced_length) || 0;
        totalWeight += Number(record.produced_weight) || 0;
      });

      // Получаем завершенные рулоны за сегодня
      const { data: completedRolls, error: rollsError } = await supabase
        .from('weaving_rolls')
        .select('*')
        .eq('status', 'completed')
        .gte('updated_at', `${today}T00:00:00`)
        .lte('updated_at', `${today}T23:59:59`);

      if (rollsError) throw rollsError;

      const rollsCompleted = completedRolls?.length || 0;

      // Получаем простои за сегодня только для ткацких станков
      const weavingMachineIds = machines.map(m => m.id);

      const { data: downtimes, error: downError } = await supabase
        .from('production_downtimes')
        .select('start_time, end_time')
        .eq('date', today)
        .in('machine_id', weavingMachineIds);

      if (downError) throw downError;

      // Рассчитываем общее время простоя в минутах
      const totalDowntime = downtimes?.reduce((sum, item) => {
        const start = new Date(item.start_time);
        const end = new Date(item.end_time);
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        return sum + durationMinutes;
      }, 0) || 0;

      setTodayStats({
        rollsCompleted,
        totalMeters: Math.round(totalMeters * 10) / 10,
        totalWeight: Math.round(totalWeight * 10) / 10,
        downtime: totalDowntime
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
      href: '/production/weaving/orders'
    },
    {
      title: 'Выбрать Станок',
      description: 'Начать производство ткани',
      icon: Factory,
      color: 'from-amber-600 to-amber-700',
      borderColor: 'border-amber-800',
      href: '/production/weaving/machines'
    },
    {
      title: 'Журнал Производства',
      description: 'История выпуска рулонов',
      icon: FileText,
      color: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-800',
      href: '/production/weaving/history'
    },
    {
      title: 'Зафиксировать Простой',
      description: 'Регистрация остановки станка',
      icon: AlertTriangle,
      color: 'from-red-900 to-red-950',
      borderColor: 'border-red-800',
      onClick: () => setShowMachineSelect(true)
    },
    {
      title: 'Журнал Простоев',
      description: 'Учет остановок станков',
      icon: AlertTriangle,
      color: 'from-orange-600 to-orange-700',
      borderColor: 'border-orange-800',
      href: '/production/weaving/downtimes'
    },
    {
      title: 'Персонал',
      description: 'Управление операторами',
      icon: Users,
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-800',
      href: '/production/weaving/personnel'
    },
    {
      title: 'Табель',
      description: 'Учет рабочего времени',
      icon: Calendar,
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-800',
      href: '/production/weaving/timesheet'
    },
    {
      title: 'Заправочные Карты',
      description: 'Спецификации тканей',
      icon: Settings,
      color: 'from-indigo-600 to-indigo-700',
      borderColor: 'border-indigo-800',
      href: '/production/weaving/weaving-setup'
    },
    {
      title: 'Обслуживание оборудования',
      description: 'ТО и ремонт станков',
      icon: Wrench,
      color: 'from-cyan-600 to-cyan-700',
      borderColor: 'border-cyan-800',
      href: '/production/weaving/maintenance'
    },
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Factory size={24} className="text-white" />
            </div>
            Ткацкий Цех
          </h1>
          <p className="text-zinc-500 mt-2">Выберите нужный раздел</p>
        </div>
      </div>

      {/* Сетка меню */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Card
            key={item.title}
            onClick={() => item.onClick ? item.onClick() : router.push(item.href!)}
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
            <div className="text-xs text-zinc-500 uppercase mb-1">Завершено рулонов</div>
            <div className="text-3xl font-bold text-white">{todayStats.rollsCompleted}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Метров произведено</div>
            <div className="text-3xl font-bold text-blue-400">{todayStats.totalMeters}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Вес (кг)</div>
            <div className="text-3xl font-bold text-green-400">{todayStats.totalWeight}</div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Простои (мин)</div>
            <div className="text-3xl font-bold text-red-400">{todayStats.downtime}</div>
          </Card>
        </div>
      </div>

      {/* Диалог выбора станка */}
      <Dialog open={showMachineSelect} onOpenChange={setShowMachineSelect}>
        <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={24} />
              Выберите станок для фиксации простоя
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {machines.map(machine => (
              <button
                key={machine.id}
                onClick={() => {
                  setSelectedMachine(machine.id);
                  setShowMachineSelect(false);
                }}
                className="p-6 bg-zinc-900 border-2 border-zinc-700 rounded-lg hover:border-red-600 hover:bg-zinc-800 transition-all text-white font-bold text-lg flex flex-col items-center gap-3"
              >
                <Factory size={32} className="text-red-400" />
                {machine.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог регистрации простоя */}
      {selectedMachine && (
        <DowntimeDialog
          key={selectedMachine}
          machineId={selectedMachine}
          machineName={machines.find(m => m.id === selectedMachine)?.name}
          autoOpen={true}
          onSuccess={() => setSelectedMachine('')}
        />
      )}
    </div>
  );
}
