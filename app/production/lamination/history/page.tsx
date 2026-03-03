'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Calendar, User, Factory, Trash2, ChevronDown, ChevronRight, ArrowRight, Pencil, X } from "lucide-react";
import { toast } from 'sonner';

export default function LaminationHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    const [{ data: emp }, { data: mach }] = await Promise.all([
      supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('equipment').select('id, name').eq('type', 'laminator').eq('is_active', true).order('name'),
    ]);
    if (emp) setEmployees(emp);
    if (mach) setMachines(mach);
  };

  const fetchHistory = async () => {
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
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки истории ламинации:', error);
    } else if (data) {
      setRecords(data);
    }
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
        .from('production_lamination_shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Смена успешно удалена');
      fetchHistory();
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error(`Невозможно удалить смену ${docNumber}. Запись связана с ламинированными рулонами.`);
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_lamination_shifts')
        .update({
          date: editingRecord.date,
          shift: editingRecord.shift,
          machine_id: editingRecord.machine_id || null,
          operator1_id: editingRecord.operator1_id || null,
          operator2_id: editingRecord.operator2_id || null,
          operator3_id: editingRecord.operator3_id || null,
          notes: editingRecord.notes || null,
        })
        .eq('id', editingRecord.id);
      if (error) throw error;
      toast.success('Запись обновлена');
      setEditingRecord(null);
      fetchHistory();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalRolls = records.reduce((sum, r) => sum + (r.production_lamination_rolls?.length || 0), 0);
  const totalOutputWeight = records.reduce((sum, r) =>
    sum + (r.production_lamination_rolls?.reduce((s: number, roll: any) => s + (roll.output_weight_kg || 0), 0) || 0), 0);

  const toggleShift = (shiftId: string) => {
    setExpandedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  return (
    <div className="page-container">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Layers size={24} className="text-white" />
            </div>
            Производственный журнал Ламинации
          </h1>
          <p className="page-description">История производства ламинированной ткани</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Всего смен</div>
            <div className="stat-value text-orange-400">{records.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Обработано рулонов</div>
            <div className="stat-value text-orange-400">{totalRolls}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Общий вес (кг)</div>
            <div className="stat-value text-orange-400">{Math.round(totalOutputWeight)}</div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка истории...</div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="empty-state">
                Нет записей о производстве ламинации
              </div>
            ) : (
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableHead className="text-zinc-400">Дата</TableHead>
                      <TableHead className="text-zinc-400">Смена</TableHead>
                      <TableHead className="text-zinc-400">Документ</TableHead>
                      <TableHead className="text-zinc-400">Операторы</TableHead>
                      <TableHead className="text-zinc-400 text-center">Рулонов</TableHead>
                      <TableHead className="text-zinc-400 text-right">Вес (кг)</TableHead>
                      <TableHead className="text-zinc-400">Станок</TableHead>
                      <TableHead className="text-zinc-400">Примечания</TableHead>
                      {isAdmin && (
                        <TableHead className="text-center text-zinc-400">Действия</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const rollsCount = record.production_lamination_rolls?.length || 0;
                      const totalWeight = record.production_lamination_rolls?.reduce((sum: number, r: any) => sum + (r.output_weight_kg || 0), 0) || 0;
                      const operators = [
                        record.operator1?.full_name,
                        record.operator2?.full_name,
                        record.operator3?.full_name
                      ].filter(Boolean).join(', ');
                      const isExpanded = expandedShifts.has(record.id);

                      return (
                        <>
                          <TableRow
                            key={record.id}
                            className="border-zinc-800 hover:bg-zinc-800/30 cursor-pointer"
                            onClick={() => toggleShift(record.id)}
                          >
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown size={16} className="text-orange-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                                <Calendar size={14} className="text-orange-500" />
                                {new Date(record.date).toLocaleDateString('ru-RU')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${
                                record.shift === 'День' ? 'border-yellow-500/50 text-yellow-400' : 'border-blue-500/50 text-blue-400'
                              }`}>
                                {record.shift}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-zinc-300">
                              {record.doc_number || '-'}
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm">
                              <div className="flex items-center gap-1">
                                <User size={12} />
                                <span className="truncate max-w-[200px]" title={operators}>
                                  {operators || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-orange-400">
                              {rollsCount}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-white">
                              {Math.round(totalWeight)}
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm">
                              <div className="flex items-center gap-1">
                                <Factory size={12} />
                                {record.equipment?.name || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-zinc-500 max-w-xs truncate" title={record.notes}>
                              {record.notes || '-'}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
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
                                    title="Удалить смену"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                          {isExpanded && record.production_lamination_rolls && record.production_lamination_rolls.length > 0 && (
                            <TableRow key={`${record.id}-details`} className="border-zinc-800 bg-zinc-900/50">
                              <TableCell colSpan={isAdmin ? 9 : 8} className="p-0">
                                <div className="p-4 space-y-2">
                                  <div className="text-sm font-semibold text-orange-400 mb-3">Обработанные рулоны ({rollsCount}):</div>
                                  <div className="grid gap-2">
                                    {record.production_lamination_rolls.map((roll: any, idx: number) => (
                                      <div key={idx} className="grid grid-cols-4 gap-4 p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm">
                                        <div>
                                          <div className="text-xs text-zinc-500 mb-1">#{idx + 1} Входящий рулон</div>
                                          <div className="font-mono text-purple-400">{roll.input_roll_number}</div>
                                          <div className="text-xs text-zinc-400">{roll.input_weight_kg} кг</div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                          <ArrowRight size={20} className="text-zinc-600" />
                                        </div>
                                        <div>
                                          <div className="text-xs text-zinc-500 mb-1">Выходной рулон</div>
                                          <div className="font-mono text-orange-400">{roll.output_roll_number}</div>
                                          <div className="text-xs text-emerald-400 font-bold">{roll.output_weight_kg} кг</div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                          <div className="text-right">
                                            <div className="text-xs text-zinc-500">Прирост веса</div>
                                            <div className="text-sm font-bold text-green-400">
                                              +{(roll.output_weight_kg - roll.input_weight_kg).toFixed(1)} кг
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Модальное окно редактирования */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold">Редактировать смену ламинации</h2>
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

              {/* Станок */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Станок (ламинатор)</label>
                <select value={editingRecord.machine_id || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, machine_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {/* Операторы */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Операторы</label>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <label className="block text-[10px] text-zinc-500 mb-1">Оператор {i}</label>
                      <select
                        value={editingRecord[`operator${i}_id`] || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, [`operator${i}_id`]: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                        <option value="">—</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Примечания */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Примечания</label>
                <textarea rows={3} value={editingRecord.notes || ''} onChange={e => setEditingRecord({ ...editingRecord, notes: e.target.value })}
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
