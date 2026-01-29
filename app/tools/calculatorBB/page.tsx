'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator, Printer, Layers, Scale, Scissors } from "lucide-react";

export default function FibcCalculatorPage() {
  // --- ВХОДНЫЕ ДАННЫЕ ---
  
  // 1. Габариты
  const [height, setHeight] = useState<number>(140);
  const [width, setWidth] = useState<number>(90);
  const [bottomSize, setBottomSize] = useState<number>(95);

  // 2. Ткани
  const [mainDensity, setMainDensity] = useState<number>(180);
  const [auxDensity, setAuxDensity] = useState<number>(95);

  // 3. Люки
  const [hasTopSpout, setHasTopSpout] = useState<boolean>(true);
  const [topSpoutDia, setTopSpoutDia] = useState<number>(40);
  const [topSpoutHeight, setTopSpoutHeight] = useState<number>(48);

  const [hasBottomSpout, setHasBottomSpout] = useState<boolean>(true);
  const [bottomSpoutDia, setBottomSpoutDia] = useState<number>(40);
  const [bottomSpoutHeight, setBottomSpoutHeight] = useState<number>(48);
  
  // НОВОЕ: Завязки (Лента)
  const [tieWeightPerM, setTieWeightPerM] = useState<number>(10); // г/м (легкая лента)
  const [tieLength, setTieLength] = useState<number>(150); // см (длина одного куска)

  // 4. Стропы
  const [strapLoopHeight, setStrapLoopHeight] = useState<number>(25);
  const [strapRatioType, setStrapRatioType] = useState<"1/3" | "2/3">("2/3"); 
  const [strapWeightPerM, setStrapWeightPerM] = useState<number>(35);

  // 5. Нить
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

    // === 3. ЛЮКИ (Ткань) ===
    const seamAllowance = 3; 

    // Верхний
    let topSpoutGrams = 0;
    let topFormula = "-";
    if (hasTopSpout) {
        const widthFlat = (topSpoutDia * 3.14159) + seamAllowance;
        const area = widthFlat * topSpoutHeight;
        topSpoutGrams = area * K_aux;
        topFormula = `((Ø${topSpoutDia}×π)+3)×${topSpoutHeight} × ${K_aux}`;
    }

    // Нижний
    let botSpoutGrams = 0;
    let botFormula = "-";
    if (hasBottomSpout) {
        const widthFlat = (bottomSpoutDia * 3.14159) + seamAllowance;
        const area = widthFlat * bottomSpoutHeight;
        botSpoutGrams = area * K_aux;
        botFormula = `((Ø${bottomSpoutDia}×π)+3)×${bottomSpoutHeight} × ${K_aux}`;
    }

    const totalFabricGrams = bodyGrams + bottomGrams;
    const totalAuxGrams = topSpoutGrams + botSpoutGrams;

    // === НОВОЕ: ЗАВЯЗКИ (ЛЕНТА) ===
    // Если есть люк -> нужна завязка.
    // Обычно 1 завязка на люк (иногда 2, но считаем 1 пока)
    let tiesCount = 0;
    if (hasTopSpout) tiesCount++;
    if (hasBottomSpout) tiesCount++;

    const tieGrams = tiesCount * (tieLength / 100) * tieWeightPerM;
    const tieFormula = `${tiesCount}шт × ${tieLength}см × ${tieWeightPerM}г/м`;

    // === 4. СТРОПЫ ===
    const strapWeightPerCm = strapWeightPerM / 100;
    let sewnLength = 0;
    if (strapRatioType === "2/3") sewnLength = height * (2 / 3);
    else sewnLength = height * (1 / 3);

    const oneStrapLen = (sewnLength * 2) + (strapLoopHeight * 2);
    const totalStrapGrams = oneStrapLen * 4 * strapWeightPerCm;
    
    const ratioStr = strapRatioType === "2/3" ? "2/3" : "1/3";
    const strapFormula = `((${height}×${ratioStr}×2)+${strapLoopHeight}×2)×4 × ${strapWeightPerCm}`;

    // === 5. НИТЬ (КОРРЕКТНЫЙ РАСЧЕТ) ===
    
    // 1. Периметр Дна (всегда)
    const seamBottom = width * 4; 
    
    // 2. Периметр Верха (всегда, крышка или сборка пришивается к телу)
    const seamTop = width * 4;

    // 3. Стропы (Пришив * 2 стороны * 4 стропы)
    const seamStraps = (sewnLength * 2 * 4); 
    
    // 4. Пришив Люков (Окружность * 1 шов)
    const seamSpoutTop = hasTopSpout ? (topSpoutDia * 3.14159) : 0;
    const seamSpoutBot = hasBottomSpout ? (bottomSpoutDia * 3.14159) : 0;
    
    const totalSeamCm = seamBottom + seamTop + seamStraps + seamSpoutTop + seamSpoutBot;
    const totalThreadGrams = totalSeamCm * threadWeightPerCm;
    
    const threadFormulaDetails = `Дно(${seamBottom}) + Верх(${seamTop}) + Стропы(${seamStraps.toFixed(0)}) + Люки(${(seamSpoutTop+seamSpoutBot).toFixed(0)})`;
    const threadFormulaFinal = `${totalSeamCm.toFixed(0)} см × ${threadWeightPerCm} г/см`;

    // === ИТОГ ===
    const totalWeightGrams = totalFabricGrams + totalAuxGrams + totalStrapGrams + totalThreadGrams + tieGrams;

    setResults({
      K_main, K_aux,
      fabric: {
        bodyGrams: bodyGrams.toFixed(1), bodyFormula,
        bottomGrams: bottomGrams.toFixed(1), bottomFormula,
        topGrams: topSpoutGrams.toFixed(1), topFormula,
        botGrams: botSpoutGrams.toFixed(1), botFormula,
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
        lenCm: totalSeamCm.toFixed(0),
        grams: totalThreadGrams.toFixed(1),
        details: threadFormulaDetails,
        final: threadFormulaFinal
      },
      totalKg: (totalWeightGrams / 1000).toFixed(3)
    });

  }, [height, width, bottomSize, mainDensity, auxDensity, hasTopSpout, topSpoutDia, topSpoutHeight, hasBottomSpout, bottomSpoutDia, bottomSpoutHeight, strapLoopHeight, strapRatioType, strapWeightPerM, threadWeightPerCm, tieWeightPerM, tieLength]);

  const handlePrint = () => window.print();

  return (
    <div className="page-container max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="text-[#E60012]" size={32} />
          Калькулятор МКР (Финал)
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
                <CardTitle className="text-white text-lg">2. Люки & Завязки</CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Ткань:</span>
                    <Input type="number" value={auxDensity} onChange={e => setAuxDensity(Number(e.target.value))} className="w-14 h-6 text-xs bg-zinc-950 border-emerald-900 text-emerald-400"/>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
               
               {/* Верхний */}
               <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <Checkbox checked={hasTopSpout} onCheckedChange={(v:any) => setHasTopSpout(v)} />
                      <Label className="flex-1 font-bold">Верхний</Label>
                   </div>
                   {hasTopSpout && (
                       <div className="flex gap-2 pl-2 border-l-2 border-zinc-800">
                          <div><Label className="text-[9px]">D</Label><Input value={topSpoutDia} onChange={e=>setTopSpoutDia(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                          <div><Label className="text-[9px]">H</Label><Input value={topSpoutHeight} onChange={e=>setTopSpoutHeight(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                       </div>
                   )}
               </div>

               {/* Нижний */}
               <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <Checkbox checked={hasBottomSpout} onCheckedChange={(v:any) => setHasBottomSpout(v)} />
                      <Label className="flex-1 font-bold">Нижний</Label>
                   </div>
                   {hasBottomSpout && (
                       <div className="flex gap-2 pl-2 border-l-2 border-zinc-800">
                          <div><Label className="text-[9px]">D</Label><Input value={bottomSpoutDia} onChange={e=>setBottomSpoutDia(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                          <div><Label className="text-[9px]">H</Label><Input value={bottomSpoutHeight} onChange={e=>setBottomSpoutHeight(Number(e.target.value))} className="w-14 h-7 bg-zinc-950"/></div>
                       </div>
                   )}
               </div>

               <Separator className="bg-zinc-800"/>

               {/* Завязки */}
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

                            {/* ЛЮКИ */}
                            {hasTopSpout && (
                                <tr className="bg-emerald-50/30">
                                   <td className="p-4 pl-6 font-sans font-bold text-emerald-900 text-sm">Люк (Верх)</td>
                                   <td className="p-4 text-emerald-800/70 bg-emerald-50/50">{results.fabric.topFormula}</td>
                                   <td className="p-4 text-right font-bold text-emerald-800 text-sm">{results.fabric.topGrams}</td>
                                </tr>
                            )}
                            {hasBottomSpout && (
                                <tr className="bg-emerald-50/30">
                                   <td className="p-4 pl-6 font-sans font-bold text-emerald-900 text-sm">Люк (Низ)</td>
                                   <td className="p-4 text-emerald-800/70 bg-emerald-50/50">{results.fabric.botFormula}</td>
                                   <td className="p-4 text-right font-bold text-emerald-800 text-sm">{results.fabric.botGrams}</td>
                                </tr>
                            )}
                            
                            {/* ЗАВЯЗКИ */}
                            {(hasTopSpout || hasBottomSpout) && (
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