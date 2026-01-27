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
import {
  Save, Users, Package, AlertTriangle,
  Calendar, Clock, Factory, Scale, Trash2, CheckCircle2,
  Palette, Ruler
} from "lucide-react";

export default function ExtrusionPage() {
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
    
    // Параметры нити
    yarn_denier: '',
    yarn_width: '2.5', // По умолчанию 2.5 мм
    yarn_color: 'Белый', // По умолчанию Белый
    
    output_bobbins: '',
    output_weight: '',
    waste: '',
    downtime: '',
    notes: ''
  });

  const [dosators, setDosators] = useState(
    Array(6).fill({ material_id: '', weight: '', batch: '' })
  );

  useEffect(() => {
    const fetchData = async () => {
      const { data: emp } = await supabase.from('employees').select('*').eq('is_active', true);
      const { data: mat } = await supabase.from('raw_materials').select('*').order('name');
      const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'extruder');
      const { data: specs } = await supabase.from('tkan_specifications').select('osnova_denye, utok_denye');

      if (emp) setEmployees(emp);
      if (mat) setMaterials(mat);
      if (mach) setMachines(mach);

      if (specs) {
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
      alert('⚠️ Выберите машину и тип нити!');
      return;
    }
    setLoading(true);

    try {
        // Формируем уникальный номер партии: Дата-Смена-Линия-Цвет
        const dateStr = formData.date.replace(/-/g, '').slice(2);
        const shiftCode = formData.shift === 'День' ? '1' : '2';
        const machineCode = machines.find(m => m.id === formData.machine_id)?.code || 'EX';
        // Добавляем первую букву цвета в партию, чтобы отличать (W-White, etc) или просто оставляем уникальность
        const colorCode = formData.yarn_color ? formData.yarn_color.charAt(0).toUpperCase() : 'X';
        const batchNum = `${dateStr}-${shiftCode}-${machineCode}-${formData.yarn_denier}${colorCode}`;

        // Имя нити полное
        const yarnName = `Нить ПП ${formData.yarn_denier}D ${formData.yarn_color} (${formData.yarn_width}мм)`;

        // RPC Вызов
        const { error } = await supabase.rpc('register_extrusion_output', {
            p_date: formData.date,
            p_shift: formData.shift,
            p_machine_id: formData.machine_id,
            p_operator_id: formData.operator_extruder || null,
            
            // Новые параметры нити
            p_yarn_name: yarnName,
            p_yarn_denier: parseInt(formData.yarn_denier),
            p_width_mm: Number(formData.yarn_width), // <-- Передаем ширину
            p_color: formData.yarn_color,            // <-- Передаем цвет
            p_batch_number: batchNum,
            
            p_weight_kg: Number(formData.output_weight),
            p_notes: `${formData.notes} | Отходы: ${formData.waste}кг | Бобин: ${formData.output_bobbins}`
        });

        if (error) throw error;

        alert(`✅ Смена закрыта!\nНа склад: ${formData.output_weight} кг\nНить: ${formData.yarn_denier}D ${formData.yarn_color}`);
        
        // Очистка формы (оставляем настройки нити, вдруг следующая партия такая же)
        setFormData({ ...formData, output_bobbins: '', output_weight: '', waste: '', notes: '' });
        setDosators(Array(6).fill({ material_id: '', weight: '', batch: '' }));

    } catch (e: any) {
        alert('❌ Ошибка: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const totalInputWeight = dosators.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
  const totalOutput = (Number(formData.output_weight) || 0) + (Number(formData.waste) || 0);
  const balance = totalInputWeight - totalOutput;
  const isBalanced = Math.abs(balance) < 1;

  // Список популярных цветов
  const colors = ["Белый", "Черный", "Синий", "Зеленый", "Бежевый", "Серый", "Желтый"];

  return (
    <div className="page-container selection:bg-red-900 selection:text-white">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-[#E60012] p-2 rounded-lg"><Factory size={24} className="text-white" /></div>
            Цех Экструзии
          </h1>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 border-b border-zinc-800 pb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
             <Calendar size={14} className="text-zinc-400"/>
             <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-6 w-32 border-0 bg-transparent p-0 text-sm focus-visible:ring-0" />
          </div>
          <Select value={formData.shift} onValueChange={(v) => setFormData({...formData, shift: v})}>
            <SelectTrigger className="h-9 w-[110px] border-zinc-800 bg-zinc-900 text-white shadow-none focus:ring-0">
               <div className="flex items-center gap-2">
                 <Clock size={14} className={formData.shift === 'День' ? "text-yellow-500" : "text-blue-500"}/>
                 <SelectValue />
               </div>
            </SelectTrigger>
            <SelectContent><SelectItem value="День">☀️ День</SelectItem><SelectItem value="Ночь">🌙 Ночь</SelectItem></SelectContent>
          </Select>
          <Select value={formData.machine_id} onValueChange={(v) => setFormData({...formData, machine_id: v})}>
             <SelectTrigger className="h-9 w-[180px] border-zinc-800 bg-[#E60012]/10 text-[#E60012] font-bold shadow-none focus:ring-0">
               <div className="flex items-center gap-2"><Factory size={14}/><SelectValue placeholder="Выбрать линию..." /></div>
             </SelectTrigger>
             <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-3"><CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide"><Users size={16}/> Команда</CardTitle></CardHeader>
             <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Оператор</Label>
                    <Select onValueChange={(v) => setFormData({...formData, operator_extruder: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="Не выбран" /></SelectTrigger>
                      <SelectContent>{employees.filter(e => e.role === 'operator_extruder').map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {/* Намотчики... (код сокращен для краткости, он есть в оригинале) */}
                  <div className="space-y-1.5"><Label className="text-xs text-zinc-500">Намотчик 1</Label><Select onValueChange={(v) => setFormData({...formData, operator_winder1: v})}><SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{employees.filter(e => e.role === 'operator_winder').map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs text-zinc-500">Намотчик 2</Label><Select onValueChange={(v) => setFormData({...formData, operator_winder2: v})}><SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{employees.filter(e => e.role === 'operator_winder').map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
               <CardTitle className="text-base text-zinc-400 font-medium flex items-center gap-2 uppercase tracking-wide"><Package size={16}/> Загрузка Сырья</CardTitle>
               <Badge variant="outline" className="text-zinc-400 border-zinc-700">Всего: <span className="text-white font-bold ml-1">{totalInputWeight} кг</span></Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dosators.map((dosator, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700">
                     <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">D{idx + 1}</div>
                     <div className="flex-grow">
                        <Select onValueChange={(v) => updateDosator(idx, 'material_id', v)}>
                          <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm font-medium focus:ring-0 text-white"><SelectValue placeholder="Сырье..." /></SelectTrigger>
                          <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                     <div className="w-24 relative">
                        <Input type="number" placeholder="0" className="h-9 bg-zinc-900 border-zinc-700 text-right pr-7 text-white" value={dosator.weight} onChange={(e) => updateDosator(idx, 'weight', e.target.value)} />
                        <span className="absolute right-2 top-2.5 text-xs text-zinc-500">кг</span>
                     </div>
                  </div>
                ))}
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

               {/* 2. ЦВЕТ И ШИРИНА (НОВЫЕ ПОЛЯ) */}
               <div className="grid grid-cols-2 gap-4">
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
               <div className="grid grid-cols-2 gap-4">
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
            <div className="p-6 pt-0 mt-auto">
               <Button onClick={handleSubmit} disabled={loading} className={`w-full h-14 font-bold text-lg shadow-xl transition-all ${isBalanced ? 'bg-[#E60012] hover:bg-red-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                 {loading ? '...' : (<span className="flex items-center gap-2"><CheckCircle2 /> Выпустить Партию</span>)}
               </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}