'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, Calendar, User, Factory } from "lucide-react";

export default function StrapsHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('production_straps')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    console.log('Straps history data:', data);
    console.log('Straps history error:', error);

    if (error) {
      console.error('Ошибка загрузки истории:', error);
    } else if (data) {
      // Загружаем связанные данные отдельно
      for (const record of data) {
        if (record.strap_type_id) {
          const { data: strapType } = await supabase
            .from('strap_types')
            .select('code, name')
            .eq('id', record.strap_type_id)
            .single();
          record.strap_types = strapType;
        }
        if (record.machine_id) {
          const { data: machine } = await supabase
            .from('equipment')
            .select('name')
            .eq('id', record.machine_id)
            .single();
          record.equipment = machine;
        }
        if (record.operator_id) {
          const { data: operator } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', record.operator_id)
            .single();
          record.employees = operator;
        }
      }
      setRecords(data);
    }
    setLoading(false);
  };

  const totalLength = records.reduce((sum, r) => sum + Number(r.produced_length || 0), 0);
  const totalWeight = records.reduce((sum, r) => sum + Number(r.produced_weight || 0), 0);

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
            <div className="stat-value text-blue-400">{Math.round(totalWeight)} кг</div>
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
                      <TableHead className="text-zinc-400">Ширина</TableHead>
                      <TableHead className="text-zinc-400 text-right">Длина (м)</TableHead>
                      <TableHead className="text-zinc-400 text-right">Вес (кг)</TableHead>
                      <TableHead className="text-zinc-400">Станок</TableHead>
                      <TableHead className="text-zinc-400">Оператор</TableHead>
                      <TableHead className="text-zinc-400">Примечания</TableHead>
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
                              <div className="text-white">{record.strap_types?.code || 'N/A'}</div>
                              <div className="text-xs text-zinc-500">{record.strap_types?.name || ''}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          -
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-white">
                          {Math.round(record.produced_length)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-300">
                          {Math.round(record.produced_weight)}
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
