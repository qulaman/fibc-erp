'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Target, ArrowLeft, ArrowRight, Package, Cable, Grid3x3, Layers,
  Ribbon, Scissors, Spool, FlaskConical, CheckCircle2, AlertTriangle,
  Calendar, Save
} from "lucide-react";
import Link from 'next/link';
import {
  calculateBigBagWeight,
  calculateProductionNeeds,
  type BigBagParams,
  type TkanSpec,
  type StropSpec,
  type ProductionCalculation,
} from '@/lib/bigbag-calculator';

const DEPT_STYLES: Record<string, { color: string; border: string; icon: any }> = {
  'Сырьё': { color: 'from-red-600 to-red-700', border: 'border-red-800', icon: FlaskConical },
  'Экструзия': { color: 'from-red-700 to-red-800', border: 'border-red-900', icon: Cable },
  'Ткачество': { color: 'from-amber-600 to-amber-700', border: 'border-amber-800', icon: Grid3x3 },
  'Ламинация': { color: 'from-orange-600 to-orange-700', border: 'border-orange-800', icon: Layers },
  'Стропы': { color: 'from-blue-600 to-blue-700', border: 'border-blue-800', icon: Ribbon },
  'Крой': { color: 'from-teal-600 to-teal-700', border: 'border-teal-800', icon: Scissors },
  'Пошив': { color: 'from-pink-600 to-pink-700', border: 'border-pink-800', icon: Spool },
  'Дополнительно': { color: 'from-cyan-600 to-cyan-700', border: 'border-cyan-800', icon: Package },
};

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // --- Тип продукции ---
  const [productType, setProductType] = useState<'bigbag_4strap' | 'bigbag_2strap'>('bigbag_4strap');
  const is2Strap = productType === 'bigbag_2strap';

  // --- Шаг 1: Заказ ---
  const [quantity, setQuantity] = useState(100);
  const [customerName, setCustomerName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Средний');

  // --- Шаг 2: Параметры ---
  const [height, setHeight] = useState(140);
  const [width, setWidth] = useState(90);
  const [bottomSize, setBottomSize] = useState(95);
  const [auxDensity, setAuxDensity] = useState(95);
  const [topType, setTopType] = useState<'spout' | 'skirt' | 'open'>('spout');
  const [topSpoutDia, setTopSpoutDia] = useState(40);
  const [topSpoutHeight, setTopSpoutHeight] = useState(48);
  const [skirtHeight, setSkirtHeight] = useState(80);
  const [hasBottomSpout, setHasBottomSpout] = useState(true);
  const [bottomSpoutDia, setBottomSpoutDia] = useState(40);
  const [bottomSpoutHeight, setBottomSpoutHeight] = useState(48);
  const [tieWeightPerM, setTieWeightPerM] = useState(10);
  const [tieLength, setTieLength] = useState(150);
  const [needsLamination, setNeedsLamination] = useState(false);

  // Дополнительно
  const [hasPeLiner, setHasPeLiner] = useState(false);
  const [peLinerLength, setPeLinerLength] = useState(200);
  const [peLinerWidth, setPeLinerWidth] = useState(100);
  const [peLinerDensity, setPeLinerDensity] = useState(100);
  const [hasPrinting, setHasPrinting] = useState(false);
  const [hasDocPocket, setHasDocPocket] = useState(false);

  // --- Шаг 3: Стропы + Ткань ---
  const [strapRatioType, setStrapRatioType] = useState<'1/3' | '2/3'>('2/3');
  const [strapLoopHeight, setStrapLoopHeight] = useState(25);
  const [threadWeightPerCm, setThreadWeightPerCm] = useState(0.077);

  // Справочники
  const [tkanSpecs, setTkanSpecs] = useState<TkanSpec[]>([]);
  const [stropSpecs, setStropSpecs] = useState<StropSpec[]>([]);
  const [selectedTkanSpec, setSelectedTkanSpec] = useState<TkanSpec | null>(null);
  const [selectedStropSpec, setSelectedStropSpec] = useState<StropSpec | null>(null);

  // Результат
  const [calculation, setCalculation] = useState<ProductionCalculation | null>(null);

  useEffect(() => {
    fetchSpecs();
  }, []);

  const fetchSpecs = async () => {
    const [tkanRes, stropRes] = await Promise.all([
      supabase.from('tkan_specifications').select('*').order('nazvanie_tkani'),
      supabase.from('strop_specifications').select('*').order('nazvanie'),
    ]);
    if (tkanRes.data) {
      setTkanSpecs(tkanRes.data);
      if (tkanRes.data.length > 0) setSelectedTkanSpec(tkanRes.data[0]);
    }
    if (stropRes.data) {
      setStropSpecs(stropRes.data);
      if (stropRes.data.length > 0) setSelectedStropSpec(stropRes.data[0]);
    }
  };

  const handleCalculate = () => {
    if (!selectedTkanSpec) {
      toast.error('Выберите спецификацию ткани');
      return;
    }
    if (!is2Strap && !selectedStropSpec) {
      toast.error('Выберите спецификацию стропы');
      return;
    }
    const params: BigBagParams = {
      productType,
      height, width, bottomSize: is2Strap ? width : bottomSize,
      mainDensity: selectedTkanSpec.plotnost_polotna_gr_m2,
      auxDensity,
      topType, topSpoutDia, topSpoutHeight, skirtHeight,
      hasBottomSpout,
      bottomSpoutDia, bottomSpoutHeight,
      tieWeightPerM, tieLength,
      strapRatioType,
      strapWeightPerM: selectedStropSpec?.plotnost_gr_mp || 0,
      strapLoopHeight,
      threadWeightPerCm,
      needsLamination,
      hasPeLiner, peLinerLength, peLinerWidth, peLinerDensity,
      hasPrinting, hasDocPocket,
    };
    const result = calculateProductionNeeds(params, quantity, selectedTkanSpec, is2Strap ? null : selectedStropSpec);
    setCalculation(result);
    setStep(4);
  };

  const handleCreateOrder = async () => {
    if (!calculation || !selectedTkanSpec) return;
    if (!is2Strap && !selectedStropSpec) return;
    setSaving(true);

    try {
      // Генерация номера
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `ПЛН-${dateStr}-${rand}`;

      const params = {
        productType,
        height, width, bottomSize: is2Strap ? width : bottomSize,
        mainDensity: selectedTkanSpec.plotnost_polotna_gr_m2,
        auxDensity, topType, topSpoutDia, topSpoutHeight, skirtHeight,
        hasBottomSpout,
        bottomSpoutDia, bottomSpoutHeight,
        tieWeightPerM, tieLength, strapRatioType,
        strapWeightPerM: selectedStropSpec?.plotnost_gr_mp || 0,
        strapLoopHeight, threadWeightPerCm, needsLamination,
        hasPeLiner, peLinerLength, peLinerWidth, peLinerDensity,
        hasPrinting, hasDocPocket,
        tkanSpecName: selectedTkanSpec.nazvanie_tkani,
        stropSpecName: selectedStropSpec?.nazvanie || null,
      };

      // 1. Сохранить заказ
      const { data: order, error: orderErr } = await supabase
        .from('production_orders')
        .insert({
          order_number: orderNumber,
          product_type: productType,
          quantity,
          status: 'confirmed',
          priority,
          deadline: deadline || null,
          customer_name: customerName || null,
          params,
          calculation: calculation,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Создать задания по цехам
      for (const dept of calculation.departments) {
        // Первый элемент — всегда основной итоговый показатель цеха
        const mainItem = dept.items[0];

        // Задание в production_order_tasks
        await supabase.from('production_order_tasks').insert({
          order_id: order.id,
          department: dept.department,
          task_description: dept.description,
          required_quantity: mainItem?.quantity || 0,
          required_unit: mainItem?.unit || 'шт',
        });

        // Задание в tasks_from_management
        const itemsList = dept.items.map(i => `${i.name}: ${i.quantity} ${i.unit}`).join(', ');
        await supabase.from('tasks_from_management').insert({
          department: dept.department === 'Сырьё' ? 'Офис' : dept.department,
          task_description: `[${orderNumber}] ${dept.description}. Потребность: ${itemsList}`,
          deadline: deadline || null,
          status: 'Новая',
          priority: priority === 'Высокий' ? 'Высокий' : priority === 'Низкий' ? 'Низкий' : 'Средний',
        });
      }

      toast.success('Заказ создан', { description: orderNumber });
      router.push(`/planning/${order.id}`);
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/planning">
            <Button variant="outline" size="icon" className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Target size={24} className="text-white" />
              </div>
              Новый заказ
            </h1>
            <p className="text-zinc-500 mt-1">Шаг {step} из 4</p>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2 mb-8">
        {['Заказ', 'Параметры', 'Ткань и стропы', 'Расчёт'].map((name, i) => (
          <button
            key={name}
            onClick={() => i + 1 < step ? setStep(i + 1) : null}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              i + 1 === step
                ? 'bg-indigo-600 text-white'
                : i + 1 < step
                  ? 'bg-indigo-900/40 text-indigo-300 cursor-pointer hover:bg-indigo-900/60'
                  : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* STEP 1: Заказ */}
      {step === 1 && (
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package size={20} className="text-indigo-400" />
              Параметры заказа
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-sm">Количество (шт)</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="bg-zinc-800 border-zinc-700 text-white text-2xl font-bold h-14 mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400 text-sm">Заказчик</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Название компании"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Дедлайн</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 text-sm mb-2 block">Приоритет</Label>
                <div className="flex gap-2">
                  {['Высокий', 'Средний', 'Низкий'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                        priority === p
                          ? p === 'Высокий' ? 'bg-red-600 text-white' : p === 'Средний' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 text-sm mb-2 block">Тип продукции</Label>
                <div className="flex gap-2">
                  {([
                    { value: 'bigbag_4strap' as const, label: '4х стропный Биг-Бэг' },
                    { value: 'bigbag_2strap' as const, label: '2х стропный Биг-Бэг' },
                  ]).map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => {
                        setProductType(pt.value);
                        // Установить дефолты для 2х стропного
                        if (pt.value === 'bigbag_2strap') {
                          setStrapLoopHeight(50);
                        } else {
                          setStrapLoopHeight(25);
                        }
                      }}
                      className={`flex-1 py-4 rounded-lg font-bold border-2 transition-all ${
                        productType === pt.value
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                  <button className="flex-1 py-4 rounded-lg font-medium bg-zinc-800 text-zinc-500 border-2 border-zinc-700 cursor-not-allowed" disabled>
                    Вкладыш (скоро)
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Button
            onClick={() => setStep(2)}
            disabled={quantity <= 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-lg"
          >
            Далее <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 2: Параметры ББ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Габариты */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-lg font-bold mb-4">Габариты (см)</h2>
            <div className={`grid ${is2Strap ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
              <div>
                <Label className="text-zinc-400 text-sm">Высота</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
                  className="bg-zinc-800 border-zinc-700 text-white text-lg font-bold mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Ширина</Label>
                <Input type="number" value={width} onChange={(e) => {
                  setWidth(Number(e.target.value));
                  // Сбросить выбор ткани если ширина изменилась (ткань должна соответствовать ширине мешка)
                  if (selectedTkanSpec && selectedTkanSpec.shirina_polotna_sm !== Number(e.target.value)) {
                    setSelectedTkanSpec(null);
                  }
                  if (is2Strap) {
                    setBottomSize(Number(e.target.value)); // дно = ширина для 2х стропного
                  } else {
                    setBottomSize(Number(e.target.value) + 5);
                  }
                }}
                  className="bg-zinc-800 border-zinc-700 text-white text-lg font-bold mt-1" />
              </div>
              {!is2Strap && (
                <div>
                  <Label className="text-zinc-400 text-sm">Дно</Label>
                  <Input type="number" value={bottomSize} onChange={(e) => setBottomSize(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white text-lg font-bold mt-1" />
                </div>
              )}
            </div>
            {is2Strap && (
              <div className="mt-3">
                <div>
                  <Label className="text-zinc-400 text-sm">Высота петли (см)</Label>
                  <Input type="number" value={strapLoopHeight} onChange={(e) => setStrapLoopHeight(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1 w-24" />
                </div>
              </div>
            )}
          </Card>

          {/* Верх */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-lg font-bold mb-4">Конструкция верха</h2>
            <div className="flex gap-2 mb-4">
              {([['spout', 'Люк'], ['skirt', 'Юбка'], ['open', 'Открытый']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setTopType(val)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    topType === val ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {topType === 'spout' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400 text-sm">Диаметр люка (см)</Label>
                  <Input type="number" value={topSpoutDia} onChange={(e) => setTopSpoutDia(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Высота люка (см)</Label>
                  <Input type="number" value={topSpoutHeight} onChange={(e) => setTopSpoutHeight(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
              </div>
            )}
            {topType === 'skirt' && (
              <div>
                <Label className="text-zinc-400 text-sm">Высота юбки (см)</Label>
                <Input type="number" value={skirtHeight} onChange={(e) => setSkirtHeight(Number(e.target.value))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1" />
              </div>
            )}
          </Card>

          {/* Конструкция низа */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-lg font-bold mb-4">Конструкция низа</h2>
            {is2Strap ? (
              <>
                <div className="flex gap-2 mb-4">
                  {([
                    { value: false, label: 'Дно звезда' },
                    { value: true, label: 'Разгрузочный люк' },
                  ]).map((opt) => (
                    <button key={String(opt.value)} onClick={() => setHasBottomSpout(opt.value)}
                      className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                        hasBottomSpout === opt.value ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {!hasBottomSpout && (
                  <div className="px-3 py-2 rounded-lg bg-amber-900/20 text-amber-400 text-sm">
                    Дно: звезда ({bottomSize}×{bottomSize} см) — складывается из рукава
                  </div>
                )}
                {hasBottomSpout && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400 text-sm">Диаметр (см)</Label>
                      <Input type="number" value={bottomSpoutDia} onChange={(e) => setBottomSpoutDia(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Высота (см)</Label>
                      <Input type="number" value={bottomSpoutHeight} onChange={(e) => setBottomSpoutHeight(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-300">Нижний люк</span>
                  <button onClick={() => setHasBottomSpout(!hasBottomSpout)}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      hasBottomSpout ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                    {hasBottomSpout ? 'Да' : 'Нет'}
                  </button>
                </div>
                {hasBottomSpout && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400 text-sm">Диаметр (см)</Label>
                      <Input type="number" value={bottomSpoutDia} onChange={(e) => setBottomSpoutDia(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Высота (см)</Label>
                      <Input type="number" value={bottomSpoutHeight} onChange={(e) => setBottomSpoutHeight(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Ламинация */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Ламинация</h2>
              <button onClick={() => setNeedsLamination(!needsLamination)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  needsLamination ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                {needsLamination ? 'Да' : 'Нет'}
              </button>
            </div>
          </Card>

          {/* ПЭ вкладыш */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">ПЭ вкладыш</h2>
              <button onClick={() => setHasPeLiner(!hasPeLiner)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  hasPeLiner ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                {hasPeLiner ? 'Да' : 'Нет'}
              </button>
            </div>
            {hasPeLiner && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-zinc-400 text-sm">Длина (см)</Label>
                  <Input type="number" value={peLinerLength} onChange={(e) => setPeLinerLength(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Ширина (см)</Label>
                  <Input type="number" value={peLinerWidth} onChange={(e) => setPeLinerWidth(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Плотность (мкм)</Label>
                  <Input type="number" value={peLinerDensity} onChange={(e) => setPeLinerDensity(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
              </div>
            )}
          </Card>

          {/* Печать и карман для документов */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-300">Печать</span>
              <button onClick={() => setHasPrinting(!hasPrinting)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  hasPrinting ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                {hasPrinting ? 'Да' : 'Нет'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Карман для документов</span>
              <button onClick={() => setHasDocPocket(!hasDocPocket)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  hasDocPocket ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                {hasDocPocket ? 'Да' : 'Нет'}
              </button>
            </div>
          </Card>

          {/* Доп. параметры — только если юбка или люк */}
          {(topType === 'skirt' || topType === 'spout' || hasBottomSpout) && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h2 className="text-lg font-bold mb-4">Дополнительно</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {topType === 'skirt' && (
                  <div>
                    <Label className="text-zinc-400 text-sm">Плотность ткани юбки (г/м²)</Label>
                    <Input type="number" value={auxDensity} onChange={(e) => setAuxDensity(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                  </div>
                )}
                {(topType === 'spout' || topType === 'skirt' || hasBottomSpout) && (
                  <>
                    <div>
                      <Label className="text-zinc-400 text-sm">Вес завязки (г/м)</Label>
                      <Input type="number" value={tieWeightPerM} onChange={(e) => setTieWeightPerM(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Длина завязки (см)</Label>
                      <Input type="number" value={tieLength} onChange={(e) => setTieLength(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={() => setStep(1)} variant="outline"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 py-6">
              <ArrowLeft size={20} className="mr-2" /> Назад
            </Button>
            <Button onClick={() => setStep(3)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-lg">
              Далее <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Ткань и Стропы */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Спецификация ткани */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Grid3x3 size={20} className="text-amber-400" />
              Спецификация ткани
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const matchingSpecs = tkanSpecs.filter(spec => spec.shirina_polotna_sm === width);
                if (matchingSpecs.length === 0) {
                  return (
                    <div className="col-span-full p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                      Нет тканей с шириной {width} см. Доступные ширины:{' '}
                      {[...new Set(tkanSpecs.map(s => s.shirina_polotna_sm))].sort((a, b) => a - b).join(', ')} см.
                      Измените ширину мешка или добавьте ткань нужной ширины.
                    </div>
                  );
                }
                return matchingSpecs.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => setSelectedTkanSpec(spec)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTkanSpec?.id === spec.id
                        ? 'bg-amber-900/30 border-amber-600 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <div className="font-bold text-sm">{spec.nazvanie_tkani}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {spec.plotnost_polotna_gr_m2} г/м² · {spec.shirina_polotna_sm} см
                    </div>
                  </button>
                ));
              })()}
            </div>
          </Card>

          {/* Спецификация стропы (только 4х стропный) */}
          {!is2Strap && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Ribbon size={20} className="text-blue-400" />
                Спецификация стропы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stropSpecs.map((spec, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedStropSpec(spec)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStropSpec?.nazvanie === spec.nazvanie
                        ? 'bg-blue-900/30 border-blue-600 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <div className="font-bold text-sm">{spec.nazvanie}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {spec.shirina_mm}мм · {spec.plotnost_gr_mp} г/м · {spec.osnova_nit_type === 'МФН' ? '100% МФН' : 'ПП+МФН'}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Параметры строп (только 4х стропный) */}
          {!is2Strap ? (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h2 className="text-lg font-bold mb-4">Параметры строп</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-sm mb-2 block">Тип пришива</Label>
                  <div className="flex gap-2">
                    {(['2/3', '1/3'] as const).map((val) => (
                      <button key={val} onClick={() => setStrapRatioType(val)}
                        className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                          strapRatioType === val ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}>
                        {val} высоты
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-sm">Высота петли (см)</Label>
                    <Input type="number" value={strapLoopHeight} onChange={(e) => setStrapLoopHeight(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Нить (г/см шва)</Label>
                    <Input type="number" step="0.001" value={threadWeightPerCm} onChange={(e) => setThreadWeightPerCm(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h2 className="text-lg font-bold mb-4">Параметры 2х стропного</h2>
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-lg bg-blue-900/20 text-blue-300 text-sm">
                  Стропы: петли через чехлы (2 шт × 30×30 см), пришивные ленты не используются
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-sm">Нить (г/см шва)</Label>
                    <Input type="number" step="0.001" value={threadWeightPerCm} onChange={(e) => setThreadWeightPerCm(Number(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={() => setStep(2)} variant="outline"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 py-6">
              <ArrowLeft size={20} className="mr-2" /> Назад
            </Button>
            <Button onClick={handleCalculate}
              disabled={!selectedTkanSpec || (!is2Strap && !selectedStropSpec)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg">
              Рассчитать
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Результат */}
      {step === 4 && calculation && (
        <div className="space-y-6">
          {/* Сводка заказа */}
          <Card className="bg-gradient-to-r from-indigo-900/40 to-indigo-950/40 border-indigo-800 border-2 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-indigo-300 text-sm">{is2Strap ? '2х стропный Биг-Бэг' : '4х стропный Биг-Бэг'}</p>
                <p className="text-4xl font-bold text-white">{quantity} шт</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-300 text-sm">Вес 1 шт</p>
                <p className="text-3xl font-bold text-indigo-300">{calculation.unitWeight.total_kg} кг</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-300 text-sm">Общий вес</p>
                <p className="text-3xl font-bold text-white">
                  {(calculation.unitWeight.total_kg * quantity).toFixed(1)} кг
                </p>
              </div>
            </div>
          </Card>

          {/* Детальный расчёт веса 1 изделия */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-400 uppercase">Расчёт веса 1 изделия</h3>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                  K_осн: {(selectedTkanSpec?.plotnost_polotna_gr_m2 || 0) / 10000}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded">
                  K_всп: {auxDensity / 10000}
                </span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase">
                <tr>
                  <th className="p-3 text-left pl-6">Компонент</th>
                  <th className="p-3 text-left">Формула</th>
                  <th className="p-3 text-right pr-6">Граммы</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { label: 'Тело (рукав)', formula: calculation.unitWeight.formulas.body, value: calculation.unitWeight.body_g, show: true },
                  { label: (is2Strap && !hasBottomSpout) ? 'Дно (звезда)' : 'Дно', formula: calculation.unitWeight.formulas.bottom, value: calculation.unitWeight.bottom_g, show: true },
                  { label: topType === 'spout' ? 'Люк (верх)' : 'Юбка', formula: calculation.unitWeight.formulas.top, value: calculation.unitWeight.top_g, show: calculation.unitWeight.top_g > 0, color: 'emerald' },
                  { label: 'Люк (низ)', formula: calculation.unitWeight.formulas.bottomSpout, value: calculation.unitWeight.bottomSpout_g, show: calculation.unitWeight.bottomSpout_g > 0, color: 'emerald' },
                  { label: 'Завязки', formula: calculation.unitWeight.formulas.ties, value: calculation.unitWeight.ties_g, show: calculation.unitWeight.ties_g > 0, color: 'amber' },
                  { label: 'Стропа (4 шт)', formula: calculation.unitWeight.formulas.straps, value: calculation.unitWeight.straps_g, show: !is2Strap, color: 'blue' },
                  { label: 'Чехол стропы (2 шт)', formula: calculation.unitWeight.formulas.strapSleeve, value: calculation.unitWeight.strapSleeve_g, show: is2Strap, color: 'blue' },
                  { label: 'Узкая лента', formula: calculation.unitWeight.formulas.narrowRibbon, value: calculation.unitWeight.narrowRibbon_g, show: true, color: 'amber' },
                  { label: 'Инф. карман', formula: calculation.unitWeight.formulas.infoPocket, value: calculation.unitWeight.infoPocket_g, show: true, color: 'amber' },
                  { label: 'ПЭ вкладыш', formula: calculation.unitWeight.formulas.peLiner, value: calculation.unitWeight.peLiner_g, show: calculation.unitWeight.peLiner_g > 0, color: 'cyan' },
                ].filter(r => r.show).map((row) => (
                  <tr key={row.label} className={row.color ? `bg-${row.color}-900/10` : ''}>
                    <td className="p-3 pl-6 font-bold text-white">{row.label}</td>
                    <td className="p-3 text-zinc-500 font-mono text-xs">{row.formula}</td>
                    <td className="p-3 text-right pr-6 font-bold text-white">{row.value.toFixed(1)}</td>
                  </tr>
                ))}
                {/* Нить — с деталями швов */}
                <tr className="bg-pink-900/10">
                  <td className="p-3 pl-6 font-bold text-white">Нить (швы)</td>
                  <td className="p-3 text-zinc-500 font-mono text-xs">
                    <div className="whitespace-pre-line text-[10px] text-zinc-600 mb-1">{calculation.unitWeight.formulas.threadDetails}</div>
                    <div>{calculation.unitWeight.formulas.thread}</div>
                  </td>
                  <td className="p-3 text-right pr-6 font-bold text-white">{calculation.unitWeight.thread_g.toFixed(1)}</td>
                </tr>
                {/* ИТОГО */}
                <tr className="bg-red-900/20 border-t-2 border-red-800">
                  <td className="p-3 pl-6 font-bold text-red-400 text-base" colSpan={2}>ИТОГО</td>
                  <td className="p-3 text-right pr-6 font-bold text-red-400 text-lg">
                    {calculation.unitWeight.total_g.toFixed(1)} г = {calculation.unitWeight.total_kg} кг
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Потребности по цехам */}
          <h2 className="text-xl font-bold mt-8 mb-4">Потребности по цехам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculation.departments.map((dept) => {
              const style = DEPT_STYLES[dept.department] || { color: 'from-zinc-600 to-zinc-700', border: 'border-zinc-800', icon: Package };
              const Icon = style.icon;
              return (
                <Card key={dept.department}
                  className={`bg-gradient-to-br ${style.color} border-2 ${style.border} overflow-hidden relative`}>
                  <div className="absolute top-0 right-0 opacity-10">
                    <Icon size={100} />
                  </div>
                  <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon size={20} className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white">{dept.department}</h3>
                    </div>
                    <p className="text-white/70 text-xs mb-3">{dept.description}</p>
                    <div className="space-y-1.5">
                      {dept.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-white/80 text-sm">{item.name}</span>
                          <span className="text-white font-bold">
                            {item.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 mt-8">
            <Button onClick={() => setStep(3)} variant="outline"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 py-6">
              <ArrowLeft size={20} className="mr-2" /> Изменить
            </Button>
            <Button onClick={handleCreateOrder} disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg">
              <Save size={20} className="mr-2" />
              {saving ? 'Создание...' : 'Создать заказ и задания'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
