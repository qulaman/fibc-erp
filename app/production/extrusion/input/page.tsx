'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import {
  Save, Users, Package,
  Calendar, Cable, Scale, CheckCircle2,
  Palette, Ruler
} from "lucide-react";

export default function ExtrusionInputPage() {
  const [loading, setLoading] = useState(false);

  // Справочники
  const [employees, setEmployees] = useState<any[]>([]);
  const [yarnDeniers, setYarnDeniers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  // Состояние формы
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День',
    machine_id: '',
    operator_extruder: '',
    operator_winder1: '',
    operator_winder2: '',
    operator_winder3: '',

    // Параметры нити
    yarn_denier: '',
    yarn_width: '2.5',
    yarn_color: 'Белый',

    output_bobbins: '',
    output_weight: '',
    waste: '',
    downtime: '',
    notes: ''
  });

  const [dosators, setDosators] = useState(
    Array(6).fill({ material_id: '', weight: '', batch: '' })
  );

  const [fabricSpecs, setFabricSpecs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: emp } = await supabase.from('employees').select('*').eq('is_active', true);
      const { data: mat } = await supabase.from('raw_materials').select('*').contains('departments', ['extrusion']).order('name');
      const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'extruder').eq('is_active', true);
      const { data: specs } = await supabase.from('tkan_specifications').select('*');

      if (emp) setEmployees(emp);
      if (mat) setMaterials(mat);
      if (mach) setMachines(mach);

      if (specs) {
        setFabricSpecs(specs);

        const deniersSet = new Set<number>();
        specs.forEach(spec => {
          if (spec.osnova_denye) deniersSet.add(spec.osnova_denye);
          if (spec.utok_denye) deniersSet.add(spec.utok_denye);
        });

        const deniersList = Array.from(deniersSet)
          .sort((a, b) => a - b)
          .map(denier => ({
            denier: denier,
            name: `Нить ${denier}D`,
            code: `PP-${denier}D`
          }));

        setYarnDeniers(deniersList);
      }
    };
    fetchData();
  }, []);

  const updateDosator = (index: number, field: string, value: string) => {
    const newDosators = [...dosators];
    // @ts-ignore
    newDosators[index] = { ...newDosators[index], [field]: value };
    setDosators(newDosators);
  };

  const handleSubmit = async () => {
    if (!formData.yarn_denier || !formData.machine_id) {
      toast.warning('Выберите машину и тип нити!');
      return;
    }
    setLoading(true);

    try {
        const dateStr = formData.date.replace(/-/g, '').slice(2);
        const shiftCode = formData.shift === 'День' ? '1' : '2';
        const machineCode = machines.find(m => m.id === formData.machine_id)?.code || 'EX';
        const colorCode = formData.yarn_color ? formData.yarn_color.charAt(0).toUpperCase() : 'X';
        const batchNum = `${dateStr}-${shiftCode}-${machineCode}-${formData.yarn_denier}${colorCode}`;

        const yarnName = `Нить ПП ${formData.yarn_denier}D ${formData.yarn_color} (${formData.yarn_width}мм)`;

        const activeDosators = dosators
            .filter(d => d.weight && Number(d.weight) > 0)
            .map(d => ({
                material_id: d.material_id || null,
                weight: Number(d.weight),
                batch: d.batch || ''
            }));

        const { data: result, error } = await supabase.rpc('register_extrusion_output', {
            p_date: formData.date,
            p_shift: formData.shift,
            p_machine_id: formData.machine_id,
            p_operator_id: formData.operator_extruder || null,
            p_operator_winder1: formData.operator_winder1 || null,
            p_operator_winder2: formData.operator_winder2 || null,
            p_operator_winder3: formData.operator_winder3 || null,
            p_yarn_name: yarnName,
            p_yarn_denier: parseInt(formData.yarn_denier),
            p_width_mm: Number(formData.yarn_width),
            p_color: formData.yarn_color,
            p_batch_number: batchNum,
            p_weight_kg: Number(formData.output_weight),
            p_dosators_data: activeDosators,
            p_output_bobbins: Number(formData.output_bobbins) || 0,
            p_waste_weight: Number(formData.waste) || 0,
            p_notes: formData.notes || ''
        });

        if (error) throw error;

        if (result && !result.success) {
            throw new Error(result.error || result.message || 'Ошибка при регистрации партии');
        }

        toast.success('Смена закрыта!', {
          description: `На склад: ${formData.output_weight} кг\nНить: ${formData.yarn_denier}D ${formData.yarn_color}`
        });

        setFormData({ ...formData, output_bobbins: '', output_weight: '', waste: '', notes: '' });
        setDosators(Array(6).fill({ material_id: '', weight: '', batch: '' }));

    } catch (e: any) {
        toast.error('Ошибка: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const totalInputWeight = dosators.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
  const totalOutput = (Number(formData.output_weight) || 0) + (Number(formData.waste) || 0);
  const balance = totalInputWeight - totalOutput;
  const isBalanced = Math.abs(balance) < 1;

  const colors = ["Белый", "Черный", "Синий", "Зеленый", "Бежевый", "Серый", "Желтый"];

  const getRecipeForDenier = () => {
    if (!formData.yarn_denier) return null;

    const selectedDenier = parseInt(formData.yarn_denier);
    const spec = fabricSpecs.find(s =>
      s.osnova_denye === selectedDenier || s.utok_denye === selectedDenier
    );

    if (!spec) return null;

    const totalWeight = (spec.receptura_pp_kg || 0) +
                       (spec.receptura_karbonat_kg || 0) +
                       (spec.receptura_uf_stabilizator_kg || 0) +
                       (spec.receptura_krasitel_kg || 0);

    if (totalWeight === 0) return null;

    const isColored = formData.yarn_color && formData.yarn_color !== 'Белый';

    if (isColored) {
      const ppPercent = 93.0;
      const krasitelPercent = 1.0;

      const baseKarbonat = spec.receptura_karbonat_kg || 0;
      const baseUF = spec.receptura_uf_stabilizator_kg || 0;
      const baseOther = baseKarbonat + baseUF;

      let karbonatPercent = 0;
      let ufPercent = 0;

      if (baseOther > 0) {
        karbonatPercent = (baseKarbonat / baseOther) * 6.0;
        ufPercent = (baseUF / baseOther) * 6.0;
      } else {
        karbonatPercent = 3.0;
        ufPercent = 3.0;
      }

      return {
        pp_kg: spec.receptura_pp_kg || 0,
        pp_percent: ppPercent.toFixed(1),
        karbonat_kg: spec.receptura_karbonat_kg || 0,
        karbonat_percent: karbonatPercent.toFixed(1),
        uf_kg: spec.receptura_uf_stabilizator_kg || 0,
        uf_percent: ufPercent.toFixed(1),
        krasitel_kg: spec.receptura_krasitel_kg || 0,
        krasitel_percent: krasitelPercent.toFixed(1),
        total: totalWeight,
        fabric_name: spec.nazvanie_tkani,
        isColored: true
      };
    }

    return {
      pp_kg: spec.receptura_pp_kg || 0,
      pp_percent: (spec.receptura_pp_kg / totalWeight * 100).toFixed(1),
      karbonat_kg: spec.receptura_karbonat_kg || 0,
      karbonat_percent: (spec.receptura_karbonat_kg / totalWeight * 100).toFixed(1),
      uf_kg: spec.receptura_uf_stabilizator_kg || 0,
      uf_percent: (spec.receptura_uf_stabilizator_kg / totalWeight * 100).toFixed(1),
      krasitel_kg: spec.receptura_krasitel_kg || 0,
      krasitel_percent: (spec.receptura_krasitel_kg / totalWeight * 100).toFixed(1),
      total: totalWeight,
      fabric_name: spec.nazvanie_tkani,
      isColored: false
    };
  };

  const recipe = getRecipeForDenier();

  return (
    <div className="page-container selection:bg-red-900 selection:text-white">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-[#E60012] p-2 rounded-lg"><Cable size={24} className="text-white" /></div>
            Внесение Производства
          </h1>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="mb-8 border-b border-zinc-800 pb-6 space-y-4">
        {/* Дата */}
        <div>
          <Label className="text-xs text-zinc-500 mb-2 block">Дата производства</Label>
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-lg border border-zinc-800 w-fit">
            <Calendar size={20} className="text-zinc-400" />
            <Input
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="h-auto w-auto border-0 bg-transparent p-0 text-base md:text-lg font-medium focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Смена - кнопки */}
        <div>
          <Label className="text-xs text-zinc-500 mb-2 block">Смена</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({...formData, shift: 'День'})}
              className={`flex-1 sm:flex-none px-6 py-4 rounded-lg border-2 transition-all font-bold text-base flex items-center justify-center gap-3 ${
                formData.shift === 'День'
                  ? 'bg-yellow-500 border-yellow-400 text-black shadow-lg scale-105'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              ☀️ День
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, shift: 'Ночь'})}
              className={`flex-1 sm:flex-none px-6 py-4 rounded-lg border-2 transition-all font-bold text-base flex items-center justify-center gap-3 ${
                formData.shift === 'Ночь'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              🌙 Ночь
            </button>
          </div>
        </div>

        {/* Линия экструдера - кнопки */}
        <div>
          <Label className="text-xs text-zinc-500 mb-2 block">Линия экструдера</Label>
          <div className="flex flex-wrap gap-3">
            {machines.map(machine => {
              const isSelected = formData.machine_id === machine.id;
              return (
                <button
                  key={machine.id}
                  type="button"
                  onClick={() => setFormData({...formData, machine_id: machine.id})}
                  className={`px-6 py-4 rounded-lg border-2 transition-all font-bold text-base flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#E60012] border-red-600 text-white shadow-lg scale-105 ring-2 ring-red-500/50'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <Cable size={20} />
                  {machine.name}
                  {isSelected && <CheckCircle2 size={18} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="xl:col-span-8 space-y-6">
          {/* Предупреждение если не выбрана машина или тип нити */}
          {(!formData.machine_id || !formData.yarn_denier) && (
            <Card className="bg-card border-l-4 border-l-yellow-500">
              <CardContent className="pt-6">
                <div className="text-center text-yellow-400">
                  <div className="text-4xl mb-2">⚠️</div>
                  <div className="font-bold mb-1">
                    {!formData.machine_id && 'Выберите линию экструдера'}
                    {formData.machine_id && !formData.yarn_denier && 'Выберите тип нити'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {!formData.machine_id && 'Для начала работы необходимо выбрать линию экструдера'}
                    {formData.machine_id && !formData.yarn_denier && 'Для расчета рецептуры необходимо выбрать тип нити (денье)'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-4">
               <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide">
                 <Users size={16}/>Команда
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                {/* Оператор экструдера */}
                <div>
                  <Label className="text-sm text-zinc-400 mb-3 block">Оператор экструдера</Label>
                  <div className="flex flex-wrap gap-2">
                    {employees.filter(e => e.role === 'operator_extruder').map(employee => {
                      const isSelected = formData.operator_extruder === employee.id;
                      const initials = employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => setFormData({...formData, operator_extruder: employee.id})}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                            isSelected
                              ? 'bg-purple-600 border-purple-500 text-white shadow-lg scale-105 ring-2 ring-purple-500/50'
                              : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-white text-purple-600' : 'bg-zinc-800 text-zinc-400'
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

                {/* Намотчики */}
                <div>
                  <Label className="text-sm text-zinc-400 mb-3 block">Намотчики (выберите до 3 человек)</Label>
                  <div className="flex flex-wrap gap-2">
                    {employees.filter(e => e.role === 'operator_winder').map(employee => {
                      const isSelected =
                        formData.operator_winder1 === employee.id ||
                        formData.operator_winder2 === employee.id ||
                        formData.operator_winder3 === employee.id;
                      const initials = employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

                      const handleWinderClick = () => {
                        if (isSelected) {
                          if (formData.operator_winder1 === employee.id) {
                            setFormData({...formData, operator_winder1: ''});
                          } else if (formData.operator_winder2 === employee.id) {
                            setFormData({...formData, operator_winder2: ''});
                          } else if (formData.operator_winder3 === employee.id) {
                            setFormData({...formData, operator_winder3: ''});
                          }
                        } else {
                          if (!formData.operator_winder1) {
                            setFormData({...formData, operator_winder1: employee.id});
                          } else if (!formData.operator_winder2) {
                            setFormData({...formData, operator_winder2: employee.id});
                          } else if (!formData.operator_winder3) {
                            setFormData({...formData, operator_winder3: employee.id});
                          }
                        }
                      };

                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={handleWinderClick}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-500/50'
                              : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-white text-blue-600' : 'bg-zinc-800 text-zinc-400'
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
               <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide"><Package size={16}/> Загрузка Сырья</CardTitle>
               <Badge variant="outline" className="text-zinc-400 border-zinc-700">Всего: <span className="text-white font-bold ml-1">{totalInputWeight} кг</span></Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dosators.map((dosator, idx) => {
                  const getMaterialColor = (materialName: string) => {
                    if (!materialName) return 'bg-zinc-700 border-zinc-600';
                    const lowerName = materialName.toLowerCase();
                    if (lowerName.includes('пп') || lowerName.includes('полипропилен')) return 'bg-blue-600 border-blue-500';
                    if (lowerName.includes('карбонат')) return 'bg-gray-400 border-gray-300';
                    if (lowerName.includes('уф') || lowerName.includes('стабилизатор')) return 'bg-yellow-600 border-yellow-500';
                    if (lowerName.includes('краситель') || lowerName.includes('мастербатч')) return 'bg-purple-600 border-purple-500';
                    if (lowerName.includes('краска')) return 'bg-pink-600 border-pink-500';
                    return 'bg-green-600 border-green-500';
                  };

                  const selectedMaterial = materials.find(m => m.id === dosator.material_id);

                  return (
                    <div key={idx} className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 hover:border-zinc-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">D{idx + 1}</div>
                          {selectedMaterial && (
                            <div className="text-[10px] font-medium text-zinc-400 truncate max-w-[120px]">
                              {selectedMaterial.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-16 bg-zinc-900 border-2 border-zinc-700 focus:border-[#E60012] text-right pr-12 text-white font-bold text-3xl"
                          value={dosator.weight}
                          onChange={(e) => updateDosator(idx, 'weight', e.target.value)}
                        />
                        <span className="absolute right-3 top-5 text-base text-zinc-500 font-bold">кг</span>
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
                                relative h-12 rounded border-2 transition-all duration-200
                                ${isSelected
                                  ? `${colorClass} shadow-lg ring-1 ring-white/30`
                                  : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                                }
                              `}
                              title={material.name}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                <span className={`text-[10px] font-bold text-center leading-tight ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                  {material.name.split(' ')[0]}
                                </span>
                                {material.name.split(' ').length > 1 && (
                                  <span className={`text-[9px] text-center leading-tight ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                    {material.name.split(' ').slice(1).join(' ').slice(0, 8)}
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

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${isBalanced ? 'bg-green-500' : 'bg-[#E60012]'}`}></div>
            <CardHeader>
              <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide"><Save size={16}/> Параметры Продукции</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">

               {/* 1. ДЕНЬЕ */}
               <div className="space-y-2">
                 <Label className="text-zinc-300">Тип Нити (Денье)</Label>
                 <Select onValueChange={(v) => setFormData({...formData, yarn_denier: v})}>
                    <SelectTrigger className="h-12 bg-zinc-950 border-zinc-700 text-white font-bold text-lg">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#E60012]"></div>
                          <SelectValue placeholder="Выберите денье..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>{yarnDeniers.map(y => <SelectItem key={y.denier} value={y.denier.toString()}>{y.name}</SelectItem>)}</SelectContent>
                 </Select>
               </div>

               {/* РЕЦЕПТУРА */}
               {recipe && (
                 <div className={`border p-3 rounded-lg space-y-2 animate-in fade-in ${
                   recipe.isColored
                     ? 'bg-purple-900/10 border-purple-800/30'
                     : 'bg-blue-900/10 border-blue-800/30'
                 }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase ${
                        recipe.isColored ? 'text-purple-400' : 'text-blue-400'
                      }`}>
                        🧪 Соотношение для дозаторов
                        {recipe.isColored && ' (Цветная)'}
                      </span>
                      <span className="text-[10px] text-zinc-500">{recipe.fabric_name}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 rounded">
                        <span className="text-zinc-400 text-xs">Полипропилен:</span>
                        <span className="font-mono text-green-400 font-bold text-lg">{recipe.pp_percent}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 rounded">
                        <span className="text-zinc-400 text-xs">Карбонат (Мел):</span>
                        <span className="font-mono text-white font-bold text-lg">{recipe.karbonat_percent}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 rounded">
                        <span className="text-zinc-400 text-xs">УФ-стабилизатор:</span>
                        <span className="font-mono text-white font-bold text-lg">{recipe.uf_percent}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 rounded">
                        <span className="text-zinc-400 text-xs">Краситель:</span>
                        <span className={`font-mono font-bold text-lg ${
                          recipe.isColored ? 'text-purple-400' : 'text-zinc-600'
                        }`}>{recipe.krasitel_percent}%</span>
                      </div>
                    </div>
                 </div>
               )}

               {/* 2. ЦВЕТ И ШИРИНА */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label className="text-xs text-zinc-500 flex items-center gap-1"><Palette size={12}/> Цвет</Label>
                      <Select value={formData.yarn_color} onValueChange={(v) => setFormData({...formData, yarn_color: v})}>
                          <SelectTrigger className="h-10 bg-zinc-950 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>{colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs text-zinc-500 flex items-center gap-1"><Ruler size={12}/> Ширина</Label>
                      <div className="relative">
                          <Input
                             type="number" step="0.1"
                             className="h-10 bg-zinc-950 border-zinc-700 text-white font-mono"
                             value={formData.yarn_width}
                             onChange={e => setFormData({...formData, yarn_width: e.target.value})}
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-zinc-500">мм</span>
                      </div>
                  </div>
               </div>

               <Separator className="bg-zinc-800"/>

               {/* ОСТАЛЬНЫЕ ПОЛЯ */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Кол-во Бобин</Label>
                    <Input type="number" className="h-10 bg-zinc-950 border-zinc-700 text-white" value={formData.output_bobbins} onChange={e => setFormData({...formData, output_bobbins: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Вес Отходов (кг)</Label>
                    <Input type="number" className="h-10 bg-zinc-950 border-zinc-700 text-red-400 text-right" value={formData.waste} onChange={e => setFormData({...formData, waste: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-xs text-zinc-500 flex items-center gap-1"><Scale size={12}/> Вес Нетто</Label>
                  <div className="relative">
                    <Input type="number" className="h-14 bg-zinc-950 border-zinc-700 text-green-400 font-bold text-3xl text-right pr-10" value={formData.output_weight} onChange={e => setFormData({...formData, output_weight: e.target.value})} />
                    <span className="absolute right-4 top-4 text-zinc-500 font-bold">КГ</span>
                  </div>
               </div>

               {/* Баланс */}
               <div className={`mt-2 p-3 rounded border ${isBalanced ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-zinc-400">Баланс:</span>
                     <span className={`text-lg font-bold ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
                        {balance > 0 ? `+${balance.toFixed(1)}` : balance.toFixed(1)} кг
                     </span>
                  </div>
               </div>

            </CardContent>
            <div className="p-6 pt-0 mt-auto space-y-4">
               {/* Проверка готовности формы */}
               {(!formData.machine_id || !formData.yarn_denier || !formData.output_weight) && (
                 <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3">
                   <div className="font-bold mb-2">⚠️ Заполните обязательные поля:</div>
                   <ul className="space-y-1 ml-4">
                     {!formData.machine_id && <li>• Выберите линию экструдера</li>}
                     {!formData.yarn_denier && <li>• Выберите тип нити (денье)</li>}
                     {!formData.output_weight && <li>• Укажите вес нетто (кг)</li>}
                   </ul>
                 </div>
               )}

               <Button
                 onClick={handleSubmit}
                 disabled={loading || !formData.machine_id || !formData.yarn_denier}
                 className={`w-full h-14 font-bold text-lg shadow-xl transition-all ${isBalanced ? 'bg-[#E60012] hover:bg-red-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
               >
                 {loading ? '...' : (<span className="flex items-center gap-2"><CheckCircle2 /> Выпустить Партию</span>)}
               </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
