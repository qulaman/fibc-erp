'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCutParts = async () => {
    const { data } = await supabase
      .from('cutting_parts_balance')
      .select('*');
    if (data) setCutParts(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, full_name')
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
      setError('Заполните все обязательные поля');
      return;
    }

    if (quantity > selectedPart.balance) {
      setError(`Недостаточно деталей на складе. Доступно: ${selectedPart.balance} шт`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      // Генерация номера документа ПЧТ-YYYYMMDD-XXXX
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

      setSuccess(`Операция печати проведена! Документ: ${docNumber}`);

      // Сброс формы
      setSelectedPart(null);
      setQuantity(0);
      setPaintName('');
      setPaintConsumptionG('');
      setNotes('');

      // Обновить остатки
      await fetchCutParts();

    } catch (err: any) {
      setError(`Ошибка при проведении операции: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Производство печати</h1>
        <p className="text-zinc-400">Нанесение краски на кроеные детали</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Смена */}
          <div>
            <label className="block text-sm font-medium mb-2">Смена *</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as 'День' | 'Ночь')}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="День">День</option>
              <option value="Ночь">Ночь</option>
            </select>
          </div>

          {/* Оператор */}
          <div>
            <label className="block text-sm font-medium mb-2">Оператор *</label>
            <Select value={operatorId} onValueChange={(value) => {
              setOperatorId(value);
              const selectedOp = operators.find(op => op.id === value);
              setOperator(selectedOp?.full_name || '');
            }}>
              <SelectTrigger className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                <SelectValue placeholder="Выберите оператора..." />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Кроеная деталь */}
          <div>
            <label className="block text-sm font-medium mb-2">Кроеная деталь *</label>
            <select
              value={selectedPart?.cutting_type_code || ''}
              onChange={(e) => {
                const part = cutParts.find(p => p.cutting_type_code === e.target.value);
                setSelectedPart(part || null);
              }}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите деталь</option>
              {cutParts.map(p => (
                <option key={p.cutting_type_code} value={p.cutting_type_code}>
                  {p.cutting_type_code} — {p.cutting_type_name} ({p.balance} шт)
                </option>
              ))}
            </select>
          </div>

          {/* Краска */}
          <div>
            <label className="block text-sm font-medium mb-2">Краска *</label>
            <input
              type="text"
              value={paintName}
              onChange={(e) => setPaintName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Название краски"
            />
          </div>

          {/* Расход краски */}
          <div>
            <label className="block text-sm font-medium mb-2">Расход краски (г)</label>
            <input
              type="number"
              value={paintConsumptionG}
              onChange={(e) => setPaintConsumptionG(e.target.value)}
              step="0.1"
              min="0"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.0"
            />
          </div>

          {/* Количество */}
          <div>
            <label className="block text-sm font-medium mb-2">Количество (шт) *</label>
            <input
              type="number"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Примечания */}
          <div>
            <label className="block text-sm font-medium mb-2">Примечания</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Дополнительная информация"
            />
          </div>
        </div>

        {/* Резюме операции */}
        {selectedPart && quantity > 0 && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Резюме операции</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-zinc-400">Деталь</p>
                <p className="text-xl font-semibold">{selectedPart.cutting_type_code}</p>
                <p className="text-xs text-zinc-500">{selectedPart.cutting_type_name}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Доступно на складе</p>
                <p className="text-xl font-semibold">{selectedPart.balance} шт</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">К печати</p>
                <p className="text-xl font-semibold">{quantity} шт</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Остаток после печати</p>
                <p className={`text-xl font-semibold ${selectedPart.balance - quantity < 0 ? 'text-red-500' : 'text-green-400'}`}>
                  {selectedPart.balance - quantity} шт
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Кнопка */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? 'Проведение...' : 'Провести операцию'}
          </button>
        </div>
      </form>
    </div>
  );
}
