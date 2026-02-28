'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Layers, Users, Package, Trash2, Plus, CheckCircle2, Factory, Sun, Moon, User, AlertTriangle, Scale } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProcessedRoll {
  id: string;
  input_roll_id: string;
  input_roll_number: string;
  input_width_cm: number;
  input_weight_kg: number;
  output_roll_number: string;
  output_width_cm: number;
  output_weight_kg: number;
  notes?: string;
}

export default function LaminationInputPage() {
  const [loading, setLoading] = useState(false);
  const [showRollDialog, setShowRollDialog] = useState(false);

  // Справочники
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [availableRolls, setAvailableRolls] = useState<any[]>([]);

  // Форма смены
  const [shiftData, setShiftData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День',
    machine_id: '',
    operator1_id: '',
    operator2_id: '',
    operator3_id: '',
    waste_oploy_kg: '',
    waste_shift_kg: '',
    waste_trim_kg: '',
    notes: ''
  });

  // Дозаторы (сырье)
  const [dosators, setDosators] = useState(
    Array(4).fill({ material_id: '', weight: '' })
  );

  // Список обработанных рулонов за смену
  const [processedRolls, setProcessedRolls] = useState<ProcessedRoll[]>([]);

  // Форма добавления рулона
  const [rollForm, setRollForm] = useState({
    input_roll_id: '',
    input_width_cm: '',
    input_weight_kg: '',
    output_roll_number: '',
    output_width_cm: '',
    output_weight_kg: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Ламинаторы
    const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'lamination');
    // 2. Операторы ламинации
    const { data: emp } = await supabase.from('employees').select('*').eq('role', 'operator_lamination').eq('is_active', true).order('full_name');
    // 3. Сырье (Гранулы)
    const { data: mat } = await supabase.from('raw_materials').select('*').contains('departments', ['lamination']).order('name');
    // 4. Доступные рулоны с ткачества
    const { data: rolls } = await supabase
      .from('weaving_rolls')
      .select('*, tkan_specifications(nazvanie_tkani, kod_tkani, shirina_polotna_sm)')
      .eq('status', 'completed')
      .eq('location', 'weaving')
      .order('created_at', { ascending: false });

    if (mach) setMachines(mach);
    if (emp) setOperators(emp);
    if (mat) setMaterials(mat);
    if (rolls) setAvailableRolls(rolls);
  };

  const updateDosator = (index: number, field: string, value: string) => {
    const newDosators = [...dosators];
    // @ts-ignore
    newDosators[index] = { ...newDosators[index], [field]: value };
    setDosators(newDosators);
  };

  const handleAddRoll = () => {
    if (!rollForm.input_roll_id || !rollForm.input_weight_kg || !rollForm.output_weight_kg) {
      toast.warning('Заполните обязательные поля рулона');
      return;
    }

    const selectedRoll = availableRolls.find(r => r.id === rollForm.input_roll_id);
    if (!selectedRoll) return;

    const newRoll: ProcessedRoll = {
      id: Math.random().toString(36).substr(2, 9),
      input_roll_id: rollForm.input_roll_id,
      input_roll_number: selectedRoll.roll_number,
      input_width_cm: Number(rollForm.input_width_cm) || selectedRoll.tkan_specifications?.shirina_polotna_sm || 0,
      input_weight_kg: Number(rollForm.input_weight_kg),
      output_roll_number: rollForm.output_roll_number || `${selectedRoll.roll_number}-LAM`,
      output_width_cm: Number(rollForm.output_width_cm) || Number(rollForm.input_width_cm) || selectedRoll.tkan_specifications?.shirina_polotna_sm || 0,
      output_weight_kg: Number(rollForm.output_weight_kg),
      notes: rollForm.notes
    };

    setProcessedRolls([...processedRolls, newRoll]);
    setRollForm({
      input_roll_id: '',
      input_width_cm: '',
      input_weight_kg: '',
      output_roll_number: '',
      output_width_cm: '',
      output_weight_kg: '',
      notes: ''
    });
    setShowRollDialog(false);
    toast.success('Рулон добавлен');
  };

  const handleRemoveRoll = (id: string) => {
    setProcessedRolls(processedRolls.filter(r => r.id !== id));
    toast.success('Рулон удален');
  };

  const handleSubmitShift = async () => {
    if (!shiftData.machine_id || !shiftData.operator1_id || processedRolls.length === 0) {
      toast.warning('Заполните обязательные поля (машина, мин. 1 оператор, мин. 1 рулон)');
      return;
    }

    setLoading(true);

    try {
      const activeDosators = dosators.filter(d => d.material_id && Number(d.weight) > 0);

      // 1. Создаем смену
      const { data: shift, error: shiftError } = await supabase
        .from('production_lamination_shifts')
        .insert({
          date: shiftData.date,
          shift: shiftData.shift,
          machine_id: shiftData.machine_id,
          operator1_id: shiftData.operator1_id || null,
          operator2_id: shiftData.operator2_id || null,
          operator3_id: shiftData.operator3_id || null,
          dosators: activeDosators,
          waste_oploy_kg: Number(shiftData.waste_oploy_kg) || 0,
          waste_shift_kg: Number(shiftData.waste_shift_kg) || 0,
          waste_trim_kg: Number(shiftData.waste_trim_kg) || 0,
          notes: shiftData.notes,
          status: 'completed'
        })
        .select()
        .single();

      if (shiftError) throw shiftError;

      // 2. Обрабатываем каждый рулон
      for (const roll of processedRolls) {
        // 2.1. Создаем ламинированный рулон в laminated_rolls
        const { data: lamRoll, error: lamRollError } = await supabase
          .from('laminated_rolls')
          .insert({
            roll_number: roll.output_roll_number,
            source_roll_id: roll.input_roll_id,
            length: 0,
            weight: roll.output_weight_kg,
            status: 'available',
            location: 'lamination'
          })
          .select()
          .single();

        if (lamRollError) throw lamRollError;

        // 2.2. Записываем связь в production_lamination_rolls
        const { error: plrError } = await supabase
          .from('production_lamination_rolls')
          .insert({
            shift_id: shift.id,
            input_roll_id: roll.input_roll_id,
            input_roll_number: roll.input_roll_number,
            input_width_cm: roll.input_width_cm,
            input_weight_kg: roll.input_weight_kg,
            output_roll_id: lamRoll.id,
            output_roll_number: roll.output_roll_number,
            output_width_cm: roll.output_width_cm,
            output_weight_kg: roll.output_weight_kg,
            notes: roll.notes
          });

        if (plrError) throw plrError;

        // 2.3. Обновляем исходный рулон (статус = used, location = used)
        const { error: updateError } = await supabase
          .from('weaving_rolls')
          .update({
            status: 'used',
            location: 'used'
          })
          .eq('id', roll.input_roll_id);

        if (updateError) throw updateError;

        // 2.4. Списываем сырье из дозаторов
        for (const dosator of activeDosators) {
          const { data: deductionResult, error: deductionError } = await supabase.rpc('update_raw_material_balance', {
            p_material_id: dosator.material_id,
            p_quantity_change: -Number(dosator.weight)
          });

          if (deductionError) {
            console.error('Ошибка списания сырья:', deductionError);
            throw new Error(`Ошибка списания сырья: ${deductionError.message}`);
          }

          if (deductionResult && !deductionResult.success) {
            console.error('Списание не выполнено:', deductionResult.error);
            throw new Error(`Списание не выполнено: ${deductionResult.error}`);
          }
        }
      }

      toast.success(`Смена ${shift.doc_number} успешно сдана! Обработано рулонов: ${processedRolls.length}`);

      // Сброс формы
      setProcessedRolls([]);
      setShiftData({
        date: new Date().toISOString().split('T')[0],
        shift: 'День',
        machine_id: '',
        operator1_id: '',
        operator2_id: '',
        operator3_id: '',
        waste_oploy_kg: '',
        waste_shift_kg: '',
        waste_trim_kg: '',
        notes: ''
      });
      setDosators(Array(4).fill({ material_id: '', weight: '' }));
      fetchData();

    } catch (err: any) {
      console.error('Error submitting shift:', err);
      toast.error('Ошибка: ' + err.message);
    }

    setLoading(false);
  };

  // Расчеты
  const totalInputWeight = processedRolls.reduce((sum, r) => sum + r.input_weight_kg, 0);
  const totalOutputWeight = processedRolls.reduce((sum, r) => sum + r.output_weight_kg, 0);
  const weightGain = totalOutputWeight - totalInputWeight;
  const totalWaste = (Number(shiftData.waste_oploy_kg) || 0) + (Number(shiftData.waste_shift_kg) || 0) + (Number(shiftData.waste_trim_kg) || 0);

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <div>
          <h1 className="h1-bold">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Layers size={24} className="text-white"/>
            </div>
            Производство — Ламинация
          </h1>
          <p className="page-description">Пакетная обработка рулонов за смену</p>
        </div>
        <div className="flex gap-3 items-center">
          <Input
            type="date"
            value={shiftData.date}
            onChange={e => setShiftData({...shiftData, date: e.target.value})}
            className="bg-zinc-900 border-zinc-700 text-white h-10"
          />
          <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setShiftData({...shiftData, shift: 'День'})}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                shiftData.shift === 'День'
                  ? 'bg-yellow-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Sun size={18} />
              День
            </button>
            <button
              onClick={() => setShiftData({...shiftData, shift: 'Ночь'})}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                shiftData.shift === 'Ночь'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Moon size={18} />
              Ночь
            </button>
          </div>
        </div>
      </div>

      {/* Предупреждение если не заполнены обязательные поля */}
      {(!shiftData.machine_id || !shiftData.operator1_id || processedRolls.length === 0) && (
        <Card className="bg-card border-l-4 border-l-yellow-500 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle size={32} className="text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <div className="font-bold mb-2 text-yellow-400 text-lg">Заполните обязательные поля</div>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {!shiftData.machine_id && <li>• Выберите ламинатор</li>}
                  {!shiftData.operator1_id && <li>• Выберите хотя бы одного оператора</li>}
                  {processedRolls.length === 0 && <li>• Добавьте хотя бы один рулон для обработки</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА: Команда и Оборудование */}
        <div className="xl:col-span-4 space-y-6">

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Factory size={16}/> Оборудование
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-zinc-400 mb-3 block">Ламинатор *</Label>
                <div className="flex flex-wrap gap-3">
                  {machines.map(machine => {
                    const isSelected = shiftData.machine_id === machine.id;
                    return (
                      <button
                        key={machine.id}
                        type="button"
                        onClick={() => setShiftData({...shiftData, machine_id: machine.id})}
                        className={`px-6 py-4 rounded-lg border-2 transition-all font-bold text-base flex items-center gap-3 ${
                          isSelected
                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg scale-105 ring-2 ring-orange-500/50'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        <Factory size={20} />
                        {machine.name}
                        {isSelected && <CheckCircle2 size={18} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Users size={16}/> Команда операторов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-zinc-400 mb-3 block">Операторы (выберите до 3 человек) *</Label>
                <div className="flex flex-wrap gap-2">
                  {operators.map(employee => {
                    const isSelected =
                      shiftData.operator1_id === employee.id ||
                      shiftData.operator2_id === employee.id ||
                      shiftData.operator3_id === employee.id;
                    const initials = employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

                    const handleOperatorClick = () => {
                      if (isSelected) {
                        if (shiftData.operator1_id === employee.id) {
                          setShiftData({...shiftData, operator1_id: ''});
                        } else if (shiftData.operator2_id === employee.id) {
                          setShiftData({...shiftData, operator2_id: ''});
                        } else if (shiftData.operator3_id === employee.id) {
                          setShiftData({...shiftData, operator3_id: ''});
                        }
                      } else {
                        if (!shiftData.operator1_id) {
                          setShiftData({...shiftData, operator1_id: employee.id});
                        } else if (!shiftData.operator2_id) {
                          setShiftData({...shiftData, operator2_id: employee.id});
                        } else if (!shiftData.operator3_id) {
                          setShiftData({...shiftData, operator3_id: employee.id});
                        }
                      }
                    };

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={handleOperatorClick}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          isSelected
                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg scale-105 ring-2 ring-orange-500/50'
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-white text-orange-600' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {initials}
                        </div>
                        <span>{employee.full_name}</span>
                        {isSelected && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                <Scale size={16}/> Загрузка сырья
              </CardTitle>
              <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                Всего: <span className="text-white font-bold ml-1">{dosators.reduce((s, d) => s + (Number(d.weight) || 0), 0)} кг</span>
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dosators.map((dosator, idx) => {
                  const getMaterialColor = (materialName: string) => {
                    if (!materialName) return 'bg-zinc-700 border-zinc-600';
                    const lowerName = materialName.toLowerCase();
                    if (lowerName.includes('пп') || lowerName.includes('полипропилен')) return 'bg-blue-600 border-blue-500';
                    if (lowerName.includes('карбонат') || lowerName.includes('мел')) return 'bg-gray-400 border-gray-300';
                    if (lowerName.includes('уф') || lowerName.includes('стабилизатор')) return 'bg-yellow-600 border-yellow-500';
                    if (lowerName.includes('краситель') || lowerName.includes('мастербатч')) return 'bg-purple-600 border-purple-500';
                    return 'bg-green-600 border-green-500';
                  };

                  const selectedMaterial = materials.find(m => m.id === dosator.material_id);

                  return (
                    <div key={idx} className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 hover:border-zinc-700 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          D{idx + 1}
                        </div>
                        {selectedMaterial && (
                          <div className="text-[10px] font-medium text-zinc-400 truncate max-w-[150px]">
                            {selectedMaterial.name}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-14 bg-zinc-900 border-2 border-zinc-700 focus:border-orange-500 text-right pr-10 text-white font-bold text-2xl"
                          value={dosator.weight}
                          onChange={(e) => updateDosator(idx, 'weight', e.target.value)}
                        />
                        <span className="absolute right-3 top-4 text-sm text-zinc-500 font-bold">кг</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {materials.map(material => {
                          const isSelected = dosator.material_id === material.id;
                          const colorClass = getMaterialColor(material.name);

                          return (
                            <button
                              key={material.id}
                              type="button"
                              onClick={() => updateDosator(idx, 'material_id', material.id)}
                              className={`
                                relative h-10 rounded border-2 transition-all duration-200
                                ${isSelected
                                  ? `${colorClass} shadow-lg ring-1 ring-white/30`
                                  : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                                }
                              `}
                              title={material.name}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5">
                                <span className={`text-[9px] font-bold text-center leading-tight ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                  {material.name.split(' ')[0]}
                                </span>
                                {material.name.split(' ').length > 1 && (
                                  <span className={`text-[8px] text-center leading-tight ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                    {material.name.split(' ').slice(1).join(' ').slice(0, 10)}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={8} className="text-green-600" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Список рулонов */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package size={18}/> Обработанные рулоны ({processedRolls.length})
                </CardTitle>
                <Button
                  onClick={() => setShowRollDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                >
                  <Plus size={16} className="mr-1"/> Добавить рулон
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {processedRolls.length === 0 ? (
                <div className="text-center text-zinc-500 py-10">Рулоны не добавлены</div>
              ) : (
                <div className="space-y-2">
                  {processedRolls.map((roll, idx) => (
                    <div key={roll.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-mono font-bold text-white">#{idx + 1} {roll.input_roll_number}</div>
                          <div className="text-xs text-zinc-500 mt-1">&rarr; {roll.output_roll_number}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveRoll(roll.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-zinc-900 rounded">
                          <div className="text-zinc-500">Вход</div>
                          <div className="text-white">{roll.input_width_cm}см / {roll.input_weight_kg}кг</div>
                        </div>
                        <div className="p-2 bg-emerald-900/20 border border-emerald-800/30 rounded">
                          <div className="text-zinc-500">Выход</div>
                          <div className="text-emerald-400 font-bold">{roll.output_width_cm}см / {roll.output_weight_kg}кг</div>
                        </div>
                      </div>
                      {roll.notes && (
                        <div className="text-xs text-zinc-400 italic mt-2">{roll.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Отходы и Итоги */}
        <div className="xl:col-span-3 space-y-6">

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Отходы (кг)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-400">Оплой (пленка с головы)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-zinc-950 border-zinc-700 text-white h-9"
                  value={shiftData.waste_oploy_kg}
                  onChange={e => setShiftData({...shiftData, waste_oploy_kg: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Отход за смену</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-zinc-950 border-zinc-700 text-white h-9"
                  value={shiftData.waste_shift_kg}
                  onChange={e => setShiftData({...shiftData, waste_shift_kg: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Обрезка краев</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-zinc-950 border-zinc-700 text-white h-9"
                  value={shiftData.waste_trim_kg}
                  onChange={e => setShiftData({...shiftData, waste_trim_kg: e.target.value})}
                />
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Всего:</span>
                  <span className="text-red-400 font-bold">{totalWaste.toFixed(2)} кг</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Итоги смены</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Рулонов:</span>
                <span className="text-white font-bold">{processedRolls.length} шт</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Вес вход:</span>
                <span className="text-white font-mono">{totalInputWeight.toFixed(2)} кг</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Вес выход:</span>
                <span className="text-white font-mono">{totalOutputWeight.toFixed(2)} кг</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                <span className="text-zinc-400">Прирост:</span>
                <span className="text-green-400 font-bold">+{weightGain.toFixed(2)} кг</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Label className="text-zinc-400 text-xs">Примечания</Label>
            <Input
              className="bg-zinc-950 border-zinc-700 text-white"
              value={shiftData.notes}
              onChange={e => setShiftData({...shiftData, notes: e.target.value})}
              placeholder="Комментарий к смене..."
            />
          </div>

          <Button
            onClick={handleSubmitShift}
            disabled={loading || processedRolls.length === 0}
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Сохранение...' : (
              <span className="flex items-center gap-2"><CheckCircle2 /> Сдать смену</span>
            )}
          </Button>
        </div>

      </div>

      {/* ДИАЛОГ ДОБАВЛЕНИЯ РУЛОНА */}
      <Dialog open={showRollDialog} onOpenChange={setShowRollDialog}>
        <DialogContent className="bg-zinc-900 border-2 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Добавить рулон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Входящий рулон (с ткачества)</Label>
              <Select value={rollForm.input_roll_id} onValueChange={v => {
                const roll = availableRolls.find(r => r.id === v);
                setRollForm({
                  ...rollForm,
                  input_roll_id: v,
                  input_width_cm: roll?.tkan_specifications?.shirina_polotna_sm?.toString() || '',
                  input_weight_kg: roll?.total_weight?.toString() || '',
                  output_roll_number: `${roll?.roll_number}-LAM` || '',
                  output_width_cm: roll?.tkan_specifications?.shirina_polotna_sm?.toString() || ''
                });
              }}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white h-12">
                  <SelectValue placeholder="Выберите рулон..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableRolls.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roll_number} — {r.tkan_specifications?.nazvanie_tkani} ({r.total_length}м / {r.total_weight}кг)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Ширина входящая (см)</Label>
                <Input
                  type="number"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  value={rollForm.input_width_cm}
                  onChange={e => setRollForm({...rollForm, input_width_cm: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-zinc-300">Вес входящий (кг) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  value={rollForm.input_weight_kg}
                  onChange={e => setRollForm({...rollForm, input_weight_kg: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Номер выходного рулона</Label>
              <Input
                className="bg-zinc-950 border-zinc-700 text-white"
                value={rollForm.output_roll_number}
                onChange={e => setRollForm({...rollForm, output_roll_number: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Ширина выходная (см)</Label>
                <Input
                  type="number"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  value={rollForm.output_width_cm}
                  onChange={e => setRollForm({...rollForm, output_width_cm: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-zinc-300">Вес выходной (кг) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  value={rollForm.output_weight_kg}
                  onChange={e => setRollForm({...rollForm, output_weight_kg: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Примечания</Label>
              <Input
                className="bg-zinc-950 border-zinc-700 text-white"
                value={rollForm.notes}
                onChange={e => setRollForm({...rollForm, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                onClick={() => setShowRollDialog(false)}
                variant="outline"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddRoll}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus size={16} className="mr-1"/> Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
