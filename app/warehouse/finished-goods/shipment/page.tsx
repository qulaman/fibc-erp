'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { toast } from 'sonner';
import {
  Truck, Calendar, Users, Package, Plus, Trash2,
  CheckCircle2, AlertTriangle, ArrowRight, Building2
} from "lucide-react";
import Link from 'next/link';

interface Product {
  product_code: string;
  product_name: string;
  product_type: string;
  balance: number;
}

interface Employee {
  id: string;
  full_name: string;
}

interface ShipmentItem {
  id: string;
  product_code: string;
  product_name: string;
  product_type: string;
  quantity: number;
  available: number;
}

export default function FinishedGoodsShipmentPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Форма
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Загрузка товаров со склада - используем агрегацию для расчета баланса
    const { data: productsData } = await supabase
      .from('finished_goods_warehouse')
      .select('product_code, product_name, operation, quantity');

    if (productsData) {
      // Группируем по продуктам и рассчитываем балансы
      const grouped = productsData.reduce((acc: any, item) => {
        const key = item.product_code;
        if (!acc[key]) {
          acc[key] = {
            product_code: item.product_code,
            product_name: item.product_name,
            product_type: '', // Нет в таблице
            balance: 0
          };
        }
        // Приход увеличивает, Расход уменьшает
        if (item.operation === 'Приход') {
          acc[key].balance += item.quantity;
        } else if (item.operation === 'Расход') {
          acc[key].balance -= item.quantity;
        }
        return acc;
      }, {});

      // Фильтруем только товары с положительным балансом
      const available = Object.values(grouped).filter((p: any) => p.balance > 0) as Product[];
      setProducts(available);
    }

    // Загрузка кладовщиков
    const { data: empsData } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('role', 'warehouse')
      .eq('is_active', true)
      .order('full_name');

    if (empsData) setEmployees(empsData);
  };

  const addShipmentItem = () => {
    setShipmentItems([
      ...shipmentItems,
      {
        id: crypto.randomUUID(),
        product_code: '',
        product_name: '',
        product_type: '',
        quantity: 0,
        available: 0
      }
    ]);
  };

  const removeShipmentItem = (id: string) => {
    setShipmentItems(shipmentItems.filter(item => item.id !== id));
  };

  const updateShipmentItem = (id: string, field: string, value: any) => {
    setShipmentItems(shipmentItems.map(item => {
      if (item.id === id) {
        if (field === 'product_code') {
          const product = products.find(p => p.product_code === value);
          if (product) {
            return {
              ...item,
              product_code: value,
              product_name: product.product_name,
              product_type: product.product_type,
              available: product.balance,
              quantity: 0
            };
          }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Укажите название клиента');
      return;
    }

    if (shipmentItems.length === 0) {
      toast.error('Добавьте товары для отпуска');
      return;
    }

    // Валидация количества
    for (const item of shipmentItems) {
      if (!item.product_code) {
        toast.error('Выберите товар');
        return;
      }
      if (item.quantity <= 0) {
        toast.error(`Укажите количество для ${item.product_name}`);
        return;
      }
      if (item.quantity > item.available) {
        toast.error(`Недостаточно товара ${item.product_name}. Доступно: ${item.available} шт`);
        return;
      }
    }

    setLoading(true);

    try {
      // Генерируем номер документа
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_shipment_number');

      if (numberError) throw numberError;
      const shipmentNumber = numberData;

      // Вставляем записи отпуска
      for (const item of shipmentItems) {
        const { error: shipmentError } = await supabase
          .from('finished_goods_shipments')
          .insert({
            shipment_number: shipmentNumber,
            shipment_date: shipmentDate,
            client_name: clientName.trim(),
            responsible_person: responsiblePerson || null,
            employee_id: employeeId || null,
            product_code: item.product_code,
            product_name: item.product_name,
            product_type: item.product_type,
            quantity: item.quantity,
            notes,
            status: 'Проведено'
          });

        if (shipmentError) throw shipmentError;

        // Списываем со склада - создаем запись расхода
        await supabase
          .from('finished_goods_warehouse')
          .insert({
            doc_number: shipmentNumber,
            date: shipmentDate,
            operation: 'Расход',
            product_code: item.product_code,
            product_name: item.product_name,
            quantity: item.quantity,
            destination_client: clientName.trim(),
            notes: `Отпуск клиенту: ${clientName.trim()}`,
            status: 'Проведено'
          });
      }

      toast.success(`✅ Отпуск проведен! ${shipmentNumber}`);

      // Сброс формы
      setClientName('');
      setResponsiblePerson('');
      setEmployeeId('');
      setNotes('');
      setShipmentItems([]);
      fetchData();

    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = shipmentItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Проверка обязательных полей
  const missingFields = [];
  if (!clientName.trim()) missingFields.push('Укажите название клиента');
  if (shipmentItems.length === 0) missingFields.push('Добавьте товары для отпуска');
  if (shipmentItems.some(item => !item.product_code)) missingFields.push('Выберите товары');
  if (shipmentItems.some(item => item.quantity <= 0)) missingFields.push('Укажите количество');
  if (shipmentItems.some(item => item.quantity > item.available)) missingFields.push('Превышен остаток товара');

  return (
    <div className="page-container max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-2 rounded-lg">
                <Truck size={28} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Отпуск Готовой Продукции
              </span>
            </h1>
            <p className="text-zinc-400">Оформление отпуска товаров клиентам</p>
          </div>
          <Link href="/warehouse/finished-goods/shipment/history">
            <Button variant="outline" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
              📋 Журнал отпусков
            </Button>
          </Link>
        </div>
      </div>

      {/* Индикатор обязательных полей */}
      {missingFields.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-2 border-yellow-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="text-yellow-500 font-bold text-lg mb-2">Заполните обязательные поля</h3>
              <ul className="space-y-1 text-zinc-300">
                {missingFields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-yellow-500">•</span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 size={20} className="text-emerald-400" />
              Информация о клиенте и отпуске
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 flex items-center gap-2 mb-2">
                  <Calendar size={16} /> Дата отпуска
                </Label>
                <Input
                  type="date"
                  value={shipmentDate}
                  onChange={e => setShipmentDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-zinc-400 flex items-center gap-2 mb-2">
                  <Building2 size={16} /> Клиент *
                </Label>
                <Input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="ООО Компания"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 flex items-center gap-2 mb-2">
                  <Users size={16} /> Ответственный
                </Label>
                <Input
                  value={responsiblePerson}
                  onChange={e => setResponsiblePerson(e.target.value)}
                  placeholder="ФИО ответственного"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-400 flex items-center gap-2 mb-2">
                  <Users size={16} /> Кладовщик
                </Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                    <SelectValue placeholder="Выберите кладовщика..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 mb-2">Примечания</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                className="bg-zinc-950 border-zinc-700 text-white"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Товары */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Package size={20} className="text-emerald-400" />
                Товары для отпуска
              </CardTitle>
              <Button
                type="button"
                onClick={addShipmentItem}
                variant="outline"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
              >
                <Plus size={16} className="mr-1" /> Добавить товар
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {shipmentItems.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p>Нажмите "Добавить товар" для начала</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shipmentItems.map((item, idx) => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-5">
                        <Label className="text-zinc-500 text-xs mb-1">Товар</Label>
                        <Select
                          value={item.product_code}
                          onValueChange={v => updateShipmentItem(item.id, 'product_code', v)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue placeholder="Выберите товар..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.product_code} value={p.product_code}>
                                {p.product_name} ({p.product_type}) - {p.balance} шт
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-zinc-500 text-xs mb-1">Доступно</Label>
                        <div className="h-10 flex items-center">
                          <Badge variant="outline" className="bg-zinc-800 text-emerald-400 border-emerald-600">
                            {item.available} шт
                          </Badge>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-zinc-500 text-xs mb-1">Количество</Label>
                        <Input
                          type="number"
                          min={1}
                          max={item.available}
                          value={item.quantity || ''}
                          onChange={e => updateShipmentItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className={`bg-zinc-900 border-zinc-700 text-white ${
                            item.quantity > item.available ? 'border-red-500' : ''
                          }`}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-zinc-500 text-xs mb-1">Тип</Label>
                        <div className="h-10 flex items-center text-zinc-400 text-sm">
                          {item.product_type || '-'}
                        </div>
                      </div>

                      <div className="md:col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShipmentItem(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>

                    {item.quantity > item.available && (
                      <div className="mt-2 text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Превышен остаток! Доступно только {item.available} шт
                      </div>
                    )}
                  </div>
                ))}

                {/* Итого */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-700 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Всего товаров:</span>
                    <span className="text-2xl font-bold text-emerald-400">{shipmentItems.length} поз.</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-zinc-300 font-medium">Общее количество:</span>
                    <span className="text-2xl font-bold text-emerald-400">{totalQuantity} шт</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Кнопка отправки */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || missingFields.length > 0}
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg px-12 py-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5 animate-spin" />
                Проведение...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Провести отпуск
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
