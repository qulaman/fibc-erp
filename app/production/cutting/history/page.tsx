'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Trash2, Pencil, X } from 'lucide-react';

interface ProductionRecord {
  id: string;
  doc_number: string;
  date: string;
  time: string;
  shift: string;
  operator: string;
  roll_number: string;
  material_type: string;
  material_code: string;
  total_used_m: number;
  cutting_type_category: string;
  cutting_type_code: string;
  cutting_type_name: string;
  quantity: number;
  consumption_m: number;
  waste_m: number;
  total_weight_kg: number;
  status: string;
  created_at: string;
}

export default function CuttingHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_cutting')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, docNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись кроя ${docNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_cutting')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchRecords();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить запись.\n\nЭта запись связана с другими данными в системе (возможно, используется в пошиве).`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_cutting')
        .update({
          date: editingRecord.date,
          shift: editingRecord.shift,
          operator: editingRecord.operator || null,
          roll_number: editingRecord.roll_number || null,
          material_type: editingRecord.material_type || null,
          quantity: Number(editingRecord.quantity),
          consumption_m: Number(editingRecord.consumption_m),
          waste_m: Number(editingRecord.waste_m),
          status: editingRecord.status,
          notes: editingRecord.notes || null,
        })
        .eq('id', editingRecord.id);
      if (error) throw error;
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesMaterial = filterMaterial === 'all' || record.material_type === filterMaterial;
    const matchesSearch = !searchQuery ||
      record.doc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.cutting_type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.roll_number.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesMaterial && matchesSearch;
  });

  // Calculate totals
  const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalConsumption = filteredRecords.reduce((sum, r) => sum + r.consumption_m, 0);
  const totalWaste = filteredRecords.reduce((sum, r) => sum + r.waste_m, 0);
  const totalWeight = filteredRecords.reduce((sum, r) => sum + (r.total_weight_kg || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Проведено':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'В работе':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50';
      case 'Черновик':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
      case 'Отменено':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/50';
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold">Журнал производства кроя</h1>
          <Link
            href="/production/cutting"
            className="px-3 md:px-4 py-2 text-sm md:text-base bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Новая операция
          </Link>
        </div>
        <p className="text-sm md:text-base text-zinc-400">История всех операций раскроя материалов</p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Поиск</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Документ, оператор, деталь..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Тип материала</label>
          <select
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все</option>
            <option value="Ткань">Ткань</option>
            <option value="Ламинат">Ламинат</option>
            <option value="Стропа">Стропа</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Статус</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все</option>
            <option value="Проведено">Проведено</option>
            <option value="В работе">В работе</option>
            <option value="Черновик">Черновик</option>
            <option value="Отменено">Отменено</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Всего операций</p>
          <p className="text-lg md:text-2xl font-bold">{filteredRecords.length}</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Всего деталей</p>
          <p className="text-lg md:text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Расход материала</p>
          <p className="text-lg md:text-2xl font-bold">{totalConsumption.toFixed(1)} м</p>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-[10px] md:text-sm text-zinc-400 mb-1">Общий вес</p>
          <p className="text-lg md:text-2xl font-bold">{totalWeight.toFixed(1)} кг</p>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Нет данных для отображения
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Документ</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Дата</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Смена</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Оператор</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Материал</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Рулон</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Деталь</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold">Кол-во</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold">Расход</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold">Отходы</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold">Статус</th>
                  {isAdmin && (
                    <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-2 md:px-4 py-2 md:py-3 font-mono">{record.doc_number}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      {new Date(record.date).toLocaleDateString('ru-RU')}
                      <br />
                      <span className="text-[10px] md:text-xs text-zinc-500">{record.time}</span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">{record.shift}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">{record.operator}</td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded bg-zinc-800 text-zinc-300">
                        {record.material_type}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 font-mono text-zinc-400">
                      {record.roll_number}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <div className="font-medium">{record.cutting_type_code}</div>
                      <div className="text-[10px] md:text-xs text-zinc-500">{record.cutting_type_name}</div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">
                      {record.quantity.toLocaleString()} шт
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                      {record.consumption_m.toFixed(2)} м
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                      {record.waste_m.toFixed(2)} м
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                      <span className={`inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingRecord({ ...record })}
                            className="p-1.5 md:p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-950 rounded transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id, record.doc_number)}
                            className="p-1.5 md:p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить запись"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold">Редактировать запись кроя</h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{editingRecord.doc_number}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Дата</label>
                  <input type="date" value={editingRecord.date} onChange={e => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Смена</label>
                  <select value={editingRecord.shift} onChange={e => setEditingRecord({ ...editingRecord, shift: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                    <option value="День">☀️ День</option>
                    <option value="Ночь">🌙 Ночь</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Оператор</label>
                  <input type="text" value={editingRecord.operator || ''} onChange={e => setEditingRecord({ ...editingRecord, operator: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Рулон</label>
                  <input type="text" value={editingRecord.roll_number || ''} onChange={e => setEditingRecord({ ...editingRecord, roll_number: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Тип материала</label>
                <select value={editingRecord.material_type || ''} onChange={e => setEditingRecord({ ...editingRecord, material_type: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  <option value="Ткань">Ткань</option>
                  <option value="Ламинат">Ламинат</option>
                  <option value="Стропа">Стропа</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Кол-во деталей (шт)</label>
                <input type="number" value={editingRecord.quantity} onChange={e => setEditingRecord({ ...editingRecord, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Расход (м)</label>
                  <input type="number" step="0.01" value={editingRecord.consumption_m} onChange={e => setEditingRecord({ ...editingRecord, consumption_m: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Отходы (м)</label>
                  <input type="number" step="0.01" value={editingRecord.waste_m} onChange={e => setEditingRecord({ ...editingRecord, waste_m: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Статус</label>
                <select value={editingRecord.status} onChange={e => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="Проведено">Проведено</option>
                  <option value="В работе">В работе</option>
                  <option value="Черновик">Черновик</option>
                  <option value="Отменено">Отменено</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={() => setEditingRecord(null)} className="flex-1 py-2 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg font-bold transition-colors">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
