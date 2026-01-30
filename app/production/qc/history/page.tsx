'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function QCHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('qc_journal')
      .select('*')
      .order('inspection_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, docNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись ОТК ${docNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('qc_journal')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchRecords();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить запись.\n\nЭта запись связана с другими данными в системе.`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  if (error) return <div className="text-white p-8">Ошибка: {error}</div>;
  if (loading) return <div className="text-white p-8">Загрузка...</div>;

  // Статистика
  const totalRecords = records.length;
  const totalGood = records.reduce((sum, r) => sum + (r.quantity_good || 0), 0);
  const totalDefect = records.reduce((sum, r) => sum + (r.quantity_defect || 0), 0);
  const totalInspected = totalGood + totalDefect;
  const defectRate = totalInspected > 0 ? ((totalDefect / totalInspected) * 100).toFixed(2) : 0;

  return (
    <div className="p-4 md:p-8 font-sans bg-black min-h-screen text-white">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/production/qc">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
              <ArrowLeft size={18} className="md:hidden" />
              <ArrowLeft size={20} className="hidden md:block" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#E60012] flex items-center gap-2">
              <FileText size={24} className="md:hidden" />
              <FileText size={32} className="hidden md:block" />
              Журнал ОТК
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm">История приёмки и контроля качества</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-4">
          <p className="text-zinc-500 text-[10px] md:text-sm">Всего проверок</p>
          <p className="text-xl md:text-3xl font-bold text-white">{totalRecords}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-4">
          <p className="text-zinc-500 text-[10px] md:text-sm">Годных</p>
          <p className="text-xl md:text-3xl font-bold text-green-400">{totalGood} шт</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-4">
          <p className="text-zinc-500 text-[10px] md:text-sm">Брак</p>
          <p className="text-xl md:text-3xl font-bold text-red-400">{totalDefect} шт</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-4">
          <p className="text-zinc-500 text-[10px] md:text-sm">% брака</p>
          <p className="text-xl md:text-3xl font-bold text-orange-400">{defectRate}%</p>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-xs md:text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-2 md:px-4 py-2 md:py-4 text-left font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Документ</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-left font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Дата</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-left font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Контролер</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-left font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Изделие</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-right font-bold text-green-500 uppercase text-[10px] md:text-xs">Годных</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-right font-bold text-red-500 uppercase text-[10px] md:text-xs">Брак</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-center font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Решение</th>
                <th className="px-2 md:px-4 py-2 md:py-4 text-left font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Примечание</th>
                {isAdmin && (
                  <th className="px-2 md:px-4 py-2 md:py-4 text-center font-bold text-zinc-500 uppercase text-[10px] md:text-xs">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {!records || records.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 md:py-12 text-zinc-500 text-xs md:text-sm">
                    Нет записей в журнале ОТК
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const totalQty = (record.quantity_good || 0) + (record.quantity_defect || 0);
                  const defectPercent = totalQty > 0 ? ((record.quantity_defect / totalQty) * 100).toFixed(1) : 0;

                  return (
                    <tr key={record.id} className="hover:bg-zinc-800/50 transition-all">
                      <td className="px-2 md:px-4 py-2 md:py-4">
                        <span className="font-mono text-blue-400">{record.doc_number}</span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4 text-zinc-300">
                        {new Date(record.inspection_date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4 text-zinc-300">{record.inspector_name}</td>
                      <td className="px-2 md:px-4 py-2 md:py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{record.product_name}</span>
                          <span className="text-[10px] md:text-xs text-zinc-500 font-mono">{record.product_code}</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CheckCircle2 size={12} className="md:hidden text-green-500" />
                          <CheckCircle2 size={14} className="hidden md:block text-green-500" />
                          <span className="font-mono text-green-400 font-bold">{record.quantity_good}</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4 text-right">
                        {record.quantity_defect > 0 ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <XCircle size={12} className="md:hidden text-red-500" />
                              <XCircle size={14} className="hidden md:block text-red-500" />
                              <span className="font-mono text-red-400 font-bold">{record.quantity_defect}</span>
                            </div>
                            <span className="text-[10px] md:text-xs text-orange-400">({defectPercent}%)</span>
                            {record.defect_category && (
                              <Badge variant="outline" className="mt-1 text-[10px] md:text-xs border-red-800 text-red-400 bg-red-900/10">
                                {record.defect_category}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            record.decision === 'Принято'
                              ? 'border-green-700 text-green-400 bg-green-900/10 text-[10px] md:text-xs'
                              : record.decision === 'Отклонено'
                              ? 'border-red-700 text-red-400 bg-red-900/10 text-[10px] md:text-xs'
                              : 'border-yellow-700 text-yellow-400 bg-yellow-900/10 text-[10px] md:text-xs'
                          }
                        >
                          {record.decision}
                        </Badge>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-4">
                        <div className="max-w-xs">
                          {record.defect_reason && (
                            <p className="text-[10px] md:text-xs text-red-400 mb-1">
                              <strong>Брак:</strong> {record.defect_reason}
                            </p>
                          )}
                          {record.notes && (
                            <p className="text-[10px] md:text-xs text-zinc-500">{record.notes}</p>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-2 md:px-4 py-2 md:py-4 text-center">
                          <button
                            onClick={() => handleDelete(record.id, record.doc_number)}
                            className="p-1.5 md:p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить запись"
                          >
                            <Trash2 size={14} className="md:hidden" />
                            <Trash2 size={16} className="hidden md:block" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Футер */}
        <div className="bg-zinc-950 p-2 md:p-3 text-center text-[10px] md:text-xs text-zinc-600 border-t border-zinc-800">
          Всего записей: {records?.length || 0}
        </div>
      </div>
    </div>
  );
}
