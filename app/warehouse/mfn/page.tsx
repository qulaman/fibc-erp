'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, TrendingDown, Search } from "lucide-react";
import MFNTransactionDialog from './MFNTransactionDialog';

export default function MFNWarehousePage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'balances' | 'history'>('balances');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Загружаем остатки через VIEW
    const { data: balancesData } = await supabase
      .from('view_mfn_balance')
      .select('*')
      .order('material_name');

    if (balancesData) setBalances(balancesData);

    // Загружаем историю операций
    const { data: historyData } = await supabase
      .from('mfn_warehouse')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (historyData) setHistory(historyData);

    setLoading(false);
  };

  const filteredBalances = balances.filter(b =>
    b.material_code?.toLowerCase().includes(search.toLowerCase()) ||
    b.material_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.color?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    h.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    h.material_code?.toLowerCase().includes(search.toLowerCase()) ||
    h.material_name?.toLowerCase().includes(search.toLowerCase()) ||
    h.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getOperationBadge = (operation: string) => {
    if (operation === 'Приход') {
      return (
        <Badge variant="outline" className="text-green-400 border-green-900">
          <TrendingUp size={12} className="mr-1" /> Приход
        </Badge>
      );
    } else if (operation === 'Расход') {
      return (
        <Badge variant="outline" className="text-red-400 border-red-900">
          <TrendingDown size={12} className="mr-1" /> Расход
        </Badge>
      );
    } else if (operation === 'Возврат') {
      return (
        <Badge variant="outline" className="text-blue-400 border-blue-900">
          <TrendingUp size={12} className="mr-1" /> Возврат
        </Badge>
      );
    }
    return <Badge variant="outline">{operation}</Badge>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Package size={24} className="text-white" />
            </div>
            Склад МФН Нити
          </h1>
          <p className="page-description">Учет МФН нити (мультифиламентная нить)</p>
        </div>
        <div className="flex gap-3">
          <MFNTransactionDialog />
        </div>
      </div>

      {/* Переключатель вида */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setView('balances')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'balances'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          📊 Остатки
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'history'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          📜 История операций
        </button>
      </div>

      {/* Поиск */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input
              type="text"
              placeholder={view === 'balances' ? 'Поиск по коду, названию, цвету...' : 'Поиск по документу, материалу, поставщику...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-950 border-zinc-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Остатки */}
      {view === 'balances' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Остатки МФН на складе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Код</TableHead>
                    <TableHead className="text-zinc-400">Название</TableHead>
                    <TableHead className="text-zinc-400">Денье</TableHead>
                    <TableHead className="text-zinc-400">Цвет</TableHead>
                    <TableHead className="text-right text-zinc-400">Приход</TableHead>
                    <TableHead className="text-right text-zinc-400">Расход</TableHead>
                    <TableHead className="text-right text-zinc-400">Остаток (кг)</TableHead>
                    <TableHead className="text-zinc-400">Посл. движение</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                        Загрузка...
                      </TableCell>
                    </TableRow>
                  ) : filteredBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                        {search ? 'Нет результатов' : 'Нет данных'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBalances.map((balance) => (
                      <TableRow key={`${balance.material_code}-${balance.denier}`} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-zinc-300">{balance.material_code}</TableCell>
                        <TableCell className="text-white">{balance.material_name}</TableCell>
                        <TableCell className="text-zinc-300">
                          {balance.denier ? (
                            <Badge variant="outline" className="text-purple-400 border-purple-900">
                              {balance.denier}D
                            </Badge>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-300">{balance.color || '—'}</TableCell>
                        <TableCell className="text-right text-green-400">{balance.total_in || 0}</TableCell>
                        <TableCell className="text-right text-red-400">{balance.total_out || 0}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-white border-purple-800 bg-purple-900/20">
                            {Number(balance.balance_kg).toFixed(2)} кг
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {balance.last_movement_date
                            ? new Date(balance.last_movement_date).toLocaleDateString('ru-RU')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* История операций */}
      {view === 'history' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">История операций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Дата</TableHead>
                    <TableHead className="text-zinc-400">Документ</TableHead>
                    <TableHead className="text-zinc-400">Операция</TableHead>
                    <TableHead className="text-zinc-400">Материал</TableHead>
                    <TableHead className="text-zinc-400">Денье</TableHead>
                    <TableHead className="text-right text-zinc-400">Кол-во (кг)</TableHead>
                    <TableHead className="text-zinc-400">Поставщик/Назначение</TableHead>
                    <TableHead className="text-zinc-400">Примечание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                        Загрузка...
                      </TableCell>
                    </TableRow>
                  ) : filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                        {search ? 'Нет результатов' : 'Нет операций'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((record) => (
                      <TableRow key={record.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400 text-sm">
                          {new Date(record.operation_date).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell className="font-mono text-zinc-300 text-sm">{record.doc_number}</TableCell>
                        <TableCell>
                          {getOperationBadge(record.operation_type)}
                        </TableCell>
                        <TableCell className="text-white">{record.material_name}</TableCell>
                        <TableCell>
                          {record.denier ? (
                            <Badge variant="outline" className="text-purple-400 border-purple-900 text-xs">
                              {record.denier}D
                            </Badge>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${
                          record.operation_type === 'Расход' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {record.operation_type === 'Расход' ? '-' : '+'}{Number(record.quantity_kg).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {record.operation_type === 'Приход' || record.operation_type === 'Возврат'
                            ? record.supplier_name || '—'
                            : record.destination || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                          {record.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
