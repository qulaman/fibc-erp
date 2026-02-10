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
  waste_oploy_kg: number;
  waste_shift_kg: number;
  waste_trim_kg: number;
  notes: string;
  equipment: {
    name: string;
  } | null;
  operator1: {
    full_name: string;
  } | null;
  operator2: {
    full_name: string;
  } | null;
  operator3: {
    full_name: string;
  } | null;
  production_lamination_rolls: {
    input_roll_number: string;
    input_weight_kg: number;
    output_roll_number: string;
    output_weight_kg: number;
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
        .from('production_lamination_shifts')
        .select(`
          *,
          equipment:machine_id(name),
          operator1:operator1_id(full_name),
          operator2:operator2_id(full_name),
          operator3:operator3_id(full_name),
          production_lamination_rolls(
            input_roll_number,
            input_weight_kg,
            output_roll_number,
            output_weight_kg
          )
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
      record.production_lamination_rolls?.some(r =>
        r.input_roll_number?.toLowerCase().includes(searchLower) ||
        r.output_roll_number?.toLowerCase().includes(searchLower)
      );
  });

  const totalInput = filteredRecords.reduce((sum, r) =>
    sum + (r.production_lamination_rolls?.reduce((s, roll) => s + (roll.input_weight_kg || 0), 0) || 0), 0);
  const totalOutput = filteredRecords.reduce((sum, r) =>
    sum + (r.production_lamination_rolls?.reduce((s, roll) => s + (roll.output_weight_kg || 0), 0) || 0), 0);
  const totalWaste = filteredRecords.reduce((sum, r) =>
    sum + (r.waste_oploy_kg || 0) + (r.waste_shift_kg || 0) + (r.waste_trim_kg || 0), 0);

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
          <p className="text-sm text-zinc-400 mb-1">Всего смен</p>
          <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Вход ткани (кг)</p>
          <p className="text-2xl font-bold text-purple-500">{totalInput.toFixed(1)}</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4">
          <p className="text-sm text-orange-400 mb-1">Выход ламината (кг)</p>
          <p className="text-2xl font-bold text-orange-500">{totalOutput.toFixed(1)}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Документ</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Смена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Операторы</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-zinc-400 uppercase">Рулонов</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Вход (кг)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Выход (кг)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Отходы (кг)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Станок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => {
                  const totalInputWeight = record.production_lamination_rolls?.reduce((sum, r) => sum + (r.input_weight_kg || 0), 0) || 0;
                  const totalOutputWeight = record.production_lamination_rolls?.reduce((sum, r) => sum + (r.output_weight_kg || 0), 0) || 0;
                  const totalWasteKg = (record.waste_oploy_kg || 0) + (record.waste_shift_kg || 0) + (record.waste_trim_kg || 0);
                  const rollsCount = record.production_lamination_rolls?.length || 0;
                  const operators = [record.operator1?.full_name, record.operator2?.full_name, record.operator3?.full_name]
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr key={record.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {new Date(record.date).toLocaleDateString('ru-RU')}
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
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {operators || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-orange-400">
                        {rollsCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-purple-400">
                        {totalInputWeight.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-bold text-green-400">
                          {totalOutputWeight.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-400">
                        {totalWasteKg.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {record.equipment?.name || '-'}
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
