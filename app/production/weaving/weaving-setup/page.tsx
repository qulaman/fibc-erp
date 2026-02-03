'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Импортируем компонент и тип
import { CircularLoom, LoomSector } from '@/components/weaving/CircularLoom'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Settings, Printer, Save, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

type SetupCard = {
  id: string;
  title: string;
  width_cm: number;
  density_g_m2: number;
  warp_spec: string;
  weft_spec: string;
  total_threads_target: number; // ПЛАН
  linear_weight_g_m: number;
  weave_type: string;
  sectors_pattern: LoomSector[]; // ФАКТ (Схема)
};

export default function WeavingSetupPage() {
  const [cards, setCards] = useState<SetupCard[]>([]);
  const [selected, setSelected] = useState<SetupCard | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Локальное состояние для редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editPattern, setEditPattern] = useState<LoomSector[]>([]);
  const [editTarget, setEditTarget] = useState<number>(0);
  const [machineSectors, setMachineSectors] = useState(36);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data } = await supabase
      .from('weaving_setup_cards')
      .select('*')
      .order('width_cm', { ascending: true });
    
    if (data) {
        // Приведение типов
        const typedData = data.map((item: any) => ({
           ...item,
           sectors_pattern: item.sectors_pattern as LoomSector[]
        }));
        setCards(typedData);
        if (typedData.length > 0) selectCard(typedData[0]);
    }
    setLoading(false);
  };

  const selectCard = (card: SetupCard) => {
    setSelected(card);
    setEditPattern(JSON.parse(JSON.stringify(card.sectors_pattern))); // Глубокая копия
    setEditTarget(card.total_threads_target);
    setIsEditing(false);
  };

  // Расчет ФАКТА по введенным секторам
  const calculateFact = (pattern: LoomSector[]) => {
      const onePartSum = pattern.reduce((sum, s) => sum + s.t + s.b, 0);
      const multiplier = machineSectors / pattern.length; // Обычно 36 / 9 = 4
      return Math.round(onePartSum * multiplier);
  };

  // Изменение ячейки в паттерне
  const handlePatternChange = (idx: number, field: 't' | 'b', val: string) => {
    const newVal = parseInt(val) || 0;
    const newPattern = [...editPattern];
    newPattern[idx] = { ...newPattern[idx], [field]: newVal };
    setEditPattern(newPattern);
  };

  // Сохранение в базу
  const handleSave = async () => {
    if (!selected) return;
    
    // Оптимистичное обновление UI
    const updatedCard = { 
        ...selected, 
        sectors_pattern: editPattern, 
        total_threads_target: editTarget 
    };
    
    // Обновляем список локально
    setCards(prev => prev.map(c => c.id === selected.id ? updatedCard : c));
    setSelected(updatedCard);
    setIsEditing(false);

    // Отправка в Supabase
    const { error } = await supabase
        .from('weaving_setup_cards')
        .update({ 
            sectors_pattern: editPattern,
            total_threads_target: editTarget
        })
        .eq('id', selected.id);

    if (error) alert("Ошибка сохранения!");
  };

  const currentFact = calculateFact(editPattern);
  const diff = currentFact - editTarget;
  const isMatch = diff === 0;

  return (
    <div className="page-container h-screen flex flex-col md:flex-row bg-zinc-950 text-white overflow-hidden">
      
      {/* 1. ЛЕВАЯ ПАНЕЛЬ: СПИСОК */}
      <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800">
           <h2 className="font-bold flex items-center gap-2 text-lg">
             <Settings className="text-[#E60012]" /> Карты (ЗК)
           </h2>
        </div>
        <ScrollArea className="flex-1">
           <div className="flex flex-col p-2 gap-1">
              {cards.map(card => (
                 <button
                   key={card.id}
                   onClick={() => selectCard(card)}
                   className={`text-left p-3 rounded-xl transition-all border ${
                     selected?.id === card.id 
                       ? 'bg-[#E60012] text-white border-[#E60012]' 
                       : 'hover:bg-zinc-800 border-transparent text-zinc-400'
                   }`}
                 >
                    <div className="font-bold text-sm">{card.title}</div>
                    <div className="flex justify-between mt-2 opacity-80 text-[10px]">
                       <span>{card.width_cm} см</span>
                       <span>План: {card.total_threads_target}</span>
                    </div>
                 </button>
              ))}
           </div>
        </ScrollArea>
      </div>

      {/* 2. ПРАВАЯ ПАНЕЛЬ: РАБОЧАЯ ОБЛАСТЬ */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-zinc-950">
         {selected ? (
           <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
             
             {/* ЗАГОЛОВОК И КНОПКИ */}
             <div className="flex justify-between items-start border-b border-zinc-800 pb-6">
                <div>
                   <h1 className="text-3xl font-bold text-white mb-2">{selected.title}</h1>
                   <div className="flex gap-4 text-xs text-zinc-400">
                      <div className="bg-zinc-900 px-2 py-1 rounded">Основа: <span className="text-white">{selected.warp_spec}</span></div>
                      <div className="bg-zinc-900 px-2 py-1 rounded">Уток: <span className="text-white">{selected.weft_spec}</span></div>
                   </div>
                </div>
                <div className="flex gap-2">
                   {!isEditing ? (
                       <>
                         <Button variant="outline" onClick={() => window.print()}><Printer size={16}/></Button>
                         <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">Редактировать</Button>
                       </>
                   ) : (
                       <>
                         <Button variant="ghost" onClick={() => selectCard(selected)}><RotateCcw size={16} className="mr-2"/> Отмена</Button>
                         <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700"><Save size={16} className="mr-2"/> Сохранить</Button>
                       </>
                   )}
                </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                 
                 {/* ЛЕВАЯ ЧАСТЬ: ВВОД ДАННЫХ (ПЛАН И ПАТТЕРН) */}
                 <div className="xl:col-span-5 space-y-6">
                    
                    {/* 1. БЛОК ПЛАНА */}
                    <Card className="bg-zinc-900 border-zinc-800">
                       <CardHeader className="pb-2"><CardTitle className="text-white text-base">1. Общий План</CardTitle></CardHeader>
                       <CardContent>
                          <div className="flex items-center justify-between gap-4">
                             <div className="flex-1">
                                <Label className="text-zinc-400 text-xs">Всего нитей (из документа)</Label>
                                <Input 
                                   type="number" 
                                   disabled={!isEditing}
                                   value={editTarget} 
                                   onChange={e => setEditTarget(Number(e.target.value))}
                                   className={`mt-1 font-bold text-lg ${isEditing ? 'bg-zinc-950 text-white border-zinc-700' : 'bg-transparent border-none text-zinc-300 pl-0'}`}
                                />
                             </div>
                             <div className="flex-1 text-right">
                                <Label className="text-zinc-400 text-xs">Вес п.м.</Label>
                                <div className="text-lg font-bold text-zinc-300 mt-2">{selected.linear_weight_g_m} г</div>
                             </div>
                          </div>
                       </CardContent>
                    </Card>

                    {/* 2. БЛОК РЕДАКТОРА СЕКТОРОВ */}
                    <Card className={`border-zinc-800 ${isEditing ? 'bg-zinc-900 ring-1 ring-blue-500/30' : 'bg-zinc-900/50'}`}>
                       <CardHeader className="pb-4 flex flex-row items-center justify-between">
                          <CardTitle className="text-white text-base">2. Настройка секторов (Раппорт)</CardTitle>
                          <Badge variant="outline" className="text-zinc-500">1-9</Badge>
                       </CardHeader>
                       <CardContent>
                          <div className="grid grid-cols-9 gap-1 mb-2">
                             {editPattern.map((s, i) => (
                                <div key={i} className="text-center text-[10px] text-zinc-500">#{i+1}</div>
                             ))}
                          </div>
                          
                          {/* ВЕРХНИЙ РЯД */}
                          <div className="grid grid-cols-9 gap-1 mb-2">
                             {editPattern.map((s, i) => (
                                <input
                                   key={`t-${i}`}
                                   type="number"
                                   disabled={!isEditing}
                                   value={s.t}
                                   onChange={e => handlePatternChange(i, 't', e.target.value)}
                                   className={`w-full h-10 text-center rounded text-sm font-bold border transition-colors
                                      ${isEditing 
                                         ? 'bg-blue-950/30 border-blue-800 text-blue-200 focus:border-blue-500 outline-none' 
                                         : 'bg-zinc-950 border-zinc-800 text-zinc-500'}
                                   `}
                                />
                             ))}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-blue-500/50 mb-4 text-center">Верхняя рамка</div>

                          {/* НИЖНИЙ РЯД */}
                          <div className="grid grid-cols-9 gap-1 mb-2">
                             {editPattern.map((s, i) => (
                                <input
                                   key={`b-${i}`}
                                   type="number"
                                   disabled={!isEditing}
                                   value={s.b}
                                   onChange={e => handlePatternChange(i, 'b', e.target.value)}
                                   className={`w-full h-10 text-center rounded text-sm font-bold border transition-colors
                                      ${isEditing 
                                         ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200 focus:border-emerald-500 outline-none' 
                                         : 'bg-zinc-950 border-zinc-800 text-zinc-500'}
                                   `}
                                />
                             ))}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-emerald-500/50 text-center">Нижняя рамка</div>
                          
                          {isEditing && (
                             <div className="mt-4 p-3 bg-blue-500/10 rounded border border-blue-500/20 text-xs text-blue-200">
                                <p>💡 Вы меняете шаблон. Эти значения умножаются на 4, чтобы заполнить весь круг (36 секторов).</p>
                             </div>
                          )}
                       </CardContent>
                    </Card>

                 </div>

                 {/* ПРАВАЯ ЧАСТЬ: ВИЗУАЛИЗАЦИЯ И ИТОГ */}
                 <div className="xl:col-span-7 flex flex-col items-center">
                    
                    {/* БЛОК СТАТУСА (СХОДИТСЯ ИЛИ НЕТ) */}
                    <div className={`w-full p-4 rounded-xl border flex items-center justify-between shadow-lg mb-8 transition-all duration-500
                       ${isMatch 
                          ? 'bg-emerald-500/10 border-emerald-500/50' 
                          : 'bg-red-500/10 border-red-500/50'}
                    `}>
                       <div className="flex items-center gap-4">
                          {isMatch 
                             ? <CheckCircle2 size={32} className="text-emerald-500" />
                             : <AlertTriangle size={32} className="text-red-500" />
                          }
                          <div>
                             <div className={`font-bold text-lg ${isMatch ? 'text-emerald-200' : 'text-red-200'}`}>
                                {isMatch ? "Баланс соблюден" : "Несоответствие!"}
                             </div>
                             <div className="text-sm text-zinc-400">
                                Схема дает <strong>{currentFact}</strong> шт.
                                {!isMatch && <span> (Нужно: {editTarget})</span>}
                             </div>
                          </div>
                       </div>
                       
                       {!isMatch && (
                          <div className="text-right">
                             <div className="text-[10px] uppercase text-red-300 font-bold">Разница</div>
                             <div className="text-2xl font-mono font-bold text-red-400">
                                {diff > 0 ? `+${diff}` : diff}
                             </div>
                          </div>
                       )}
                    </div>

                    {/* ВИЗУАЛИЗАЦИЯ */}
                    <div className="relative p-8 bg-zinc-900/30 rounded-full border border-zinc-800/50">
                       <CircularLoom pattern={editPattern} />
                       
                       {/* Легенда */}
                       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Верх</span>
                          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Низ</span>
                       </div>
                    </div>

                 </div>
             </div>

           </div>
         ) : (
           <div className="flex items-center justify-center h-full text-zinc-600">Выберите карту</div>
         )}
      </div>
    </div>
  );
}