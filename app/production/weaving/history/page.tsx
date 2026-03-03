'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Scissors, Scale, Calendar, Scroll, User, Trash2, Pencil, X } from "lucide-react";
import { toast } from 'sonner';

export default function WeavingHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name');
    if (data) setEmployees(data);
  };

  const fetchRecords = async () => {
    // Новый запрос, соответствующий структуре Parent-Child
    const { data, error } = await supabase
      .from('production_weaving')
      .select(`
        *,
        is_final_shift,
        employees (full_name),
        weaving_rolls (
          roll_number,
          status,
          total_length,
          total_weight,
          equipment (name),
          tkan_specifications (nazvanie_tkani, kod_tkani)
        )
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
        console.error("Ошибка загрузки истории:", error);
    }

    if (data) setRecords(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, docNumber: string) => {
    if (!isAdmin) {
      toast.error('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись производства ${docNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_weaving')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись успешно удалена');
      fetchRecords();
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error(`Невозможно удалить запись ${docNumber}. Запись связана с другими данными.`);
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_weaving')
        .update({
          date: editingRecord.date,
          shift: editingRecord.shift,
          operator_id: editingRecord.operator_id || null,
          produced_length: Number(editingRecord.produced_length),
          produced_weight: Number(editingRecord.produced_weight) || 0,
          warp_usage_kg: editingRecord.warp_usage_kg ? Number(editingRecord.warp_usage_kg) : null,
          weft_usage_kg: editingRecord.weft_usage_kg ? Number(editingRecord.weft_usage_kg) : null,
          is_final_shift: editingRecord.is_final_shift,
          notes: editingRecord.notes || null,
        })
        .eq('id', editingRecord.id);
      if (error) throw error;
      toast.success('Запись обновлена');
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-amber-600 p-2 rounded-lg">
              <History size={24} className="text-white"/>
            </div>
            Журнал Ткачества
          </h1>
          <p className="page-description">Журнал сменных отчетов (Shift Log)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка данных...</div>
      ) : (
        <div className="grid gap-4">
          {records.length === 0 ? (
             <div className="text-zinc-500">История пуста</div>
          ) : (
             records.map(record => {
               // Для удобства сократим доступ к вложенным объектам
               const roll = record.weaving_rolls;
               const loomName = roll?.equipment?.name || 'Неизвестный станок';
               const fabricName = roll?.tkan_specifications?.nazvanie_tkani || 'Неизвестная ткань';

               return (
                <Card key={record.id} className={`border transition-colors ${
                  record.is_final_shift
                    ? 'bg-zinc-900 border-zinc-800 hover:border-green-800'
                    : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className={`text-lg flex items-center gap-2 ${
                          record.is_final_shift ? 'text-white' : 'text-zinc-400'
                        }`}>
                          <Scissors size={18} className={record.is_final_shift ? 'text-green-500' : 'text-gray-500'}/>
                          {fabricName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                           <Calendar size={14}/>
                           <span>{new Date(record.date).toLocaleDateString('ru-RU')}</span>
                           <span className="text-zinc-600">|</span>
                           <span>{record.shift === 'День' ? '☀️ День' : '🌙 Ночь'}</span>
                           <span className="text-zinc-600">|</span>
                           <span className="text-zinc-300 font-medium">{record.doc_number}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={record.is_final_shift ? 'text-green-400 border-green-900 bg-green-900/10' : 'text-gray-400 border-gray-700 bg-gray-900/10'}>
                          {record.is_final_shift ? '✓ Рулон Завершен' : '◦ В работе'}
                        </Badge>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditingRecord({ ...record })}
                              className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-950 rounded transition-colors"
                              title="Редактировать"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.doc_number)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                              title="Удалить запись"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-sm bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">

                      {/* 1. Станок */}
                      <div>
                        <p className="text-zinc-500 flex items-center gap-1 mb-1"><Scroll size={12}/> Станок</p>
                        <p className="text-white font-bold">{loomName}</p>
                      </div>

                      {/* 2. Оператор */}
                      <div>
                        <p className="text-zinc-500 flex items-center gap-1 mb-1"><User size={12}/> Ткач</p>
                        <p className="text-white">{record.employees?.full_name || '-'}</p>
                      </div>

                      {/* 3. Выработка за смену */}
                      <div>
                        <p className="text-zinc-500 mb-1 text-blue-400">Выработка за смену</p>
                        <p className="text-white font-mono text-lg font-bold">
                           +{record.produced_length} м
                        </p>
                        {record.produced_weight > 0 && <span className="text-xs text-zinc-500">({record.produced_weight} кг)</span>}
                      </div>

                      {/* 4. Инфо о рулоне */}
                      <div>
                        <p className="text-zinc-500 mb-1">Рулон (Накопительно)</p>
                        <div className="flex flex-col">
                           <span className="text-white font-mono font-medium">{roll?.roll_number}</span>
                           <span className="text-xs text-zinc-500">Всего: {roll?.total_length} м</span>
                           {roll?.total_weight > 0 && (
                             <span className="text-xs text-emerald-400">Вес: {roll.total_weight} кг</span>
                           )}
                        </div>
                      </div>

                      {/* 5. Расход нити (если есть) */}
                      {(record.warp_usage_kg > 0 || record.weft_usage_kg > 0) && (
                        <>
                          {record.warp_usage_kg > 0 && (
                            <div>
                              <p className="text-zinc-500 mb-1">Расход основы</p>
                              <p className="text-white font-mono">{record.warp_usage_kg} кг</p>
                            </div>
                          )}
                          {record.weft_usage_kg > 0 && (
                            <div>
                              <p className="text-zinc-500 mb-1">Расход утка</p>
                              <p className="text-white font-mono">{record.weft_usage_kg} кг</p>
                            </div>
                          )}
                        </>
                      )}

                    </div>

                    {/* Примечания (если есть) */}
                    {record.notes && (
                      <div className="mt-3 p-3 bg-zinc-900/50 rounded border border-zinc-800/50">
                        <p className="text-xs text-zinc-500 mb-1">Примечания:</p>
                        <p className="text-sm text-zinc-300 italic">{record.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
               )
             })
          )}
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold">Редактировать запись ткачества</h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{editingRecord.doc_number}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="p-1 text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-4">
              {/* Дата и смена */}
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

              {/* Ткач */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ткач (оператор)</label>
                <select value={editingRecord.operator_id || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, operator_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Выработка */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Выработка за смену (м)</label>
                  <input type="number" step="0.1" value={editingRecord.produced_length}
                    onChange={e => setEditingRecord({ ...editingRecord, produced_length: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Вес (кг)</label>
                  <input type="number" step="0.1" value={editingRecord.produced_weight || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, produced_weight: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                </div>
              </div>

              {/* Расход нити */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Расход нити</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Основа (кг)</label>
                    <input type="number" step="0.01" value={editingRecord.warp_usage_kg || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, warp_usage_kg: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Уток (кг)</label>
                    <input type="number" step="0.01" value={editingRecord.weft_usage_kg || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, weft_usage_kg: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* Статус рулона */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Статус смены</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRecord({ ...editingRecord, is_final_shift: false })}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      !editingRecord.is_final_shift
                        ? 'bg-zinc-700 border-zinc-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    ◦ В работе
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecord({ ...editingRecord, is_final_shift: true })}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      editingRecord.is_final_shift
                        ? 'bg-green-900 border-green-600 text-green-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    ✓ Рулон завершён
                  </button>
                </div>
              </div>

              {/* Примечания */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Примечания</label>
                <textarea rows={2} value={editingRecord.notes || ''} onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none" />
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