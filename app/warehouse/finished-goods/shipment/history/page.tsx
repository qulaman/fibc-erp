'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Calendar, Building2, Package, Search,
  FileText, TrendingUp, ArrowLeft
} from "lucide-react";
import Link from 'next/link';

interface ShipmentRecord {
  id: string;
  shipment_number: string;
  shipment_date: string;
  client_name: string;
  responsible_person: string | null;
  product_code: string;
  product_name: string;
  product_type: string | null;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
}

interface GroupedShipment {
  shipment_number: string;
  shipment_date: string;
  client_name: string;
  responsible_person: string | null;
  total_items: number;
  total_quantity: number;
  items: ShipmentRecord[];
  status: string;
}

export default function ShipmentHistoryPage() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<GroupedShipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  // Статистика
  const [stats, setStats] = useState({
    totalShipments: 0,
    totalQuantity: 0,
    totalClients: 0,
    todayShipments: 0
  });

  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [shipments, searchTerm, dateFrom, dateTo, selectedClient]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finished_goods_shipments')
        .select('*')
        .order('shipment_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setShipments(data || []);
      calculateStats(data || []);
    } catch (err: any) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ShipmentRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const uniqueClients = new Set(data.map(s => s.client_name));
    const uniqueShipments = new Set(data.map(s => s.shipment_number));

    setStats({
      totalShipments: uniqueShipments.size,
      totalQuantity: data.reduce((sum, s) => sum + s.quantity, 0),
      totalClients: uniqueClients.size,
      todayShipments: new Set(
        data.filter(s => s.shipment_date === today).map(s => s.shipment_number)
      ).size
    });
  };

  const applyFilters = () => {
    let filtered = [...shipments];

    // Фильтр по поиску (номер документа, клиент, товар)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.shipment_number.toLowerCase().includes(term) ||
        s.client_name.toLowerCase().includes(term) ||
        s.product_name.toLowerCase().includes(term)
      );
    }

    // Фильтр по дате от
    if (dateFrom) {
      filtered = filtered.filter(s => s.shipment_date >= dateFrom);
    }

    // Фильтр по дате до
    if (dateTo) {
      filtered = filtered.filter(s => s.shipment_date <= dateTo);
    }

    // Фильтр по клиенту
    if (selectedClient) {
      filtered = filtered.filter(s => s.client_name === selectedClient);
    }

    // Группировка по номеру документа
    const grouped = filtered.reduce((acc: { [key: string]: GroupedShipment }, record) => {
      const key = record.shipment_number;
      if (!acc[key]) {
        acc[key] = {
          shipment_number: record.shipment_number,
          shipment_date: record.shipment_date,
          client_name: record.client_name,
          responsible_person: record.responsible_person,
          total_items: 0,
          total_quantity: 0,
          items: [],
          status: record.status
        };
      }
      acc[key].items.push(record);
      acc[key].total_items += 1;
      acc[key].total_quantity += record.quantity;
      return acc;
    }, {});

    setFilteredShipments(Object.values(grouped));
  };

  const uniqueClients = Array.from(new Set(shipments.map(s => s.client_name))).sort();

  return (
    <div className="page-container max-w-[100vw] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/warehouse/finished-goods/shipment">
            <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-700">
              <ArrowLeft size={16} className="mr-1" /> Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-400 flex items-center gap-2">
              <FileText size={28} /> Журнал Отпусков Готовой Продукции
            </h1>
            <p className="text-zinc-500 text-sm">История отпуска товаров клиентам</p>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs">Всего отпусков</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.totalShipments}</p>
                </div>
                <Truck className="text-emerald-600 opacity-50" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs">Отпущено единиц</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{stats.totalQuantity}</p>
                </div>
                <Package className="text-blue-600 opacity-50" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs">Клиентов</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{stats.totalClients}</p>
                </div>
                <Building2 className="text-purple-600 opacity-50" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs">Сегодня отпусков</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">{stats.todayShipments}</p>
                </div>
                <TrendingUp className="text-orange-600 opacity-50" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Поиск по номеру, клиенту, товару..."
                  className="pl-10 bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  placeholder="Дата от"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  placeholder="Дата до"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-zinc-950 border border-zinc-700 text-white"
                >
                  <option value="">Все клиенты</option>
                  {uniqueClients.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>
            </div>

            {(searchTerm || dateFrom || dateTo || selectedClient) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-zinc-500">Найдено: {filteredShipments.length}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFrom('');
                    setDateTo('');
                    setSelectedClient('');
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  Сбросить фильтры
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Таблица */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Загрузка...</div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Truck size={48} className="mx-auto mb-4 opacity-30" />
            <p>Отпуски не найдены</p>
          </div>
        ) : (
          filteredShipments.map(shipment => (
            <Card key={shipment.shipment_number} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              {/* Заголовок документа */}
              <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-b border-emerald-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 p-2 rounded-lg">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg">{shipment.shipment_number}</h3>
                        <Badge
                          variant="outline"
                          className={`${
                            shipment.status === 'Проведено'
                              ? 'bg-emerald-900/50 text-emerald-400 border-emerald-600'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-600'
                          }`}
                        >
                          {shipment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {new Date(shipment.shipment_date).toLocaleDateString('ru-RU')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={14} /> {shipment.client_name}
                        </span>
                        {shipment.responsible_person && (
                          <span className="flex items-center gap-1">
                            👤 {shipment.responsible_person}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Позиций</p>
                      <p className="text-lg font-bold text-emerald-400">{shipment.total_items}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Количество</p>
                      <p className="text-lg font-bold text-emerald-400">{shipment.total_quantity} шт</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Список товаров */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950">
                        <th className="text-left p-3 text-xs font-medium text-zinc-500">Код</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-500">Наименование</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-500">Тип</th>
                        <th className="text-right p-3 text-xs font-medium text-zinc-500">Количество</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipment.items.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}>
                          <td className="p-3 text-sm text-zinc-400">{item.product_code}</td>
                          <td className="p-3 text-sm text-white font-medium">{item.product_name}</td>
                          <td className="p-3 text-sm text-zinc-400">{item.product_type || '-'}</td>
                          <td className="p-3 text-sm text-right">
                            <Badge variant="outline" className="bg-emerald-900/30 text-emerald-400 border-emerald-700">
                              {item.quantity} шт
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {shipment.items[0]?.notes && (
                  <div className="p-3 border-t border-zinc-800 bg-zinc-950">
                    <p className="text-xs text-zinc-500 mb-1">Примечания:</p>
                    <p className="text-sm text-zinc-300">{shipment.items[0].notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
