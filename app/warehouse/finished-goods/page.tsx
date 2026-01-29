'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, TrendingDown, Search, Trash2 } from "lucide-react";

export default function FinishedGoodsWarehousePage() {
  const { isAdmin } = useAuth();
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
      .from('view_finished_goods_balance')
      .select('*')
      .order('code');

    if (balancesData) setBalances(balancesData);

    // Загружаем историю операций
    const { data: historyData } = await supabase
      .from('finished_goods_warehouse')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (historyData) setHistory(historyData);

    setLoading(false);
  };

  const handleDelete = async (id: string, docNumber: string) => {
    if (!isAdmin) {
      alert('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить операцию ${docNumber}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('finished_goods_warehouse')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Запись успешно удалена');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        alert(`Невозможно удалить операцию ${docNumber}.\n\nЭта запись связана с другими данными в системе (отгрузка или другие операции).`);
      } else {
        alert('Ошибка удаления: ' + err.message);
      }
    }
  };

  const filteredBalances = balances.filter(b =>
    b.code?.toLowerCase().includes(search.toLowerCase()) ||
    b.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    h.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    h.product_code?.toLowerCase().includes(search.toLowerCase()) ||
    h.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    h.destination_client?.toLowerCase().includes(search.toLowerCase())
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
            <div className="bg-green-600 p-2 rounded-lg">
              <Package size={24} className="text-white" />
            </div>
            Склад Готовой Продукции
          </h1>
          <p className="page-description">Учет готовых изделий (мешков)</p>
        </div>
      </div>

      {/* Переключатель вида */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setView('balances')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'balances'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Остатки
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            view === 'history'
              ? 'bg-green-600 text-white'
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
            <CardTitle className="text-white">Остатки готовой продукции</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBalances.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <Package size={48} className="mx-auto mb-4 text-zinc-700" />
                <p>Нет данных о готовой продукции</p>
                <p className="text-sm text-zinc-600 mt-2">
                  Остатки появятся после выполнения операций пошива
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700">
                    <TableHead className="text-zinc-400">Код</TableHead>
                    <TableHead className="text-zinc-400">Название</TableHead>
                    <TableHead className="text-zinc-400 text-right">Приход</TableHead>
                    <TableHead className="text-zinc-400 text-right">Расход</TableHead>
                    <TableHead className="text-zinc-400 text-right">Остаток</TableHead>
                    <TableHead className="text-zinc-400">Последнее движение</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.map(balance => (
                    <TableRow key={balance.code} className="border-zinc-700">
                      <TableCell className="font-mono text-zinc-300">{balance.code}</TableCell>
                      <TableCell className="text-white">{balance.name}</TableCell>
                      <TableCell className="text-right text-green-400">{balance.total_in || 0}</TableCell>
                      <TableCell className="text-right text-red-400">{balance.total_out || 0}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold text-lg ${balance.balance > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                          {balance.balance || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {balance.last_movement ? new Date(balance.last_movement).toLocaleString('ru-RU') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">История операций</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <Package size={48} className="mx-auto mb-4 text-zinc-700" />
                <p>Нет истории операций</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-700">
                    <TableHead className="text-zinc-400">Дата/Время</TableHead>
                    <TableHead className="text-zinc-400">Документ</TableHead>
                    <TableHead className="text-zinc-400">Операция</TableHead>
                    <TableHead className="text-zinc-400">Код</TableHead>
                    <TableHead className="text-zinc-400">Название</TableHead>
                    <TableHead className="text-zinc-400 text-right">Количество</TableHead>
                    <TableHead className="text-zinc-400">Источник/Клиент</TableHead>
                    <TableHead className="text-zinc-400">Примечания</TableHead>
                    {isAdmin && (
                      <TableHead className="text-center text-zinc-400">Действия</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map(record => (
                    <TableRow key={record.id} className="border-zinc-700">
                      <TableCell className="text-zinc-400 text-sm">
                        <div>{new Date(record.date).toLocaleDateString('ru-RU')}</div>
                        <div className="text-xs text-zinc-600">{record.time}</div>
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300 text-sm">{record.doc_number}</TableCell>
                      <TableCell>
                        {getOperationBadge(record.operation)}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300">{record.product_code}</TableCell>
                      <TableCell className="text-white">{record.product_name}</TableCell>
                      <TableCell className={`text-right font-bold ${
                        record.operation === 'Расход' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {record.operation === 'Расход' ? '-' : '+'}{record.quantity}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {record.operation === 'Приход' || record.operation === 'Возврат'
                          ? record.source_doc || '-'
                          : record.destination_client || '-'
                        }
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                        {record.notes || '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleDelete(record.id, record.doc_number)}
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
