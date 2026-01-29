'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

interface RollRecord {
  id: string;
  roll_number: string;
  strap_type_id: string;
  produced_length: number;
  produced_weight: number;
  length: number;
  weight: number;
  status: string;
  created_at: string;
  strap_types: {
    code: string;
    name: string;
    width_mm: number;
    color: string;
  } | null;
  production_straps: {
    date: string;
    shift: string;
  } | null;
}

export default function StrapsWarehousePage() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'available' | 'all'>('available');
  const [rolls, setRolls] = useState<RollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchRolls();
  }, [view]);

  const fetchRolls = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('straps_warehouse')
        .select(`
          *,
          strap_types(code, name, width_mm, color),
          production_straps(date, shift)
        `)
        .order('created_at', { ascending: false });

      if (view === 'available') {
        query = query.eq('status', 'available');
      }

      const { data, error } = await query;

      if (error) throw error;
      setRolls(data || []);
    } catch (err) {
      console.error('Error fetching rolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, rollNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить рулон ${rollNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('straps_warehouse')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchRolls();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить рулон ${rollNumber}.\n\nЭта запись связана с другими данными в системе (крой или пошив).\nСначала удалите связанные записи.`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  const filteredRolls = rolls.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesSearch = !searchQuery ||
      record.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.strap_types?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.strap_types?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalWeight = filteredRolls.reduce((sum, r) => sum + (r.produced_weight || r.weight || 0), 0);
  const totalLength = filteredRolls.reduce((sum, r) => sum + (r.produced_length || r.length || 0), 0);
  const availableRolls = filteredRolls.filter(r => r.status === 'available').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'used':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Доступен';
      case 'used': return 'Использован';
      default: return status;
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Склад строп</h1>
          <div className="flex gap-3">
            <Link
              href="/warehouse/straps/history"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors border border-zinc-700"
            >
              Журнал операций
            </Link>
            <Link
              href="/production/straps"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              + Производство
            </Link>
          </div>
        </div>
        <p className="text-zinc-400">Готовые рулоны строп на складе</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setView('available')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'available'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Доступные
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Все рулоны
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Поиск</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Номер рулона, код или тип стропы..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {view === 'all' && (
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="available">Доступен</option>
              <option value="used">Использован</option>
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего рулонов</p>
          <p className="text-2xl font-bold">{filteredRolls.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-1">Доступно</p>
          <p className="text-2xl font-bold text-green-500">{availableRolls}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">Общий вес</p>
          <p className="text-2xl font-bold text-blue-500">{Math.round(totalWeight).toLocaleString()} кг</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">Общая длина</p>
          <p className="text-2xl font-bold text-blue-500">{Math.round(totalLength).toLocaleString()} м</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : filteredRolls.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Нет рулонов на складе
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Номер рулона</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Тип стропы</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Ширина</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Длина (м)</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Вес (кг)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Статус</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Дата / Смена</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRolls.map((record) => {
                  const weight = record.produced_weight || record.weight || 0;
                  const length = record.produced_length || record.length || 0;

                  return (
                    <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold">
                        {record.roll_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{record.strap_types?.code || '-'}</div>
                        <div className="text-xs text-zinc-500">{record.strap_types?.name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-zinc-400">
                        {record.strap_types?.width_mm || '-'} мм
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {Math.round(length).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-bold text-blue-400">
                          {Math.round(weight).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${getStatusColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {record.production_straps?.date
                          ? new Date(record.production_straps.date).toLocaleDateString('ru-RU')
                          : '-'}
                        {record.production_straps?.shift && (
                          <span className="ml-2 text-xs">({record.production_straps.shift})</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(record.id, record.roll_number || 'эту запись')}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить запись"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
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
