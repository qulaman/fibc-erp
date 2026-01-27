'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface BalanceRecord {
  cutting_type_code: string;
  cutting_type_name: string;
  category: string;
  total_received: number;
  total_used: number;
  balance: number;
}

interface WarehouseRecord {
  id: string;
  doc_number: string;
  date: string;
  time: string;
  operation: string;
  cutting_type_code: string;
  cutting_type_name: string;
  category: string;
  quantity: number;
  source_number: string;
  operator: string;
  status: string;
  notes: string;
  created_at: string;
}

export default function CuttingWarehousePage() {
  const [view, setView] = useState<'balance' | 'history'>('balance');
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [history, setHistory] = useState<WarehouseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');

  useEffect(() => {
    if (view === 'balance') {
      fetchBalances();
    } else {
      fetchHistory();
    }
  }, [view]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cutting_parts_balance')
        .select('*')
        .order('cutting_type_code');

      if (error) throw error;
      setBalances(data || []);
    } catch (err) {
      console.error('Error fetching balances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cutting_parts_warehouse')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalances = balances.filter(record => {
    const matchesCategory = filterCategory === 'all' || record.category === filterCategory;
    const matchesSearch = !searchQuery ||
      record.cutting_type_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const filteredHistory = history.filter(record => {
    const matchesCategory = filterCategory === 'all' || record.category === filterCategory;
    const matchesOperation = filterOperation === 'all' || record.operation === filterOperation;
    const matchesSearch = !searchQuery ||
      record.doc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.operator?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesOperation && matchesSearch;
  });

  const categories = Array.from(new Set(
    view === 'balance'
      ? balances.map(b => b.category)
      : history.map(h => h.category)
  )).sort();

  const totalBalance = filteredBalances.reduce((sum, r) => sum + r.balance, 0);
  const totalReceived = filteredHistory
    .filter(r => r.operation === 'Приход')
    .reduce((sum, r) => sum + r.quantity, 0);
  const totalUsed = filteredHistory
    .filter(r => r.operation === 'Расход')
    .reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Склад кроеных деталей</h1>
          <Link
            href="/production/cutting"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Новая операция кроя
          </Link>
        </div>
        <p className="text-zinc-400">Учет готовых кроеных деталей</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setView('balance')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'balance'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Остатки
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          История движений
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
            placeholder={view === 'balance' ? 'Код или название детали...' : 'Документ, оператор...'}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Категория</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все категории</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {view === 'history' && (
          <div>
            <label className="block text-sm font-medium mb-2">Операция</label>
            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все операции</option>
              <option value="Приход">Приход</option>
              <option value="Расход">Расход</option>
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {view === 'balance' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Всего позиций</p>
            <p className="text-2xl font-bold">{filteredBalances.length}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Общий остаток</p>
            <p className="text-2xl font-bold">{totalBalance.toLocaleString()} шт</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Категорий</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Всего операций</p>
            <p className="text-2xl font-bold">{filteredHistory.length}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
            <p className="text-sm text-green-400 mb-1">Оприходовано</p>
            <p className="text-2xl font-bold text-green-500">{totalReceived.toLocaleString()} шт</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-sm text-red-400 mb-1">Израсходовано</p>
            <p className="text-2xl font-bold text-red-500">{totalUsed.toLocaleString()} шт</p>
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
            Нет остатков на складе
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Код</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Наименование</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Категория</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Приход</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Расход</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Остаток</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredBalances.map((record) => (
                    <tr key={record.cutting_type_code} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold">
                        {record.cutting_type_code}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.cutting_type_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300">
                          {record.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-400">
                        {record.total_received.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-400">
                        {record.total_used.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-bold text-lg">
                          {record.balance.toLocaleString()}
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
        filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            Нет движений на складе
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Документ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Операция</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Деталь</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Категория</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Количество</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Источник</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Оператор</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono">{record.doc_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(record.date).toLocaleDateString('ru-RU')}
                        <br />
                        <span className="text-xs text-zinc-500">{record.time}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${
                          record.operation === 'Приход'
                            ? 'bg-green-500/10 text-green-500 border-green-500/50'
                            : 'bg-red-500/10 text-red-500 border-red-500/50'
                        }`}>
                          {record.operation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{record.cutting_type_code}</div>
                        <div className="text-xs text-zinc-500">{record.cutting_type_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300">
                          {record.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        <span className={record.operation === 'Приход' ? 'text-green-400' : 'text-red-400'}>
                          {record.operation === 'Приход' ? '+' : '-'}{record.quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-400">
                        {record.source_number}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.operator}</td>
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
