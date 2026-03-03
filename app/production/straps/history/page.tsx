'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, Calendar, User, Factory, Trash2, Pencil, X } from "lucide-react";
import { toast } from 'sonner';

export default function StrapsHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [strapSpecs, setStrapSpecs] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    const [{ data: emp }, { data: mach }, { data: specs }] = await Promise.all([
      supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('equipment').select('id, name').eq('type', 'loom_flat').eq('is_active', true).order('name'),
      supabase.from('strop_specifications').select('nazvanie').eq('is_active', true).order('nazvanie'),
    ]);
    if (emp) setEmployees(emp);
    if (mach) setMachines(mach);
    if (specs) setStrapSpecs(specs);
  };

  const fetchHistory = async () => {
    // Загружаем основные данные с лимитом (последние 200 записей)
    const { data, error } = await supabase
      .from('production_straps')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Ошибка загрузки истории:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // Собираем уникальные ID для batch-запросов
    const uniqueSpecNames = [...new Set(data.map(r => r.spec_name).filter(Boolean))];
    const uniqueMachineIds = [...new Set(data.map(r => r.machine_id).filter(Boolean))];
    const uniqueOperatorIds = [...new Set([
      ...data.map(r => r.operator_id),
      ...data.map(r => r.operator_id_2),
    ].filter(Boolean))];

    // Параллельная загрузка всех связанных данных одним пакетом
    const [specsResponse, machinesResponse, operatorsResponse] = await Promise.all([
      uniqueSpecNames.length > 0
        ? supabase
            .from('strop_specifications')
            .select('nazvanie, shirina_mm, plotnost_gr_mp')
            .in('nazvanie', uniqueSpecNames)
        : Promise.resolve({ data: [] }),
      uniqueMachineIds.length > 0
        ? supabase
            .from('equipment')
            .select('id, name')
            .in('id', uniqueMachineIds)
        : Promise.resolve({ data: [] }),
      uniqueOperatorIds.length > 0
        ? supabase
            .from('employees')
            .select('id, full_name')
            .in('id', uniqueOperatorIds)
        : Promise.resolve({ data: [] })
    ]);

    // Создаем Map для быстрого поиска
    const specsMap = new Map((specsResponse.data || []).map(s => [s.nazvanie, s]));
    const machinesMap = new Map((machinesResponse.data || []).map(m => [m.id, m]));
    const operatorsMap = new Map((operatorsResponse.data || []).map(o => [o.id, o]));

    // Присваиваем связанные данные к записям
    const enrichedData = data.map(record => ({
      ...record,
      specification: record.spec_name ? specsMap.get(record.spec_name) : null,
      equipment: record.machine_id ? machinesMap.get(record.machine_id) : null,
      employees: record.operator_id ? operatorsMap.get(record.operator_id) : null,
      employees2: record.operator_id_2 ? operatorsMap.get(record.operator_id_2) : null,
    }));

    setRecords(enrichedData);
    setLoading(false);
  };

  const handleDelete = async (id: string, date: string) => {
    if (!isAdmin) {
      toast.error('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить запись производства от ${new Date(date).toLocaleDateString('ru-RU')}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_straps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись успешно удалена');
      fetchHistory();
    } catch (err: any) {
      if (err.code === '23503') {
        toast.error('Невозможно удалить запись. Она связана с другими данными.');
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_straps')
        .update({
          date: editingRecord.date,
          shift: editingRecord.shift,
          spec_name: editingRecord.spec_name || null,
          machine_id: editingRecord.machine_id || null,
          operator_id: editingRecord.operator_id || null,
          operator_id_2: editingRecord.operator_id_2 || null,
          produced_length: Number(editingRecord.produced_length),
          produced_weight: Number(editingRecord.produced_weight),
          defect_weight: Number(editingRecord.defect_weight) || 0,
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

  const totalLength = records.reduce((sum, r) => sum + Number(r.produced_length || 0), 0);
  const totalWeight = records.reduce((sum, r) => sum + Number(r.produced_weight || 0), 0);
  const totalDefect = records.reduce((sum, r) => sum + Number(r.defect_weight || 0), 0);
  const defectPercentage = totalWeight > 0 ? ((totalDefect / totalWeight) * 100).toFixed(1) : 0;

  return (
    <div className="page-container">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Scissors size={24} className="text-white" />
            </div>
            История Производства Строп
          </h1>
          <p className="page-description">Журнал выпуска строп</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Всего записей</div>
            <div className="stat-value text-blue-400">{records.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Общая длина</div>
            <div className="stat-value text-blue-400">{Math.round(totalLength)} м</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Общий вес</div>
            <div className="stat-value text-green-400">{Math.round(totalWeight)} кг</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Брак</div>
            <div className="stat-value text-red-400">{totalDefect.toFixed(1)} кг ({defectPercentage}%)</div>
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
                Нет записей о производстве строп
              </div>
            ) : (
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableHead className="text-zinc-400">Дата</TableHead>
                      <TableHead className="text-zinc-400">Смена</TableHead>
                      <TableHead className="text-zinc-400">Тип стропы</TableHead>
                      <TableHead className="text-zinc-400 text-right">Длина (м)</TableHead>
                      <TableHead className="text-zinc-400 text-right">Расч. вес</TableHead>
                      <TableHead className="text-zinc-400 text-right">Факт. вес</TableHead>
                      <TableHead className="text-zinc-400 text-right">Брак</TableHead>
                      <TableHead className="text-zinc-400">Станок</TableHead>
                      <TableHead className="text-zinc-400">Оператор</TableHead>
                      <TableHead className="text-zinc-400">Примечания</TableHead>
                      {isAdmin && (
                        <TableHead className="text-center text-zinc-400">Действия</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="border-zinc-800 hover:bg-zinc-800/30">
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500" />
                            {new Date(record.date).toLocaleDateString('ru-RU')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.shift}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Scissors size={14} className="text-blue-400" />
                            <div>
                              <div className="text-white">{record.spec_name || record.strap_types?.code || 'N/A'}</div>
                              <div className="text-xs text-zinc-500">
                                {record.specification?.shirina_mm && record.specification?.plotnost_gr_mp
                                  ? `${record.specification.shirina_mm}мм, ${record.specification.plotnost_gr_mp}гр/мп`
                                  : record.strap_types?.name || ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-white">
                          {Math.round(record.produced_length)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-400 text-sm">
                          {record.calculated_weight ? Number(record.calculated_weight).toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400 font-bold">
                          {Number(record.produced_weight).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-400">
                          {record.defect_weight && Number(record.defect_weight) > 0
                            ? Number(record.defect_weight).toFixed(1)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          <div className="flex items-center gap-1">
                            <Factory size={12} />
                            {record.equipment?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              {record.employees?.full_name || '-'}
                            </div>
                            {record.employees2 && (
                              <div className="flex items-center gap-1 text-violet-400">
                                <User size={12} />
                                {record.employees2.full_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 max-w-xs truncate" title={record.notes}>
                          {record.notes || '-'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingRecord({ ...record })}
                                className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-950 rounded transition-colors"
                                title="Редактировать"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id, record.date)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                                title="Удалить запись"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
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
              <h2 className="text-lg font-bold">Редактировать запись строп</h2>
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
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Тип стропы</label>
                <select value={editingRecord.spec_name || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, spec_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {strapSpecs.map(s => <option key={s.nazvanie} value={s.nazvanie}>{s.nazvanie}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Станок</label>
                <select value={editingRecord.machine_id || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, machine_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                  <option value="">— не указано —</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Оператор 1</label>
                  <select value={editingRecord.operator_id || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, operator_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                    <option value="">—</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Оператор 2</label>
                  <select value={editingRecord.operator_id_2 || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, operator_id_2: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
                    <option value="">—</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 uppercase font-medium tracking-wide mb-3">Показатели</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Длина (м)</label>
                    <input type="number" step="0.1" value={editingRecord.produced_length} onChange={e => setEditingRecord({ ...editingRecord, produced_length: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Факт. вес (кг)</label>
                    <input type="number" step="0.1" value={editingRecord.produced_weight} onChange={e => setEditingRecord({ ...editingRecord, produced_weight: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Брак (кг)</label>
                    <input type="number" step="0.1" value={editingRecord.defect_weight || 0} onChange={e => setEditingRecord({ ...editingRecord, defect_weight: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
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
