'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import {
  Scissors, Users, Package, CheckCircle2, Sun, Moon,
  AlertTriangle, Save, Layers, Ribbon
} from "lucide-react";

interface CuttingType {
  id: string;
  code: string;
  category: string;
  name: string;
  material_type: string;
  width_cm: number | null;
  length_cm: number | null;
  consumption_cm: number;
  weight_g: number | null;
}

interface Material {
  id?: string;
  roll_number: string;
  material_code: string;
  material_name?: string;
  material_type: string;
  balance_m: number;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

export default function ProductionCuttingPage() {
  const [materialCategory, setMaterialCategory] = useState<'fabric' | 'strap'>('fabric');
  const [shift, setShift] = useState<'День' | 'Ночь'>('День');
  const [operator, setOperator] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [operators, setOperators] = useState<Employee[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedCuttingType, setSelectedCuttingType] = useState<CuttingType | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [waste, setWaste] = useState<number>(0);

  const [sizeMode, setSizeMode] = useState<'catalog' | 'custom'>('catalog');
  const [customWidth, setCustomWidth] = useState('');
  const [customLength, setCustomLength] = useState('');
  const [customConsumption, setCustomConsumption] = useState('');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [cuttingTypes, setCuttingTypes] = useState<CuttingType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOperators = async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('role', 'operator_cutting')
        .eq('is_active', true)
        .order('full_name');
      if (data) setOperators(data);
    };
    fetchOperators();
  }, []);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        let data: Material[] = [];

        if (materialCategory === 'fabric') {
          // VIEW: рулоны ткани в крое
          const { data: cuttingRolls, error: cuttingErr } = await supabase
            .from('cutting_rolls_available')
            .select('*');
          const fabricData = (cuttingRolls || []).map(r => ({
            id: r.id,
            roll_number: r.roll_number || '',
            material_code: r.fabric_code || '',
            material_name: r.fabric_name || '',
            material_type: 'Ткань',
            balance_m: r.balance_m || 0
          }));

          // Ламинированные рулоны в крое
          const { data: laminatedRolls, error: lamErr } = await supabase
            .from('laminated_rolls')
            .select('*')
            .eq('status', 'available')
            .eq('location', 'cutting');
          const laminatedData = (laminatedRolls || []).map(r => ({
            id: r.id,
            roll_number: r.roll_number || '',
            material_code: r.material_code || '',
            material_type: 'Ламинат',
            balance_m: r.length || r.weight || 0  // fallback на weight если length = 0
          }));
          data = [...fabricData, ...laminatedData];
        } else {
          const { data: straps } = await supabase
            .from('straps_warehouse')
            .select('*, strap_types(code, name), production_straps(spec_name)')
            .eq('status', 'available');

          data = (straps || []).map(s => {
            const strapType = (s.strap_types as any);
            const prod = (s.production_straps as any);
            const displayName = strapType?.name || prod?.spec_name || '';
            const displayCode = strapType?.code || prod?.spec_name || '';
            return {
              id: s.id,
              roll_number: s.roll_number || '',
              material_code: displayCode,
              material_name: displayName,
              material_type: 'Стропа',
              balance_m: s.length || 0
            };
          });
        }

        setMaterials(data.filter(m => m.balance_m > 0));
        setSelectedMaterial(null);
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    };

    fetchMaterials();
  }, [materialCategory]);

  useEffect(() => {
    const fetchCuttingTypes = async () => {
      try {
        const { data } = await supabase
          .from('cutting_types')
          .select('*')
          .eq('status', 'Активно');

        const filtered = (data || []).filter(ct => {
          if (materialCategory === 'fabric') {
            return ['Ткань', 'Ткань/Ламинат', 'Ламинат'].includes(ct.material_type);
          } else {
            return ct.material_type === 'Стропа';
          }
        });

        setCuttingTypes(filtered);
        setSelectedCuttingType(null);
      } catch (err) {
        console.error('Error fetching cutting types:', err);
      }
    };

    fetchCuttingTypes();
  }, [materialCategory]);

  // Расчёты
  const effectiveConsumption = sizeMode === 'catalog'
    ? (selectedCuttingType ? selectedCuttingType.consumption_cm : 0)
    : (customConsumption ? parseFloat(customConsumption) : 0);

  const calculatedConsumption = (effectiveConsumption * quantity) / 100;
  const totalUsed = calculatedConsumption + waste;
  const totalWeight = selectedCuttingType?.weight_g
    ? (selectedCuttingType.weight_g * quantity) / 1000
    : 0;

  // Проверка заполненности
  const missingFields = [];
  if (!operatorId) missingFields.push('Выберите оператора');
  if (!selectedMaterial) missingFields.push('Выберите материал');
  if (sizeMode === 'catalog' && !selectedCuttingType) missingFields.push('Выберите тип детали');
  if (sizeMode === 'custom' && !customLength) missingFields.push('Укажите длину детали');
  if (sizeMode === 'custom' && !customConsumption) missingFields.push('Укажите расход на деталь');
  if (quantity <= 0) missingFields.push('Укажите количество');

  const handleSubmit = async () => {
    if (missingFields.length > 0) {
      toast.warning('Заполните обязательные поля');
      return;
    }
    if (totalUsed > (selectedMaterial?.balance_m || 0)) {
      toast.error(`Недостаточно материала. Доступно: ${selectedMaterial?.balance_m.toFixed(2)} м`);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      const { data: lastDoc } = await supabase
        .from('production_cutting')
        .select('doc_number')
        .like('doc_number', `ПРВ-${dateStr}-%`)
        .order('doc_number', { ascending: false })
        .limit(1);

      const lastNum = lastDoc && lastDoc.length > 0
        ? parseInt(lastDoc[0].doc_number.split('-')[2])
        : 0;
      const docNumber = `ПРВ-${dateStr}-${String(lastNum + 1).padStart(4, '0')}`;

      const cuttingTypeCategory = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.category : 'Произвольный';
      const cuttingTypeCode = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.code : 'CUSTOM';
      const cuttingTypeName = sizeMode === 'catalog' && selectedCuttingType ? selectedCuttingType.name : 'Произвольные размеры';

      const { data: prodData, error: prodError } = await supabase
        .from('production_cutting')
        .insert({
          doc_number: docNumber,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          shift,
          operator,
          operator_id: operatorId || null,
          roll_number: selectedMaterial!.roll_number,
          roll_id: selectedMaterial!.material_type === 'Ткань' ? (selectedMaterial!.id || null) : null,
          material_type: selectedMaterial!.material_type,
          material_code: selectedMaterial!.material_code,
          total_used_m: totalUsed,
          cutting_type_category: cuttingTypeCategory,
          cutting_type_code: cuttingTypeCode,
          cutting_type_name: cuttingTypeName,
          quantity,
          consumption_m: calculatedConsumption,
          waste_m: waste,
          total_weight_kg: totalWeight,
          is_custom_size: sizeMode === 'custom',
          status: 'Проведено'
        })
        .select()
        .single();

      if (prodError) throw prodError;

      if (sizeMode === 'custom' && prodData) {
        await supabase.from('custom_cutting_sizes').insert({
          production_cutting_id: prodData.id,
          width_cm: customWidth ? parseFloat(customWidth) : null,
          length_cm: parseFloat(customLength),
          consumption_cm: parseFloat(customConsumption)
        });
      }

      await supabase.from('cutting_parts_warehouse').insert({
        doc_number: docNumber,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        operation: 'Приход',
        cutting_type_code: cuttingTypeCode,
        cutting_type_name: cuttingTypeName,
        category: cuttingTypeCategory,
        quantity,
        source_number: selectedMaterial!.roll_number,
        operator,
        status: 'Проведено'
      });

      // Списание материала
      if (selectedMaterial!.material_type === 'Ткань') {
        const newLength = selectedMaterial!.balance_m - totalUsed;
        const { data: testRoll } = await supabase
          .from('weaving_rolls').select('location').eq('id', selectedMaterial!.id).single();
        const updateData: any = {
          total_length: newLength > 0 ? newLength : 0,
          status: newLength <= 0 ? 'used' : 'completed'
        };
        if (testRoll && 'location' in testRoll) {
          updateData.location = newLength <= 0 ? 'used' : 'cutting';
        }
        await supabase.from('weaving_rolls').update(updateData).eq('id', selectedMaterial!.id);
      } else if (selectedMaterial!.material_type === 'Ламинат') {
        const newLength = selectedMaterial!.balance_m - totalUsed;
        await supabase.from('laminated_rolls').update({
          length: newLength > 0 ? newLength : 0,
          status: newLength <= 0 ? 'used' : 'available',
          location: newLength <= 0 ? 'used' : 'cutting'
        }).eq('roll_number', selectedMaterial!.roll_number);
      } else {
        const newLength = selectedMaterial!.balance_m - totalUsed;
        await supabase.from('straps_warehouse').update({
          length: newLength > 0 ? newLength : 0,
          status: newLength <= 0 ? 'used' : 'available'
        }).eq('roll_number', selectedMaterial!.roll_number);
      }

      toast.success(`Операция кроя проведена! Документ: ${docNumber}`, {
        description: `${quantity} шт · ${totalUsed.toFixed(2)} м использовано`,
        duration: 4000
      });

      // Сброс формы
      setSelectedMaterial(null);
      setSelectedCuttingType(null);
      setQuantity(0);
      setWaste(0);
      setCustomWidth('');
      setCustomLength('');
      setCustomConsumption('');
    } catch (err: any) {
      toast.error('Ошибка при проведении операции: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header mb-6">
        <div>
          <h1 className="h1-bold">
            <div className="bg-teal-600 p-2 rounded-lg">
              <Scissors size={24} className="text-white" />
            </div>
            Цех Кроя
          </h1>
          <p className="text-zinc-500 mt-2">Раскрой ткани, ламината и строп на детали</p>
        </div>
        {/* Смена */}
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setShift('День')}
            className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
              shift === 'День' ? 'bg-yellow-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sun size={18} /> День
          </button>
          <button
            onClick={() => setShift('Ночь')}
            className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
              shift === 'Ночь' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Moon size={18} /> Ночь
          </button>
        </div>
      </div>

      {/* Предупреждение */}
      {missingFields.length > 0 && (
        <Card className="bg-card border-l-4 border-l-yellow-500 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle size={32} className="text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <div className="font-bold mb-2 text-yellow-400 text-lg">Заполните обязательные поля</div>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {missingFields.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="xl:col-span-5 space-y-6">

          {/* Оператор */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Users size={16} /> Оператор
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {operators.length === 0 && (
                  <p className="text-zinc-500 text-sm">Нет операторов кроя в справочнике</p>
                )}
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
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? 'bg-teal-600 border-teal-500 text-white shadow-lg scale-105 ring-2 ring-teal-500/50'
                          : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-white text-teal-600' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {initials}
                      </div>
                      <span>{emp.full_name}</span>
                      {isSelected && <CheckCircle2 size={16} />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Тип материала */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Package size={16} /> Тип материала
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMaterialCategory('fabric')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    materialCategory === 'fabric'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <Layers size={18} /> Ткань / Ламинат
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialCategory('strap')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    materialCategory === 'strap'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <Ribbon size={18} /> Стропа
                </button>
              </div>

              {/* Материалы */}
              <div>
                <Label className="text-zinc-400 mb-3 block">Выберите рулон *</Label>
                {materials.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-4 text-center">Нет доступных материалов</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {materials.map(m => {
                      const isSelected = selectedMaterial?.roll_number === m.roll_number;
                      return (
                        <button
                          key={m.roll_number || m.id}
                          type="button"
                          onClick={() => setSelectedMaterial(m)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-teal-600 border-teal-500 shadow-lg'
                              : 'bg-zinc-800 border-zinc-700 hover:border-teal-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                {isSelected && <CheckCircle2 size={14} />}
                                {m.material_type === 'Стропа'
                                  ? (m.material_name || m.material_code || m.roll_number || '—')
                                  : (m.roll_number || '—')
                                }
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  m.material_type === 'Ламинат' ? 'bg-orange-900/50 text-orange-300' :
                                  m.material_type === 'Стропа' ? 'bg-purple-900/50 text-purple-300' :
                                  'bg-blue-900/50 text-blue-300'
                                }`}>
                                  {m.material_type}
                                </span>
                              </div>
                              {m.material_type === 'Стропа' ? (
                                <div className="text-xs text-zinc-500 mt-1 font-mono">
                                  {m.roll_number}
                                </div>
                              ) : (m.material_name || m.material_code) && (
                                <div className="text-xs text-zinc-400 mt-1">
                                  {m.material_name || m.material_code}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white">{m.balance_m.toFixed(1)} м</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="xl:col-span-7 space-y-6">

          {/* Режим + Тип детали */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Scissors size={16} /> Тип кроя
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Переключатель режима */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setSizeMode('catalog'); setCustomWidth(''); setCustomLength(''); setCustomConsumption(''); }}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    sizeMode === 'catalog'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  Из справочника
                </button>
                <button
                  type="button"
                  onClick={() => { setSizeMode('custom'); setSelectedCuttingType(null); }}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    sizeMode === 'custom'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  Произвольные размеры
                </button>
              </div>

              {/* Справочник типов */}
              {sizeMode === 'catalog' && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cuttingTypes.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4 text-center">Нет типов деталей для этой категории</p>
                  ) : (
                    cuttingTypes.map(ct => {
                      const isSelected = selectedCuttingType?.code === ct.code;
                      return (
                        <button
                          key={ct.code}
                          type="button"
                          onClick={() => setSelectedCuttingType(ct)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-teal-600 border-teal-500 shadow-lg'
                              : 'bg-zinc-800 border-zinc-700 hover:border-teal-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                {isSelected && <CheckCircle2 size={14} />}
                                {ct.name}
                              </div>
                              <div className="text-xs text-zinc-400 mt-1">
                                {ct.code} · {ct.category}
                                {ct.width_cm && ct.length_cm ? ` · ${ct.length_cm}×${ct.width_cm} см` : ''}
                              </div>
                            </div>
                            <div className="text-right text-xs text-zinc-400">
                              <div>Расход: {ct.consumption_cm} см</div>
                              {ct.weight_g && <div>{ct.weight_g} г/шт</div>}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Произвольные размеры */}
              {sizeMode === 'custom' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div>
                    <Label className="text-zinc-400 text-sm mb-1 block">Длина (см) *</Label>
                    <Input
                      type="number"
                      value={customLength}
                      onChange={e => {
                        setCustomLength(e.target.value);
                        if (e.target.value) {
                          setCustomConsumption((parseFloat(e.target.value) + 3).toString());
                        }
                      }}
                      className="bg-zinc-950 border-zinc-600 text-white"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm mb-1 block">Ширина (см)</Label>
                    <Input
                      type="number"
                      value={customWidth}
                      onChange={e => setCustomWidth(e.target.value)}
                      className="bg-zinc-950 border-zinc-600 text-white"
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm mb-1 block">Расход (см) *</Label>
                    <Input
                      type="number"
                      value={customConsumption}
                      onChange={e => setCustomConsumption(e.target.value)}
                      className="bg-zinc-950 border-zinc-600 text-white"
                      placeholder="153"
                    />
                    <div className="text-xs text-zinc-500 mt-1">длина + 3 см запас</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Количество и отходы */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium uppercase tracking-wide">
                Параметры операции
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300 mb-2 block">Количество (шт) *</Label>
                  <Input
                    type="number"
                    value={quantity || ''}
                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                    className="h-14 text-3xl font-bold bg-zinc-950 border-zinc-700 text-white focus:border-teal-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 mb-2 block">Отходы (м)</Label>
                  <Input
                    type="number"
                    value={waste || ''}
                    onChange={e => setWaste(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    className="h-14 text-3xl font-bold bg-zinc-950 border-zinc-700 text-white focus:border-teal-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Расчёт */}
              {quantity > 0 && effectiveConsumption > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-teal-900/20 border border-teal-800/50 rounded-lg">
                  <div>
                    <div className="text-xs text-zinc-400">Расход на деталь</div>
                    <div className="text-lg font-bold text-white">{effectiveConsumption} см</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Расход материала</div>
                    <div className="text-lg font-bold text-teal-400">{calculatedConsumption.toFixed(2)} м</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Итого израсходовано</div>
                    <div className="text-lg font-bold text-white">{totalUsed.toFixed(2)} м</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Остаток рулона</div>
                    <div className={`text-lg font-bold ${
                      (selectedMaterial?.balance_m || 0) - totalUsed < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {selectedMaterial ? ((selectedMaterial.balance_m - totalUsed).toFixed(2)) : '—'} м
                    </div>
                  </div>
                </div>
              )}

              {/* Кнопка */}
              <Button
                onClick={handleSubmit}
                disabled={loading || missingFields.length > 0 || (totalUsed > (selectedMaterial?.balance_m || 0))}
                size="lg"
                className="w-full bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white font-bold text-lg px-12 py-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Save className="mr-2 h-5 w-5 animate-spin" />
                    Проведение...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Провести операцию кроя
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
