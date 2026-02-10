'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

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
  const { isAdmin } = useAuth();
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

  const handleDelete = async (id: string, rollNumber: string) => {
    if (!isAdmin) {
      toast.error('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить рулон ${rollNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      // Проверяем использование рулона в производстве
      const { data: usageCheck } = await supabase
        .from('production_weaving')
        .select('id')
        .eq('roll_id', id)
        .limit(1);

      if (usageCheck && usageCheck.length > 0) {
        toast.error('Невозможно удалить рулон', {
          description: `Рулон ${rollNumber} используется в записях производства ткачества. Сначала удалите связанные записи производства.`
        });
        return;
      }

      // Проверяем использование в ламинации (таблица laminated_rolls)
      const { data: laminationCheck } = await supabase
        .from('laminated_rolls')
        .select('id')
        .eq('source_roll_id', id)
        .limit(1);

      if (laminationCheck && laminationCheck.length > 0) {
        toast.error('Невозможно удалить рулон', {
          description: `Рулон ${rollNumber} был использован для создания ламинированных рулонов. Сначала удалите связанные ламинированные рулоны.`
        });
        return;
      }

      // Проверяем использование в производстве ламинации (таблица production_lamination)
      const { data: prodLaminationCheck } = await supabase
        .from('production_lamination')
        .select('id')
        .eq('input_roll_id', id)
        .limit(1);

      if (prodLaminationCheck && prodLaminationCheck.length > 0) {
        toast.error('Невозможно удалить рулон', {
          description: `Рулон ${rollNumber} использовался в производстве ламинации. Сначала удалите связанные записи производства ламинации.`
        });
        return;
      }

      // Проверяем использование в крое (таблица production_cutting)
      const { data: cuttingCheck } = await supabase
        .from('production_cutting')
        .select('id')
        .eq('roll_id', id)
        .limit(1);

      if (cuttingCheck && cuttingCheck.length > 0) {
        toast.error('Невозможно удалить рулон', {
          description: `Рулон ${rollNumber} использовался в крое. Сначала удалите связанные записи кроя.`
        });
        return;
      }

      const { error } = await supabase
        .from('weaving_rolls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись успешно удалена');
      if (view === 'rolls') {
        fetchRolls();
      } else {
        fetchBalances();
      }
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        // Пытаемся извлечь название таблицы из сообщения об ошибке
        const errorMessage = err.message || err.details || '';
        let tableName = 'другими данными';

        if (errorMessage.includes('production_lamination')) {
          tableName = 'записями производства ламинации';
        } else if (errorMessage.includes('production_cutting')) {
          tableName = 'записями производства кроя';
        } else if (errorMessage.includes('production_weaving')) {
          tableName = 'записями производства ткачества';
        } else if (errorMessage.includes('laminated_rolls')) {
          tableName = 'ламинированными рулонами';
        }

        toast.error(`Невозможно удалить рулон ${rollNumber}`, {
          description: `Этот рулон связан с ${tableName}. Сначала удалите связанные записи, затем повторите попытку.`
        });
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
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
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h1 className="text-xl md:text-3xl font-bold">
            <span className="hidden sm:inline">Склад ткани</span>
            <span className="sm:hidden">Ткань</span>
          </h1>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <Link
              href="/warehouse/fabric/history"
              className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-base bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors border border-zinc-700 text-center"
            >
              <span className="hidden sm:inline">Журнал операций</span>
              <span className="sm:hidden">Журнал</span>
            </Link>
            <Link
              href="/production/weaving"
              className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-base bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-center"
            >
              + <span className="hidden sm:inline">Производство</span><span className="sm:hidden">Новый</span>
            </Link>
          </div>
        </div>
        <p className="text-xs md:text-base text-zinc-400">Учет рулонов ткани из цеха ткачества</p>
      </div>

      {/* View Toggle */}
      <div className="mb-4 md:mb-6 flex gap-2 md:gap-3">
        <button
          onClick={() => setView('balance')}
          className={`flex-1 sm:flex-none px-3 md:px-6 py-2 md:py-3 rounded-lg text-xs md:text-base font-medium transition-colors ${
            view === 'balance'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span className="hidden sm:inline">Остатки по типам</span>
          <span className="sm:hidden">Остатки</span>
        </button>
        <button
          onClick={() => setView('rolls')}
          className={`flex-1 sm:flex-none px-3 md:px-6 py-2 md:py-3 rounded-lg text-xs md:text-base font-medium transition-colors ${
            view === 'rolls'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span className="hidden sm:inline">Все рулоны</span>
          <span className="sm:hidden">Рулоны</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2 text-zinc-400">Поиск</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={view === 'balance' ? 'Код или название...' : 'Номер рулона...'}
            className="w-full px-3 md:px-4 py-2 text-xs md:text-base bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {view === 'rolls' && (
          <div>
            <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2 text-zinc-400">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 md:px-4 py-2 text-xs md:text-base bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-zinc-400 mb-1">Типов ткани</p>
            <p className="text-xl md:text-2xl font-bold">{filteredBalances.length}</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-purple-400 mb-1">Общий вес</p>
            <p className="text-xl md:text-2xl font-bold text-purple-500">{totalBalanceKg.toLocaleString()} кг</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-purple-400 mb-1">Общая длина</p>
            <p className="text-xl md:text-2xl font-bold text-purple-500">{totalBalanceM.toLocaleString()} м</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-zinc-400 mb-1">Всего</p>
            <p className="text-xl md:text-2xl font-bold">{totalRolls}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-green-400 mb-1">Завершено</p>
            <p className="text-xl md:text-2xl font-bold text-green-500">{completedRolls}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-blue-400 mb-1">В работе</p>
            <p className="text-xl md:text-2xl font-bold text-blue-500">{activeRolls}</p>
          </div>
          <div className="bg-zinc-500/10 border border-zinc-500/50 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-zinc-400 mb-1">
              <span className="hidden sm:inline">Использовано</span>
              <span className="sm:hidden">Испол.</span>
            </p>
            <p className="text-xl md:text-2xl font-bold text-zinc-400">{totalRolls - completedRolls - activeRolls}</p>
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
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold">Код</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold">
                      <span className="hidden sm:inline">Наименование</span>
                      <span className="sm:hidden">Название</span>
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold hidden sm:table-cell">Ширина</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">Вес (кг)</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">Длина (м)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredBalances.map((record) => (
                    <tr key={record.fabric_type_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-2 md:px-4 py-2 md:py-3 font-mono font-semibold">
                        {record.code}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="max-w-[100px] md:max-w-none truncate">{record.name}</div>
                        <div className="text-[10px] text-zinc-500 sm:hidden">{record.width_cm} см</div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right text-zinc-400 hidden sm:table-cell">
                        {record.width_cm} см
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                        <span className="font-bold text-sm md:text-lg text-purple-400">
                          {Math.round(record.balance_kg).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">
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
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold">Рулон</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold">Тип</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold hidden lg:table-cell">Ширина</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">
                      <span className="hidden sm:inline">Длина (м)</span>
                      <span className="sm:hidden">м</span>
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold hidden sm:table-cell">Вес (кг)</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold">Статус</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold hidden md:table-cell">Дата</th>
                    {isAdmin && (
                      <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold w-[50px] md:w-auto"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredRolls.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-2 md:px-4 py-2 md:py-3 font-mono font-semibold">
                        {record.roll_number}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="font-medium">{record.tkan_specifications?.kod_tkani || '-'}</div>
                        <div className="text-[10px] md:text-xs text-zinc-500 truncate max-w-[80px] md:max-w-none">{record.tkan_specifications?.nazvanie_tkani || '-'}</div>
                        <div className="text-[10px] text-zinc-500 sm:hidden lg:hidden">
                          {record.tkan_specifications?.shirina_polotna_sm || '-'} см
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right text-zinc-400 hidden lg:table-cell">
                        {record.tkan_specifications?.shirina_polotna_sm || '-'} см
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">
                        {Math.round(record.total_length || 0).toLocaleString()}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right hidden sm:table-cell">
                        <span className="font-bold text-purple-400">
                          {Math.round(record.total_weight || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                        <span className={`inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded border whitespace-nowrap ${getStatusColor(record.status)}`}>
                          <span className="hidden sm:inline">{getStatusLabel(record.status)}</span>
                          <span className="sm:hidden">
                            {record.status === 'completed' ? '✓' : record.status === 'active' ? '⋯' : '×'}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-zinc-400 hidden md:table-cell">
                        {new Date(record.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      {isAdmin && (
                        <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                          <button
                            onClick={() => handleDelete(record.id, record.roll_number)}
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
        )
      )}
    </div>
  );
}
