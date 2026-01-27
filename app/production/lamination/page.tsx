'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select"; // Используем твой компонент
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Layers, ArrowRight, Package, Scale, Scissors, Save, CheckCircle2 } from "lucide-react";

export default function LaminationPage() {
  const [loading, setLoading] = useState(false);
  
  // Справочники
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [availableRolls, setAvailableRolls] = useState<any[]>([]);

  // Форма
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День',
    machine_id: '',
    operator_id: '',
    input_roll_id: '',
    
    // Результат
    output_length: '',
    output_weight: '',
    waste: '',
    notes: ''
  });

  // Дозаторы (Сырье для ламинации)
  const [dosators, setDosators] = useState(
    Array(4).fill({ material_id: '', weight: '' })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Станки (Ламинаторы)
    const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'lamination');
    // 2. Операторы
    const { data: emp } = await supabase.from('employees').select('*').eq('role', 'operator_lamination').eq('is_active', true); 
    // 3. Сырье (Гранулы)
    const { data: mat } = await supabase.from('raw_materials').select('*').order('name');
    // 4. Рулоны со склада (Только завершенные и не списанные)
    const { data: rolls } = await supabase
      .from('weaving_rolls')
      .select('*, tkan_specifications(nazvanie_tkani)')
      .eq('status', 'completed') // Берем только готовые
      .order('created_at', { ascending: false });

    if (mach) setMachines(mach);
    else setMachines([]); // Если пусто, массив

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

  const selectedInputRoll = availableRolls.find(r => r.id === formData.input_roll_id);

  const handleSubmit = async () => {
    if (!formData.machine_id || !formData.input_roll_id || !formData.output_weight) {
      alert('⚠️ Заполните обязательные поля (Станок, Рулон, Вес выхода)');
      return;
    }
    setLoading(true);

    const activeDosators = dosators.filter(d => d.material_id && Number(d.weight) > 0);

    console.log('machine_id:', formData.machine_id, typeof formData.machine_id);
    console.log('operator_id:', formData.operator_id, typeof formData.operator_id);
    console.log('input_roll_id:', formData.input_roll_id, typeof formData.input_roll_id);

    // Вызываем SQL-функцию process_lamination
    const { data, error } = await supabase.rpc('process_lamination', {
        p_date: formData.date,
        p_shift: formData.shift,
        p_machine_id: formData.machine_id,
        p_operator_id: formData.operator_id || null,
        
        p_input_roll_id: formData.input_roll_id,
        p_input_length: selectedInputRoll?.total_length || 0,
        p_input_weight: selectedInputRoll?.total_weight || 0,
        
        p_output_length: Number(formData.output_length) || (selectedInputRoll?.total_length || 0), // Если длина не изменилась
        p_output_weight: Number(formData.output_weight),
        p_waste: Number(formData.waste) || 0,
        
        p_dosators: activeDosators,
        p_notes: formData.notes
    });

    if (error) {
      alert('❌ Ошибка: ' + error.message);
    } else {
      alert(`✅ Рулон заламинирован!\nНовый номер: ${selectedInputRoll.roll_number}-LAM`);
      // Сброс
      setFormData({ ...formData, input_roll_id: '', output_length: '', output_weight: '', waste: '' });
      setDosators(Array(4).fill({ material_id: '', weight: '' }));
      fetchData(); // Обновить список рулонов
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Layers size={24} className="text-white"/>
            </div>
            Цех Ламинации
          </h1>
          <p className="page-description">Производство ламинированной ткани</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ЛЕВАЯ КОЛОНКА: ВХОД (Рулон + Сырье) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* 1. Настройки смены */}
          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader><CardTitle className="text-white">Смена и Оборудование</CardTitle></CardHeader>
             <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-zinc-400">Дата</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-zinc-950 border-zinc-700 text-white"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400">Станок</Label>
                  <Select value={formData.machine_id} onValueChange={v => setFormData({...formData, machine_id: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="Выбрать..." /></SelectTrigger>
                    <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                   <Label className="text-zinc-400">Оператор</Label>
                   <Select value={formData.operator_id} onValueChange={v => setFormData({...formData, operator_id: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="Выбрать..." /></SelectTrigger>
                    <SelectContent>{operators.map(o => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
             </CardContent>
          </Card>

          {/* 2. Выбор рулона (ВХОД) */}
          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-3"><CardTitle className="text-white flex items-center gap-2"><Package size={18}/> Входящий рулон (с Ткачества)</CardTitle></CardHeader>
             <CardContent>
                <Select value={formData.input_roll_id} onValueChange={v => setFormData({...formData, input_roll_id: v})}>
                   <SelectTrigger className="h-14 bg-zinc-950 border-zinc-700 text-white text-lg font-bold">
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
                
                {selectedInputRoll && (
                   <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg grid grid-cols-2 gap-4 text-sm">
                      <div>
                         <div className="text-zinc-400">Ткань</div>
                         <div className="text-white font-bold">{selectedInputRoll.tkan_specifications?.nazvanie_tkani}</div>
                      </div>
                      <div>
                         <div className="text-zinc-400">Исходный вес</div>
                         <div className="text-white font-mono">{selectedInputRoll.total_weight} кг</div>
                      </div>
                   </div>
                )}
             </CardContent>
          </Card>

          {/* 3. Сырье (Дозаторы) */}
          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-3"><CardTitle className="text-white flex items-center gap-2"><Layers size={18}/> Сырье для ламинации</CardTitle></CardHeader>
             <CardContent className="space-y-3">
                {dosators.map((d, idx) => (
                   <div key={idx} className="flex gap-2">
                      <Select onValueChange={v => updateDosator(idx, 'material_id', v)}>
                         <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="Сырье..." /></SelectTrigger>
                         <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input 
                        placeholder="Кг" 
                        type="number"
                        className="w-24 bg-zinc-950 border-zinc-700 text-white" 
                        value={d.weight}
                        onChange={e => updateDosator(idx, 'weight', e.target.value)}
                      />
                   </div>
                ))}
             </CardContent>
          </Card>

        </div>

        {/* ПРАВАЯ КОЛОНКА: ВЫХОД (Результат) */}
        <div className="xl:col-span-5 space-y-6">
           <Card className="bg-zinc-900 border-zinc-800 h-full border-l-4 border-l-blue-600">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><ArrowRight size={18}/> Результат (Выход)</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 
                 <div className="space-y-2">
                    <Label className="text-zinc-400">Итоговый Вес (Рулон + Ламинат)</Label>
                    <Input 
                       type="number" 
                       className="h-16 text-4xl font-bold bg-zinc-950 border-zinc-700 text-white"
                       placeholder="0"
                       value={formData.output_weight}
                       onChange={e => setFormData({...formData, output_weight: e.target.value})}
                    />
                    {selectedInputRoll && formData.output_weight && (
                       <div className="text-xs text-green-400 text-right">
                          Прирост: +{(Number(formData.output_weight) - selectedInputRoll.total_weight).toFixed(1)} кг
                       </div>
                    )}
                 </div>

                 <div className="space-y-2">
                    <Label className="text-zinc-400">Длина (если изменилась)</Label>
                    <Input 
                       type="number" 
                       className="bg-zinc-950 border-zinc-700 text-white"
                       placeholder={selectedInputRoll ? `${selectedInputRoll.total_length}` : "0"}
                       value={formData.output_length}
                       onChange={e => setFormData({...formData, output_length: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2">
                    <Label className="text-zinc-400">Отходы / Обрезки (кг)</Label>
                    <Input 
                       type="number" 
                       className="bg-zinc-950 border-zinc-700 text-red-300 font-bold"
                       value={formData.waste}
                       onChange={e => setFormData({...formData, waste: e.target.value})}
                    />
                 </div>

                 <Separator className="bg-zinc-800 my-4" />
                 
                 <Button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
                 >
                    {loading ? 'Обработка...' : (
                       <span className="flex items-center gap-2"><CheckCircle2 /> Подтвердить Ламинацию</span>
                    )}
                 </Button>

              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}