'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

interface WeavingRecord {
  id: string;
  created_at: string;
  date: string;
  shift: string;
  produced_length: number;
  produced_weight: number;
  notes: string;
  roll_id: string;
  weaving_rolls: {
    roll_number: string;
    status: string;
    tkan_specifications: {
      kod_tkani: string;
      nazvanie_tkani: string;
    } | null;
  } | null;
  employees: {
    full_name: string;
  } | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function FabricHistoryPage() {
  const [records, setRecords] = useState<WeavingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_weaving')
        .select(`
          *,
          weaving_rolls:roll_id(
            roll_number,
            status,
            tkan_specifications(kod_tkani, nazvanie_tkani)
          ),
          employees:operator_id(full_name)
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
      record.weaving_rolls?.roll_number?.toLowerCase().includes(searchLower) ||
      record.weaving_rolls?.tkan_specifications?.kod_tkani?.toLowerCase().includes(searchLower) ||
      record.weaving_rolls?.tkan_specifications?.nazvanie_tkani?.toLowerCase().includes(searchLower);
  });

  const totalLength = filteredRecords.reduce((sum, r) => sum + (r.produced_length || 0), 0);
  const totalWeight = filteredRecords.reduce((sum, r) => sum + (r.produced_weight || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div className="flex items-center gap-4">
          <Link href="/warehouse/fabric">
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал операций склада ткани
            </h1>
            <p className="text-zinc-400 mt-1">История производства ткачества</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по номеру рулона, коду ткани..."
          className="w-full md:w-1/3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего записей</p>
          <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Наткано (м)</p>
          <p className="text-2xl font-bold text-purple-500">{totalLength.toLocaleString()}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Общий вес (кг)</p>
          <p className="text-2xl font-bold text-purple-500">{totalWeight.toLocaleString()}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Рулон</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Ткань</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Длина (м)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Вес (кг)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-zinc-400 uppercase">Статус рулона</th>
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
                    <td className="px-4 py-3 text-sm font-mono text-purple-300">
                      {record.weaving_rolls?.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">
                        {record.weaving_rolls?.tkan_specifications?.kod_tkani || '-'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {record.weaving_rolls?.tkan_specifications?.nazvanie_tkani || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="font-bold text-green-400">
                        +{record.produced_length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-300">
                      {record.produced_weight || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs border ${
                        record.weaving_rolls?.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/50'
                          : record.weaving_rolls?.status === 'active'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/50'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50'
                      }`}>
                        {record.weaving_rolls?.status === 'completed' ? 'Завершен' :
                         record.weaving_rolls?.status === 'active' ? 'В работе' :
                         record.weaving_rolls?.status || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {record.employees?.full_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 max-w-[200px] truncate">
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
