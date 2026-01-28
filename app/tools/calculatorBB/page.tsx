'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator, Printer, ArrowRight, Ruler, Scale, Scissors } from "lucide-react";

export default function FibcCalculatorPage() {
  // --- СОСТОЯНИЕ (Входные данные) ---
  
  // 1. Размеры Мешка
  const [height, setHeight] = useState<number>(140);   // Высота
  const [width, setWidth] = useState<number>(90);      // Ширина дна
  
  // 2. Ткань
  const [fabricDensity, setFabricDensity] = useState<number>(180); // г/м2
  const [hemAllowance, setHemAllowance] = useState<number>(10);    // Припуск на подгиб (5+5)

  // 3. Стропы
  const [strapLoopHeight, setStrapLoopHeight] = useState<number>(25); // Высота петли
  const [strapSewingRatio, setStrapSewingRatio] = useState<string>("0.67"); // 2/3 или 1/3
  const [strapWeightPerM, setStrapWeightPerM] = useState<number>(35); // г/м (0.035 кг)

  // 4. Нитки и Люки
  const [threadWeightPerCm, setThreadWeightPerCm] = useState<number>(0.077); // г/см
  const [hasTopSpout, setHasTopSpout] = useState<boolean>(true);
  const [topSpoutDia, setTopSpoutDia] = useState<number>(40);
  const [hasBottomSpout, setHasBottomSpout] = useState<boolean>(true);
  const [bottomSpoutDia, setBottomSpoutDia] = useState<number>(40);

  // --- РЕЗУЛЬТАТЫ ---
  const [results, setResults] = useState<any>(null);

  // --- КАЛЬКУЛЯТОР (useEffect) ---
  useEffect(() => {
    // 1. РАСЧЕТ ТКАНИ
    // Логика: Высота + Ширина + Подгибы
    const cutLengthCm = height + width + hemAllowance;
    const cutLengthM = cutLengthCm / 100;
    
    // Вес погонного метра ткани (Рукав 4 стороны)
    // Периметр = Ширина * 4. Площадь 1 п.м. = (Ширина * 4 / 100).
    const fabricLinearWeightKg = (width * 4 / 100) * (fabricDensity / 1000);
    const totalFabricWeight = cutLengthM * fabricLinearWeightKg;

    // 2. РАСЧЕТ СТРОПЫ
    // Логика: (Высота * Ratio * 2 стороны) + (Петля * 2)
    const ratio = parseFloat(strapSewingRatio);
    const oneStrapLengthCm = (height * ratio * 2) + (strapLoopHeight * 2); 
    // Обычно добавляют небольшой запас на подгиб краев стропы (например 10 см), 
    // но по твоей инструкции считаем чисто. Можно добавить +10 см в формулу если нужно.
    const totalStrapLengthM = (oneStrapLengthCm * 4) / 100; // 4 стропы
    const totalStrapWeight = totalStrapLengthM * (strapWeightPerM / 1000);

    // 3. РАСЧЕТ НИТИ
    // Периметр дна
    const bottomSeamCm = width * 4;
    // Пришив строп (8 швов: 4 стропы * 2 ноги)
    // Длина шва = Высота * Ratio
    const strapSeamCm = (height * ratio) * 2 * 4;
    // Люки (Длина окружности = Dia * 3.14)
    const topSpoutSeam = hasTopSpout ? topSpoutDia * 3.14 : 0;
    const bottomSpoutSeam = hasBottomSpout ? bottomSpoutDia * 3.14 : 0;
    
    const totalSeamCm = bottomSeamCm + strapSeamCm + topSpoutSeam + bottomSpoutSeam;
    const totalThreadWeightKg = (totalSeamCm * threadWeightPerCm) / 1000;

    // 4. ИТОГ
    const totalBagWeight = totalFabricWeight + totalStrapWeight + totalThreadWeightKg;

    setResults({
      fabric: {
        length: cutLengthM.toFixed(2), // 2.40 м
        weight: totalFabricWeight.toFixed(3),
        linearWeight: fabricLinearWeightKg.toFixed(3)
      },
      strap: {
        oneLength: (oneStrapLengthCm / 100).toFixed(2),
        totalLength: totalStrapLengthM.toFixed(2),
        weight: totalStrapWeight.toFixed(3)
      },
      thread: {
        totalSeam: totalSeamCm.toFixed(0),
        weight: totalThreadWeightKg.toFixed(3)
      },
      totalWeight: totalBagWeight.toFixed(3)
    });

  }, [height, width, fabricDensity, hemAllowance, strapLoopHeight, strapSewingRatio, strapWeightPerM, threadWeightPerCm, hasTopSpout, topSpoutDia, hasBottomSpout, bottomSpoutDia]);

  // Функция печати
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container max-w-6xl mx-auto p-6">
      
      {/* ЗАГОЛОВОК */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="text-[#E60012]" size={32} />
            Калькулятор Технолога МКР
          </h1>
          <p className="text-zinc-400">Расчет расхода материалов на 1 единицу продукции</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer size={16} /> Печать / PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- ЛЕВАЯ КОЛОНКА: ВВОД ДАННЫХ --- */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. ГАБАРИТЫ И ТКАНЬ */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Ruler size={18} className="text-blue-500"/> 1. Габариты и Ткань
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Высота мешка (см)</Label>
                  <Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-zinc-950 font-bold text-lg"/>
                </div>
                <div className="space-y-1">
                  <Label>Ширина дна (см)</Label>
                  <Input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="bg-zinc-950 font-bold text-lg"/>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Плотность ткани (г/м²)</Label>
                  <Input type="number" value={fabricDensity} onChange={e => setFabricDensity(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400">Припуск на подгиб (см)</Label>
                  <Input type="number" value={hemAllowance} onChange={e => setHemAllowance(Number(e.target.value))} className="bg-zinc-950"/>
                  <p className="text-[10px] text-zinc-500">Обычно 10 см (5 верх + 5 низ)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. СТРОПЫ */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Scissors size={18} className="text-emerald-500"/> 2. Стропы (4 шт)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Высота петли (см)</Label>
                  <Input type="number" value={strapLoopHeight} onChange={e => setStrapLoopHeight(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
                <div className="space-y-1">
                  <Label>Вес ленты (г/м)</Label>
                  <Input type="number" value={strapWeightPerM} onChange={e => setStrapWeightPerM(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
              </div>
              <div className="space-y-2">
                 <Label>Глубина пришива (Ratio)</Label>
                 <Select value={strapSewingRatio} onValueChange={setStrapSewingRatio}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="0.33">1/3 высоты (Короткий)</SelectItem>
                       <SelectItem value="0.67">2/3 высоты (Глубокий)</SelectItem>
                       <SelectItem value="1.0">На всю высоту</SelectItem>
                    </SelectContent>
                 </Select>
                 <p className="text-xs text-zinc-500">
                   Расчет: Высота × {strapSewingRatio} × 2 стороны + Петля
                 </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. КОНФИГУРАЦИЯ (НИТИ) */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Scissors size={18} className="text-pink-500"/> 3. Пошив (Нити)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                 <Label>Вес нити на 1 см шва (г)</Label>
                 <Input type="number" value={threadWeightPerCm} onChange={e => setThreadWeightPerCm(Number(e.target.value))} className="w-24 bg-zinc-950 h-8"/>
              </div>
              
              <Separator className="bg-zinc-800"/>
              
              <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    <Checkbox id="topSpout" checked={hasTopSpout} onCheckedChange={(v: any) => setHasTopSpout(v)} />
                    <Label htmlFor="topSpout" className="flex-1">Загрузочный люк</Label>
                    {hasTopSpout && (
                       <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Диам:</span>
                          <Input type="number" value={topSpoutDia} onChange={e => setTopSpoutDia(Number(e.target.value))} className="w-16 h-7 bg-zinc-950"/>
                       </div>
                    )}
                 </div>
                 <div className="flex items-center gap-3">
                    <Checkbox id="botSpout" checked={hasBottomSpout} onCheckedChange={(v: any) => setHasBottomSpout(v)} />
                    <Label htmlFor="botSpout" className="flex-1">Разгрузочный люк</Label>
                    {hasBottomSpout && (
                       <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Диам:</span>
                          <Input type="number" value={bottomSpoutDia} onChange={e => setBottomSpoutDia(Number(e.target.value))} className="w-16 h-7 bg-zinc-950"/>
                       </div>
                    )}
                 </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* --- ПРАВАЯ КОЛОНКА: РЕЗУЛЬТАТЫ --- */}
        <div className="lg:col-span-7">
          {results && (
             <div className="sticky top-6 space-y-6">
                
                {/* ГЛАВНАЯ КАРТОЧКА ИТОГОВ */}
                <Card className="bg-[#E60012] border-[#E60012] text-white shadow-2xl">
                   <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                         <div className="text-white/80 font-medium text-sm uppercase tracking-wider">Общий вес изделия</div>
                         <Scale className="text-white/80" />
                      </div>
                      <div className="text-6xl font-black tracking-tight">
                         {results.totalWeight} <span className="text-3xl font-medium opacity-80">кг</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
                         <div>
                            <div className="text-xs uppercase opacity-70">Ткань</div>
                            <div className="font-bold text-xl">{results.fabric.weight}</div>
                         </div>
                         <div>
                            <div className="text-xs uppercase opacity-70">Стропы</div>
                            <div className="font-bold text-xl">{results.strap.weight}</div>
                         </div>
                         <div>
                            <div className="text-xs uppercase opacity-70">Нить</div>
                            <div className="font-bold text-xl">{results.thread.weight}</div>
                         </div>
                      </div>
                   </CardContent>
                </Card>

                {/* ДЕТАЛИЗАЦИЯ */}
                <Card className="bg-white text-black border-zinc-200 shadow-xl overflow-hidden">
                   <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-3">
                      <CardTitle className="flex items-center gap-2">
                         <ArrowRight className="text-zinc-400" /> Спецификация расхода
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                      <table className="w-full text-sm">
                         <tbody>
                            {/* ТКАНЬ */}
                            <tr className="border-b border-zinc-100">
                               <td className="p-4 bg-zinc-50/50 w-1/3 font-medium text-zinc-500">Ткань (Рукав)</td>
                               <td className="p-4">
                                  <div className="font-bold text-lg">{results.fabric.length} м</div>
                                  <div className="text-xs text-zinc-500 mt-1">
                                     Формула: {height} + {width} + {hemAllowance} см = {height+width+hemAllowance} см
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-zinc-900">
                                  {results.fabric.weight} кг
                               </td>
                            </tr>

                            {/* СТРОПЫ */}
                            <tr className="border-b border-zinc-100">
                               <td className="p-4 bg-zinc-50/50 font-medium text-zinc-500">Стропа (4 шт)</td>
                               <td className="p-4">
                                  <div className="font-bold text-lg">{results.strap.totalLength} м <span className="text-sm font-normal text-zinc-400">({results.strap.oneLength} м × 4)</span></div>
                                  <div className="text-xs text-zinc-500 mt-1">
                                     Пошив: {strapSewingRatio === "0.67" ? "2/3 высоты" : "1/3 высоты"} × 2 стороны
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-zinc-900">
                                  {results.strap.weight} кг
                               </td>
                            </tr>

                            {/* НИТИ */}
                            <tr>
                               <td className="p-4 bg-zinc-50/50 font-medium text-zinc-500">Нить (МФН)</td>
                               <td className="p-4">
                                  <div className="font-bold text-lg">~{results.thread.weight} кг</div>
                                  <div className="text-xs text-zinc-500 mt-1">
                                     Длина швов: {results.thread.totalSeam} см × {threadWeightPerCm} г/см
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-zinc-900">
                                  {results.thread.weight} кг
                               </td>
                            </tr>
                         </tbody>
                      </table>
                   </CardContent>
                </Card>

                {/* ПРИМЕЧАНИЕ */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800 text-sm">
                   <strong>Важно:</strong> Расчет произведен теоретически на основе введенных параметров. 
                   Фактический расход может отличаться из-за брака, настройки оборудования или человеческого фактора.
                </div>

             </div>
          )}
        </div>

      </div>
    </div>
  );
}