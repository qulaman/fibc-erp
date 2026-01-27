'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Scroll, Ruler, Weight, PlayCircle, PlusCircle,
  StopCircle, CheckCircle2, Factory, Save
} from "lucide-react";

interface ActiveRoll {
  id: string;
  roll_number: string;
  loom_id: string;
  fabric_spec_id: number;
  status: string;
  total_length: number;
  total_weight: number;
  tkan_specifications?: {
    id: number;
    nazvanie_tkani: string;
    kod_tkani: string;
    osnova_denye: number;
    utok_denye: number;
    osnova_itogo_kg: number;
    utok_itogo_kg: number;
  };
}

export default function WeavingPage() {
  const [loading, setLoading] = useState(false);

  // Справочники
  const [looms, setLooms] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [fabricSpecs, setFabricSpecs] = useState<any[]>([]);
  const [yarnStock, setYarnStock] = useState<any[]>([]);

  // Активный рулон на выбранном станке
  const [activeRoll, setActiveRoll] = useState<ActiveRoll | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День',
    machine_id: '',
    operator_id: '',

    // Для НОВОГО рулона
    fabric_spec_id: '',
    warp_batch_id: '', // Партия основы (для списания при завершении)
    weft_batch_id: '', // Партия утка (для списания при завершении)

    // Данные смены
    length: '',
    weight: '',
    notes: '',
    is_finished: false // ВАЖНО: только если true - списываем нить и отправляем на склад
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: mach } = await supabase.from('equipment').select('*').or('type.eq.loom,type.eq.weaving,type.eq.loom_round');
      const { data: emp } = await supabase.from('employees').select('*').eq('is_active', true);
      const { data: specs } = await supabase.from('tkan_specifications').select('*').order('shirina_polotna_sm');
      const { data: yarn } = await supabase.from('yarn_inventory').select('*').gt('quantity_kg', 0);

      if (mach) setLooms(mach);
      if (emp) setEmployees(emp);
      if (specs) setFabricSpecs(specs);
      if (yarn) setYarnStock(yarn);
    };
    fetchData();
  }, []);

  // При выборе станка - проверяем есть ли активный рулон
  const handleMachineChange = async (machineId: string) => {
    // Сброс формы
    setFormData(prev => ({
      ...prev,
      machine_id: machineId,
      is_finished: false,
      length: '',
      weight: '',
      notes: '',
      fabric_spec_id: '',
      warp_batch_id: '',
      weft_batch_id: ''
    }));
    setActiveRoll(null);

    console.log("🔍 Ищем активный рулон для станка:", machineId);

    try {
      // Ищем активный рулон на этом станке
      const { data: simpleRoll, error: simpleError } = await supabase
        .from('weaving_rolls')
        .select('*')
        .eq('loom_id', machineId)
        .eq('status', 'active')
        .maybeSingle();

      if (simpleError) {
        console.error("Ошибка поиска рулона:", simpleError);
        return;
      }

      if (!simpleRoll) {
        console.log("⚪ Станок свободен - можно начать новый рулон");
        return;
      }

      console.log("🟢 Найден активный рулон:", simpleRoll.roll_number);

      // Пробуем загрузить с данными о ткани
      const { data: fullRoll, error: joinError } = await supabase
        .from('weaving_rolls')
        .select('*, tkan_specifications(*)')
        .eq('id', simpleRoll.id)
        .single();

      if (joinError) {
        console.warn("⚠️ Не удалось загрузить спецификацию ткани:", joinError.message);
        setActiveRoll(simpleRoll);
      } else {
        console.log("✅ Рулон и спецификация загружены успешно");
        setActiveRoll(fullRoll);
      }
    } catch (e: any) {
      console.error("❌ Ошибка:", e.message);
    }
  };

  // Подбор нити по денье
  const selectedSpec = fabricSpecs.find(s => s.id.toString() === formData.fabric_spec_id);

  const getMatchingYarns = (targetDenier: number) => {
    if (!targetDenier) return yarnStock;
    const matches = yarnStock.filter(y => y.denier === targetDenier);
    return matches.length > 0 ? matches : yarnStock;
  };

  // Расчет расхода нити (для всего рулона при завершении)
  const currentSpec = activeRoll?.tkan_specifications || selectedSpec;

  // Общий расход рассчитываем от НАКОПЛЕННОЙ длины рулона + текущий ввод
  const totalRollLength = (activeRoll?.total_length || 0) + Number(formData.length || 0);

  const warpConsumption = currentSpec
    ? (totalRollLength * (currentSpec.osnova_itogo_kg || 0)).toFixed(2)
    : '0';
  const weftConsumption = currentSpec
    ? (totalRollLength * (currentSpec.utok_itogo_kg || 0)).toFixed(2)
    : '0';

  const handleSubmit = async () => {
    if (!formData.machine_id || !formData.operator_id || !formData.length) {
      return alert('⚠️ Заполните: Станок, Оператор, Длина');
    }

    setLoading(true);

    try {
      let rollId = activeRoll?.id;
      let rollNum = activeRoll?.roll_number;

      // ═══════════════════════════════════════════════════════════════
      // СЦЕНАРИЙ А: НОВЫЙ РУЛОН (станок был свободен)
      // ═══════════════════════════════════════════════════════════════
      if (!activeRoll) {
        if (!formData.fabric_spec_id) {
          throw new Error('Выберите Спецификацию Ткани!');
        }

        // Генерируем номер рулона
        const datePart = formData.date.replace(/-/g, '').slice(2);
        const loomCode = looms.find(l => l.id === formData.machine_id)?.code || 'L';
        rollNum = `R-${datePart}-${loomCode}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        // Создаем новый рулон со статусом 'active'
        const { data: newRoll, error: createError } = await supabase
          .from('weaving_rolls')
          .insert([{
            roll_number: rollNum,
            loom_id: formData.machine_id,
            fabric_spec_id: Number(formData.fabric_spec_id),
            status: 'active',
            total_length: 0,
            total_weight: 0
          }])
          .select()
          .single();

        if (createError) throw new Error('Ошибка создания рулона: ' + createError.message);

        rollId = newRoll.id;
        console.log("✅ Создан новый рулон:", rollNum);
      }

      // ═══════════════════════════════════════════════════════════════
      // СЦЕНАРИЙ Б: ЗАПИСЬ ДАННЫХ СМЕНЫ (для любого рулона)
      // ═══════════════════════════════════════════════════════════════
      const length = Number(formData.length);
      const weight = Number(formData.weight) || 0;

      // Записываем в журнал production_weaving
      const { error: logError } = await supabase
        .from('production_weaving')
        .insert([{
          date: formData.date,
          shift: formData.shift,
          roll_id: rollId,
          operator_id: formData.operator_id,
          produced_length: length,
          produced_weight: weight,
          notes: formData.notes
        }]);

      if (logError) throw new Error('Ошибка записи в журнал: ' + logError.message);

      // Обновляем накопительные данные рулона
      const newTotalLength = (activeRoll?.total_length || 0) + length;
      const newTotalWeight = (activeRoll?.total_weight || 0) + weight;

      // ═══════════════════════════════════════════════════════════════
      // СЦЕНАРИЙ В: ЗАВЕРШЕНИЕ РУЛОНА (ТОЛЬКО если is_finished = true)
      // ═══════════════════════════════════════════════════════════════
      if (formData.is_finished) {
        console.log("🔴 Завершаем рулон и списываем материалы");

        // 1. Меняем статус рулона на 'completed'
        const { error: updateError } = await supabase
          .from('weaving_rolls')
          .update({
            status: 'completed',
            total_length: newTotalLength,
            total_weight: newTotalWeight
          })
          .eq('id', rollId);

        if (updateError) throw new Error('Ошибка завершения рулона: ' + updateError.message);

        // 2. Списываем нить со склада экструзии
        const totalWarp = Number(warpConsumption);
        const totalWeft = Number(weftConsumption);

        if (formData.warp_batch_id && totalWarp > 0) {
          const warpBatch = yarnStock.find(y => y.id === formData.warp_batch_id);
          if (warpBatch) {
            const newQty = Math.max(0, (warpBatch.quantity_kg || 0) - totalWarp);
            await supabase
              .from('yarn_inventory')
              .update({ quantity_kg: newQty, last_updated: new Date().toISOString() })
              .eq('id', formData.warp_batch_id);
            console.log(`📦 Списано основы: ${totalWarp} кг`);
          }
        }

        if (formData.weft_batch_id && totalWeft > 0) {
          const weftBatch = yarnStock.find(y => y.id === formData.weft_batch_id);
          if (weftBatch) {
            const newQty = Math.max(0, (weftBatch.quantity_kg || 0) - totalWeft);
            await supabase
              .from('yarn_inventory')
              .update({ quantity_kg: newQty, last_updated: new Date().toISOString() })
              .eq('id', formData.weft_batch_id);
            console.log(`📦 Списано утка: ${totalWeft} кг`);
          }
        }

        alert(`✅ Рулон ${rollNum} ЗАВЕРШЁН и отправлен на склад!\n\nИтого: ${newTotalLength} м / ${newTotalWeight} кг\nСписано основы: ~${totalWarp} кг\nСписано утка: ~${totalWeft} кг`);
      } else {
        // Рулон НЕ завершен - просто обновляем накопительные данные
        const { error: updateError } = await supabase
          .from('weaving_rolls')
          .update({
            total_length: newTotalLength,
            total_weight: newTotalWeight
          })
          .eq('id', rollId);

        if (updateError) throw new Error('Ошибка обновления рулона: ' + updateError.message);

        alert(`✅ Данные записаны!\n\nРулон ${rollNum} продолжает работу.\nТекущий итог: ${newTotalLength} м / ${newTotalWeight} кг\n\n💡 Нить НЕ списана (рулон не снят со станка)`);
      }

      // Сброс формы
      setFormData(prev => ({
        ...prev,
        length: '',
        weight: '',
        notes: '',
        is_finished: false,
        warp_batch_id: '',
        weft_batch_id: ''
      }));

      // Перезагружаем данные о станке
      handleMachineChange(formData.machine_id);

      // Обновляем список нити (если было списание)
      if (formData.is_finished) {
        const { data: yarn } = await supabase.from('yarn_inventory').select('*').gt('quantity_kg', 0);
        if (yarn) setYarnStock(yarn);
      }

    } catch (e: any) {
      alert('❌ Ошибка: ' + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container selection:bg-blue-900 selection:text-white">

      {/* HEADER */}
      <div className="page-header mb-6">
        <div>
          <h1 className="h1-bold">
            <div className="bg-amber-600 p-2 rounded-lg"><Scroll size={24} className="text-white"/></div>
            Ткацкий Цех
          </h1>
        </div>
        <div className="flex gap-3 items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800">
           <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-transparent border-0 text-white w-32"/>
           <Select value={formData.shift} onValueChange={(v) => setFormData({...formData, shift: v})}>
             <SelectTrigger className="bg-zinc-950 border-0 h-8 w-24"><SelectValue/></SelectTrigger>
             <SelectContent><SelectItem value="День">☀️ День</SelectItem><SelectItem value="Ночь">🌙 Ночь</SelectItem></SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-5 space-y-6">
           <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader><CardTitle className="text-white flex items-center gap-2"><Factory size={18}/> 1. Станок и Рулон</CardTitle></CardHeader>
             <CardContent className="space-y-6">

                {/* Выбор станка */}
                <div>
                   <Label className="text-zinc-400 mb-2 block">Выберите станок</Label>
                   <Select value={formData.machine_id} onValueChange={handleMachineChange}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white h-12 text-lg"><SelectValue placeholder="Выберите станок..." /></SelectTrigger>
                      <SelectContent>{looms.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                   </Select>
                </div>

                {/* ИНДИКАТОР РУЛОНА */}
                {formData.machine_id && (
                  <div className={`p-4 rounded-xl border ${activeRoll ? 'bg-blue-900/20 border-blue-800' : 'bg-emerald-900/20 border-emerald-800'}`}>
                     {activeRoll ? (
                       <div className="flex gap-4 items-center">
                         <div className="p-3 bg-blue-600 rounded-full"><PlayCircle size={32} className="text-white"/></div>
                         <div className="flex-1">
                            <div className="text-xs text-blue-300 font-bold uppercase">Рулон в работе</div>
                            <div className="text-2xl font-bold text-white">{activeRoll.roll_number}</div>
                            <div className="text-sm text-zinc-400 mt-1">
                               Ткань: <span className="text-white">{activeRoll.tkan_specifications?.nazvanie_tkani || 'Не указано'}</span>
                            </div>
                            <div className="text-xs text-blue-300 mt-2 bg-blue-900/30 px-2 py-1 rounded inline-block">
                               Накоплено: {activeRoll.total_length} м / {activeRoll.total_weight} кг
                            </div>
                         </div>
                       </div>
                     ) : (
                       <div className="flex gap-4 items-center">
                         <div className="p-3 bg-emerald-600 rounded-full"><PlusCircle size={32} className="text-white"/></div>
                         <div>
                            <div className="text-xs text-emerald-300 font-bold uppercase">Станок свободен</div>
                            <div className="text-xl font-bold text-white">Начните новый рулон</div>
                         </div>
                       </div>
                     )}
                  </div>
                )}

                {/* ЕСЛИ НОВЫЙ РУЛОН - ВЫБОР ТКАНИ */}
                {!activeRoll && formData.machine_id && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div>
                         <Label className="text-emerald-400 mb-1">Спецификация Ткани *</Label>
                         <Select value={formData.fabric_spec_id} onValueChange={v => setFormData({...formData, fabric_spec_id: v})}>
                           <SelectTrigger className="bg-emerald-950/30 border-emerald-800 text-white"><SelectValue placeholder="Выберите ткань..." /></SelectTrigger>
                           <SelectContent className="max-h-[300px]">
                              {fabricSpecs.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nazvanie_tkani} ({s.kod_tkani})</SelectItem>)}
                           </SelectContent>
                         </Select>
                      </div>

                      {selectedSpec && (
                          <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 text-sm">
                              <div className="text-xs text-zinc-400 mb-2">Характеристики ткани:</div>
                              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                                 <div>Основа: <span className="text-white">{selectedSpec.osnova_denye}D</span></div>
                                 <div>Уток: <span className="text-white">{selectedSpec.utok_denye}D</span></div>
                                 <div>Расход основы: <span className="text-emerald-400">{selectedSpec.osnova_itogo_kg} кг/м</span></div>
                                 <div>Расход утка: <span className="text-emerald-400">{selectedSpec.utok_itogo_kg} кг/м</span></div>
                              </div>
                          </div>
                      )}
                   </div>
                )}

                {/* Оператор */}
                <div>
                    <Label className="text-zinc-400">Оператор *</Label>
                    <Select value={formData.operator_id} onValueChange={v => setFormData({...formData, operator_id: v})}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Выберите оператора..."/></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

             </CardContent>
           </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="lg:col-span-7 space-y-6">
           <Card className="bg-zinc-900 border-zinc-800 h-full">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Ruler size={18}/> 2. Результаты Смены</CardTitle></CardHeader>
              <CardContent className="space-y-6">

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <Label className="text-zinc-300 flex items-center gap-2"><Scroll size={16}/> Метров наткано *</Label>
                       <Input
                          type="number"
                          className="h-16 text-4xl font-bold bg-zinc-950 border-zinc-700 text-white focus:border-amber-500"
                          placeholder="0"
                          value={formData.length}
                          onChange={e => setFormData({...formData, length: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-zinc-300 flex items-center gap-2"><Weight size={16}/> Вес (кг)</Label>
                       <Input
                          type="number"
                          className="h-16 text-3xl font-bold bg-zinc-950 border-zinc-700 text-zinc-300"
                          placeholder="0"
                          value={formData.weight}
                          onChange={e => setFormData({...formData, weight: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Примечания */}
                 <div>
                    <Label className="text-zinc-400">Примечания</Label>
                    <Input
                       className="bg-zinc-950 border-zinc-700 text-white"
                       placeholder="Комментарий к смене..."
                       value={formData.notes}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                 </div>

                 {/* БЛОК ЗАВЕРШЕНИЯ РУЛОНА - показываем всегда когда выбран станок */}
                 {formData.machine_id && (
                   <div className={`p-5 rounded-xl border transition-all ${
                      formData.is_finished
                        ? 'bg-red-900/30 border-red-700'
                        : 'bg-zinc-800/40 border-zinc-700/50'
                   }`}>
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full transition-colors ${formData.is_finished ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                               <StopCircle size={24} />
                            </div>
                            <div>
                               <div className="font-bold text-white text-lg">Снять рулон со станка?</div>
                               <div className="text-sm text-zinc-400">
                                  {formData.is_finished
                                    ? '⚠️ Рулон будет завершён, нить будет списана'
                                    : 'Работа продолжится на следующей смене (нить НЕ списывается)'}
                               </div>
                            </div>
                         </div>
                         <input
                            type="checkbox"
                            className="w-7 h-7 accent-red-600 cursor-pointer rounded"
                            checked={formData.is_finished}
                            onChange={e => setFormData({...formData, is_finished: e.target.checked})}
                         />
                      </div>

                      {/* Выбор партий нити для списания (только при завершении) */}
                      {formData.is_finished && currentSpec && (
                         <div className="space-y-3 pt-4 border-t border-zinc-700/50 animate-in fade-in">
                            <div className="text-xs text-red-300 font-bold uppercase mb-2">Списание нити со склада экструзии (за весь рулон: {totalRollLength} м)</div>

                            <div className="grid grid-cols-2 gap-3">
                               <div>
                                  <Label className="text-xs text-zinc-400">Партия Основы ({currentSpec.osnova_denye}D)</Label>
                                  <Select value={formData.warp_batch_id} onValueChange={v => setFormData({...formData, warp_batch_id: v})}>
                                     <SelectTrigger className="h-9 text-xs bg-zinc-900 border-zinc-600"><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                                     <SelectContent>
                                        {getMatchingYarns(currentSpec.osnova_denye).map(y => (
                                           <SelectItem key={y.id} value={y.id}>
                                              {y.batch_number || y.name} ({y.quantity_kg?.toFixed(1)} кг)
                                           </SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                                  <div className="text-xs text-red-400 mt-1">Спишется: ~{warpConsumption} кг</div>
                               </div>

                               <div>
                                  <Label className="text-xs text-zinc-400">Партия Утка ({currentSpec.utok_denye}D)</Label>
                                  <Select value={formData.weft_batch_id} onValueChange={v => setFormData({...formData, weft_batch_id: v})}>
                                     <SelectTrigger className="h-9 text-xs bg-zinc-900 border-zinc-600"><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                                     <SelectContent>
                                        {getMatchingYarns(currentSpec.utok_denye).map(y => (
                                           <SelectItem key={y.id} value={y.id}>
                                              {y.batch_number || y.name} ({y.quantity_kg?.toFixed(1)} кг)
                                           </SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                                  <div className="text-xs text-red-400 mt-1">Спишется: ~{weftConsumption} кг</div>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                 )}

                 <Button
                    onClick={handleSubmit}
                    disabled={loading || !formData.machine_id || !formData.operator_id || !formData.length}
                    className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${
                       formData.is_finished
                         ? 'bg-red-600 hover:bg-red-700 text-white'
                         : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                 >
                    {loading ? 'Сохранение...' : (
                       <span className="flex items-center gap-2">
                          {formData.is_finished ? <CheckCircle2 /> : <Save />}
                          {formData.is_finished
                            ? 'Завершить рулон и списать нить'
                            : 'Записать данные смены (продолжить рулон)'}
                       </span>
                    )}
                 </Button>

              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
