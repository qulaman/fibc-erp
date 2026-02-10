'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { AlertTriangle, Clock, Calendar, Factory } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DowntimeRecord {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_code: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  reason: string;
  notes: string | null;
  shift: string | null;
  date: string;
  created_at: string;
}

export default function ExtrusionDowntimesPage() {
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(7);

  useEffect(() => {
    fetchDowntimes();
  }, [filterDays]);

  const fetchDowntimes = async () => {
    setLoading(true);
    try {
      // Вычисляем дату начала периода
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - filterDays);

      const { data, error } = await supabase
        .from('downtimes_with_equipment')
        .select('*')
        .eq('machine_type', 'extruder')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('start_time', { ascending: false });

      if (error) throw error;
      setDowntimes(data || []);
    } catch (error: any) {
      console.error('Error fetching downtimes:', error);
      toast.error('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Категории причин с иконками и цветами
  const reasonCategories: Record<string, { label: string; color: string; icon: string }> = {
    'thread_break': { label: 'Обрыв нити', color: 'bg-yellow-900 border-yellow-700 text-yellow-300', icon: '🧵' },
    'equipment_failure': { label: 'Поломка оборудования', color: 'bg-red-900 border-red-700 text-red-300', icon: '⚙️' },
    'no_material': { label: 'Отсутствие сырья', color: 'bg-orange-900 border-orange-700 text-orange-300', icon: '📦' },
    'batch_change': { label: 'Смена партии/рецептуры', color: 'bg-blue-900 border-blue-700 text-blue-300', icon: '🔄' },
    'maintenance': { label: 'Плановое обслуживание', color: 'bg-green-900 border-green-700 text-green-300', icon: '🔧' },
    'quality_check': { label: 'Контроль качества', color: 'bg-purple-900 border-purple-700 text-purple-300', icon: '🔍' },
    'operator_break': { label: 'Перерыв оператора', color: 'bg-zinc-800 border-zinc-600 text-zinc-300', icon: '☕' },
    'power_outage': { label: 'Отключение электроэнергии', color: 'bg-red-950 border-red-800 text-red-400', icon: '⚡' },
    'other': { label: 'Другое', color: 'bg-zinc-900 border-zinc-700 text-zinc-400', icon: '❓' }
  };

  const getReasonStyle = (reason: string) => {
    return reasonCategories[reason] || reasonCategories['other'];
  };

  // Статистика
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + d.duration_minutes, 0);
  const totalDowntimeHours = (totalDowntimeMinutes / 60).toFixed(1);
  const avgDowntimeMinutes = downtimes.length > 0 ? (totalDowntimeMinutes / downtimes.length).toFixed(0) : 0;

  // Группировка по причинам
  const downtimesByReason = downtimes.reduce((acc, dt) => {
    if (!acc[dt.reason]) {
      acc[dt.reason] = { count: 0, totalMinutes: 0 };
    }
    acc[dt.reason].count++;
    acc[dt.reason].totalMinutes += dt.duration_minutes;
    return acc;
  }, {} as Record<string, { count: number; totalMinutes: number }>);

  const topReasons = Object.entries(downtimesByReason)
    .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-red-950 p-2 rounded-lg border border-red-800">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            Журнал Простоев Экструзии
          </h1>
        </div>
      </div>

      {/* Фильтр по периоду */}
      <div className="mb-6 flex gap-3">
        {[3, 7, 14, 30].map(days => (
          <button
            key={days}
            onClick={() => setFilterDays(days)}
            className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
              filterDays === days
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {days} дней
          </button>
        ))}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Всего простоев</div>
            <div className="text-3xl font-bold text-white">{downtimes.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Общее время</div>
            <div className="text-3xl font-bold text-red-400">{totalDowntimeHours} ч</div>
            <div className="text-xs text-zinc-600 mt-1">{totalDowntimeMinutes} минут</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Средняя длительность</div>
            <div className="text-3xl font-bold text-orange-400">{avgDowntimeMinutes} мин</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Период</div>
            <div className="text-xl font-bold text-blue-400">{filterDays} дней</div>
          </CardContent>
        </Card>
      </div>

      {/* Топ причин */}
      {topReasons.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-base">📊 Топ-5 причин простоев</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReasons.map(([reason, stats]) => {
                const style = getReasonStyle(reason);
                const percentage = ((stats.totalMinutes / totalDowntimeMinutes) * 100).toFixed(1);
                return (
                  <div key={reason} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white flex items-center gap-2">
                          <span>{style.icon}</span>
                          {style.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {stats.count} раз • {(stats.totalMinutes / 60).toFixed(1)} ч
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-red-400 w-12 text-right">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список простоев */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Все простои</CardTitle>
        </CardHeader>
        <CardContent>
          {downtimes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Простоев не зафиксировано за выбранный период
            </div>
          ) : (
            <div className="space-y-3">
              {downtimes.map(dt => {
                const style = getReasonStyle(dt.reason);
                const startTime = new Date(dt.start_time);
                const endTime = new Date(dt.end_time);

                return (
                  <div
                    key={dt.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-950 p-2 rounded border border-red-800">
                          <Factory size={20} className="text-red-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{dt.machine_name}</div>
                          <div className="text-xs text-zinc-500">{dt.machine_code}</div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-lg font-bold px-3 py-1 bg-red-900/20 border-red-800 text-red-300"
                      >
                        <Clock size={16} className="mr-1" />
                        {dt.duration_minutes} мин
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="text-sm">
                        <span className="text-zinc-500">Начало:</span>{' '}
                        <span className="text-white font-mono">
                          {format(startTime, 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-zinc-500">Окончание:</span>{' '}
                        <span className="text-white font-mono">
                          {format(endTime, 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`${style.color} border`}>
                        {style.icon} {style.label}
                      </Badge>
                      {dt.shift && (
                        <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">
                          {dt.shift === 'День' ? '☀️' : '🌙'} {dt.shift}
                        </Badge>
                      )}
                    </div>

                    {dt.notes && (
                      <div className="mt-2 p-2 bg-zinc-900 rounded border border-zinc-800 text-sm text-zinc-400">
                        <span className="text-zinc-600">Примечание:</span> {dt.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
