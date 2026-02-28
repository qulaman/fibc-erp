'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  Stamp, Sun, Moon, Users, Scissors, Package, CheckCircle2,
  Droplet, TrendingDown, ArrowRight, Sparkles, AlertTriangle
} from "lucide-react";

interface CutPart {
  cutting_type_code: string;
  cutting_type_name: string;
  category: string;
  balance: number;
}

interface Employee {
  id: string;
  full_name: string;
}

export default function ProductionPrintingPage() {
  const [shift, setShift] = useState<'День' | 'Ночь'>('День');
  const [operatorId, setOperatorId] = useState('');
  const [operator, setOperator] = useState('');
  const [operators, setOperators] = useState<Employee[]>([]);
  const [cutParts, setCutParts] = useState<CutPart[]>([]);
  const [selectedPart, setSelectedPart] = useState<CutPart | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [paintName, setPaintName] = useState('');
  const [paintConsumptionG, setPaintConsumptionG] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);

  const fetchCutParts = async () => {
    const { data } = await supabase
      .from('cutting_parts_balance')
      .select('*')
      .order('cutting_type_name');
    if (data) setCutParts(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Загружаем операторов печати
      const { data: emps } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('role', 'operator_printing')
        .eq('is_active', true)
        .order('full_name');

      if (emps) setOperators(emps);

      await fetchCutParts();
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operator || !selectedPart || quantity <= 0 || !paintName.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    if (quantity > selectedPart.balance) {
      toast.error(`Недостаточно деталей на складе! Доступно: ${selectedPart.balance} шт`);
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      // Генерация номера документа
      const { data: lastDoc } = await supabase
        .from('production_printing')
        .select('doc_number')
        .like('doc_number', `ПЧТ-${dateStr}-%`)
        .order('doc_number', { ascending: false })
        .limit(1);

      const lastNum = lastDoc && lastDoc.length > 0
        ? parseInt(lastDoc[0].doc_number.split('-')[2])
        : 0;
      const docNumber = `ПЧТ-${dateStr}-${String(lastNum + 1).padStart(4, '0')}`;

      // Запись в журнал печати
      const { error: prodError } = await supabase
        .from('production_printing')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          shift,
          operator,
          operator_id: operatorId || null,
          cutting_type_code: selectedPart.cutting_type_code,
          cutting_type_name: selectedPart.cutting_type_name,
          category: selectedPart.category,
          quantity,
          paint_name: paintName.trim(),
          paint_consumption_g: paintConsumptionG ? parseFloat(paintConsumptionG) : null,
          notes: notes.trim() || null,
          status: 'Проведено'
        });

      if (prodError) throw prodError;

      // Расход со склада кроеных деталей
      const { error: warehouseError } = await supabase
        .from('cutting_parts_warehouse')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          operation: 'Расход',
          cutting_type_code: selectedPart.cutting_type_code,
          cutting_type_name: selectedPart.cutting_type_name,
          category: selectedPart.category,
          quantity,
          source_number: docNumber,
          operator,
          status: 'Проведено',
          notes: `Печать: ${paintName.trim()}`
        });

      if (warehouseError) throw warehouseError;

      toast.success(`✅ Операция проведена! ${docNumber} · ${quantity} шт · ${paintName}`);

      // Сброс формы
      setSelectedPart(null);
      setQuantity(0);
      setPaintName('');
      setPaintConsumptionG('');
      setNotes('');

      // Обновить остатки
      await fetchCutParts();

    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const remainingBalance = selectedPart ? selectedPart.balance - quantity : 0;
  const isValid = operator && selectedPart && quantity > 0 && paintName.trim() && quantity <= (selectedPart?.balance || 0);

  // Проверка обязательных полей
  const missingFields = [];
  if (!operator) missingFields.push('Выберите оператора');
  if (!selectedPart) missingFields.push('Выберите деталь');
  if (!paintName.trim()) missingFields.push('Укажите название краски');
  if (quantity <= 0) missingFields.push('Укажите количество');
  if (selectedPart && quantity > selectedPart.balance) missingFields.push('Количество превышает остаток');

  return (
    <div className="page-container max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2 rounded-lg">
            <Stamp size={28} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Производство Печати
          </span>
        </h1>
        <p className="text-zinc-400">Нанесение краски на кроеные детали Биг-Бэг</p>
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
        {/* Controls Row */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
          {/* Shift Toggle */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">Смена</label>
            <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-700">
              <button
                type="button"
                onClick={() => setShift('День')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  shift === 'День' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Sun size={16} /> День
              </button>
              <button
                type="button"
                onClick={() => setShift('Ночь')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  shift === 'Ночь' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Moon size={16} /> Ночь
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Operator Selection */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                Оператор печати
              </CardTitle>
            </CardHeader>
            <CardContent>
              {operators.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {operators.map(emp => {
                    const isSelected = operatorId === emp.id;
                    const initials = emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setOperatorId(emp.id);
                          setOperator(emp.full_name);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg scale-105'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-purple-600 hover:text-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isSelected ? 'bg-white text-purple-600' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {initials}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{emp.full_name}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={18} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-8">
                  <Users size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Нет операторов печати</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Paint Info */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Droplet size={18} className="text-pink-400" />
                Информация о краске
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">
                  Название краски *
                </label>
                <Input
                  value={paintName}
                  onChange={(e) => setPaintName(e.target.value)}
                  placeholder="Например: Краска синяя..."
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">
                  Расход краски (г)
                </label>
                <Input
                  type="number"
                  value={paintConsumptionG}
                  onChange={(e) => setPaintConsumptionG(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">
                  Примечания
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация..."
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parts Selection */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Scissors size={18} className="text-orange-400" />
              Выбор кроеной детали
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cutParts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cutParts.map(part => {
                  const isSelected = selectedPart?.cutting_type_code === part.cutting_type_code;
                  const lowStock = part.balance < 10;
                  return (
                    <button
                      key={part.cutting_type_code}
                      type="button"
                      onClick={() => setSelectedPart(part)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500 shadow-lg scale-105'
                          : 'bg-zinc-800 border-zinc-700 hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`text-xs font-bold ${isSelected ? 'text-purple-200' : 'text-purple-400'}`}>
                          {part.cutting_type_code}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-white shrink-0" />}
                      </div>
                      <div className={`text-sm font-medium mb-2 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {part.cutting_type_name}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${
                          isSelected ? 'border-purple-300 text-purple-100' :
                          lowStock ? 'border-red-600 text-red-400' : 'border-green-600 text-green-400'
                        }`}>
                          {part.category}
                        </Badge>
                        <div className={`text-xs font-bold ${
                          isSelected ? 'text-white' :
                          lowStock ? 'text-red-400' : 'text-green-400'
                        }`}>
                          <Package size={12} className="inline mr-1" />
                          {part.balance} шт
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-12">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет деталей на складе</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quantity Input */}
        {selectedPart && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-800 animate-in fade-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                Количество для печати
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-purple-300 uppercase font-bold mb-2 block">
                    Количество (шт) *
                  </label>
                  <Input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                    max={selectedPart.balance}
                    placeholder="0"
                    className="bg-zinc-950 border-purple-700 text-white text-2xl font-bold h-14 text-center"
                  />
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight size={32} className="text-purple-600" />
                </div>

                <div className="space-y-3">
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">Доступно на складе</div>
                    <div className="text-2xl font-bold text-green-400">{selectedPart.balance} шт</div>
                  </div>
                  <div className={`border rounded-lg p-3 ${
                    remainingBalance < 0 ? 'bg-red-900/20 border-red-700' : 'bg-blue-900/20 border-blue-700'
                  }`}>
                    <div className="text-xs text-zinc-300 mb-1">Остаток после печати</div>
                    <div className={`text-2xl font-bold ${remainingBalance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {remainingBalance} шт
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isValid || loading}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg px-12 py-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <>
                <TrendingDown className="mr-2 h-5 w-5 animate-spin" />
                Проведение...
              </>
            ) : (
              <>
                <Stamp className="mr-2 h-5 w-5" />
                Провести операцию
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
