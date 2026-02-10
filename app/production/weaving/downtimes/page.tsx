'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface Downtime {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes: string;
  shift: string;
  equipment?: {
    name: string;
  };
}

export default function WeavingDowntimesPage() {
  const [downtimes, setDowntimes] = useState<Downtime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDowntimes();
  }, []);

  const fetchDowntimes = async () => {
    try {
      // Сначала получаем ID всех станков ткацкого цеха
      const { data: weavingEquipment, error: eqError } = await supabase
        .from('equipment')
        .select('id')
        .or('type.eq.loom,type.eq.weaving,type.eq.loom_round');

      if (eqError) throw eqError;

      const weavingMachineIds = weavingEquipment?.map(eq => eq.id) || [];

      // Затем получаем простои только для этих станков
      const { data, error } = await supabase
        .from('production_downtimes')
        .select(`
          *,
          equipment (name)
        `)
        .in('machine_id', weavingMachineIds)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setDowntimes(data || []);
    } catch (err) {
      console.error('Error fetching downtimes:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/weaving">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-orange-600 p-2 rounded-lg">
                <AlertTriangle size={24} className="text-white" />
              </div>
              Журнал Простоев
            </h1>
            <p className="text-zinc-500 mt-2">История остановок станков ткацкого цеха</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : downtimes.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-zinc-500 text-lg">Нет данных о простоях</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950/50 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Станок</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Начало</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Конец</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Длительность (мин)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Причина</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Смена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {downtimes.map((downtime) => {
                  const duration = calculateDuration(downtime.start_time, downtime.end_time);
                  return (
                    <tr key={downtime.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-4 text-sm text-white">
                        {new Date(downtime.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-white">
                        {downtime.equipment?.name || 'Не указан'}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {new Date(downtime.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {new Date(downtime.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                          duration > 60 ? 'bg-red-900/50 text-red-300' :
                          duration > 30 ? 'bg-orange-900/50 text-orange-300' :
                          'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {duration} мин
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white">
                        {downtime.reason}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          downtime.shift === 'День' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-blue-900/30 text-blue-400'
                        }`}>
                          {downtime.shift}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-500 max-w-xs truncate">
                        {downtime.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
