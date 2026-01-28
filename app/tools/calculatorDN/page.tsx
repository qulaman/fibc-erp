'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calculator, Scale, Ruler, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculateDensity, calculateRequiredDenier, CalculationResult } from '@/lib/fabric-calculator';

export default function DenierCalculatorPage() {
  const [mode, setMode] = useState<'density' | 'denier'>('density');

  // Данные по умолчанию как в твоем примере
  const [params, setParams] = useState({
    weftDenier: 1570,
    warpDenier: 1570,
    weftThreads: 40, 
    warpThreads: 40,
    width: 300,      
    targetDensity: 140,
    actualDensity: 140 // Для сравнения
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [reverseResult, setReverseResult] = useState<any>(null);

  // Авто-пересчет
  useEffect(() => {
    if (mode === 'density') {
      const res = calculateDensity({
        weftDenier: params.weftDenier,
        warpDenier: params.warpDenier,
        weftThreads10cm: params.weftThreads,
        warpThreads10cm: params.warpThreads,
        fabricWidthCm: params.width
      });
      setResult(res);
    } else {
      const res = calculateRequiredDenier(
        params.targetDensity,
        params.weftThreads,
        params.warpThreads
      );
      setReverseResult(res);
    }
  }, [params, mode]);

  const handleChange = (field: string, value: string) => {
    setParams(prev => ({ ...prev, [field]: Number(value) }));
  };

  // Расчет отклонения
  const deviation = result ? Math.abs(result.density - params.actualDensity) : 0;
  const deviationPercent = result && params.actualDensity > 0 ? (deviation / params.actualDensity) * 100 : 0;
  const isCritical = deviationPercent > 5;

  return (
    <div className="page-container max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="h1-bold flex items-center gap-3">
          <Calculator className="text-[#E60012]" size={32} />
          Калькулятор Технолога
        </h1>
        <p className="text-zinc-400">Точный расчет параметров полипропиленовой ткани.</p>
      </div>

      <Tabs defaultValue="density" onValueChange={(v: any) => setMode(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="density" className="data-[state=active]:bg-[#E60012] data-[state=active]:text-white">
            📊 Расчет плотности (по Денье)
          </TabsTrigger>
          <TabsTrigger value="denier" className="data-[state=active]:bg-[#E60012] data-[state=active]:text-white">
            🧵 Расчет денье (по Плотности)
          </TabsTrigger>
        </TabsList>

        {/* --- РЕЖИМ 1: РАСЧЕТ ПЛОТНОСТИ --- */}
        <TabsContent value="density">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* ВВОД ДАННЫХ */}
            <div className="md:col-span-5 space-y-6">
              
              {/* УТОК */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3"><CardTitle className="text-sm uppercase text-zinc-400">Параметры Утка</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Денье (dtex)</Label>
                      <Input type="number" value={params.weftDenier} onChange={e => handleChange('weftDenier', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
                    </div>
                    <div className="space-y-2">
                      <Label>Нитей на 10см</Label>
                      <Input type="number" value={params.weftThreads} onChange={e => handleChange('weftThreads', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
                    </div>
                </CardContent>
              </Card>

              {/* ОСНОВА */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3"><CardTitle className="text-sm uppercase text-zinc-400">Параметры Основы</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Денье (dtex)</Label>
                      <Input type="number" value={params.warpDenier} onChange={e => handleChange('warpDenier', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
                    </div>
                    <div className="space-y-2">
                      <Label>Нитей на 10см</Label>
                      <Input type="number" value={params.warpThreads} onChange={e => handleChange('warpThreads', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
                    </div>
                </CardContent>
              </Card>

              {/* ДОПОЛНИТЕЛЬНО */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="grid grid-cols-2 gap-4 pt-6">
                    <div className="space-y-2">
                      <Label>Факт. плотность (г/м²)</Label>
                      <Input type="number" value={params.actualDensity} onChange={e => handleChange('actualDensity', e.target.value)} className="bg-zinc-950 border-zinc-700 text-yellow-500"/>
                    </div>
                    <div className="space-y-2">
                      <Label>Ширина ткани (см)</Label>
                      <Input type="number" value={params.width} onChange={e => handleChange('width', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
                    </div>
                </CardContent>
              </Card>
            </div>

            {/* РЕЗУЛЬТАТЫ */}
            <div className="md:col-span-7 space-y-4">
              {result && (
                <>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader><CardTitle className="text-emerald-500">Результаты расчета</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* ГЛАВНЫЙ ИТОГ */}
                      <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                         <div>
                            <div className="text-sm text-zinc-400">Расчетная плотность</div>
                            <div className="text-4xl font-bold text-white">{result.density} <span className="text-lg font-normal text-zinc-500">г/м²</span></div>
                         </div>
                         <div className="text-right text-sm">
                            <div className="text-zinc-400">Уток: <span className="text-white font-bold">{result.weftContribution}</span> г/м²</div>
                            <div className="text-zinc-400">Основа: <span className="text-white font-bold">{result.warpContribution}</span> г/м²</div>
                         </div>
                      </div>

                      {/* АНАЛИЗ ОТКЛОНЕНИЯ */}
                      {params.actualDensity > 0 && (
                          <div className={`p-4 rounded-lg border flex items-start gap-3 ${isCritical ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-green-900/20 border-green-800 text-green-400'}`}>
                             {isCritical ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
                             <div>
                                <div className="font-bold">
                                   {isCritical ? 'Критическое отклонение!' : 'В пределах нормы'}
                                </div>
                                <div className="text-sm opacity-80 mt-1">
                                   Факт: {params.actualDensity} | Расчет: {result.density} | Разница: {deviationPercent.toFixed(2)}%
                                </div>
                             </div>
                          </div>
                      )}

                      <Separator className="bg-zinc-800"/>

                      {/* РАСХОД */}
                      <div>
                         <div className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Scale size={16}/> Расход сырья (на 1 пог. метр)</div>
                         <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                               <div className="text-xs text-zinc-500">Уток</div>
                               <div className="font-mono font-bold">{result.weftConsumption} кг</div>
                            </div>
                            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                               <div className="text-xs text-zinc-500">Основа</div>
                               <div className="font-mono font-bold">{result.warpConsumption} кг</div>
                            </div>
                            <div className="p-3 bg-indigo-950/30 rounded border border-indigo-900/50">
                               <div className="text-xs text-indigo-400">Итого</div>
                               <div className="font-mono font-bold text-white">{result.consumptionKgPerM} кг</div>
                            </div>
                         </div>
                      </div>

                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* --- РЕЖИМ 2: ПОДБОР НИТИ --- */}
        <TabsContent value="denier">
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardHeader><CardTitle>Целевые параметры</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="space-y-2">
                  <Label className="text-[#E60012] text-lg">Цель: Грамматура</Label>
                  <Input type="number" value={params.targetDensity} onChange={e => handleChange('targetDensity', e.target.value)} className="h-14 text-2xl font-bold bg-zinc-950 border-zinc-700"/>
               </div>
               <div className="space-y-2">
                  <Label>Плотность Утка</Label>
                  <Input type="number" value={params.weftThreads} onChange={e => handleChange('weftThreads', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
               </div>
               <div className="space-y-2">
                  <Label>Плотность Основы</Label>
                  <Input type="number" value={params.warpThreads} onChange={e => handleChange('warpThreads', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
               </div>
               <div className="space-y-2">
                  <Label>Ширина ткани</Label>
                  <Input type="number" value={params.width} onChange={e => handleChange('width', e.target.value)} className="bg-zinc-950 border-zinc-700"/>
               </div>
            </CardContent>
          </Card>

          {reverseResult && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                   <CardHeader><CardTitle className="text-zinc-300">Рекомендуемая Основа</CardTitle></CardHeader>
                   <CardContent>
                      <div className="text-4xl font-bold text-white mb-1">{reverseResult.warpDenier} <span className="text-lg text-zinc-500">dtex</span></div>
                      <div className="mt-4 p-3 bg-zinc-950 rounded-lg border border-zinc-700 flex items-center justify-between">
                         <span className="text-sm text-zinc-400">Стандарт:</span>
                         <span className="font-bold text-emerald-400 text-lg">{reverseResult.closestStandardWarp} dtex</span>
                      </div>
                   </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                   <CardHeader><CardTitle className="text-zinc-300">Рекомендуемый Уток</CardTitle></CardHeader>
                   <CardContent>
                      <div className="text-4xl font-bold text-white mb-1">{reverseResult.weftDenier} <span className="text-lg text-zinc-500">dtex</span></div>
                      <div className="mt-4 p-3 bg-zinc-950 rounded-lg border border-zinc-700 flex items-center justify-between">
                         <span className="text-sm text-zinc-400">Стандарт:</span>
                         <span className="font-bold text-emerald-400 text-lg">{reverseResult.closestStandardWeft} dtex</span>
                      </div>
                   </CardContent>
                </Card>
             </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}