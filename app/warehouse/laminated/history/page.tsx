'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

interface LaminationRecord {
  id: string;
  created_at: string;
  doc_number: string;
  date: string;
  shift: string;
  input_length: number;
  input_weight: number;
  output_length: number;
  output_weight: number;
  waste_weight: number;
  notes: string;
  equipment: {
    name: string;
  } | null;
  employees: {
    full_name: string;
  } | null;
  input_roll: {
    roll_number: string;
    tkan_specifications: {
      kod_tkani: string;
      nazvanie_tkani: string;
    } | null;
  } | null;
  laminated_rolls: {
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

export default function LaminatedHistoryPage() {
  const [records, setRecords] = useState<LaminationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_lamination')
        .select(`
          *,
          equipment:machine_id(name),
          employees:operator_id(full_name),
          input_roll:input_roll_id(
            roll_number,
            tkan_specifications(kod_tkani, nazvanie_tkani)
          ),
          laminated_rolls(roll_number, status)
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
      record.doc_number?.toLowerCase().includes(searchLower) ||
      record.input_roll?.roll_number?.toLowerCase().includes(searchLower) ||
      record.input_roll?.tkan_specifications?.kod_tkani?.toLowerCase().includes(searchLower) ||
      record.laminated_rolls?.some(r => r.roll_number?.toLowerCase().includes(searchLower));
  });

  const totalInput = filteredRecords.reduce((sum, r) => sum + (r.input_length || 0), 0);
  const totalOutput = filteredRecords.reduce((sum, r) => sum + (r.output_length || 0), 0);
  const totalWaste = filteredRecords.reduce((sum, r) => sum + (r.waste_weight || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div className="flex items-center gap-4">
          <Link href="/warehouse/laminated">
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-orange-600 p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал операций склада ламината
            </h1>
            <p className="text-zinc-400 mt-1">История производства ламинации</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по документу, рулону..."
          className="w-full md:w-1/3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего операций</p>
          <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Вход ткани (м)</p>
          <p className="text-2xl font-bold text-purple-500">{totalInput.toLocaleString()}</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4">
          <p className="text-sm text-orange-400 mb-1">Выход ламината (м)</p>
          <p className="text-2xl font-bold text-orange-500">{totalOutput.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400 mb-1">Отходы (кг)</p>
          <p className="text-2xl font-bold text-red-500">{totalWaste.toFixed(1)}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Документ</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Смена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Исх. рулон</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Ткань</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Вход (м)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Выход (м)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Отходы</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Вых. рулон</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Станок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                      {record.doc_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.shift === 'День' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {record.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-purple-300">
                      {record.input_roll?.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">
                        {record.input_roll?.tkan_specifications?.kod_tkani || '-'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {record.input_roll?.tkan_specifications?.nazvanie_tkani || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-400">
                      -{record.input_length || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="font-bold text-green-400">
                        +{record.output_length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-500">
                      {record.waste_weight?.toFixed(1) || '0'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-orange-300">
                      {record.laminated_rolls?.[0]?.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {record.equipment?.name || '-'}
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
