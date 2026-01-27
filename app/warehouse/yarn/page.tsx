'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Package, Ruler, Palette } from 'lucide-react';

// Обновленный интерфейс под вашу реальную структуру БД
interface YarnRecord {
  id: string;
  batch_number: string;
  quantity_kg: number;
  bobbin_count: number;
  location: string;
  last_updated: string;
  
  // Данные лежат напрямую в таблице, без yarn_types
  name: string;
  denier: number;
  color: string;
  width_mm: number; 
  yarn_code?: string;
}

export default function YarnWarehousePage() {
  const [view, setView] = useState<'available' | 'all'>('available');
  const [items, setItems] = useState<YarnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [view]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Убрали join yarn_types(...), так как данные теперь лежат локально
      let query = supabase
        .from('yarn_inventory')
        .select('*') 
        .order('last_updated', { ascending: false });

      if (view === 'available') {
        query = query.gt('quantity_kg', 0);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    
    // Поиск теперь идет по прямым полям
    return !searchQuery ||
      item.batch_number?.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.color?.toLowerCase().includes(searchLower) ||
      item.denier?.toString().includes(searchLower);
  });

  const totalWeight = filteredItems.reduce((sum, i) => sum + (i.quantity_kg || 0), 0);
  const totalBobbins = filteredItems.reduce((sum, i) => sum + (i.bobbin_count || 0), 0);
  const itemsWithStock = filteredItems.filter(i => i.quantity_kg > 0).length;

  return (
    <div className="page-container max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="text-indigo-500" />
            Склад нити
          </h1>
          <div className="flex gap-3">
            <Link
              href="/warehouse/yarn/history"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors text-white border border-zinc-700"
            >
              Журнал операций
            </Link>
            <Link
              href="/production/extrusion"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors text-white"
            >
              + Производство
            </Link>
          </div>
        </div>
        <p className="text-zinc-400">Полуфабрикаты из цеха экструзии</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setView('available')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'available'
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          В наличии
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Все партии (Архив)
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-zinc-400">Поиск по складу</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Номер партии, 1200D, Белый..."
          className="w-full md:w-1/3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего партий</p>
          <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Партий с остатком</p>
          <p className="text-2xl font-bold text-green-500">{itemsWithStock}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Общий вес на складе</p>
          <p className="text-2xl font-bold text-indigo-400">{totalWeight.toFixed(1)} кг</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего бобин</p>
          <p className="text-2xl font-bold text-indigo-400">{totalBobbins.toLocaleString()}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-zinc-500 text-lg">Нет данных</p>
          <p className="text-zinc-600 text-sm">Попробуйте изменить фильтры или добавить продукцию через Экструзию</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950/50 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Партия</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Наименование</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Характеристики</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Остаток (кг)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Бобин</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Обновлено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-4 py-4 text-sm font-mono font-medium text-indigo-300">
                      {item.batch_number}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-white">{item.name || 'Без названия'}</div>
                      <div className="text-xs text-zinc-500">{item.yarn_code}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex justify-center gap-2">
                          {/* Денье */}
                          <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700" title="Денье">
                            <span className="font-bold mr-1">{item.denier || '?'}</span> D
                          </span>
                          
                          {/* Цвет */}
                          {item.color && (
                              <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700" title="Цвет">
                                <Palette size={10} className="mr-1 opacity-50"/> {item.color}
                              </span>
                          )}

                          {/* Ширина */}
                          {item.width_mm && (
                              <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700" title="Ширина">
                                <Ruler size={10} className="mr-1 opacity-50"/> {item.width_mm} мм
                              </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      <span className={`text-lg font-bold ${item.quantity_kg > 0 ? 'text-white' : 'text-zinc-600'}`}>
                        {item.quantity_kg?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-right text-zinc-400">
                      {item.bobbin_count || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500">
                      {item.last_updated
                        ? new Date(item.last_updated).toLocaleDateString('ru-RU')
                        : '-'}
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