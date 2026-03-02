'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Scroll, Ruler, Weight, PlayCircle, PlusCircle,
  StopCircle, CheckCircle2, Factory, Save, Search, Sun, Moon, User, ArrowLeft
} from "lucide-react";

interface ActiveRoll {
  id: string;
  roll_number: string;
  loom_id: string;
  fabric_spec_id: number;
  status: string;
  total_length: number;
  total_weight: number;
  warp_batch_id?: string;
  weft_batch_id?: string;
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
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Справочники
  const [looms, setLooms] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [fabricSpecs, setFabricSpecs] = useState<any[]>([]);
  const [yarnStock, setYarnStock] = useState<any[]>([]);

  // Активный рулон на выбранном станке
  const [activeRoll, setActiveRoll] = useState<ActiveRoll | null>(null);

  // Поиск и фильтрация тканей
  const [fabricSearch, setFabricSearch] = useState('');
  const [fabricCategory, setFabricCategory] = useState<'all' | 'recent'>('all');

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
      const { data: emp } = await supabase.from('employees').select('*').eq('is_active', true).order('full_name');
      const { data: specs } = await supabase.from('tkan_specifications').select('*').order('shirina_polotna_sm');
      const { data: yarn } = await supabase.from('yarn_inventory').select('*').gt('quantity_kg', 0);

      if (mach) setLooms(mach);
      if (emp) setEmployees(emp);
      if (specs) setFabricSpecs(specs);
      if (yarn) setYarnStock(yarn);
    };
    fetchData();
  }, []);

  // Автоматический выбор станка из URL
  useEffect(() => {
    const machineId = searchParams.get('machine_id');
    if (machineId && looms.length > 0 && !formData.machine_id) {
      handleMachineChange(machineId);
    }
  }, [looms, searchParams]);

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
    // Проверяем оба поля: yarn_denier и denier (для совместимости)
    const matches = yarnStock.filter(y => y.yarn_denier === targetDenier || y.denier === targetDenier);
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

  // Расчет расхождения веса (теоретический vs фактический)
  const theoreticalWeight = Number(warpConsumption) + Number(weftConsumption);
  const totalRollWeight = (activeRoll?.total_weight || 0) + Number(formData.weight || 0);
  const weightDifference = totalRollWeight - theoreticalWeight;
  const weightDifferencePercent = theoreticalWeight > 0
    ? ((weightDifference / theoreticalWeight) * 100).toFixed(1)
    : '0';

  // Фильтрация и сортировка тканей
  const filteredFabrics = fabricSpecs.filter(fabric => {
    const searchLower = fabricSearch.toLowerCase();
    return !fabricSearch ||
      fabric.nazvanie_tkani?.toLowerCase().includes(searchLower) ||
      fabric.kod_tkani?.toLowerCase().includes(searchLower) ||
      fabric.osnova_denye?.toString().includes(searchLower) ||
      fabric.utok_denye?.toString().includes(searchLower);
  });

  const handleSubmit = async () => {
    if (!formData.machine_id || !formData.operator_id || !formData.length) {
      toast.warning('Заполните все обязательные поля', {
        description: 'Необходимо выбрать: Станок, Оператор и указать Длину',
      });
      return;
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

        if (!formData.warp_batch_id || !formData.weft_batch_id) {
          throw new Error('Выберите партии нити для основы и утка!');
        }

        // Генерируем номер рулона
        const datePart = formData.date.replace(/-/g, '').slice(2);
        const loomCode = looms.find(l => l.id === formData.machine_id)?.code || 'L';
        rollNum = `R-${datePart}-${loomCode}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        // Создаем новый рулон со статусом 'active' + СРАЗУ СОХРАНЯЕМ ПАРТИИ НИТИ
        const { data: newRoll, error: createError } = await supabase
          .from('weaving_rolls')
          .insert([{
            roll_number: rollNum,
            loom_id: formData.machine_id,
            fabric_spec_id: Number(formData.fabric_spec_id),
            warp_batch_id: formData.warp_batch_id,  // ← СОХРАНЯЕМ ПАРТИЮ ОСНОВЫ
            weft_batch_id: formData.weft_batch_id,  // ← СОХРАНЯЕМ ПАРТИЮ УТКА
            status: 'active',
            total_length: 0,
            total_weight: 0
          }])
          .select()
          .single();

        if (createError) throw new Error('Ошибка создания рулона: ' + createError.message);

        rollId = newRoll.id;
        console.log("✅ Создан новый рулон:", rollNum);
        console.log("📦 Партия основы:", formData.warp_batch_id);
        console.log("📦 Партия утка:", formData.weft_batch_id);
      }

      // ═══════════════════════════════════════════════════════════════
      // СЦЕНАРИЙ Б: ЗАПИСЬ ДАННЫХ СМЕНЫ (для любого рулона)
      // ═══════════════════════════════════════════════════════════════
      const length = Number(formData.length);
      const weight = Number(formData.weight) || 0;

      // Рассчитываем расход нити ЗА ЭТУ СМЕНУ
      const shiftWarpUsage = currentSpec ? Number((length * (currentSpec.osnova_itogo_kg || 0)).toFixed(2)) : 0;
      const shiftWeftUsage = currentSpec ? Number((length * (currentSpec.utok_itogo_kg || 0)).toFixed(2)) : 0;

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
          warp_usage_kg: shiftWarpUsage,
          weft_usage_kg: shiftWeftUsage,
          notes: formData.notes,
          is_final_shift: formData.is_finished // Помечаем если это завершающая смена
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

        // Получаем актуальные данные рулона для списания
        const { data: rollData, error: fetchError } = await supabase
          .from('weaving_rolls')
          .select('warp_batch_id, weft_batch_id')
          .eq('id', rollId)
          .single();

        if (fetchError) throw new Error('Ошибка получения данных рулона: ' + fetchError.message);

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

        // 2. Списываем нить со склада экструзии (используем сохраненные партии из БД!)
        const totalWarp = Number(warpConsumption);
        const totalWeft = Number(weftConsumption);

        let warpBatchNumber = '';
        let weftBatchNumber = '';

        if (rollData.warp_batch_id && totalWarp > 0) {
          const warpBatch = yarnStock.find(y => y.id === rollData.warp_batch_id);
          if (warpBatch) {
            warpBatchNumber = warpBatch.batch_number || warpBatch.name || '';
            const newQty = Math.max(0, (warpBatch.quantity_kg || 0) - totalWarp);
            await supabase
              .from('yarn_inventory')
              .update({ quantity_kg: newQty, quantity: newQty, last_updated: new Date().toISOString() })
              .eq('id', rollData.warp_batch_id);
            console.log(`📦 Списано основы: ${totalWarp} кг из партии ${warpBatchNumber}`);
          }
        }

        if (rollData.weft_batch_id && totalWeft > 0) {
          const weftBatch = yarnStock.find(y => y.id === rollData.weft_batch_id);
          if (weftBatch) {
            weftBatchNumber = weftBatch.batch_number || weftBatch.name || '';
            const newQty = Math.max(0, (weftBatch.quantity_kg || 0) - totalWeft);
            await supabase
              .from('yarn_inventory')
              .update({ quantity_kg: newQty, quantity: newQty, last_updated: new Date().toISOString() })
              .eq('id', rollData.weft_batch_id);
            console.log(`📦 Списано утка: ${totalWeft} кг из партии ${weftBatchNumber}`);
          }
        }

        toast.success('Рулон завершён и отправлен на склад!', {
          description: `Рулон ${rollNum}\nИтого: ${newTotalLength} м / ${newTotalWeight} кг\nСписано: Основа ${totalWarp} кг, Уток ${totalWeft} кг`,
          duration: 5000,
        });
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

        toast.success('Данные записаны!', {
          description: `Рулон ${rollNum} продолжает работу\nТекущий итог: ${newTotalLength} м / ${newTotalWeight} кг\n💡 Нить НЕ списана (рулон не снят)`,
          duration: 4000,
        });
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
      toast.error('Ошибка!', {
        description: e.message,
        duration: 5000,
      });
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
        <div className="flex gap-3 items-center">
           <Link
             href="/production/weaving/machines"
             className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors text-white flex items-center gap-2 border border-zinc-700 text-base whitespace-nowrap"
           >
             <ArrowLeft size={20} />
             <Factory size={20} />
             К станкам
           </Link>
           <Input
             type="date"
             value={formData.date}
             onChange={e => setFormData({...formData, date: e.target.value})}
             className="bg-zinc-900 border-zinc-700 text-white h-10"
           />
           <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
             <button
               onClick={() => setFormData({...formData, shift: 'День'})}
               className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                 formData.shift === 'День'
                   ? 'bg-yellow-600 text-white shadow-lg'
                   : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
               }`}
             >
               <Sun size={18} />
               День
             </button>
             <button
               onClick={() => setFormData({...formData, shift: 'Ночь'})}
               className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                 formData.shift === 'Ночь'
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-5 space-y-6">
           {/* Предупреждение если не выбран станок */}
           {!formData.machine_id && (
             <Card className="bg-card border-l-4 border-l-yellow-500">
               <CardContent className="pt-6">
                 <div className="text-center text-yellow-400">
                   <div className="text-4xl mb-2">⚠️</div>
                   <div className="font-bold mb-1">Выберите станок</div>
                   <div className="text-xs text-muted-foreground">
                     Для начала работы необходимо выбрать ткацкий станок
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}

           {/* Предупреждение если новый рулон и не выбрана ткань */}
           {formData.machine_id && !activeRoll && !formData.fabric_spec_id && (
             <Card className="bg-card border-l-4 border-l-yellow-500">
               <CardContent className="pt-6">
                 <div className="text-center text-yellow-400">
                   <div className="text-4xl mb-2">⚠️</div>
                   <div className="font-bold mb-1">Выберите спецификацию ткани</div>
                   <div className="text-xs text-muted-foreground">
                     Для начала нового рулона необходимо выбрать спецификацию ткани
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}

           <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader><CardTitle className="text-white flex items-center gap-2"><Factory size={18}/> Станок и Рулон</CardTitle></CardHeader>
             <CardContent className="space-y-6">

                {/* Информация о выбранном станке */}
                {formData.machine_id ? (
                  <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                        <Factory size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-amber-300 font-bold uppercase">Выбранный станок</div>
                        <div className="text-xl font-bold text-white">
                          {looms.find(l => l.id === formData.machine_id)?.name}
                        </div>
                        {looms.find(l => l.id === formData.machine_id)?.code && (
                          <div className="text-xs text-zinc-400 mt-1">
                            Код: {looms.find(l => l.id === formData.machine_id)?.code}
                          </div>
                        )}
                      </div>
                      <Link
                        href="/production/weaving/machines"
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors border border-zinc-700"
                      >
                        Сменить
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
                    <Factory size={48} className="text-zinc-600 mx-auto mb-3" />
                    <div className="text-zinc-400 mb-3">Станок не выбран</div>
                    <Link
                      href="/production/weaving/machines"
                      className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white font-medium transition-colors"
                    >
                      Выбрать станок
                    </Link>
                  </div>
                )}

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

                {/* ЕСЛИ НОВЫЙ РУЛОН - ВЫБОР ТКАНИ И ПАРТИЙ НИТИ */}
                {!activeRoll && formData.machine_id && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div>
                         <Label className="text-emerald-400 mb-2">Спецификация Ткани *</Label>

                         {/* Поиск по ткани */}
                         <div className="relative mb-3">
                           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                           <Input
                             placeholder="Поиск по названию, коду, денье..."
                             value={fabricSearch}
                             onChange={e => setFabricSearch(e.target.value)}
                             className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                           />
                         </div>

                         {/* Список тканей */}
                         <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                           {filteredFabrics.length === 0 ? (
                             <div className="text-center py-6 text-zinc-500">
                               Ничего не найдено
                             </div>
                           ) : (
                             filteredFabrics.map(fabric => (
                               <button
                                 key={fabric.id}
                                 onClick={() => {
                                   setFormData({...formData, fabric_spec_id: fabric.id.toString()});
                                   setFabricSearch('');
                                 }}
                                 className={`w-full text-left p-3 rounded-lg border transition-all ${
                                   formData.fabric_spec_id === fabric.id.toString()
                                     ? 'bg-emerald-600 border-emerald-500 shadow-lg'
                                     : 'bg-zinc-800 border-zinc-700 hover:border-emerald-600'
                                 }`}
                               >
                                 <div className="font-medium text-white">{fabric.nazvanie_tkani}</div>
                                 <div className="text-xs text-zinc-400 mt-1">
                                   Код: {fabric.kod_tkani || '-'} | Ширина: {fabric.shirina_polotna_sm || '-'}см | Плотность: {fabric.plotnost_polotna_gr_m2 || '-'} г/м²
                                 </div>
                                 <div className="text-xs text-zinc-500 mt-1">
                                   Основа: {fabric.osnova_denye || '-'}D/{fabric.osnova_shirina_niti_sm || '-'}мм | Уток: {fabric.utok_denye || '-'}D/{fabric.utok_shirina_niti_sm || '-'}мм{fabric.tip ? ` | ${fabric.tip}` : ''}
                                 </div>
                               </button>
                             ))
                           )}
                         </div>
                      </div>

                      {selectedSpec && (
                          <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 text-sm">
                              <div className="text-xs text-zinc-400 mb-2">Характеристики ткани:</div>
                              <div className="grid grid-cols-2 gap-2 text-zinc-300 mb-3">
                                 <div>Ширина полотна: <span className="text-white font-bold">{selectedSpec.shirina_polotna_sm || '-'} см</span></div>
                                 <div>Плотность: <span className="text-white font-bold">{selectedSpec.plotnost_polotna_gr_m2 || '-'} г/м²</span></div>
                                 {selectedSpec.tip && (
                                   <div className="col-span-2">Тип плетения: <span className="text-amber-400 font-bold">{selectedSpec.tip}</span></div>
                                 )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-2 border-t border-zinc-700/50">
                                 <div>Основа: <span className="text-white">{selectedSpec.osnova_denye || '-'}D / {selectedSpec.osnova_shirina_niti_sm || '-'}мм</span></div>
                                 <div>Уток: <span className="text-white">{selectedSpec.utok_denye || '-'}D / {selectedSpec.utok_shirina_niti_sm || '-'}мм</span></div>
                                 <div>Расход основы: <span className="text-emerald-400">{selectedSpec.osnova_itogo_kg || 0} кг/м</span></div>
                                 <div>Расход утка: <span className="text-emerald-400">{selectedSpec.utok_itogo_kg || 0} кг/м</span></div>
                              </div>
                          </div>
                      )}

                      {/* ВЫБОР ПАРТИЙ НИТИ ДЛЯ НОВОГО РУЛОНА */}
                      {selectedSpec && (
                         <div className="space-y-3 p-3 bg-emerald-900/10 border border-emerald-800/30 rounded-lg">
                            <div className="text-xs text-emerald-400 font-bold uppercase">Выберите партии нити *</div>

                            <div>
                               <Label className="text-xs text-zinc-400">Партия Основы ({selectedSpec.osnova_denye}D)</Label>
                               <Select value={formData.warp_batch_id} onValueChange={v => setFormData({...formData, warp_batch_id: v})}>
                                  <SelectTrigger className="h-9 text-sm bg-zinc-900 border-zinc-600"><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                                  <SelectContent>
                                     {getMatchingYarns(selectedSpec.osnova_denye).length === 0 ? (
                                        <div className="px-2 py-4 text-xs text-center text-zinc-500">
                                           Нет партий нити {selectedSpec.osnova_denye}D на складе
                                        </div>
                                     ) : (
                                        getMatchingYarns(selectedSpec.osnova_denye).map(y => (
                                           <SelectItem key={y.id} value={y.id}>
                                              {y.batch_number || y.name} {y.yarn_name ? `- ${y.yarn_name}` : ''} ({y.quantity_kg?.toFixed(1)} кг)
                                           </SelectItem>
                                        ))
                                     )}
                                  </SelectContent>
                               </Select>
                               {formData.warp_batch_id && (() => {
                                 const selectedYarn = yarnStock.find(y => y.id === formData.warp_batch_id);
                                 if (selectedYarn && selectedYarn.denier !== selectedSpec.osnova_denye) {
                                   return (
                                     <div className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                                       ⚠️ Несоответствие: выбрана нить {selectedYarn.denier}D, требуется {selectedSpec.osnova_denye}D
                                     </div>
                                   );
                                 }
                               })()}
                            </div>

                            <div>
                               <Label className="text-xs text-zinc-400">Партия Утка ({selectedSpec.utok_denye}D)</Label>
                               <Select value={formData.weft_batch_id} onValueChange={v => setFormData({...formData, weft_batch_id: v})}>
                                  <SelectTrigger className="h-9 text-sm bg-zinc-900 border-zinc-600"><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                                  <SelectContent>
                                     {getMatchingYarns(selectedSpec.utok_denye).length === 0 ? (
                                        <div className="px-2 py-4 text-xs text-center text-zinc-500">
                                           Нет партий нити {selectedSpec.utok_denye}D на складе
                                        </div>
                                     ) : (
                                        getMatchingYarns(selectedSpec.utok_denye).map(y => (
                                           <SelectItem key={y.id} value={y.id}>
                                              {y.batch_number || y.name} {y.yarn_name ? `- ${y.yarn_name}` : ''} ({y.quantity_kg?.toFixed(1)} кг)
                                           </SelectItem>
                                        ))
                                     )}
                                  </SelectContent>
                               </Select>
                               {formData.weft_batch_id && (() => {
                                 const selectedYarn = yarnStock.find(y => y.id === formData.weft_batch_id);
                                 if (selectedYarn && selectedYarn.denier !== selectedSpec.utok_denye) {
                                   return (
                                     <div className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                                       ⚠️ Несоответствие: выбрана нить {selectedYarn.denier}D, требуется {selectedSpec.utok_denye}D
                                     </div>
                                   );
                                 }
                               })()}
                            </div>

                            <div className="text-xs text-zinc-500 italic">
                               💡 Партии будут списаны при завершении рулона
                            </div>
                         </div>
                      )}
                   </div>
                )}

                {/* Оператор */}
                <div>
                    <Label className="text-zinc-400 mb-3 block">Оператор *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {employees.filter(e => e.role === 'operator_weaving' || e.department === 'weaving').map(employee => (
                        <button
                          key={employee.id}
                          onClick={() => setFormData({...formData, operator_id: employee.id})}
                          className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                            formData.operator_id === employee.id
                              ? 'bg-blue-600 border-blue-500 shadow-lg'
                              : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              formData.operator_id === employee.id ? 'bg-blue-500' : 'bg-zinc-700'
                            }`}>
                              <User size={20} className="text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${
                                formData.operator_id === employee.id ? 'text-white' : 'text-zinc-300'
                              }`}>
                                {employee.full_name}
                              </div>
                              {employee.employee_code && (
                                <div className={`text-xs ${
                                  formData.operator_id === employee.id ? 'text-blue-200' : 'text-zinc-500'
                                }`}>
                                  {employee.employee_code}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                </div>

             </CardContent>
           </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="lg:col-span-7 space-y-6">
           <Card className="bg-zinc-900 border-zinc-800 h-full">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Ruler size={18}/> Результаты Смены</CardTitle></CardHeader>
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
                       <Label className={`flex items-center gap-2 ${formData.is_finished ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                         <Weight size={16}/>
                         Итоговый вес рулона (кг) {formData.is_finished && '*'}
                       </Label>
                       {formData.is_finished && (
                         <div className="text-xs text-red-300 mb-1 flex items-center gap-1">
                           ⚠️ Обязательно при завершении рулона
                         </div>
                       )}
                       <Input
                          type="number"
                          step="0.01"
                          className={`h-16 text-3xl font-bold bg-zinc-950 ${
                            formData.is_finished
                              ? 'border-red-600 border-2 text-red-400 focus:border-red-500'
                              : 'border-zinc-700 text-zinc-300'
                          }`}
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

                      {/* Информация о списании нити (только при завершении) */}
                      {formData.is_finished && currentSpec && (
                         <div className="space-y-3 pt-4 border-t border-zinc-700/50 animate-in fade-in">
                            <div className="text-xs text-red-300 font-bold uppercase mb-2">
                               Будет списано нити (за весь рулон: {totalRollLength} м)
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                               <div className="p-3 bg-red-900/20 border border-red-800/30 rounded">
                                  <div className="text-xs text-zinc-400 mb-1">Основа ({currentSpec.osnova_denye}D)</div>
                                  <div className="text-sm font-bold text-white">
                                     {yarnStock.find(y => y.id === (activeRoll?.warp_batch_id || formData.warp_batch_id))?.batch_number || 'Не указана'}
                                  </div>
                                  <div className="text-xs text-red-400 mt-1">Спишется: ~{warpConsumption} кг</div>
                               </div>

                               <div className="p-3 bg-red-900/20 border border-red-800/30 rounded">
                                  <div className="text-xs text-zinc-400 mb-1">Уток ({currentSpec.utok_denye}D)</div>
                                  <div className="text-sm font-bold text-white">
                                     {yarnStock.find(y => y.id === (activeRoll?.weft_batch_id || formData.weft_batch_id))?.batch_number || 'Не указана'}
                                  </div>
                                  <div className="text-xs text-red-400 mt-1">Спишется: ~{weftConsumption} кг</div>
                               </div>
                            </div>

                            {/* Сравнение теоретического и фактического веса */}
                            {formData.weight && (
                              <div className={`p-4 rounded-lg border-2 ${
                                Math.abs(Number(weightDifferencePercent)) <= 5
                                  ? 'bg-green-900/20 border-green-800/50'
                                  : Math.abs(Number(weightDifferencePercent)) <= 10
                                  ? 'bg-yellow-900/20 border-yellow-800/50'
                                  : 'bg-red-900/20 border-red-800/50'
                              }`}>
                                <div className="text-xs font-bold uppercase mb-3 text-zinc-300">Контроль веса</div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <div className="text-xs text-zinc-400">Теоретический (основа + уток)</div>
                                    <div className="text-lg font-bold text-white">{theoreticalWeight.toFixed(2)} кг</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-zinc-400">Фактический (рулон)</div>
                                    <div className="text-lg font-bold text-white">{totalRollWeight.toFixed(2)} кг</div>
                                  </div>
                                </div>
                                <div className="pt-3 border-t border-zinc-700/50">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400">Расхождение:</span>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xl font-bold ${
                                        Math.abs(Number(weightDifferencePercent)) <= 5 ? 'text-green-400' :
                                        Math.abs(Number(weightDifferencePercent)) <= 10 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {weightDifference > 0 ? '+' : ''}{weightDifference.toFixed(2)} кг
                                      </span>
                                      <span className={`px-2 py-1 rounded font-bold text-sm ${
                                        Math.abs(Number(weightDifferencePercent)) <= 5 ? 'bg-green-600 text-white' :
                                        Math.abs(Number(weightDifferencePercent)) <= 10 ? 'bg-yellow-600 text-white' :
                                        'bg-red-600 text-white'
                                      }`}>
                                        {weightDifference > 0 ? '+' : ''}{weightDifferencePercent}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-zinc-500 italic">
                                  {Math.abs(Number(weightDifferencePercent)) <= 5 && '✅ Отличное соответствие'}
                                  {Math.abs(Number(weightDifferencePercent)) > 5 && Math.abs(Number(weightDifferencePercent)) <= 10 && '⚠️ Допустимое расхождение'}
                                  {Math.abs(Number(weightDifferencePercent)) > 10 && '❌ Значительное расхождение - проверьте данные'}
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-zinc-500 italic">
                               ℹ️ {activeRoll ? 'Партии были выбраны при создании рулона' : 'Выбранные партии нити будут списаны'}
                            </div>
                         </div>
                      )}
                   </div>
                 )}

                 {/* Проверка готовности формы */}
                 {(() => {
                   const missingFields = [];
                   if (!formData.machine_id) missingFields.push('Выберите станок');
                   if (!activeRoll && !formData.fabric_spec_id) missingFields.push('Выберите спецификацию ткани');
                   if (!activeRoll && selectedSpec && !formData.warp_batch_id) missingFields.push('Выберите партию основы');
                   if (!activeRoll && selectedSpec && !formData.weft_batch_id) missingFields.push('Выберите партию утка');
                   if (!formData.operator_id) missingFields.push('Выберите оператора');
                   if (!formData.length) missingFields.push('Укажите метры наткано');
                   if (formData.is_finished && !formData.weight) missingFields.push('⚠️ Укажите итоговый вес рулона (обязательно при завершении)');

                   return missingFields.length > 0 && (
                     <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3">
                       <div className="font-bold mb-2">⚠️ Заполните обязательные поля:</div>
                       <ul className="space-y-1 ml-4">
                         {missingFields.map((field, idx) => (
                           <li key={idx}>• {field}</li>
                         ))}
                       </ul>
                     </div>
                   );
                 })()}

                 <Button
                    onClick={handleSubmit}
                    disabled={loading || !formData.machine_id || !formData.operator_id || !formData.length || (formData.is_finished && !formData.weight)}
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
