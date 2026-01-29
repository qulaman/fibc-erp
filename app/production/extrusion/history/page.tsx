'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Plus, Trash2 } from "lucide-react";
import ExtrusionDetailsDialog from './ExtrusionDetailsDialog';

// Форматирование даты
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function ExtrusionHistoryPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    // Сложный запрос с "подтягиванием" связей (JOIN)
    const { data, error } = await supabase
      .from('production_extrusion')
      .select(`
        *,
        equipment (name),
        operator_extruder:employees!operator_extruder_id (full_name),
        operator_winder1:employees!operator_winder1_id (full_name),
        operator_winder2:employees!operator_winder2_id (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, batchNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись производства партии ${batchNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_extrusion')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchLogs();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить запись партии ${batchNumber}.\n\nЭта запись связана с другими данными в системе (склад нити).`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error}</div>;

  return (
    <div className="page-container">

      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/extrusion">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-[#E60012] p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал Производства Экструзии
            </h1>
            <p className="page-description">История смен экструзии</p>
          </div>
        </div>

        <Link href="/production/extrusion">
          <Button className="bg-[#E60012] hover:bg-red-700 text-white font-bold gap-2">
            <Plus size={18} /> Новая смена
          </Button>
        </Link>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка данных...</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Дата / Смена</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Партия</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Продукт</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs hidden md:table-cell">Оператор</th>
                  <th className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs">Бобин</th>
                  <th className="px-4 py-4 text-right font-bold text-[#E60012] uppercase text-xs">Вес Нетто</th>
                  <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Детали</th>
                  {isAdmin && (
                    <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {logs.length === 0 ? (
                  <tr>
                     <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-zinc-500">Записей пока нет</td>
                  </tr>
                ) : (
                  logs.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                    
                    {/* Дата и Смена */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                           <Calendar size={12} className="text-zinc-500"/> {formatDate(row.date)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {row.shift === 'День' ? '☀️ День' : '🌙 Ночь'}
                        </span>
                      </div>
                    </td>

                    {/* Партия */}
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      <div className="flex flex-col">
                         <span>{row.batch_number}</span>
                         <span className="text-[10px] text-zinc-600">{row.doc_number}</span>
                      </div>
                    </td>

                    {/* Продукт и Линия */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.yarn_name || `Нить ${row.yarn_denier}D`}</div>
                      <div className="text-xs text-zinc-500">{row.equipment?.name}</div>
                    </td>

                    {/* Оператор */}
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {row.operator_extruder?.full_name?.split(' ')[0] || '—'}
                    </td>

                    {/* Бобины */}
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {row.output_bobbins}
                    </td>

                    {/* Вес */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#E60012] text-base">
                      {row.output_weight_net}
                    </td>

                    {/* Кнопка Деталей */}
                    <td className="px-4 py-3 text-center">
                      <ExtrusionDetailsDialog record={row} />
                    </td>

                    {/* Кнопка Удаления */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(row.id, row.batch_number)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                          title="Удалить запись"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}