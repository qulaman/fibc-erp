'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ribbon, Save, Layers, AlertCircle } from "lucide-react";

export default function StrapsProductionPage() {
  const [loading, setLoading] = useState(false);
  
  // Данные БД
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [strapTypes, setStrapTypes] = useState<any[]>([]);
  
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
    
    // Источники сырья
    weft_source: 'mfn', 
    weft_item_id: '',
    weft_amount: '',
    
    warp_source: 'yarn', 
    warp_item_id: '',
    warp_amount: '',
    
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Справочники
    const { data: mach } = await supabase.from('equipment').select('*').eq('type', 'loom_flat');
    const { data: emp } = await supabase.from('employees').select('*'); // Берем всех, чтобы наверняка
    const { data: straps } = await supabase.from('strap_types').select('*');
    
    // 2. Склад Сырья (МФН)
    const { data: raw } = await supabase.from('raw_materials').select('*');
    
    // 3. Склад Нити (ПП) - Читаем всё, фильтруем в браузере
    const { data: yarns } = await supabase
        .from('yarn_inventory')
        .select('*')
        .order('last_updated', { ascending: false });

    if (mach) setMachines(mach);
    if (emp) setOperators(emp);
    if (straps) setStrapTypes(straps);
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

  const handleSubmit = async () => {
    if (!formData.strap_type_id || !formData.length) return alert('Заполните: Стропа и Длина');
    setLoading(true);

    try {
        const weftAmount = Number(formData.weft_amount) || 0;
        const warpAmount = Number(formData.warp_amount) || 0;

        const composition = {
            weft: { source: formData.weft_source, id: formData.weft_item_id, qty: weftAmount },
            warp: { source: formData.warp_source, id: formData.warp_item_id, qty: warpAmount }
        };

        // 1. Записываем производство
        const { error } = await supabase.from('production_straps').insert([{
            date: formData.date,
            shift: formData.shift,
            machine_id: formData.machine_id || null,
            operator_id: formData.operator_id || null,
            strap_type_id: formData.strap_type_id,
            produced_length: Number(formData.length),
            produced_weight: Number(formData.weight),
            notes: `${formData.notes} | Состав: ${JSON.stringify(composition)}`
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

        // 3. СПИСАНИЕ СО СКЛАДА СЫРЬЯ - используем inventory_transactions
        if (formData.weft_source === 'mfn' && formData.weft_item_id && weftAmount > 0) {
            const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const docNumber = `PCX-STRAP-${datePrefix}-${randomSuffix}`;

            const { error: txError } = await supabase
                .from('inventory_transactions')
                .insert([{
                    material_id: formData.weft_item_id,
                    type: 'out',
                    quantity: weftAmount,
                    doc_number: docNumber,
                    counterparty: 'Цех Строп (уток)',
                    notes: `Списание на производство стропы`
                }]);

            console.log('МФН уток - транзакция:', { docNumber, weftAmount }, 'Ошибка:', txError);

            if (txError) {
                console.error('Ошибка списания утка (МФН):', txError);
            } else {
                writeOffMessages.push(`Уток (МФН): списано ${weftAmount} кг`);
            }
        }

        if (formData.warp_source === 'mfn' && formData.warp_item_id && warpAmount > 0) {
            const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const docNumber = `PCX-STRAP-${datePrefix}-${randomSuffix}W`;

            const { error: txError } = await supabase
                .from('inventory_transactions')
                .insert([{
                    material_id: formData.warp_item_id,
                    type: 'out',
                    quantity: warpAmount,
                    doc_number: docNumber,
                    counterparty: 'Цех Строп (основа)',
                    notes: `Списание на производство стропы`
                }]);

            console.log('МФН основа - транзакция:', { docNumber, warpAmount }, 'Ошибка:', txError);

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

  // Компонент выбора материала
  const MaterialSelector = ({ label, typeKey, idKey, amountKey }: any) => {
      // @ts-ignore
      const sourceType = formData[typeKey];
      // @ts-ignore
      const currentId = formData[idKey];
      
      return (
        <div className="border border-border p-4 rounded-lg bg-card/50 mb-4">
            <div className="flex items-center justify-between mb-3">
                <Label className="uppercase text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Layers size={14}/> {label}
                </Label>
                <Select value={sourceType} onValueChange={v => setFormData({...formData, [typeKey]: v, [idKey]: ''})}>
                    <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="mfn">📦 Склад Сырья (МФН)</SelectItem>
                        <SelectItem value="yarn">🧵 Склад Нити (ПП)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-8">
                    <Label className="mb-1 block text-xs">Партия / Материал</Label>
                    <Select value={currentId} onValueChange={v => setFormData({...formData, [idKey]: v})}>
                        <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                        <SelectContent>
                            {sourceType === 'mfn' ? (
                                // МФН (Сырье)
                                mfnStock.length === 0 ? <SelectItem value="none" disabled>Нет МФН</SelectItem> :
                                mfnStock.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} (Ост: {m.balance} {m.unit})
                                    </SelectItem>
                                ))
                            ) : (
                                // НИТЬ (Своя) - ЛОГИКА ОТОБРАЖЕНИЯ ИСПРАВЛЕНА ЗДЕСЬ
                                yarnStock.length === 0 ? <SelectItem value="none" disabled>Нет Нити</SelectItem> :
                                yarnStock.map(y => {
                                    // Используем правильные поля из вашей таблицы
                                    const name = y.yarn_name || y.name || 'Нить б/н';
                                    const qty = y.quantity_kg || y.quantity || 0;
                                    const batch = y.batch_number || '---';
                                    const denier = y.yarn_denier ? `(${y.yarn_denier}D)` : '';
                                    
                                    return (
                                        <SelectItem key={y.id} value={y.id}>
                                            {batch} — {name} {denier} [Ост: {qty} кг]
                                        </SelectItem>
                                    )
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-4">
                    <Label className="mb-1 block text-xs">Расход (кг)</Label>
                    {/* @ts-ignore */}
                    <Input type="number" placeholder="0.00" value={formData[amountKey]} onChange={e => setFormData({...formData, [amountKey]: e.target.value})} />
                </div>
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
                    <Select onValueChange={v => setFormData({...formData, strap_type_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Артикул..." /></SelectTrigger>
                        <SelectContent>
                            {strapTypes.length === 0 ? <SelectItem value="none" disabled>Нет типов (добавьте в справочнике)</SelectItem> : 
                             strapTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)
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
                       onChange={e => setFormData({...formData, length: e.target.value})}
                    />
                 </div>
                 <div>
                    <Label className="text-muted-foreground">Вес стропы (кг)</Label>
                    <Input 
                       className="h-14 text-2xl font-bold mt-2" 
                       placeholder="0.00"
                       type="number"
                       value={formData.weight}
                       onChange={e => setFormData({...formData, weight: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertCircle size={12}/> Включает вес утка и основы
                    </p>
                 </div>

                 <Separator />

                 <Button 
                    onClick={handleSubmit} 
                    disabled={loading} 
                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20 shadow-xl transition-all"
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