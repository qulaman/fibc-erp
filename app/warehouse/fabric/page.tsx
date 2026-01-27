'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface BalanceRecord {
  fabric_type_id: string;
  name: string;
  code: string;
  width_cm: number;
  balance_kg: number;
  balance_meters: number;
}

interface RollRecord {
  id: string;
  roll_number: string;
  status: string;
  total_length: number;
  total_weight: number;
  created_at: string;
  fabric_spec_id: number;
  tkan_specifications: {
    kod_tkani: string;
    nazvanie_tkani: string;
    shirina_polotna_sm: number;
  } | null;
}

export default function FabricWarehousePage() {
  const [view, setView] = useState<'balance' | 'rolls'>('balance');
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [rolls, setRolls] = useState<RollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (view === 'balance') {
      fetchBalances();
    } else {
      fetchRolls();
    }
  }, [view]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fabric_stock_balance')
        .select('*')
        .order('balance_kg', { ascending: false });

      if (error) throw error;
      setBalances(data || []);
    } catch (err) {
      console.error('Error fetching balances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weaving_rolls')
        .select('*, tkan_specifications(kod_tkani, nazvanie_tkani, shirina_polotna_sm)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRolls(data || []);
    } catch (err) {
      console.error('Error fetching rolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalances = balances.filter(record => {
    const matchesSearch = !searchQuery ||
      record.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredRolls = rolls.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesSearch = !searchQuery ||
      record.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.tkan_specifications?.kod_tkani?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.tkan_specifications?.nazvanie_tkani?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalBalanceKg = filteredBalances.reduce((sum, r) => sum + (r.balance_kg || 0), 0);
  const totalBalanceM = filteredBalances.reduce((sum, r) => sum + (r.balance_meters || 0), 0);
  const totalRolls = filteredRolls.length;
  const completedRolls = filteredRolls.filter(r => r.status === 'completed').length;
  const activeRolls = filteredRolls.filter(r => r.status === 'active').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'active':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/50';
      case 'used':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершен';
      case 'active': return 'В работе';
      case 'used': return 'Использован';
      default: return status;
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Склад ткани</h1>
          <div className="flex gap-3">
            <Link
              href="/warehouse/fabric/history"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors border border-zinc-700"
            >
              Журнал операций
            </Link>
            <Link
              href="/production/weaving"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              + Производство
            </Link>
          </div>
        </div>
        <p className="text-zinc-400">Учет рулонов ткани из цеха ткачества</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setView('balance')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'balance'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Остатки по типам
        </button>
        <button
          onClick={() => setView('rolls')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'rolls'
              ? 'bg-purple-600 text-white'
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
            placeholder={view === 'balance' ? 'Код или название ткани...' : 'Номер рулона, код ткани...'}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {view === 'rolls' && (
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="completed">Завершен</option>
              <option value="active">В работе</option>
              <option value="used">Использован</option>
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {view === 'balance' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Типов ткани</p>
            <p className="text-2xl font-bold">{filteredBalances.length}</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
            <p className="text-sm text-purple-400 mb-1">Общий вес</p>
            <p className="text-2xl font-bold text-purple-500">{totalBalanceKg.toLocaleString()} кг</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
            <p className="text-sm text-purple-400 mb-1">Общая длина</p>
            <p className="text-2xl font-bold text-purple-500">{totalBalanceM.toLocaleString()} м</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Всего рулонов</p>
            <p className="text-2xl font-bold">{totalRolls}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
            <p className="text-sm text-green-400 mb-1">Завершено</p>
            <p className="text-2xl font-bold text-green-500">{completedRolls}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
            <p className="text-sm text-blue-400 mb-1">В работе</p>
            <p className="text-2xl font-bold text-blue-500">{activeRolls}</p>
          </div>
          <div className="bg-zinc-500/10 border border-zinc-500/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Использовано</p>
            <p className="text-2xl font-bold text-zinc-400">{totalRolls - completedRolls - activeRolls}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : view === 'balance' ? (
        filteredBalances.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            Нет данных на складе
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Код</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Наименование</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Ширина</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Вес (кг)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Длина (м)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredBalances.map((record) => (
                    <tr key={record.fabric_type_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold">
                        {record.code}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-zinc-400">
                        {record.width_cm} см
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-bold text-lg text-purple-400">
                          {Math.round(record.balance_kg).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-semibold">
                          {Math.round(record.balance_meters).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        filteredRolls.length === 0 ? (
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
                    <th className="px-4 py-3 text-left text-sm font-semibold">Тип ткани</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Ширина</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Длина (м)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Вес (кг)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Статус</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Дата создания</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredRolls.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold">
                        {record.roll_number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{record.tkan_specifications?.kod_tkani || '-'}</div>
                        <div className="text-xs text-zinc-500">{record.tkan_specifications?.nazvanie_tkani || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-zinc-400">
                        {record.tkan_specifications?.shirina_polotna_sm || '-'} см
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {Math.round(record.total_length || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-bold text-purple-400">
                          {Math.round(record.total_weight || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${getStatusColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(record.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
