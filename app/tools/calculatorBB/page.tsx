'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator, Printer, Layers, Scale } from "lucide-react";

export default function FibcCalculatorPage() {
  // --- ВХОДНЫЕ ДАННЫЕ ---
  
  // 1. Габариты
  const [height, setHeight] = useState<number>(140);
  const [width, setWidth] = useState<number>(90);
  const [bottomSize, setBottomSize] = useState<number>(95);

  // 2. Ткани
  const [mainDensity, setMainDensity] = useState<number>(180);
  const [auxDensity, setAuxDensity] = useState<number>(95);

  // 3. КОНФИГУРАЦИЯ ВЕРХА (Люк или Юбка)
  const [topType, setTopType] = useState<'spout' | 'skirt' | 'open'>('spout');
  
  // Параметры Люка
  const [topSpoutDia, setTopSpoutDia] = useState<number>(40);
  const [topSpoutHeight, setTopSpoutHeight] = useState<number>(48);
  
  // Параметры Юбки
  const [skirtHeight, setSkirtHeight] = useState<number>(80);

  // 4. КОНФИГУРАЦИЯ НИЗА
  const [hasBottomSpout, setHasBottomSpout] = useState<boolean>(true);
  const [bottomSpoutDia, setBottomSpoutDia] = useState<number>(40);
  const [bottomSpoutHeight, setBottomSpoutHeight] = useState<number>(48);
  
  // 5. Завязки (Лента)
  const [tieWeightPerM, setTieWeightPerM] = useState<number>(10);
  const [tieLength, setTieLength] = useState<number>(150);

  // 6. Стропы
  const [strapLoopHeight, setStrapLoopHeight] = useState<number>(25);
  const [strapRatioType, setStrapRatioType] = useState<"1/3" | "2/3">("2/3"); 
  const [strapWeightPerM, setStrapWeightPerM] = useState<number>(35);

  // 7. Нить
  const [threadWeightPerCm, setThreadWeightPerCm] = useState<number>(0.077);

  // --- РЕЗУЛЬТАТЫ ---
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const K_main = mainDensity / 10000;
    const K_aux = auxDensity / 10000;

    // === 1. ТЕЛО ===
    const bodyGrams = width * height * 4 * K_main;
    const bodyFormula = `${width}×${height}×4 × ${K_main}`;

    // === 2. ДНО ===
    const bottomGrams = bottomSize * bottomSize * 1 * K_main;
    const bottomFormula = `${bottomSize}×${bottomSize} × ${K_main}`;

    // === 3. ВЕРХ (Люк или Юбка) ===
    const seamAllowance = 3; // +3 см на шов трубы (для люка)

    let topGrams = 0;
    let topFormula = "-";
    let topName = "Открытый";

    if (topType === 'spout') {
        topName = "Люк (Верх)";
        const widthFlat = (topSpoutDia * 3.14159) + seamAllowance;
        const area = widthFlat * topSpoutHeight;
        topGrams = area * K_aux;
        topFormula = `((Ø${topSpoutDia}×π)+3)×${topSpoutHeight} × ${K_aux}`;
    } 
    else if (topType === 'skirt') {
        topName = "Юбка (Сборка)";
        // Периметр мешка * (Высота + 5см)
        const bagPerimeter = width * 4;
        const area = bagPerimeter * (skirtHeight + 5);
        topGrams = area * K_aux;
        topFormula = `(${width}×4)×(${skirtHeight}+5) × ${K_aux}`;
    }

    // === 4. НИЗ (Люк) ===
    let botGrams = 0;
    let botFormula = "-";
    if (hasBottomSpout) {
        const widthFlat = (bottomSpoutDia * 3.14159) + seamAllowance;
        const area = widthFlat * bottomSpoutHeight;
        botGrams = area * K_aux;
        botFormula = `((Ø${bottomSpoutDia}×π)+3)×${bottomSpoutHeight} × ${K_aux}`;
    }

    const totalFabricGrams = bodyGrams + bottomGrams;
    const totalAuxGrams = topGrams + botGrams;

    // === 5. ЗАВЯЗКИ (ЛЕНТА) ===
    let tiesCount = 0;
    if (topType !== 'open') tiesCount++; // И для люка, и для юбки нужна завязка
    if (hasBottomSpout) tiesCount++;
    
    const tieGrams = tiesCount * (tieLength / 100) * tieWeightPerM;
    const tieFormula = `${tiesCount}шт × ${tieLength}см × ${tieWeightPerM}г/м`;

    // === 6. СТРОПЫ ===
    const strapWeightPerCm = strapWeightPerM / 100;
    let sewnLength = 0;
    if (strapRatioType === "2/3") sewnLength = height * (2 / 3);
    else sewnLength = height * (1 / 3);

    const oneStrapLen = (sewnLength * 2) + (strapLoopHeight * 2);
    const totalStrapGrams = oneStrapLen * 4 * strapWeightPerCm;
    
    const ratioStr = strapRatioType === "2/3" ? "2/3" : "1/3";
    const strapFormula = `((${height}×${ratioStr}×2)+${strapLoopHeight}×2)×4 × ${strapWeightPerCm}`;

    // === 7. НИТЬ (МЕТОД ТЕХНОЛОГА) ===
    
    // А. Швы Верх
    const seamPerimeter = width * 4; // 360
    let seamTopPart = 0;
    let topThreadDesc = "";

    if (topType === 'spout') {
        // (Периметр + Высота + Окружность)
        seamTopPart = seamPerimeter + topSpoutHeight + (topSpoutDia * 3.14159);
        topThreadDesc = `(360+${topSpoutHeight}+${(topSpoutDia*3.14).toFixed(0)})`;
    } 
    else if (topType === 'skirt') {
        // Пришив к телу (Периметр) + Подгиб верха (Периметр) + Боковой шов юбки (Высота)
        seamTopPart = seamPerimeter + seamPerimeter + skirtHeight;
        topThreadDesc = `Юбка: 360(низ)+360(верх)+${skirtHeight}(бок)`;
    }
    else {
        seamTopPart = seamPerimeter; // Просто обметка верха
        topThreadDesc = "Обметка верха (360)";
    }

    // Б. Швы Низ
    let seamBotPart = 0;
    let botThreadDesc = "";
    if (hasBottomSpout) {
        seamBotPart = seamPerimeter + bottomSpoutHeight + (bottomSpoutDia * 3.14159);
        botThreadDesc = `(360+${bottomSpoutHeight}+${(bottomSpoutDia*3.14).toFixed(0)})`;
    } else {
        seamBotPart = seamPerimeter;
        botThreadDesc = "Пришив дна (360)";
    }

    // В. Стропы (Одинарный проход)
    const seamStraps = sewnLength * 4; 
    
    const totalSeamCm = seamTopPart + seamBotPart + seamStraps;
    const totalThreadGrams = totalSeamCm * threadWeightPerCm;
    
    const threadFormulaDetails = `
       Верх: ${seamTopPart.toFixed(0)} ${topThreadDesc}
       Низ: ${seamBotPart.toFixed(0)} ${botThreadDesc}
       Стропы: ${seamStraps.toFixed(0)} (${sewnLength.toFixed(1)}×4)
    `;
    const threadFormulaFinal = `${totalSeamCm.toFixed(1)} см × ${threadWeightPerCm} г/см`;

    // === ИТОГ ===
    const totalWeightGrams = totalFabricGrams + totalAuxGrams + totalStrapGrams + totalThreadGrams + tieGrams;

    setResults({
      K_main, K_aux,
      fabric: {
        bodyGrams: bodyGrams.toFixed(1), bodyFormula,
        bottomGrams: bottomGrams.toFixed(1), bottomFormula,
        topName, topGrams: topGrams.toFixed(1), topFormula,
        botGrams: botGrams.toFixed(1), botFormula,
      },
      tie: {
        grams: tieGrams.toFixed(1),
        formula: tieFormula
      },
      strap: {
        lenM: (oneStrapLen * 4 / 100).toFixed(2),
        grams: totalStrapGrams.toFixed(1),
        formula: strapFormula
      },
      thread: {
        lenCm: totalSeamCm.toFixed(1),
        grams: totalThreadGrams.toFixed(1),
        details: threadFormulaDetails,
        final: threadFormulaFinal
      },
      totalKg: (totalWeightGrams / 1000).toFixed(3)
    });

  }, [height, width, bottomSize, mainDensity, auxDensity, topType, topSpoutDia, topSpoutHeight, skirtHeight, hasBottomSpout, bottomSpoutDia, bottomSpoutHeight, strapLoopHeight, strapRatioType, strapWeightPerM, threadWeightPerCm, tieWeightPerM, tieLength]);

  const handlePrint = () => window.print();

  return (
    <div className="page-container max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="text-[#E60012]" size={32} />
          Калькулятор МКР (Финал v2)
        </h1>
        <Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-2"/> Печать</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- ВВОД (ЛЕВАЯ КОЛОНКА) --- */}
        <div className="lg:col-span-4 space-y-6">
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800"><CardTitle className="text-white text-lg">1. Тело и Дно</CardTitle></CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Высота (см)</Label><Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-zinc-950 font-bold"/></div>
                <div><Label>Ширина (см)</Label><Input type="number" value={width} onChange={e => {
                    const v = Number(e.target.value);
                    setWidth(v);
                    setBottomSize(v + 5);
                }} className="bg-zinc-950 font-bold"/></div>
                <div><Label className="text-zinc-400">Дно (см)</Label><Input type="number" value={bottomSize} onChange={e => setBottomSize(Number(e.target.value))} className="bg-zinc-950"/></div>
                <div>
                    <Label className="text-blue-400">Плотность (г/м²)</Label>
                    <Input type="number" value={mainDensity} onChange={e => setMainDensity(Number(e.target.value))} className="bg-zinc-950 text-blue-400 border-blue-900/30"/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800 flex justify-between">
                <CardTitle className="text-white text-lg">2. Верх / Низ / Завязки</CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Ткань:</span>
                    <Input type="number" value={auxDensity} onChange={e => setAuxDensity(Number(e.target.value))} className="w-14 h-6 text-xs bg-zinc-950 border-emerald-900 text-emerald-400"/>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
               
               {/* ВЕРХ (Select) */}
               <div className="space-y-2">
                   <Label className="text-emerald-400">Конструкция Верха</Label>
                   <Select value={topType} onValueChange={(v:any) => setTopType(v)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="spout">Люк (Загрузочный)</SelectItem>
                         <SelectItem value="skirt">Юбка (Сборка)</SelectItem>
                         <SelectItem value="open">Открытый</SelectItem>
                      </SelectContent>
                   </Select>

                   {/* Настройки выбранного типа */}
                   {topType === 'spout' && (
                       <div className="flex gap-2 pl-2 border-l-2 border-zinc-800 animate-in fade-in">
                          <div><Label className="text-[9px]">D</Label><Input value={topSpoutDia} onChange={e=>setTopSpoutDia(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                          <div><Label className="text-[9px]">H</Label><Input value={topSpoutHeight} onChange={e=>setTopSpoutHeight(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                       </div>
                   )}
                   {topType === 'skirt' && (
                       <div className="pl-2 border-l-2 border-zinc-800 animate-in fade-in">
                          <div><Label className="text-[10px]">Высота юбки (+5см)</Label><Input value={skirtHeight} onChange={e=>setSkirtHeight(Number(e.target.value))} className="h-7 bg-zinc-950"/></div>
                       </div>
                   )}
               </div>

               <Separator className="bg-zinc-800"/>

               {/* НИЖНИЙ ЛЮК */}
               <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <Checkbox checked={hasBottomSpout} onCheckedChange={(v:any) => setHasBottomSpout(v)} />
                      <Label className="flex-1 font-bold">Нижний люк</Label>
                   </div>
                   {hasBottomSpout && (
                       <div className="flex gap-2 pl-2 border-l-2 border-zinc-800">
                          <div><Label className="text-[9px]">D</Label><Input value={bottomSpoutDia} onChange={e=>setBottomSpoutDia(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                          <div><Label className="text-[9px]">H</Label><Input value={bottomSpoutHeight} onChange={e=>setBottomSpoutHeight(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                       </div>
                   )}
               </div>

               <Separator className="bg-zinc-800"/>

               {/* ЗАВЯЗКИ */}
               <div>
                   <Label className="text-yellow-400 mb-2 block">Лента для завязки</Label>
                   <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-[10px]">Вес (г/м)</Label><Input value={tieWeightPerM} onChange={e=>setTieWeightPerM(Number(e.target.value))} className="bg-zinc-950 text-yellow-500 border-yellow-900/30"/></div>
                      <div><Label className="text-[10px]">Длина (см)</Label><Input value={tieLength} onChange={e=>setTieLength(Number(e.target.value))} className="bg-zinc-950 text-yellow-500 border-yellow-900/30"/></div>
                   </div>
               </div>

            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-3 border-b border-zinc-800"><CardTitle className="text-white text-lg">3. Стропы / Нить</CardTitle></CardHeader>
             <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Тип пришива стропы</Label>
                   <Select value={strapRatioType} onValueChange={(v:any) => setStrapRatioType(v)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="1/3">1/3 высоты</SelectItem>
                         <SelectItem value="2/3">2/3 высоты</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div><Label>Лента (г/м)</Label><Input type="number" value={strapWeightPerM} onChange={e => setStrapWeightPerM(Number(e.target.value))} className="bg-zinc-950"/></div>
                <div><Label>Петля (см)</Label><Input type="number" value={strapLoopHeight} onChange={e => setStrapLoopHeight(Number(e.target.value))} className="bg-zinc-950"/></div>
                
                <div className="col-span-2 pt-2 border-t border-zinc-800 mt-1">
                   <Label>Нить (г/см шва)</Label>
                   <Input type="number" value={threadWeightPerCm} onChange={e => setThreadWeightPerCm(Number(e.target.value))} className="bg-zinc-950 mt-1"/>
                </div>
             </CardContent>
          </Card>
        </div>

        {/* --- ИТОГИ (ПРАВАЯ КОЛОНКА) --- */}
        <div className="lg:col-span-8">
          {results && (
             <div className="space-y-6 sticky top-6">
                
                {/* ГЛАВНАЯ ЦИФРА */}
                <Card className="bg-[#E60012] border-[#E60012] text-white shadow-2xl">
                   <CardContent className="p-6 flex justify-between items-center">
                      <div>
                         <div className="text-white/80 font-medium text-sm uppercase tracking-wider">Вес 1 мешка (Нетто)</div>
                         <div className="text-6xl font-black tracking-tight mt-1">
                            {results.totalKg} <span className="text-3xl font-medium opacity-80">кг</span>
                         </div>
                      </div>
                      <Scale size={64} className="text-white/20" />
                   </CardContent>
                </Card>

                {/* ДЕТАЛЬНАЯ ТАБЛИЦА */}
                <Card className="bg-white text-black border-zinc-200 shadow-xl overflow-hidden">
                   <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-zinc-800">
                         <Layers className="text-zinc-400" /> Детальный расчет
                      </CardTitle>
                      <div className="flex gap-2">
                          <div className="text-[10px] font-mono text-zinc-500 bg-zinc-200 px-2 py-1 rounded">Main: {results.K_main}</div>
                          <div className="text-[10px] font-mono text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Aux: {results.K_aux}</div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <table className="w-full text-sm">
                         <thead className="bg-zinc-100 text-zinc-500 text-xs uppercase font-medium">
                            <tr>
                               <th className="p-3 text-left pl-6 w-1/4">Компонент</th>
                               <th className="p-3 text-left w-1/2">Формула</th>
                               <th className="p-3 text-right">Граммы</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-zinc-100 font-mono text-xs">
                            
                            {/* ТЕЛО */}
                            <tr>
                               <td className="p-4 pl-6 font-sans font-bold text-zinc-900 text-sm">Полотно (Тело)</td>
                               <td className="p-4 text-zinc-600 bg-zinc-50/50">{results.fabric.bodyFormula}</td>
                               <td className="p-4 text-right font-bold text-zinc-900 text-sm">{results.fabric.bodyGrams}</td>
                            </tr>
                            
                            {/* ДНО */}
                            <tr>
                               <td className="p-4 pl-6 font-sans font-bold text-zinc-900 text-sm">Дно</td>
                               <td className="p-4 text-zinc-600 bg-zinc-50/50">{results.fabric.bottomFormula}</td>
                               <td className="p-4 text-right font-bold text-zinc-900 text-sm">{results.fabric.bottomGrams}</td>
                            </tr>

                            {/* ВЕРХ (Люк или Юбка) */}
                            {topType !== 'open' && (
                                <tr className="bg-emerald-50/30">
                                   <td className="p-4 pl-6 font-sans font-bold text-emerald-900 text-sm">{results.fabric.topName}</td>
                                   <td className="p-4 text-emerald-800/70 bg-emerald-50/50">{results.fabric.topFormula}</td>
                                   <td className="p-4 text-right font-bold text-emerald-800 text-sm">{results.fabric.topGrams}</td>
                                </tr>
                            )}

                            {/* НИЗ (Люк) */}
                            {hasBottomSpout && (
                                <tr className="bg-emerald-50/30">
                                   <td className="p-4 pl-6 font-sans font-bold text-emerald-900 text-sm">Люк (Низ)</td>
                                   <td className="p-4 text-emerald-800/70 bg-emerald-50/50">{results.fabric.botFormula}</td>
                                   <td className="p-4 text-right font-bold text-emerald-800 text-sm">{results.fabric.botGrams}</td>
                                </tr>
                            )}
                            
                            {/* ЗАВЯЗКИ */}
                            {(topType !== 'open' || hasBottomSpout) && (
                                <tr className="bg-yellow-50/50">
                                   <td className="p-4 pl-6 font-sans font-bold text-yellow-900 text-sm">Завязка (Лента)</td>
                                   <td className="p-4 text-yellow-800/70 bg-yellow-50/50">{results.tie.formula}</td>
                                   <td className="p-4 text-right font-bold text-yellow-800 text-sm">{results.tie.grams}</td>
                                </tr>
                            )}

                            {/* СТРОПЫ */}
                            <tr className="bg-blue-50/30">
                               <td className="p-4 pl-6 font-sans font-bold text-blue-900 text-sm">Стропа (4шт)</td>
                               <td className="p-4 text-blue-800/70 bg-blue-50/50">
                                  {results.strap.formula}
                               </td>
                               <td className="p-4 text-right font-bold text-blue-800 text-sm">{results.strap.grams}</td>
                            </tr>

                            {/* НИТИ */}
                            <tr className="bg-pink-50/30">
                               <td className="p-4 pl-6 font-sans font-bold text-pink-900 text-sm">Нить (Швы)</td>
                               <td className="p-4 text-pink-800/70 bg-pink-50/50 whitespace-pre-line">
                                  <div className="mb-1 opacity-70 italic">{results.thread.details}</div>
                                  <div>{results.thread.final}</div>
                               </td>
                               <td className="p-4 text-right font-bold text-pink-800 text-sm">{results.thread.grams}</td>
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