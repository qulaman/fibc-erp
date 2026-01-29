'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ribbon, Save, Layers } from "lucide-react";

export default function StrapsProductionPage() {
  const [loading, setLoading] = useState(false);
  
  // Данные БД
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [strapSpecs, setStrapSpecs] = useState<any[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);

  // Склады
  const [mfnStock, setMfnStock] = useState<any[]>([]);
  const [yarnStock, setYarnStock] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День',
    machine_id: '',
    operator_id: '',
    strap_type_id: '',

    length: '',
    weight: '',
    defect_weight: '',

    // Источники сырья
    weft_source: 'mfn',
    weft_item_id: '',
    weft_amount: '',

    warp_source: 'yarn',
    warp_item_id: '',
    warp_amount: '',

    notes: ''
  });

  // Вес по спецификации (для справки)
  const [calculatedWeight, setCalculatedWeight] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Справочники
    const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'loom_flat');
    const { data: emp } = await supabase.from('employees').select('*');
    const { data: specs } = await supabase
      .from('strop_specifications')
      .select('*')
      .eq('is_active', true)
      .order('nazvanie');

    // 2. Склад МФН
    const { data: raw } = await supabase.from('view_mfn_balance').select('*');

    // 3. Склад Нити (ПП) - Читаем всё, фильтруем в браузере
    const { data: yarns } = await supabase
        .from('yarn_inventory')
        .select('*')
        .order('last_updated', { ascending: false });

    if (mach) setMachines(mach);
    if (emp) setOperators(emp);
    if (specs) setStrapSpecs(specs);
    if (raw) setMfnStock(raw || []);

    // Фильтруем нить: показываем только те, где есть вес (в любой из колонок)
    if (yarns) {
        const activeYarns = yarns.filter(y => {
            const qty = y.quantity_kg || y.quantity || 0;
            return qty > 0;
        });
        setYarnStock(activeYarns);
    }
  };

  // Обработка выбора стропы
  const handleStrapSelect = (specId: string) => {
    const spec = strapSpecs.find(s => s.id.toString() === specId);
    if (spec) {
      setSelectedSpec(spec);
      setFormData(prev => ({
        ...prev,
        strap_type_id: specId,
        // Автоматически устанавливаем источники материалов по спецификации
        warp_source: spec.osnova_nit_type === 'ПП' ? 'yarn' : 'mfn',
        weft_source: 'mfn', // Уток всегда МФН
        warp_item_id: '',
        weft_item_id: '',
        warp_amount: '',
        weft_amount: '',
        weight: ''
      }));
    }
  };

  // Автоматический расчет расхода при вводе метров
  const handleLengthChange = (meters: string) => {
    setFormData(prev => ({ ...prev, length: meters }));

    if (selectedSpec && meters) {
      const m = Number(meters);
      if (m > 0) {
        // Расчет веса стропы по спецификации (только для справки)
        const calcWeight = (selectedSpec.ves_1_pogonnogo_m_gr * m / 1000).toFixed(2);
        setCalculatedWeight(calcWeight);

        // Расчет расхода материалов
        const weftAmount = (selectedSpec.utok_itogo_kg * m).toFixed(3);
        const warpAmount = (selectedSpec.osnova_itogo_kg * m).toFixed(3);

        setFormData(prev => ({
          ...prev,
          weft_amount: weftAmount,
          warp_amount: warpAmount
        }));
      } else {
        setCalculatedWeight('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.strap_type_id || !formData.length) return alert('Заполните: Стропа и Длина');
    if (!selectedSpec) return alert('Спецификация не выбрана');
    if (!formData.weft_item_id || !formData.warp_item_id) return alert('Выберите материалы для утка и основы');

    // Проверка достаточности материалов
    const weftAmount = Number(formData.weft_amount) || 0;
    const warpAmount = Number(formData.warp_amount) || 0;

    // Проверка утка
    if (formData.weft_source === 'mfn') {
      const weftItem = mfnStock.find(m => m.material_code === formData.weft_item_id);
      if (weftItem && Number(weftItem.balance_kg) < weftAmount) {
        return alert(`Недостаточно МФН для утка!\nДоступно: ${Number(weftItem.balance_kg).toFixed(2)} кг\nТребуется: ${weftAmount.toFixed(2)} кг`);
      }
    } else {
      const weftItem = yarnStock.find(y => y.id === formData.weft_item_id);
      if (weftItem) {
        const available = weftItem.quantity_kg || weftItem.quantity || 0;
        if (available < weftAmount) {
          return alert(`Недостаточно нити для утка!\nДоступно: ${available.toFixed(2)} кг\nТребуется: ${weftAmount.toFixed(2)} кг`);
        }
      }
    }

    // Проверка основы
    if (formData.warp_source === 'mfn') {
      const warpItem = mfnStock.find(m => m.material_code === formData.warp_item_id);
      if (warpItem && Number(warpItem.balance_kg) < warpAmount) {
        return alert(`Недостаточно МФН для основы!\nДоступно: ${Number(warpItem.balance_kg).toFixed(2)} кг\nТребуется: ${warpAmount.toFixed(2)} кг`);
      }
    } else {
      const warpItem = yarnStock.find(y => y.id === formData.warp_item_id);
      if (warpItem) {
        const available = warpItem.quantity_kg || warpItem.quantity || 0;
        if (available < warpAmount) {
          return alert(`Недостаточно нити для основы!\nДоступно: ${available.toFixed(2)} кг\nТребуется: ${warpAmount.toFixed(2)} кг`);
        }
      }
    }

    setLoading(true);

    try {
        const weftAmount = Number(formData.weft_amount) || 0;
        const warpAmount = Number(formData.warp_amount) || 0;

        const composition = {
            spec: selectedSpec.nazvanie,
            weft: { source: formData.weft_source, id: formData.weft_item_id, qty: weftAmount },
            warp: { source: formData.warp_source, id: formData.warp_item_id, qty: warpAmount }
        };

        // 1. Записываем производство
        const { error } = await supabase.from('production_straps').insert([{
            date: formData.date,
            shift: formData.shift,
            machine_id: formData.machine_id || null,
            operator_id: formData.operator_id || null,
            spec_name: selectedSpec.nazvanie,
            produced_length: Number(formData.length),
            produced_weight: Number(formData.weight),
            defect_weight: formData.defect_weight ? Number(formData.defect_weight) : 0,
            calculated_weight: Number(calculatedWeight),
            notes: `${formData.notes} | ${JSON.stringify(composition)}`
        }]);

        if (error) throw error;

        let writeOffMessages: string[] = [];

        // 2. СПИСАНИЕ СО СКЛАДА НИТИ (yarn_inventory) - получаем актуальные данные из БД
        // Списываем уток если выбран склад нити
        if (formData.weft_source === 'yarn' && formData.weft_item_id && weftAmount > 0) {
            // Получаем актуальное значение из БД
            const { data: currentItem, error: fetchError } = await supabase
                .from('yarn_inventory')
                .select('quantity_kg, name, batch_number')
                .eq('id', formData.weft_item_id)
                .single();

            console.log('Уток (нить) - текущие данные:', currentItem, 'Ошибка:', fetchError);

            if (currentItem) {
                const currentQty = currentItem.quantity_kg || 0;
                const newQty = Math.max(0, currentQty - weftAmount);
                const { error: updateError, data: updateData } = await supabase
                    .from('yarn_inventory')
                    .update({ quantity_kg: newQty, last_updated: new Date().toISOString() })
                    .eq('id', formData.weft_item_id)
                    .select();

                console.log('Уток (нить) - обновление:', { currentQty, weftAmount, newQty }, 'Результат:', updateData, 'Ошибка:', updateError);

                if (updateError) {
                    console.error('Ошибка списания утка (нить):', updateError);
                } else {
                    writeOffMessages.push(`Уток (нить): ${currentItem.batch_number || currentItem.name} - списано ${weftAmount} кг`);
                }
            }
        }

        // Списываем основу если выбран склад нити
        if (formData.warp_source === 'yarn' && formData.warp_item_id && warpAmount > 0) {
            const { data: currentItem, error: fetchError } = await supabase
                .from('yarn_inventory')
                .select('quantity_kg, name, batch_number')
                .eq('id', formData.warp_item_id)
                .single();

            console.log('Основа (нить) - текущие данные:', currentItem, 'Ошибка:', fetchError);

            if (currentItem) {
                const currentQty = currentItem.quantity_kg || 0;
                const newQty = Math.max(0, currentQty - warpAmount);
                const { error: updateError, data: updateData } = await supabase
                    .from('yarn_inventory')
                    .update({ quantity_kg: newQty, last_updated: new Date().toISOString() })
                    .eq('id', formData.warp_item_id)
                    .select();

                console.log('Основа (нить) - обновление:', { currentQty, warpAmount, newQty }, 'Результат:', updateData, 'Ошибка:', updateError);

                if (updateError) {
                    console.error('Ошибка списания основы (нить):', updateError);
                } else {
                    writeOffMessages.push(`Основа (нить): ${currentItem.batch_number || currentItem.name} - списано ${warpAmount} кг`);
                }
            }
        }

        // 3. СПИСАНИЕ СО СКЛАДА МФН - используем mfn_warehouse
        if (formData.weft_source === 'mfn' && formData.weft_item_id && weftAmount > 0) {
            const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const docNumber = `MFN-OUT-${datePrefix}-${randomSuffix}`;

            // Находим материал МФН для получения информации
            const mfnItem = mfnStock.find((m: any) => m.material_code === formData.weft_item_id);

            const { error: txError } = await supabase
                .from('mfn_warehouse')
                .insert([{
                    doc_number: docNumber,
                    operation_date: formData.date,
                    operation_type: 'Расход',
                    material_code: mfnItem?.material_code || formData.weft_item_id,
                    material_name: mfnItem?.material_name || 'МФН',
                    material_type: 'МФН',
                    denier: mfnItem?.denier,
                    color: mfnItem?.color,
                    quantity_kg: weftAmount,
                    destination: 'Цех Строп',
                    destination_doc: docNumber,
                    notes: `Списание на производство стропы (уток)`,
                    status: 'Активно'
                }]);

            console.log('МФН уток - расход:', { docNumber, weftAmount }, 'Ошибка:', txError);

            if (txError) {
                console.error('Ошибка списания утка (МФН):', txError);
            } else {
                writeOffMessages.push(`Уток (МФН): списано ${weftAmount} кг`);
            }
        }

        if (formData.warp_source === 'mfn' && formData.warp_item_id && warpAmount > 0) {
            const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const docNumber = `MFN-OUT-${datePrefix}-${randomSuffix}W`;

            // Находим материал МФН для получения информации
            const mfnItem = mfnStock.find((m: any) => m.material_code === formData.warp_item_id);

            const { error: txError } = await supabase
                .from('mfn_warehouse')
                .insert([{
                    doc_number: docNumber,
                    operation_date: formData.date,
                    operation_type: 'Расход',
                    material_code: mfnItem?.material_code || formData.warp_item_id,
                    material_name: mfnItem?.material_name || 'МФН',
                    material_type: 'МФН',
                    denier: mfnItem?.denier,
                    color: mfnItem?.color,
                    quantity_kg: warpAmount,
                    destination: 'Цех Строп',
                    destination_doc: docNumber,
                    notes: `Списание на производство стропы (основа)`,
                    status: 'Активно'
                }]);

            console.log('МФН основа - расход:', { docNumber, warpAmount }, 'Ошибка:', txError);

            if (txError) {
                console.error('Ошибка списания основы (МФН):', txError);
            } else {
                writeOffMessages.push(`Основа (МФН): списано ${warpAmount} кг`);
            }
        }

        const message = writeOffMessages.length > 0
            ? `✅ Стропа выпущена!\n\nСписано:\n${writeOffMessages.join('\n')}`
            : '✅ Стропа выпущена! (без списания материалов)';

        alert(message);
        setFormData(prev => ({...prev, length: '', weight: '', weft_amount: '', warp_amount: '', weft_item_id: '', warp_item_id: ''}));
        fetchData();

    } catch (e: any) {
        console.error('Общая ошибка:', e);
        alert('Ошибка: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  // Компонент выбора материала (УПРОЩЕННЫЙ - только выбор партии, расход автоматический)
  const MaterialSelector = ({ label, typeKey, idKey, amountKey }: any) => {
      // @ts-ignore
      const sourceType = formData[typeKey];
      // @ts-ignore
      const currentId = formData[idKey];
      // @ts-ignore
      const amount = formData[amountKey];

      const isLocked = selectedSpec !== null;

      // Проверка достаточности материала
      let availableQty = 0;
      let isInsufficient = false;

      if (currentId && amount) {
        if (sourceType === 'mfn') {
          const item = mfnStock.find(m => m.material_code === currentId);
          if (item) {
            availableQty = Number(item.balance_kg);
            isInsufficient = availableQty < Number(amount);
          }
        } else {
          const item = yarnStock.find(y => y.id === currentId);
          if (item) {
            availableQty = item.quantity_kg || item.quantity || 0;
            isInsufficient = availableQty < Number(amount);
          }
        }
      }

      return (
        <div className="border border-border p-4 rounded-lg bg-card/50 mb-4">
            <div className="flex items-center justify-between mb-3">
                <Label className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Layers size={14}/> {label}
                </Label>
                <div className="flex items-center gap-2">
                  {amount && (
                    <div className={`text-sm font-bold px-3 py-1 rounded border ${
                      isInsufficient
                        ? 'text-red-400 bg-red-900/20 border-red-800'
                        : 'text-green-400 bg-green-900/20 border-green-800'
                    }`}>
                      Расход: {amount} кг
                    </div>
                  )}
                  <Select
                    value={sourceType}
                    onValueChange={v => setFormData({...formData, [typeKey]: v, [idKey]: ''})}
                    disabled={isLocked}
                  >
                      <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="mfn">📦 Склад МФН</SelectItem>
                          <SelectItem value="yarn">🧵 Склад Нити (ПП)</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
            </div>

            {isLocked && (
              <div className="mb-3 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1">
                🔒 Источник определен спецификацией
              </div>
            )}

            {isInsufficient && (
              <div className="mb-3 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1">
                ⚠️ Недостаточно материала! Доступно: {availableQty.toFixed(2)} кг, требуется: {amount} кг
              </div>
            )}

            <div>
                <Label className="mb-2 block text-xs">Выберите партию для списания</Label>
                <Select value={currentId} onValueChange={v => setFormData({...formData, [idKey]: v})}>
                    <SelectTrigger><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                    <SelectContent>
                        {sourceType === 'mfn' ? (
                            // МФН нить
                            mfnStock.length === 0 ? <SelectItem value="none" disabled>Нет МФН</SelectItem> :
                            mfnStock.map(m => {
                                const balance = Number(m.balance_kg);
                                const needsAmount = Number(amount) || 0;
                                const hasEnough = balance >= needsAmount;

                                return (
                                    <SelectItem key={m.material_code} value={m.material_code}>
                                        {m.material_name} {m.denier ? `(${m.denier}D)` : ''} {m.color ? `- ${m.color}` : ''}
                                        {' '}[Ост: {balance.toFixed(2)} кг{!hasEnough && needsAmount > 0 ? ' ❌' : ''}]
                                    </SelectItem>
                                );
                            })
                        ) : (
                            // НИТЬ (Своя)
                            yarnStock.length === 0 ? <SelectItem value="none" disabled>Нет Нити</SelectItem> :
                            yarnStock.map(y => {
                                const name = y.yarn_name || y.name || 'Нить б/н';
                                const qty = y.quantity_kg || y.quantity || 0;
                                const batch = y.batch_number || '---';
                                const denier = y.yarn_denier ? `(${y.yarn_denier}D)` : '';
                                const needsAmount = Number(amount) || 0;
                                const hasEnough = qty >= needsAmount;

                                return (
                                    <SelectItem key={y.id} value={y.id}>
                                        {batch} — {name} {denier} [Ост: {qty} кг{!hasEnough && needsAmount > 0 ? ' ❌' : ''}]
                                    </SelectItem>
                                )
                            })
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
      );
  }

  return (
    <div className="page-container">
      <div className="header-section">
        <h1 className="h1-bold">
           <span className="bg-blue-600 p-2 rounded-lg text-white"><Ribbon size={24}/></span>
           Цех Строп
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-8">
           
           <Card className="bg-card mb-6">
              <CardHeader><CardTitle>1. Параметры выпуска</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label>Станок</Label>
                    <Select onValueChange={v => setFormData({...formData, machine_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                        <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Label>Тип Стропы</Label>
                    <Select onValueChange={handleStrapSelect} value={formData.strap_type_id}>
                        <SelectTrigger><SelectValue placeholder="Выберите стропу..." /></SelectTrigger>
                        <SelectContent>
                            {strapSpecs.length === 0 ? <SelectItem value="none" disabled>Нет спецификаций</SelectItem> :
                             strapSpecs.map(s => (
                               <SelectItem key={s.id} value={s.id.toString()}>
                                 {s.nazvanie} ({s.osnova_nit_type === 'ПП' ? 'ПП+МФН' : '100% МФН'})
                               </SelectItem>
                             ))
                            }
                        </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Label>Оператор</Label>
                    <Select onValueChange={v => setFormData({...formData, operator_id: v})}>
                        <SelectTrigger><SelectValue placeholder="ФИО..." /></SelectTrigger>
                        <SelectContent>{operators.map(o => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Label>Смена</Label>
                    <Select value={formData.shift} onValueChange={v => setFormData({...formData, shift: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="День">День</SelectItem><SelectItem value="Ночь">Ночь</SelectItem></SelectContent>
                    </Select>
                 </div>
              </CardContent>
           </Card>

           {/* Спецификация выбранной стропы */}
           {!selectedSpec ? (
             <Card className="bg-card mb-6 border-l-4 border-l-yellow-500">
               <CardContent className="pt-6">
                 <div className="text-center text-yellow-400">
                   <div className="text-4xl mb-2">⚠️</div>
                   <div className="font-bold mb-1">Выберите тип стропы</div>
                   <div className="text-xs text-muted-foreground">
                     Для расчета расхода материалов необходимо выбрать тип стропы из спецификации
                   </div>
                 </div>
               </CardContent>
             </Card>
           ) : (
             <Card className="bg-card mb-6 border-l-4 border-l-purple-500">
               <CardHeader className="pb-3">
                 <CardTitle className="text-purple-400">📋 Спецификация: {selectedSpec.nazvanie}</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                   <div>
                     <div className="text-muted-foreground text-xs">Ширина</div>
                     <div className="font-bold">{selectedSpec.shirina_mm} мм</div>
                   </div>
                   <div>
                     <div className="text-muted-foreground text-xs">Плотность</div>
                     <div className="font-bold">{selectedSpec.plotnost_gr_mp} гр/мп</div>
                   </div>
                   <div>
                     <div className="text-muted-foreground text-xs">Основа</div>
                     <div className="font-bold text-blue-400">
                       {selectedSpec.osnova_nit_type} {selectedSpec.osnova_denye}D
                     </div>
                   </div>
                   <div>
                     <div className="text-muted-foreground text-xs">Уток</div>
                     <div className="font-bold text-purple-400">
                       МФН {selectedSpec.utok_denye}D
                     </div>
                   </div>
                 </div>
                 <Separator className="my-4" />
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="bg-zinc-800/50 p-3 rounded">
                     <div className="text-muted-foreground text-xs mb-1">Расход основы на 1м</div>
                     <div className="font-bold text-lg text-blue-400">
                       {(selectedSpec.osnova_itogo_kg * 1000).toFixed(1)} г
                     </div>
                   </div>
                   <div className="bg-zinc-800/50 p-3 rounded">
                     <div className="text-muted-foreground text-xs mb-1">Расход утка на 1м</div>
                     <div className="font-bold text-lg text-purple-400">
                       {(selectedSpec.utok_itogo_kg * 1000).toFixed(1)} г
                     </div>
                   </div>
                 </div>
                 {formData.length && Number(formData.length) > 0 && (
                   <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded">
                     <div className="text-green-400 text-sm font-bold mb-3 flex items-center gap-2">
                       <span className="text-xl">✓</span>
                       Расчет на {formData.length} метров:
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-zinc-900/50 p-3 rounded">
                         <div className="text-xs text-muted-foreground mb-1">Основа ({selectedSpec.osnova_nit_type})</div>
                         <div className="text-lg font-bold text-blue-400">{formData.warp_amount} кг</div>
                       </div>
                       <div className="bg-zinc-900/50 p-3 rounded">
                         <div className="text-xs text-muted-foreground mb-1">Уток (МФН)</div>
                         <div className="text-lg font-bold text-purple-400">{formData.weft_amount} кг</div>
                       </div>
                     </div>
                     <div className="mt-3 pt-3 border-t border-green-800">
                       <div className="text-xs text-muted-foreground mb-1">Вес по спецификации</div>
                       <div className="text-xl font-bold text-blue-400">{calculatedWeight} кг</div>
                       {formData.weight && (
                         <>
                           <div className="text-xs text-muted-foreground mt-2 mb-1">Фактический вес</div>
                           <div className="text-xl font-bold text-green-400">{formData.weight} кг</div>
                           {formData.defect_weight && Number(formData.defect_weight) > 0 && (
                             <>
                               <div className="text-xs text-muted-foreground mt-2 mb-1">Брак</div>
                               <div className="text-xl font-bold text-red-400">{formData.defect_weight} кг</div>
                             </>
                           )}
                         </>
                       )}
                     </div>
                   </div>
                 )}
               </CardContent>
             </Card>
           )}

           <Card className="bg-card">
              <CardHeader className="pb-3"><CardTitle>2. Списание материалов</CardTitle></CardHeader>
              <CardContent>
                 <MaterialSelector label="Уток (Weft)" typeKey="weft_source" idKey="weft_item_id" amountKey="weft_amount" />
                 <MaterialSelector label="Основа (Warp)" typeKey="warp_source" idKey="warp_item_id" amountKey="warp_amount" />
              </CardContent>
           </Card>

        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="bg-card h-full border-l-4 border-l-blue-500 shadow-lg">
              <CardHeader><CardTitle>3. Итог</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div>
                    <Label className="text-muted-foreground">Длина (метров)</Label>
                    <Input
                       className="h-14 text-3xl font-bold mt-2"
                       placeholder="0"
                       type="number"
                       value={formData.length}
                       onChange={e => handleLengthChange(e.target.value)}
                    />
                 </div>
                 <div>
                    <Label className="text-muted-foreground">Фактический вес (кг)</Label>
                    {calculatedWeight && (
                      <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                        💡 По спецификации: {calculatedWeight} кг
                      </div>
                    )}
                    <Input
                       className="h-14 text-2xl font-bold mt-2"
                       placeholder={calculatedWeight || "0.00"}
                       type="number"
                       step="0.01"
                       value={formData.weight}
                       onChange={e => setFormData({...formData, weight: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        Введите фактический вес произведенной стропы
                    </p>
                 </div>

                 <div>
                    <Label className="text-muted-foreground">Брак (кг)</Label>
                    <Input
                       className="h-14 text-2xl font-bold mt-2 border-red-800"
                       placeholder="0.00"
                       type="number"
                       step="0.01"
                       value={formData.defect_weight}
                       onChange={e => setFormData({...formData, defect_weight: e.target.value})}
                    />
                    <p className="text-xs text-red-400 mt-2">
                        Вес бракованной продукции
                    </p>
                 </div>

                 <Separator />

                 {/* Проверка готовности формы */}
                 {(!selectedSpec || !formData.length || !formData.weft_item_id || !formData.warp_item_id) && (
                   <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3 mb-4">
                     <div className="font-bold mb-2">⚠️ Заполните все поля:</div>
                     <ul className="space-y-1 ml-4">
                       {!selectedSpec && <li>• Выберите тип стропы</li>}
                       {!formData.length && <li>• Укажите длину (метры)</li>}
                       {!formData.weft_item_id && <li>• Выберите партию утка</li>}
                       {!formData.warp_item_id && <li>• Выберите партию основы</li>}
                     </ul>
                   </div>
                 )}

                 <Button
                    onClick={handleSubmit}
                    disabled={loading || !selectedSpec || !formData.length || !formData.weft_item_id || !formData.warp_item_id}
                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {loading ? 'Сохранение...' : <><Save className="mr-2"/> Подтвердить выпуск</>}
                 </Button>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}