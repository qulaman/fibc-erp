'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface HistoryRecord {
  id: string;
  created_at: string;
  type: 'in' | 'out';
  source: string; // Экструзия, Ткачество, Стропы
  batch_number: string;
  yarn_name: string;
  yarn_denier: number;
  quantity_kg: number;
  roll_number?: string;
  fabric_name?: string;
  equipment_name?: string;
  operator_name?: string;
  shift?: string;
  notes?: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function YarnHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; record: HistoryRecord | null }>({
    open: false,
    record: null,
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const allRecords: HistoryRecord[] = [];

      // 1. ПРИХОД - из production_extrusion
      const { data: extrusionData, error: extrusionError } = await supabase
        .from('production_extrusion')
        .select(`
          *,
          equipment:machine_id(name),
          employees:operator_extruder_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (!extrusionError && extrusionData) {
        extrusionData.forEach(record => {
          if (record.output_weight_net > 0) {
            allRecords.push({
              id: `ext-${record.id}`,
              created_at: record.created_at,
              type: 'in',
              source: 'Экструзия',
              batch_number: record.batch_number || '-',
              yarn_name: record.yarn_name || '-',
              yarn_denier: record.yarn_denier || 0,
              quantity_kg: record.output_weight_net || 0,
              equipment_name: record.equipment?.name,
              operator_name: record.employees?.full_name,
              shift: record.shift,
              notes: record.notes
            });
          }
        });
      }

      // 2. РАСХОД на ткачество - из production_weaving для завершенных рулонов
      const { data: weavingData, error: weavingError } = await supabase
        .from('production_weaving')
        .select(`
          *,
          weaving_rolls:roll_id(
            roll_number,
            status,
            total_length,
            tkan_specifications(kod_tkani, nazvanie_tkani, osnova_itogo_kg, utok_itogo_kg, osnova_denye, utok_denye)
          ),
          employees:operator_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (!weavingError && weavingData) {
        // Группируем по roll_id чтобы посчитать общий расход на рулон
        const rollConsumptions = new Map<string, {
          roll_number: string;
          total_length: number;
          fabric_name: string;
          spec: any;
          last_record: any;
          status: string;
        }>();

        weavingData.forEach(record => {
          if (record.weaving_rolls) {
            const rollId = record.roll_id;
            const existing = rollConsumptions.get(rollId);

            if (!existing) {
              rollConsumptions.set(rollId, {
                roll_number: record.weaving_rolls.roll_number,
                total_length: record.weaving_rolls.total_length || 0,
                fabric_name: record.weaving_rolls.tkan_specifications?.nazvanie_tkani || '-',
                spec: record.weaving_rolls.tkan_specifications,
                last_record: record,
                status: record.weaving_rolls.status
              });
            }
          }
        });

        // Добавляем расход для завершенных и использованных рулонов
        rollConsumptions.forEach((roll, rollId) => {
          if ((roll.status === 'completed' || roll.status === 'used') && roll.spec) {
            const warpConsumption = roll.total_length * (roll.spec.osnova_itogo_kg || 0);
            const weftConsumption = roll.total_length * (roll.spec.utok_itogo_kg || 0);

            if (warpConsumption > 0) {
              allRecords.push({
                id: `weave-warp-${rollId}`,
                created_at: roll.last_record.created_at,
                type: 'out',
                source: 'Ткачество',
                batch_number: '-',
                yarn_name: `Основа (${roll.spec.osnova_denye}D)`,
                yarn_denier: roll.spec.osnova_denye || 0,
                quantity_kg: warpConsumption,
                roll_number: roll.roll_number,
                fabric_name: roll.fabric_name,
                operator_name: roll.last_record.employees?.full_name,
                shift: roll.last_record.shift,
                notes: `Рулон ${roll.roll_number}, ${roll.total_length} м`
              });
            }

            if (weftConsumption > 0) {
              allRecords.push({
                id: `weave-weft-${rollId}`,
                created_at: roll.last_record.created_at,
                type: 'out',
                source: 'Ткачество',
                batch_number: '-',
                yarn_name: `Уток (${roll.spec.utok_denye}D)`,
                yarn_denier: roll.spec.utok_denye || 0,
                quantity_kg: weftConsumption,
                roll_number: roll.roll_number,
                fabric_name: roll.fabric_name,
                operator_name: roll.last_record.employees?.full_name,
                shift: roll.last_record.shift,
                notes: `Рулон ${roll.roll_number}, ${roll.total_length} м`
              });
            }
          }
        });
      }

      // 3. РАСХОД на стропы - из production_straps (парсим данные о составе из notes)
      const { data: strapsData, error: strapsError } = await supabase
        .from('production_straps')
        .select(`
          *,
          strap_types(code, name, width_mm)
        `)
        .order('created_at', { ascending: false });

      if (!strapsError && strapsData) {
        for (const record of strapsData) {
          // Пытаемся извлечь данные о списании из notes (JSON)
          let composition = null;
          if (record.notes) {
            // Ищем JSON после "Состав:" до конца строки
            const match = record.notes.match(/Состав:\s*(\{[\s\S]*\})$/);
            if (match) {
              try {
                composition = JSON.parse(match[1]);
              } catch (e) {
                console.log('Не удалось распарсить состав:', record.notes, e);
              }
            }
          }

          // Если есть данные о составе и списание было со склада нити
          if (composition) {
            // Уток со склада нити
            if (composition.weft?.source === 'yarn' && composition.weft?.qty > 0 && composition.weft?.id) {
              // Получаем информацию о партии нити
              const { data: yarnItem } = await supabase
                .from('yarn_inventory')
                .select('batch_number, name, yarn_denier')
                .eq('id', composition.weft.id)
                .single();

              // Используем дату операции (date) + время из created_at
              const operationDate = record.date
                ? new Date(record.date + 'T' + (record.created_at ? new Date(record.created_at).toTimeString().slice(0, 8) : '12:00:00')).toISOString()
                : record.created_at;

              allRecords.push({
                id: `strap-weft-${record.id}`,
                created_at: operationDate,
                type: 'out',
                source: 'Стропы',
                batch_number: yarnItem?.batch_number || '-',
                yarn_name: `Уток: ${yarnItem?.name || 'Нить'}`,
                yarn_denier: yarnItem?.yarn_denier || 0,
                quantity_kg: composition.weft.qty,
                roll_number: record.strap_types?.code,
                shift: record.shift,
                notes: `${record.produced_length} м стропы ${record.strap_types?.name || ''}`
              });
            }

            // Основа со склада нити
            if (composition.warp?.source === 'yarn' && composition.warp?.qty > 0 && composition.warp?.id) {
              const { data: yarnItem } = await supabase
                .from('yarn_inventory')
                .select('batch_number, name, yarn_denier')
                .eq('id', composition.warp.id)
                .single();

              // Используем дату операции (date) + время из created_at
              const operationDate2 = record.date
                ? new Date(record.date + 'T' + (record.created_at ? new Date(record.created_at).toTimeString().slice(0, 8) : '12:00:00')).toISOString()
                : record.created_at;

              allRecords.push({
                id: `strap-warp-${record.id}`,
                created_at: operationDate2,
                type: 'out',
                source: 'Стропы',
                batch_number: yarnItem?.batch_number || '-',
                yarn_name: `Основа: ${yarnItem?.name || 'Нить'}`,
                yarn_denier: yarnItem?.yarn_denier || 0,
                quantity_kg: composition.warp.qty,
                roll_number: record.strap_types?.code,
                shift: record.shift,
                notes: `${record.produced_length} м стропы ${record.strap_types?.name || ''}`
              });
            }
          }
        }
      }

      // Сортируем по дате (новые сверху)
      allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecords(allRecords);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (record: HistoryRecord) => {
    if (!isAdmin) {
      toast.warning('Недостаточно прав', {
        description: 'Только администраторы могут удалять операции',
      });
      return;
    }

    setDeleteDialog({ open: true, record });
  };

  const confirmDelete = async () => {
    const record = deleteDialog.record;
    setDeleteDialog({ open: false, record: null });

    if (!record) return;

    // Парсим ID чтобы понять тип операции и реальный ID
    const [type, ...idParts] = record.id.split('-');
    const realId = idParts.join('-');

    try {
      if (type === 'ext') {
        // Удаление операции прихода из экструзии
        const { error } = await supabase
          .from('production_extrusion')
          .delete()
          .eq('id', realId);

        if (error) throw error;

        toast.success('Операция удалена', {
          description: 'Операция прихода удалена из производства экструзии',
        });
      } else if (type === 'weave') {
        // Для расхода ткачества - это calculated data, нельзя удалить напрямую
        toast.info('Расход ткачества рассчитывается автоматически', {
          description: `Чтобы удалить этот расход:\n1. Откройте "Склад ткани"\n2. Найдите рулон: ${record.roll_number}\n3. Удалите рулон оттуда`,
          duration: 8000,
        });
        return;
      } else if (type === 'strap') {
        // Удаление операции расхода на стропы
        const { error } = await supabase
          .from('production_straps')
          .delete()
          .eq('id', realId);

        if (error) throw error;

        toast.success('Операция удалена', {
          description: 'Операция расхода удалена из производства строп',
        });
      }

      // Обновляем список после удаления
      await fetchHistory();
    } catch (err: any) {
      console.error('Error deleting operation:', err);
      if (err.code === '23503') {
        toast.error('Невозможно удалить операцию', {
          description: 'Эта запись связана с другими данными в системе',
          duration: 5000,
        });
      } else {
        toast.error('Ошибка при удалении', {
          description: err.message,
          duration: 5000,
        });
      }
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesType = filterType === 'all' || record.type === filterType;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      record.batch_number?.toLowerCase().includes(searchLower) ||
      record.yarn_name?.toLowerCase().includes(searchLower) ||
      record.source?.toLowerCase().includes(searchLower) ||
      record.roll_number?.toLowerCase().includes(searchLower);
    return matchesType && matchesSearch;
  });

  const totalIn = filteredRecords.filter(r => r.type === 'in').reduce((sum, r) => sum + r.quantity_kg, 0);
  const totalOut = filteredRecords.filter(r => r.type === 'out').reduce((sum, r) => sum + r.quantity_kg, 0);
  const balance = totalIn - totalOut;

  const inCount = filteredRecords.filter(r => r.type === 'in').length;
  const outCount = filteredRecords.filter(r => r.type === 'out').length;

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div className="flex items-center gap-4">
          <Link href="/warehouse/yarn">
            <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал операций склада нити
            </h1>
            <p className="text-zinc-400 mt-1">Приход (Экструзия) и Расход (Ткачество, Стропы)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по партии, нити, рулону..."
          className="flex-1 min-w-[200px] max-w-md px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilterType('in')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filterType === 'in' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <TrendingUp size={16} /> Приход
          </button>
          <button
            onClick={() => setFilterType('out')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filterType === 'out' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <TrendingDown size={16} /> Расход
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Всего операций</p>
          <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-1">Приход ({inCount})</p>
          <p className="text-2xl font-bold text-green-500">+{totalIn.toFixed(1)} кг</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-sm text-red-400 mb-1">Расход ({outCount})</p>
          <p className="text-2xl font-bold text-red-500">-{totalOut.toFixed(1)} кг</p>
        </div>
        <div className={`border rounded-lg p-4 ${balance >= 0 ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-orange-500/10 border-orange-500/50'}`}>
          <p className={`text-sm mb-1 ${balance >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>Баланс</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-500' : 'text-orange-500'}`}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(1)} кг
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Расход по цехам</p>
          <div className="text-xs space-y-1 mt-2">
            <div className="flex justify-between text-purple-400">
              <span>Ткачество:</span>
              <span>{filteredRecords.filter(r => r.type === 'out' && r.source === 'Ткачество').reduce((s, r) => s + r.quantity_kg, 0).toFixed(1)} кг</span>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>Стропы:</span>
              <span>{filteredRecords.filter(r => r.type === 'out' && r.source === 'Стропы').reduce((s, r) => s + r.quantity_kg, 0).toFixed(1)} кг</span>
            </div>
          </div>
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
                  <th className="px-4 py-3 text-center text-xs font-bold text-zinc-400 uppercase">Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Цех / Источник</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Партия</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Нить</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-zinc-400 uppercase">Кол-во (кг)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Рулон / Продукция</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Смена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase">Примечание</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center text-xs font-bold text-zinc-400 uppercase">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                          <TrendingUp size={12} /> Приход
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                          <TrendingDown size={12} /> Расход
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.source === 'Экструзия' ? 'bg-indigo-500/20 text-indigo-300' :
                        record.source === 'Ткачество' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {record.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-indigo-300">
                      {record.batch_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">{record.yarn_name}</div>
                      {record.yarn_denier > 0 && (
                        <div className="text-xs text-zinc-500">{record.yarn_denier}D</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-bold text-lg ${record.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                        {record.type === 'in' ? '+' : '-'}{record.quantity_kg.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.roll_number && (
                        <div className="font-mono text-zinc-300">{record.roll_number}</div>
                      )}
                      {record.fabric_name && (
                        <div className="text-xs text-zinc-500">{record.fabric_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.shift && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.shift === 'День' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {record.shift}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 max-w-[200px] truncate">
                      {record.notes || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(record)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                          title="Удалить операцию"
                        >
                          <Trash2 size={16} />
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

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Удалить операцию?"
        description={
          deleteDialog.record
            ? `Вы уверены что хотите удалить эту операцию?\n\nТип: ${deleteDialog.record.type === 'in' ? 'Приход' : 'Расход'}\nИсточник: ${deleteDialog.record.source}\nНить: ${deleteDialog.record.yarn_name}\nКоличество: ${deleteDialog.record.quantity_kg.toFixed(1)} кг\n\n⚠️ ВНИМАНИЕ: Это действие нельзя отменить!`
            : ''
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
