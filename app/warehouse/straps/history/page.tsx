'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

interface StrapsRecord {
  id: string;
  created_at: string;
  date: string;
  shift: string;
  produced_length: number;
  produced_weight: number;
  notes: string;
  strap_types: {
    code: string;
    name: string;
    width_mm: number;
    color: string;
  } | null;
  equipment: {
    name: string;
  } | null;
  employees: {
    full_name: string;
  } | null;
  straps_warehouse: {
    roll_number: string;
    status: string;
  }[];
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function StrapsHistoryPage() {
  const [records, setRecords] = useState<StrapsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_straps')
        .select(`
          *,
          strap_types(code, name, width_mm, color),
          equipment:machine_id(name),
          employees:operator_id(full_name),
          straps_warehouse(roll_number, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery ||
      record.strap_types?.code?.toLowerCase().includes(searchLower) ||
      record.strap_types?.name?.toLowerCase().includes(searchLower) ||
      record.straps_warehouse?.some(r => r.roll_number?.toLowerCase().includes(searchLower));
  });

  const totalLength = filteredRecords.reduce((sum, r) => sum + (r.produced_length || 0), 0);
  const totalWeight = filteredRecords.reduce((sum, r) => sum + (r.produced_weight || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div className="flex items-center gap-4">
          <Link href="/warehouse/straps">
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал операций склада строп
            </h1>
            <p className="text-zinc-400 mt-1">История производства строп</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по коду, названию, номеру рулона..."
          className="w-full md:w-1/3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего операций</p>
          <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">Произведено (м)</p>
          <p className="text-2xl font-bold text-blue-500">{totalLength.toLocaleString()}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">Общий вес (кг)</p>
          <p className="text-2xl font-bold text-blue-500">{totalWeight.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Загрузка...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">Нет записей</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Дата / Время</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Смена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Тип стропы</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Ширина</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Длина (м)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Вес (кг)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Рулон</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Станок</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Оператор</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.shift === 'День' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {record.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">{record.strap_types?.code || '-'}</div>
                      <div className="text-xs text-zinc-500">{record.strap_types?.name || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-400">
                      {record.strap_types?.width_mm || '-'} мм
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="font-bold text-green-400">
                        +{record.produced_length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-300">
                      {record.produced_weight || 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-300">
                      {record.straps_warehouse?.[0]?.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {record.equipment?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {record.employees?.full_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 max-w-[150px] truncate">
                      {record.notes || '-'}
                    </td>
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
