'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Calendar, Plus, Trash2, Pencil, X } from "lucide-react";
import ExtrusionDetailsDialog from './ExtrusionDetailsDialog';

const YARN_COLORS = ["Белый", "Черный", "Синий", "Зеленый", "Бежевый", "Серый", "Желтый"];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function ExtrusionHistoryPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    const [{ data: emp }, { data: mach }] = await Promise.all([
      supabase.from('employees').select('id, full_name, role').eq('is_active', true).order('full_name'),
      supabase.from('equipment').select('id, name, code').eq('type', 'extruder').eq('is_active', true).order('name'),
    ]);
    if (emp) setEmployees(emp);
    if (mach) setMachines(mach);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('production_extrusion')
      .select(`
        *,
        machine:equipment!machine_id (id, name),
        operator_extruder:employees!operator_extruder_id (id, full_name),
        operator_winder1:employees!operator_winder1_id (id, full_name),
        operator_winder2:employees!operator_winder2_id (id, full_name),
        operator_winder3:employees!operator_winder3_id (id, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, batchNumber: string) => {
    if (!isAdmin) {
      toast.error('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись производства партии ${batchNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_extrusion')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись успешно удалена');
      fetchLogs();
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error('Невозможно удалить запись', {
          description: `Партия ${batchNumber} связана с другими данными в системе (склад нити).`
        });
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('production_extrusion')
        .update({
          date: editingRecord.date,
          shift: editingRecord.shift,
          machine_id: editingRecord.machine_id || null,
          operator_extruder_id: editingRecord.operator_extruder_id || null,
          operator_winder1_id: editingRecord.operator_winder1_id || null,
          operator_winder2_id: editingRecord.operator_winder2_id || null,
          operator_winder3_id: editingRecord.operator_winder3_id || null,
          yarn_denier: editingRecord.yarn_denier ? Number(editingRecord.yarn_denier) : null,
          yarn_width_mm: editingRecord.yarn_width_mm ? Number(editingRecord.yarn_width_mm) : null,
          yarn_color: editingRecord.yarn_color || null,
          yarn_name: editingRecord.yarn_name || null,
          output_bobbins: Number(editingRecord.output_bobbins) || 0,
          output_weight_net: Number(editingRecord.output_weight_net) || 0,
          waste_weight: editingRecord.waste_weight ? Number(editingRecord.waste_weight) : null,
          notes: editingRecord.notes || null,
        })
        .eq('id', editingRecord.id);
      if (updateError) throw updateError;
      toast.success('Запись обновлена');
      setEditingRecord(null);
      fetchLogs();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error}</div>;

  return (
    <div className="page-container">

      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/extrusion">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-[#E60012] p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал Производства Экструзии
            </h1>
            <p className="page-description">История смен экструзии</p>
          </div>
        </div>

        <Link href="/production/extrusion">
          <Button className="bg-[#E60012] hover:bg-red-700 text-white font-bold gap-2">
            <Plus size={18} /> Новая смена
          </Button>
        </Link>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка данных...</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Дата / Смена</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Партия</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Продукт</th>
                  <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs hidden md:table-cell">Оператор</th>
                  <th className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs">Бобин</th>
                  <th className="px-4 py-4 text-right font-bold text-[#E60012] uppercase text-xs">Вес Нетто</th>
                  <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Детали</th>
                  {isAdmin && (
                    <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {logs.length === 0 ? (
                  <tr>
                     <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-zinc-500">Записей пока нет</td>
                  </tr>
                ) : (
                  logs.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">

                    {/* Дата и Смена */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                           <Calendar size={12} className="text-zinc-500"/> {formatDate(row.date)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {row.shift === 'День' ? '☀️ День' : '🌙 Ночь'}
                        </span>
                      </div>
                    </td>

                    {/* Партия */}
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      <div className="flex flex-col">
                         <span>{row.batch_number}</span>
                         <span className="text-[10px] text-zinc-600">{row.doc_number}</span>
                      </div>
                    </td>

                    {/* Продукт и Линия */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.yarn_name || `Нить ${row.yarn_denier}D`}</div>
                      <div className="text-xs text-zinc-500">{row.machine?.name}</div>
                    </td>

                    {/* Оператор */}
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {row.operator_extruder?.full_name?.split(' ')[0] || '—'}
                    </td>

                    {/* Бобины */}
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {row.output_bobbins}
                    </td>

                    {/* Вес */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#E60012] text-base">
                      {row.output_weight_net}
                    </td>

                    {/* Кнопка Деталей */}
                    <td className="px-4 py-3 text-center">
                      <ExtrusionDetailsDialog record={row} />
                    </td>

                    {/* Кнопки редактирования и удаления */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingRecord({ ...row })}
                            className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-950 rounded transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id, row.batch_number)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                            title="Удалить запись"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Модальное окно редактирования */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

            {/* Шапка */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold">Редактировать запись экструзии</h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{editingRecord.batch_number}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="p-1 text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Поля */}
            <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-4">

              {/* Дата и смена */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Дата</label>
                  <input type="date" value={editingRecord.date}
                    onChange={e => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Смена</label>
                  <select value={editingRecord.shift}
                    onChange={e => setEditingRecord({ ...editingRecord, shift: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                    <option value="День">☀️ День</option>
                    <option value="Ночь">🌙 Ночь</option>
                  </select>
                </div>
              </div>

              {/* Линия экструдера */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Линия экструдера</label>
                <select value={editingRecord.machine_id || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, machine_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Оператор экструдера */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Оператор экструдера</label>
                <select value={editingRecord.operator_extruder_id || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, operator_extruder_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {employees.filter(e => e.role === 'operator_extruder').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Намотчики */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Намотчики</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <label className="block text-[10px] text-zinc-500 mb-1">Намотчик {i}</label>
                      <select
                        value={editingRecord[`operator_winder${i}_id`] || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, [`operator_winder${i}_id`]: e.target.value })}
                        className="w-full px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs">
                        <option value="">—</option>
                        {employees.filter(e => e.role === 'operator_winder').map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Параметры нити */}
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 uppercase font-medium tracking-wide mb-3">Параметры нити</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Денье</label>
                    <input type="number" value={editingRecord.yarn_denier || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, yarn_denier: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Ширина (мм)</label>
                    <input type="number" step="0.1" value={editingRecord.yarn_width_mm || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, yarn_width_mm: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Цвет</label>
                    <select value={editingRecord.yarn_color || 'Белый'}
                      onChange={e => setEditingRecord({ ...editingRecord, yarn_color: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                      {YARN_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Показатели */}
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 uppercase font-medium tracking-wide mb-3">Показатели выхода</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Кол-во бобин</label>
                    <input type="number" value={editingRecord.output_bobbins || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, output_bobbins: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Вес нетто (кг)</label>
                    <input type="number" step="0.01" value={editingRecord.output_weight_net || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, output_weight_net: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Вес отходов (кг)</label>
                    <input type="number" step="0.01" value={editingRecord.waste_weight || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, waste_weight: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* Примечания */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Примечания</label>
                <textarea rows={2} value={editingRecord.notes || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none" />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={() => setEditingRecord(null)}
                className="flex-1 py-2 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-lg font-bold transition-colors">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
