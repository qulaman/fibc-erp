'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, TrendingDown, Search } from "lucide-react";

export default function CuttingPartsWarehousePage() {
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
      .from('view_cutting_parts_balance')
      .select('*')
      .order('code');

    if (balancesData) setBalances(balancesData);

    // Загружаем историю операций
    const { data: historyData } = await supabase
      .from('cutting_parts_warehouse')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (historyData) setHistory(historyData);

    setLoading(false);
  };

  const filteredBalances = balances.filter(b =>
    b.code?.toLowerCase().includes(search.toLowerCase()) ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    h.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    h.cutting_type_code?.toLowerCase().includes(search.toLowerCase()) ||
    h.cutting_type_name?.toLowerCase().includes(search.toLowerCase()) ||
    h.operator?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Package size={24} className="text-white" />
            </div>
            Склад Кроеных Деталей
          </h1>
          <p className="page-description">Учет деталей после кроя</p>
        </div>
      </div>

      {/* Переключатель вида */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setView('balances')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'balances'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Остатки
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'history'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          История операций
        </button>
      </div>

      {/* Поиск */}
      <div className="search-container mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Поиск..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-zinc-500">Загрузка...</div>
      ) : view === 'balances' ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Остатки кроеных деталей</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Код</TableHead>
                  <TableHead className="text-zinc-400">Название</TableHead>
                  <TableHead className="text-zinc-400">Категория</TableHead>
                  <TableHead className="text-zinc-400 text-right">Приход</TableHead>
                  <TableHead className="text-zinc-400 text-right">Расход</TableHead>
                  <TableHead className="text-zinc-400 text-right">Остаток</TableHead>
                  <TableHead className="text-zinc-400">Последнее движение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                      Нет данных
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBalances.map(balance => (
                    <TableRow key={balance.code} className="border-zinc-700">
                      <TableCell className="font-mono text-zinc-300">{balance.code}</TableCell>
                      <TableCell className="text-white">{balance.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-400 border-orange-900">
                          {balance.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-400">{balance.total_in || 0}</TableCell>
                      <TableCell className="text-right text-red-400">{balance.total_out || 0}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${balance.balance > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                          {balance.balance || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {balance.last_movement ? new Date(balance.last_movement).toLocaleString('ru-RU') : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">История операций</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Дата/Время</TableHead>
                  <TableHead className="text-zinc-400">Документ</TableHead>
                  <TableHead className="text-zinc-400">Операция</TableHead>
                  <TableHead className="text-zinc-400">Код детали</TableHead>
                  <TableHead className="text-zinc-400">Название</TableHead>
                  <TableHead className="text-zinc-400 text-right">Количество</TableHead>
                  <TableHead className="text-zinc-400">Оператор</TableHead>
                  <TableHead className="text-zinc-400">Источник/Назначение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                      Нет данных
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map(record => (
                    <TableRow key={record.id} className="border-zinc-700">
                      <TableCell className="text-zinc-400 text-sm">
                        <div>{new Date(record.date).toLocaleDateString('ru-RU')}</div>
                        <div className="text-xs text-zinc-600">{record.time}</div>
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300 text-sm">{record.doc_number}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={record.operation === 'Приход' ? 'text-green-400 border-green-900' : 'text-red-400 border-red-900'}
                        >
                          {record.operation === 'Приход' ? (
                            <><TrendingUp size={12} className="mr-1" /> Приход</>
                          ) : (
                            <><TrendingDown size={12} className="mr-1" /> Расход</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300">{record.cutting_type_code}</TableCell>
                      <TableCell className="text-white">{record.cutting_type_name}</TableCell>
                      <TableCell className={`text-right font-bold ${record.operation === 'Приход' ? 'text-green-400' : 'text-red-400'}`}>
                        {record.operation === 'Приход' ? '+' : '-'}{record.quantity}
                      </TableCell>
                      <TableCell className="text-zinc-400">{record.operator || '-'}</TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {record.operation === 'Приход' ? record.source_roll_number : record.destination_doc}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
