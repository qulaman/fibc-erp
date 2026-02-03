'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

interface PrintingRecord {
  id: string;
  doc_number: string;
  date: string;
  time: string;
  shift: string;
  operator: string;
  cutting_type_code: string;
  cutting_type_name: string;
  category: string;
  quantity: number;
  paint_name: string;
  notes: string | null;
  status: string;
  created_at: string;
}

export default function PrintingHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<PrintingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaint, setFilterPaint] = useState('');
  const [filterShift, setFilterShift] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('production_printing')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching printing records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, docNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись печати ${docNumber}?\n\nЭта запись и соответствующий расход со склада кроя будут удалены. Действие нельзя отменить!`)) return;

    try {
      // Удаляем расход со склада кроеных деталей
      await supabase
        .from('cutting_parts_warehouse')
        .delete()
        .eq('doc_number', docNumber)
        .eq('operation', 'Расход');

      // Удаляем запись печати
      const { error } = await supabase
        .from('production_printing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchRecords();
    } catch (err: any) {
      alert('Ошибка удаления: ' + err.message);
    }
  };

  // Уникальные краски для фильтра
  const uniquePaints = [...new Set(records.map(r => r.paint_name))].sort();

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchQuery ||
      record.doc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.paint_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPaint = !filterPaint || record.paint_name === filterPaint;
    const matchesShift = !filterShift || record.shift === filterShift;

    return matchesSearch && matchesPaint && matchesShift;
  });

  // Итоги
  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="page-container">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold">Журнал печати</h1>
          <Link
            href="/production/printing"
            className="px-3 md:px-4 py-2 text-sm md:text-base bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Новая операция
          </Link>
        </div>
        <p className="text-sm md:text-base text-zinc-400">История всех операций печати деталей</p>
      </div>

      {/* Фильтры */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Поиск</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Документ, оператор, деталь, краска..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Краска</label>
          <select
            value={filterPaint}
            onChange={(e) => setFilterPaint(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Все краски</option>
            {uniquePaints.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Смена</label>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Все</option>
            <option value="День">День</option>
            <option value="Ночь">Ночь</option>
          </select>
        </div>
      </div>

      {/* Итоги */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Всего операций</p>
          <p className="text-lg md:text-2xl font-bold">{filteredRecords.length}</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Всего деталей</p>
          <p className="text-lg md:text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Уникальных красок</p>
          <p className="text-lg md:text-2xl font-bold">{uniquePaints.length}</p>
        </div>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Загрузка данных...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">Нет данных для отображения</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Документ</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Дата</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Смена</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Оператор</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Деталь</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Краска</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold">Кол-во</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold">Статус</th>
                  {isAdmin && (
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-2 md:px-4 py-2 md:py-3 font-mono">{record.doc_number}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      {new Date(record.date).toLocaleDateString('ru-RU')}
                      <br />
                      <span className="text-[10px] md:text-xs text-zinc-500">{record.time}</span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">{record.shift}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">{record.operator}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <div className="font-medium">{record.cutting_type_code}</div>
                      <div className="text-[10px] md:text-xs text-zinc-500">{record.cutting_type_name}</div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded bg-purple-900/40 text-purple-300">
                        {record.paint_name}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">
                      {record.quantity.toLocaleString()} шт
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                      <span className={`inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded border ${
                        record.status === 'Проведено'
                          ? 'bg-green-500/10 text-green-500 border-green-500/50'
                          : record.status === 'Отменено'
                            ? 'bg-red-500/10 text-red-500 border-red-500/50'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-2 md:px-4 py-2 md:py-3 text-center">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
