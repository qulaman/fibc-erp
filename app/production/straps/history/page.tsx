'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, Calendar, User, Factory, Trash2 } from "lucide-react";

export default function StrapsHistoryPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

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
    const uniqueOperatorIds = [...new Set(data.map(r => r.operator_id).filter(Boolean))];

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
      employees: record.operator_id ? operatorsMap.get(record.operator_id) : null
    }));

    setRecords(enrichedData);
    setLoading(false);
  };

  const handleDelete = async (id: string, date: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
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

      alert('Запись успешно удалена');
      fetchHistory();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить запись.\n\nЭта запись связана с другими данными в системе.`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
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
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            {record.employees?.full_name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 max-w-xs truncate" title={record.notes}>
                          {record.notes || '-'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleDelete(record.id, record.date)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                              title="Удалить запись"
                            >
                              <Trash2 size={16} />
                            </button>
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
    </div>
  );
}
