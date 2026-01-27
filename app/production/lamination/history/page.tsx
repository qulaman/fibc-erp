'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Calendar, User, Factory } from "lucide-react";

export default function LaminationHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('production_lamination')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки истории ламинации:', error);
    } else if (data) {
      for (const record of data) {
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

  const totalLength = records.reduce((sum, r) => sum + Number(r.output_length || 0), 0);

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
            <div className="stat-label">Всего записей</div>
            <div className="stat-value text-orange-400">{records.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Общая длина</div>
            <div className="stat-value text-orange-400">{Math.round(totalLength)} м</div>
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
                      <TableHead className="text-zinc-400 text-right">Длина (м)</TableHead>
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
                            <Calendar size={14} className="text-orange-500" />
                            {new Date(record.date).toLocaleDateString('ru-RU')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.shift}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-zinc-300">
                          {record.doc_number || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-white">
                          {Math.round(record.output_length)}
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
