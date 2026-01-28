'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator, Printer, ArrowRight, Layers, Ruler, Scale, Scissors } from "lucide-react";

export default function FibcCalculatorPage() {
  // --- ВХОДНЫЕ ДАННЫЕ ---
  
  // 1. Габариты
  const [height, setHeight] = useState<number>(140);   // Высота
  const [width, setWidth] = useState<number>(90);      // Ширина
  const [bottomSize, setBottomSize] = useState<number>(95); // Размер дна (обычно Ширина + 5см)
  
  // 2. Ткань
  const [fabricDensity, setFabricDensity] = useState<number>(180); // г/м2 (Плотность)

  // 3. Стропы
  const [strapLoopHeight, setStrapLoopHeight] = useState<number>(25);
  const [strapSewingRatio, setStrapSewingRatio] = useState<string>("0.67"); // 2/3
  const [strapWeightPerM, setStrapWeightPerM] = useState<number>(35); // г/м

  // 4. Люки (Загрузочный / Разгрузочный)
  const [hasTopSpout, setHasTopSpout] = useState<boolean>(true);
  const [topSpoutDia, setTopSpoutDia] = useState<number>(40);
  const [topSpoutHeight, setTopSpoutHeight] = useState<number>(50); // Высота рукава

  const [hasBottomSpout, setHasBottomSpout] = useState<boolean>(true);
  const [bottomSpoutDia, setBottomSpoutDia] = useState<number>(40);
  const [bottomSpoutHeight, setBottomSpoutHeight] = useState<number>(48); // Высота рукава

  // 5. Нить
  const [threadWeightPerCm, setThreadWeightPerCm] = useState<number>(0.077); // г/см

  // --- РЕЗУЛЬТАТЫ ---
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    // === 1. РАСЧЕТ ТЕЛА (ПОЛОТНА) ===
    // В таблице технолога: Ширина * Высота * 4 стороны
    // Площадь (м2)
    const bodyArea = (width / 100) * (height / 100) * 4;
    const bodyWeight = bodyArea * (fabricDensity / 1000);

    // === 2. РАСЧЕТ ДНА ===
    // В таблице: 95 * 95 см (Ширина + запас)
    const bottomArea = (bottomSize / 100) * (bottomSize / 100);
    const bottomWeight = bottomArea * (fabricDensity / 1000);

    // === 3. РАСЧЕТ ЛЮКОВ (Труба) ===
    // Площадь развертки цилиндра = Длина окружности * Высота
    // Окружность = Диаметр * 3.14
    let topSpoutWeight = 0;
    if (hasTopSpout) {
        const circum = (topSpoutDia * 3.14); // см
        const area = (circum / 100) * (topSpoutHeight / 100); // м2
        topSpoutWeight = area * (fabricDensity / 1000);
    }

    let bottomSpoutWeight = 0;
    if (hasBottomSpout) {
        const circum = (bottomSpoutDia * 3.14); // см
        const area = (circum / 100) * (bottomSpoutHeight / 100); // м2
        bottomSpoutWeight = area * (fabricDensity / 1000);
    }
    
    // Итого Ткань
    const totalFabricWeight = bodyWeight + bottomWeight + topSpoutWeight + bottomSpoutWeight;


    // === 4. РАСЧЕТ СТРОПЫ ===
    // Длина 1 стропы = (Высота * Ratio * 2 стороны) + (Петля * 2) + (Запас ~10см)
    const ratio = parseFloat(strapSewingRatio);
    // Точная формула из таблицы: 236.6 см
    // 140 * 0.67 * 2 = 187.6
    // 25 * 2 = 50
    // Итого = 237.6. (Близко к 236.6). Оставим формулу.
    const oneStrapLengthCm = (height * ratio * 2) + (strapLoopHeight * 2);
    const totalStrapLengthM = (oneStrapLengthCm * 4) / 100;
    const totalStrapWeight = totalStrapLengthM * (strapWeightPerM / 1000);


    // === 5. РАСЧЕТ НИТИ ===
    // Сумма периметров
    const bodyPerimeter = (width * 4); // Дно пришить
    const strapSewing = (height * ratio * 2 * 4); // 4 стропы пришить
    const topSpoutSewing = hasTopSpout ? (topSpoutDia * 3.14) : 0;
    const botSpoutSewing = hasBottomSpout ? (bottomSpoutDia * 3.14) : 0;
    
    const totalSeamCm = bodyPerimeter + strapSewing + topSpoutSewing + botSpoutSewing;
    const totalThreadWeight = (totalSeamCm * threadWeightPerCm) / 1000;


    // === ИТОГ ===
    const totalWeight = totalFabricWeight + totalStrapWeight + totalThreadWeight;

    setResults({
      fabric: {
        bodyWeight: bodyWeight.toFixed(3),
        bottomWeight: bottomWeight.toFixed(3),
        spoutWeight: (topSpoutWeight + bottomSpoutWeight).toFixed(3),
        totalWeight: totalFabricWeight.toFixed(3)
      },
      strap: {
        length: totalStrapLengthM.toFixed(2),
        weight: totalStrapWeight.toFixed(3)
      },
      thread: {
        weight: totalThreadWeight.toFixed(3)
      },
      total: totalWeight.toFixed(3)
    });

  }, [height, width, bottomSize, fabricDensity, strapLoopHeight, strapSewingRatio, strapWeightPerM, hasTopSpout, topSpoutDia, topSpoutHeight, hasBottomSpout, bottomSpoutDia, bottomSpoutHeight, threadWeightPerCm]);

  const handlePrint = () => window.print();

  return (
    <div className="page-container max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="text-[#E60012]" size={32} />
          Калькулятор Веса (Детальный)
        </h1>
        <Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-2"/> Печать</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛЕВАЯ КОЛОНКА - ВВОД */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800"><CardTitle className="text-white text-lg">1. Параметры Биг-бега</CardTitle></CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <Label>Высота (см)</Label>
                   <Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-zinc-950 font-bold"/>
                </div>
                <div className="space-y-1">
                   <Label>Ширина (см)</Label>
                   <Input type="number" value={width} onChange={e => {
                       const val = Number(e.target.value);
                       setWidth(val);
                       setBottomSize(val + 5); // Автомат дно +5
                   }} className="bg-zinc-950 font-bold"/>
                </div>
                <div className="space-y-1">
                   <Label className="text-zinc-400">Размер Дна (см)</Label>
                   <Input type="number" value={bottomSize} onChange={e => setBottomSize(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
                <div className="space-y-1">
                   <Label className="text-blue-400">Плотность ткани (г/м²)</Label>
                   <Input type="number" value={fabricDensity} onChange={e => setFabricDensity(Number(e.target.value))} className="bg-zinc-950 text-blue-400 border-blue-900/30"/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800"><CardTitle className="text-white text-lg">2. Люки (Опции)</CardTitle></CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    <Checkbox id="topSpout" checked={hasTopSpout} onCheckedChange={(v: any) => setHasTopSpout(v)} />
                    <Label htmlFor="topSpout" className="flex-1 font-bold">Загрузочный (Верх)</Label>
                 </div>
                 {hasTopSpout && (
                   <div className="grid grid-cols-2 gap-4 pl-7">
                      <div><Label className="text-xs">Диаметр</Label><Input type="number" value={topSpoutDia} onChange={e => setTopSpoutDia(Number(e.target.value))} className="h-8 bg-zinc-950"/></div>
                      <div><Label className="text-xs">Высота</Label><Input type="number" value={topSpoutHeight} onChange={e => setTopSpoutHeight(Number(e.target.value))} className="h-8 bg-zinc-950"/></div>
                   </div>
                 )}

                 <Separator className="bg-zinc-800"/>

                 <div className="flex items-center gap-3">
                    <Checkbox id="botSpout" checked={hasBottomSpout} onCheckedChange={(v: any) => setHasBottomSpout(v)} />
                    <Label htmlFor="botSpout" className="flex-1 font-bold">Разгрузочный (Низ)</Label>
                 </div>
                 {hasBottomSpout && (
                   <div className="grid grid-cols-2 gap-4 pl-7">
                      <div><Label className="text-xs">Диаметр</Label><Input type="number" value={bottomSpoutDia} onChange={e => setBottomSpoutDia(Number(e.target.value))} className="h-8 bg-zinc-950"/></div>
                      <div><Label className="text-xs">Высота</Label><Input type="number" value={bottomSpoutHeight} onChange={e => setBottomSpoutHeight(Number(e.target.value))} className="h-8 bg-zinc-950"/></div>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800"><CardTitle className="text-white text-lg">3. Стропы и Нить</CardTitle></CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <Label>Вес ленты (г/м)</Label>
                   <Input type="number" value={strapWeightPerM} onChange={e => setStrapWeightPerM(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
                <div className="space-y-1">
                   <Label>Петля (см)</Label>
                   <Input type="number" value={strapLoopHeight} onChange={e => setStrapLoopHeight(Number(e.target.value))} className="bg-zinc-950"/>
                </div>
                <div className="col-span-2 space-y-1">
                   <Label>Пошив (Ratio)</Label>
                   <Select value={strapSewingRatio} onValueChange={setStrapSewingRatio}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="0.33">1/3 высоты</SelectItem>
                         <SelectItem value="0.67">2/3 высоты (Стандарт)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-800 mt-2">
                   <Label>Вес нити (г/см шва)</Label>
                   <Input type="number" value={threadWeightPerCm} onChange={e => setThreadWeightPerCm(Number(e.target.value))} className="bg-zinc-950 mt-1"/>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА - ИТОГИ */}
        <div className="lg:col-span-7">
          {results && (
             <div className="space-y-6 sticky top-6">
                
                {/* ГЛАВНЫЙ ВЕС */}
                <Card className="bg-[#E60012] border-[#E60012] text-white shadow-2xl">
                   <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                         <div className="text-white/80 font-medium text-sm uppercase tracking-wider">Вес 1 мешка (Нетто)</div>
                         <Scale className="text-white/80" />
                      </div>
                      <div className="text-6xl font-black tracking-tight">
                         {results.total} <span className="text-3xl font-medium opacity-80">кг</span>
                      </div>
                   </CardContent>
                </Card>

                {/* ТАБЛИЦА КАК В EXCEL */}
                <Card className="bg-white text-black border-zinc-200 shadow-xl overflow-hidden">
                   <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-3">
                      <CardTitle className="flex items-center gap-2 text-zinc-800">
                         <Layers className="text-zinc-400" /> Структура Веса
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                      <table className="w-full text-sm">
                         <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-medium">
                            <tr>
                               <th className="p-3 text-left pl-6">Наименование</th>
                               <th className="p-3 text-right">Вес (кг)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-zinc-100">
                            {/* ТЕЛО */}
                            <tr>
                               <td className="p-4 pl-6">
                                  <div className="font-bold text-zinc-900">Полотно (Тело)</div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                     {width}x{height} см × 4 слоя
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-lg">{results.fabric.bodyWeight}</td>
                            </tr>
                            {/* ДНО */}
                            <tr>
                               <td className="p-4 pl-6">
                                  <div className="font-bold text-zinc-900">Дно</div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                     {bottomSize}x{bottomSize} см × 1 слой
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-lg">{results.fabric.bottomWeight}</td>
                            </tr>
                            {/* ЛЮКИ */}
                            {(hasTopSpout || hasBottomSpout) && (
                                <tr>
                                   <td className="p-4 pl-6">
                                      <div className="font-bold text-zinc-900">Люки (Загр/Выгр)</div>
                                      <div className="text-xs text-zinc-500 mt-0.5">
                                         Труба {topSpoutDia}/{topSpoutHeight} + {bottomSpoutDia}/{bottomSpoutHeight}
                                      </div>
                                   </td>
                                   <td className="p-4 text-right font-mono font-bold text-lg">{results.fabric.spoutWeight}</td>
                                </tr>
                            )}
                            {/* СТРОПЫ */}
                            <tr className="bg-blue-50/30">
                               <td className="p-4 pl-6">
                                  <div className="font-bold text-blue-900">Стропа (4 шт)</div>
                                  <div className="text-xs text-blue-700/60 mt-0.5">
                                     Общая длина: {results.strap.length} м
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-lg text-blue-700">{results.strap.weight}</td>
                            </tr>
                            {/* НИТИ */}
                            <tr className="bg-pink-50/30">
                               <td className="p-4 pl-6">
                                  <div className="font-bold text-pink-900">Нить прошивочная</div>
                                  <div className="text-xs text-pink-700/60 mt-0.5">
                                     Норматив: {threadWeightPerCm} г/см
                                  </div>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-lg text-pink-700">{results.thread.weight}</td>
                            </tr>
                         </tbody>
                      </table>
                   </CardContent>
                </Card>

             </div>
          )}
        </div>
      </div>
    </div>
  );
}