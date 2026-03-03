'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Plus, Scissors, Trash2, Pencil, X } from "lucide-react";
import SewingDetailsDialog from './SewingDetailsDialog';

// Форматирование даты
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const formatTime = (timeStr: string) => {
  return timeStr?.slice(0, 5) || '—';
}

export default function SewingHistoryPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('production_sewing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setError(error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, date: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись пошива от ${new Date(date).toLocaleDateString('ru-RU')}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_sewing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchLogs();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить запись.\n\nЭта запись связана с другими данными в системе.`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('production_sewing')
        .update({
          date: editingRecord.date,
          seamstress: editingRecord.seamstress || null,
          shift_master: editingRecord.shift_master || null,
          operation_name: editingRecord.operation_name || null,
          operation_category: editingRecord.operation_category || null,
          quantity_good: Number(editingRecord.quantity_good),
          quantity_defect: Number(editingRecord.quantity_defect) || 0,
          amount_kzt: Number(editingRecord.amount_kzt) || 0,
          notes: editingRecord.notes || null,
        })
        .eq('id', editingRecord.id);
      if (updateError) throw updateError;
      setEditingRecord(null);
      fetchLogs();
    } catch (err: any) {
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error}</div>;
  if (loading) return <div className="text-white p-8">Загрузка...</div>;

  // Группируем по дате для статистики
  const totalAmount = logs.reduce((sum, log) => sum + (log.amount_kzt || 0), 0);
  const totalGood = logs.reduce((sum, log) => sum + (log.quantity_good || 0), 0);
  const totalDefect = logs.reduce((sum, log) => sum + (log.quantity_defect || 0), 0);

  return (
    <>
    <div className="page-container">

      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/sewing">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-pink-600 p-2 rounded-lg">
                <Scissors size={24} className="text-white" />
              </div>
              Журнал Производства Пошива
            </h1>
            <p className="page-description">История операций пошива</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/production/sewing/daily">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white font-bold gap-2">
              <Plus size={18} /> Дневной отчет
            </Button>
          </Link>
        </div>
      </div>

      {/* Статистика */}
      {logs && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Всего операций</div>
            <div className="text-2xl font-bold text-white">{logs.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Годных изделий</div>
            <div className="text-2xl font-bold text-green-400">{totalGood}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Брак</div>
            <div className="text-2xl font-bold text-red-400">{totalDefect}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Сумма оплаты</div>
            <div className="text-2xl font-bold text-pink-400">{totalAmount.toLocaleString('ru-RU')} ₸</div>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Дата / Время</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Документ</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Швея</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs hidden lg:table-cell">Операция</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Годных</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Брак</th>
                <th className="px-4 py-4 text-right font-bold text-pink-500 uppercase text-xs">Сумма</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Детали</th>
                {isAdmin && (
                  <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs?.length === 0 ? (
                <tr>
                   <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-zinc-500">Записей пока нет</td>
                </tr>
              ) : (
                logs?.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">

                    {/* Дата и Время */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                           <Calendar size={12} className="text-zinc-500"/> {formatDate(row.date)}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {formatTime(row.time)}
                        </span>
                      </div>
                    </td>

                    {/* Документ */}
                    <td className="px-4 py-3 font-mono text-zinc-300 text-xs">
                      {row.doc_number}
                    </td>

                    {/* Швея */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.seamstress}</div>
                      <div className="text-xs text-zinc-500">
                        {row.shift_master ? `Мастер: ${row.shift_master}` : '—'}
                      </div>
                    </td>

                    {/* Операция */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="font-medium text-white">{row.operation_name}</div>
                      <div className="text-xs text-zinc-500">{row.operation_category}</div>
                    </td>

                    {/* Годных */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-green-400 border-green-700 font-mono">
                        {row.quantity_good}
                      </Badge>
                    </td>

                    {/* Брак */}
                    <td className="px-4 py-3 text-center">
                      {row.quantity_defect > 0 ? (
                        <Badge variant="outline" className="text-red-400 border-red-700 font-mono">
                          {row.quantity_defect}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Сумма */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-pink-400 text-base">
                      {row.amount_kzt?.toLocaleString('ru-RU')} ₸
                    </td>

                    {/* Кнопка Деталей */}
                    <td className="px-4 py-3 text-center">
                      <SewingDetailsDialog record={row} />
                    </td>

                    {/* Кнопки редактирования и удаления (только для админа) */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingRecord({ ...row })}
                            className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-950 rounded transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id, row.date)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить запись"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Модальное окно редактирования */}
    {editingRecord && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold">Редактировать запись пошива</h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{editingRecord.doc_number}</p>
            </div>
            <button onClick={() => setEditingRecord(null)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
          </div>
          <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Дата</label>
              <input type="date" value={editingRecord.date} onChange={e => setEditingRecord({ ...editingRecord, date: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Швея</label>
                <input type="text" value={editingRecord.seamstress || ''} onChange={e => setEditingRecord({ ...editingRecord, seamstress: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Мастер смены</label>
                <input type="text" value={editingRecord.shift_master || ''} onChange={e => setEditingRecord({ ...editingRecord, shift_master: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Операция</label>
                <input type="text" value={editingRecord.operation_name || ''} onChange={e => setEditingRecord({ ...editingRecord, operation_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Категория</label>
                <input type="text" value={editingRecord.operation_category || ''} onChange={e => setEditingRecord({ ...editingRecord, operation_category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Годных (шт)</label>
                <input type="number" value={editingRecord.quantity_good} onChange={e => setEditingRecord({ ...editingRecord, quantity_good: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Брак (шт)</label>
                <input type="number" value={editingRecord.quantity_defect || 0} onChange={e => setEditingRecord({ ...editingRecord, quantity_defect: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Сумма оплаты (₸)</label>
              <input type="number" value={editingRecord.amount_kzt || 0} onChange={e => setEditingRecord({ ...editingRecord, amount_kzt: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Примечания</label>
              <textarea rows={2} value={editingRecord.notes || ''} onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none" />
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
            <button onClick={() => setEditingRecord(null)} className="flex-1 py-2 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">Отмена</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg font-bold transition-colors">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
