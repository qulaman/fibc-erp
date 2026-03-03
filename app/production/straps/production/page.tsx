'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import {
  Ribbon, Users, Factory, CheckCircle2, Sun, Moon,
  AlertTriangle, Layers, Save, StopCircle, ArrowLeft,
  PlayCircle, PlusCircle, Weight, Ruler
} from "lucide-react";
import Link from 'next/link';

function StrapsProductionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const machineId = searchParams.get('machine_id') || '';

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Справочники
  const [machine, setMachine] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [strapSpecs, setStrapSpecs] = useState<any[]>([]);
  const [mfnStock, setMfnStock] = useState<any[]>([]);
  const [yarnStock, setYarnStock] = useState<any[]>([]);

  // Активная сессия на этом станке
  const [activeSession, setActiveSession] = useState<any>(null);

  // Форма
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'День' as 'День' | 'Ночь',
    operator_id: '',
    operator_id_2: '',
    // Для НОВОЙ сессии
    strap_spec_id: '',
    weft_item_id: '',
    warp_item_id: '',
    warp_source: 'yarn', // 'yarn' | 'mfn'
    // Данные смены
    length: '',
    weight: '',
    notes: '',
    is_finished: false, // Завершить производство и списать сырьё
  });

  useEffect(() => {
    if (machineId) loadData();
  }, [machineId]);

  const loadData = async () => {
    setPageLoading(true);
    try {
      const [mechRes, empRes, specsRes, mfnRes, yarnRes, sessionRes] = await Promise.all([
        supabase.from('equipment').select('*').eq('id', machineId).single(),
        supabase.from('employees').select('*').eq('role', 'operator_straps').eq('is_active', true).order('full_name'),
        supabase.from('strop_specifications').select('*').eq('is_active', true).order('nazvanie'),
        supabase.from('view_mfn_balance').select('*'),
        supabase.from('yarn_inventory').select('*').gt('quantity_kg', 0).order('last_updated', { ascending: false }),
        supabase.from('straps_machine_sessions').select('*, employees(full_name)').eq('machine_id', machineId).eq('status', 'active').maybeSingle(),
      ]);

      if (mechRes.data) setMachine(mechRes.data);
      if (empRes.data) setOperators(empRes.data);
      if (specsRes.data) setStrapSpecs(specsRes.data);
      if (mfnRes.data) setMfnStock(mfnRes.data);
      if (yarnRes.data) setYarnStock(yarnRes.data);
      if (sessionRes.data) {
        setActiveSession(sessionRes.data);
        // Предзаполняем операторов из сессии
        setFormData(prev => ({
          ...prev,
          operator_id: sessionRes.data.operator_id || '',
          operator_id_2: sessionRes.data.operator_id_2 || '',
        }));
      }
    } finally {
      setPageLoading(false);
    }
  };

  // Выбранная спецификация
  const selectedSpec = strapSpecs.find(s => s.id.toString() === formData.strap_spec_id);
  const sessionSpec = activeSession
    ? strapSpecs.find(s => s.nazvanie === activeSession.spec_name)
    : null;
  const currentSpec = activeSession ? sessionSpec : selectedSpec;

  // Расчёт расхода сырья от ВСЕЙ длины (накопленная + текущая смена)
  const totalLength = (activeSession?.total_length || 0) + Number(formData.length || 0);
  const weftConsumption = currentSpec ? (totalLength * currentSpec.utok_itogo_kg).toFixed(2) : '0';
  const warpConsumption = currentSpec ? (totalLength * currentSpec.osnova_itogo_kg).toFixed(2) : '0';

  // Расчёт веса по спецификации
  const theoreticalWeight = Number(warpConsumption) + Number(weftConsumption);
  const totalWeight = (activeSession?.total_weight || 0) + Number(formData.weight || 0);
  const weightDiff = totalWeight - theoreticalWeight;
  const weightDiffPct = theoreticalWeight > 0 ? ((weightDiff / theoreticalWeight) * 100).toFixed(1) : '0';

  const toggleOperator = (empId: string) => {
    setFormData(prev => {
      if (prev.operator_id === empId) {
        return { ...prev, operator_id: prev.operator_id_2, operator_id_2: '' };
      }
      if (prev.operator_id_2 === empId) {
        return { ...prev, operator_id_2: '' };
      }
      if (!prev.operator_id) {
        return { ...prev, operator_id: empId };
      }
      if (!prev.operator_id_2) {
        return { ...prev, operator_id_2: empId };
      }
      // Оба слота заняты — заменяем первого
      return { ...prev, operator_id: empId };
    });
  };

  const handleSubmit = async () => {
    if (!formData.operator_id || !formData.length) {
      toast.warning('Укажите оператора и метры');
      return;
    }
    if (!activeSession && (!formData.strap_spec_id || !formData.weft_item_id || !formData.warp_item_id)) {
      toast.warning('Для новой сессии выберите спецификацию и партии сырья');
      return;
    }
    if (formData.is_finished && !formData.weight) {
      toast.warning('При завершении необходимо указать итоговый вес');
      return;
    }

    setLoading(true);
    try {
      const length = Number(formData.length);
      const weight = Number(formData.weight) || 0;
      let sessionId = activeSession?.id;

      // ══════════════════════════════════════════
      // СЦЕНАРИЙ А: НОВАЯ СЕССИЯ (станок свободен)
      // ══════════════════════════════════════════
      if (!activeSession) {
        const { data: newSession, error: sessionErr } = await supabase
          .from('straps_machine_sessions')
          .insert({
            machine_id: machineId,
            operator_id: formData.operator_id,
            operator_id_2: formData.operator_id_2 || null,
            spec_name: selectedSpec!.nazvanie,
            status: 'active',
            weft_item_id: formData.weft_item_id,
            weft_source: 'mfn',
            warp_item_id: formData.warp_item_id,
            warp_source: formData.warp_source,
            total_length: 0,
            total_weight: 0,
          })
          .select()
          .single();

        if (sessionErr) throw new Error('Ошибка создания сессии: ' + sessionErr.message);
        sessionId = newSession.id;
      }

      // ══════════════════════════════════════════
      // СЦЕНАРИЙ Б: ЗАПИСЬ ДАННЫХ СМЕНЫ
      // ══════════════════════════════════════════
      const { error: prodErr } = await supabase.from('production_straps').insert({
        date: formData.date,
        shift: formData.shift,
        machine_id: machineId,
        operator_id: formData.operator_id,
        operator_id_2: formData.operator_id_2 || null,
        spec_name: currentSpec?.nazvanie || '',
        produced_length: length,
        produced_weight: weight,
        calculated_weight: currentSpec ? Number((length * (currentSpec.ves_1_pogonnogo_m_gr || 0) / 1000).toFixed(2)) : 0,
        session_id: sessionId,
        notes: formData.notes,
      });

      if (prodErr) throw new Error('Ошибка записи производства: ' + prodErr.message);

      const newTotalLength = (activeSession?.total_length || 0) + length;
      const newTotalWeight = (activeSession?.total_weight || 0) + weight;

      // ══════════════════════════════════════════
      // СЦЕНАРИЙ В: ЗАВЕРШЕНИЕ (списание сырья)
      // ══════════════════════════════════════════
      if (formData.is_finished) {
        // Получаем актуальные данные сессии
        const { data: sessionData } = await supabase
          .from('straps_machine_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        // Завершаем сессию
        await supabase
          .from('straps_machine_sessions')
          .update({ status: 'completed', ended_at: new Date().toISOString(), total_length: newTotalLength, total_weight: newTotalWeight })
          .eq('id', sessionId);

        const totalWeft = Number(weftConsumption);
        const totalWarp = Number(warpConsumption);

        // Списание утка (МФН)
        if (sessionData?.weft_item_id && totalWeft > 0) {
          const mfnItem = mfnStock.find((m: any) => m.material_code === sessionData.weft_item_id);
          const docNum = `MFN-OUT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 999)}`;
          await supabase.from('mfn_warehouse').insert({
            doc_number: docNum,
            operation_date: formData.date,
            operation_type: 'Расход',
            material_code: mfnItem?.material_code || sessionData.weft_item_id,
            material_name: mfnItem?.material_name || 'МФН',
            material_type: 'МФН',
            denier: mfnItem?.denier,
            color: mfnItem?.color,
            quantity_kg: totalWeft,
            destination: 'Цех Строп',
            notes: `Списание утка (${currentSpec?.nazvanie}) - ${newTotalLength} м`,
            status: 'Активно'
          });
        }

        // Списание основы (нить ПП или МФН)
        if (sessionData?.warp_item_id && totalWarp > 0) {
          if (sessionData.warp_source === 'yarn') {
            const yarn = yarnStock.find((y: any) => y.id === sessionData.warp_item_id);
            if (yarn) {
              await supabase.from('yarn_inventory')
                .update({ quantity_kg: Math.max(0, (yarn.quantity_kg || 0) - totalWarp), last_updated: new Date().toISOString() })
                .eq('id', sessionData.warp_item_id);
            }
          } else {
            const mfnItem = mfnStock.find((m: any) => m.material_code === sessionData.warp_item_id);
            const docNum = `MFN-OUT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 999)}W`;
            await supabase.from('mfn_warehouse').insert({
              doc_number: docNum,
              operation_date: formData.date,
              operation_type: 'Расход',
              material_code: mfnItem?.material_code || sessionData.warp_item_id,
              material_name: mfnItem?.material_name || 'МФН',
              material_type: 'МФН',
              quantity_kg: totalWarp,
              destination: 'Цех Строп',
              notes: `Списание основы (${currentSpec?.nazvanie}) - ${newTotalLength} м`,
              status: 'Активно'
            });
          }
        }

        // Создаём рулон на складе строп (только при завершении)
        const rollDate = formData.date.replace(/-/g, '');
        const specNameClean = (currentSpec?.nazvanie || 'unknown').replace(/[\s/\\]+/g, '-');
        const rollSuffix = crypto.randomUUID().substring(0, 8);
        const rollNumber = `STRAP-${rollDate}-${specNameClean}-${rollSuffix}`;

        await supabase.from('straps_warehouse').insert({
          roll_number: rollNumber,
          spec_name: currentSpec?.nazvanie || null,
          width_mm: (currentSpec as any)?.shirina_mm || null,
          produced_length: newTotalLength,
          produced_weight: newTotalWeight,
          length: newTotalLength,
          weight: newTotalWeight,
          status: 'available',
        });

        toast.success('Производство завершено! Сырьё списано.', {
          description: `Итого: ${newTotalLength} м / ${newTotalWeight} кг\nСписано: Уток ${totalWeft} кг, Основа ${totalWarp} кг`,
          duration: 5000,
        });
        router.push('/production/straps/machines');
        return;
      } else {
        // Просто обновляем накопленные данные
        await supabase
          .from('straps_machine_sessions')
          .update({ total_length: newTotalLength, total_weight: newTotalWeight, updated_at: new Date().toISOString() })
          .eq('id', sessionId);

        toast.success('Данные смены записаны!', {
          description: `Итого: ${newTotalLength} м / ${newTotalWeight} кг\n💡 Сырьё будет списано при завершении производства`,
          duration: 4000,
        });
      }

      // Сброс полей смены
      setFormData(prev => ({ ...prev, length: '', weight: '', notes: '', is_finished: false }));
      loadData();

    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <div className="page-container text-zinc-400 text-center py-20">Загрузка...</div>;
  if (!machine) return (
    <div className="page-container text-center py-20">
      <p className="text-zinc-400 mb-4">Станок не найден</p>
      <Link href="/production/straps/machines" className="text-blue-400 hover:underline">← К станкам</Link>
    </div>
  );

  return (
    <div className="page-container selection:bg-blue-900 selection:text-white">

      {/* HEADER */}
      <div className="page-header mb-6">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg"><Ribbon size={24} className="text-white" /></div>
            Цех Строп
          </h1>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Link
            href="/production/straps/machines"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors text-white flex items-center gap-2 border border-zinc-700"
          >
            <ArrowLeft size={18} />
            <Factory size={18} />
            К станкам
          </Link>
          <Input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-white h-10"
          />
          <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setFormData({ ...formData, shift: 'День' })}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                formData.shift === 'День' ? 'bg-yellow-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Sun size={18} /> День
            </button>
            <button
              onClick={() => setFormData({ ...formData, shift: 'Ночь' })}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                formData.shift === 'Ночь' ? 'bg-blue-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Moon size={18} /> Ночь
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-5 space-y-6">

          {/* Выбранный станок + статус */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Factory size={18} /> Станок и Производство</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Инфо о станке */}
              <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Ribbon size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-blue-300 font-bold uppercase">Выбранный станок</div>
                  <div className="text-xl font-bold text-white">{machine.name}</div>
                  {machine.code && <div className="text-xs text-zinc-400">Код: {machine.code}</div>}
                </div>
                <Link href="/production/straps/machines" className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 border border-zinc-700">
                  Сменить
                </Link>
              </div>

              {/* Статус сессии */}
              <div className={`p-4 rounded-xl border ${activeSession ? 'bg-blue-900/20 border-blue-800' : 'bg-emerald-900/20 border-emerald-800'}`}>
                {activeSession ? (
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-blue-600 rounded-full"><PlayCircle size={28} className="text-white" /></div>
                    <div className="flex-1">
                      <div className="text-xs text-blue-300 font-bold uppercase">Производство идёт</div>
                      <div className="text-xl font-bold text-white">{activeSession.spec_name}</div>
                      <div className="text-xs text-blue-300 mt-1 bg-blue-900/30 px-2 py-1 rounded inline-block">
                        Накоплено: {activeSession.total_length} м / {activeSession.total_weight} кг
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-emerald-600 rounded-full"><PlusCircle size={28} className="text-white" /></div>
                    <div>
                      <div className="text-xs text-emerald-300 font-bold uppercase">Станок свободен</div>
                      <div className="text-xl font-bold text-white">Начните новое производство</div>
                    </div>
                  </div>
                )}
              </div>

              {/* НОВАЯ СЕССИЯ: спецификация + партии сырья */}
              {!activeSession && (
                <div className="space-y-4 animate-in fade-in">

                  {/* Выбор стропы */}
                  <div>
                    <Label className="text-emerald-400 mb-2 block">Спецификация стропы *</Label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {strapSpecs.map(spec => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            strap_spec_id: spec.id.toString(),
                            warp_source: spec.osnova_nit_type === 'ПП' ? 'yarn' : 'mfn',
                            weft_item_id: '',
                            warp_item_id: '',
                          }))}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            formData.strap_spec_id === spec.id.toString()
                              ? 'bg-emerald-600 border-emerald-500 shadow-lg'
                              : 'bg-zinc-800 border-zinc-700 hover:border-emerald-600'
                          }`}
                        >
                          <div className="font-medium text-white flex items-center gap-2">
                            <Ribbon size={14} />
                            {spec.nazvanie}
                            {formData.strap_spec_id === spec.id.toString() && <CheckCircle2 size={14} />}
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {spec.shirina_mm}мм · {spec.osnova_nit_type === 'ПП' ? 'ПП+МФН' : '100% МФН'} · {spec.plotnost_gr_mp} гр/м
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Партии сырья */}
                  {selectedSpec && (
                    <div className="space-y-3 p-3 bg-emerald-900/10 border border-emerald-800/30 rounded-lg">
                      <div className="text-xs text-emerald-400 font-bold uppercase">Выберите партии сырья *</div>

                      {/* Уток (МФН) */}
                      <div>
                        <Label className="text-xs text-zinc-400">Уток — МФН ({selectedSpec.utok_denye}D)</Label>
                        <Select value={formData.weft_item_id} onValueChange={v => setFormData(prev => ({ ...prev, weft_item_id: v }))}>
                          <SelectTrigger className="h-9 text-sm bg-zinc-900 border-zinc-600 mt-1">
                            <SelectValue placeholder="Выберите партию..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mfnStock.map((m: any) => (
                              <SelectItem key={m.material_code} value={m.material_code}>
                                {m.material_name} {m.denier ? `(${m.denier}D)` : ''} — {Number(m.balance_kg).toFixed(1)} кг
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Основа (ПП нить или МФН) */}
                      <div>
                        <Label className="text-xs text-zinc-400">
                          Основа — {selectedSpec.osnova_nit_type} ({selectedSpec.osnova_denye}D)
                        </Label>
                        {selectedSpec.osnova_nit_type === 'ПП' ? (
                          <Select value={formData.warp_item_id} onValueChange={v => setFormData(prev => ({ ...prev, warp_item_id: v, warp_source: 'yarn' }))}>
                            <SelectTrigger className="h-9 text-sm bg-zinc-900 border-zinc-600 mt-1">
                              <SelectValue placeholder="Выберите партию нити..." />
                            </SelectTrigger>
                            <SelectContent>
                              {yarnStock.map((y: any) => (
                                <SelectItem key={y.id} value={y.id}>
                                  {y.batch_number || '—'} · {y.yarn_name || y.name} — {(y.quantity_kg || 0).toFixed(1)} кг
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={formData.warp_item_id} onValueChange={v => setFormData(prev => ({ ...prev, warp_item_id: v, warp_source: 'mfn' }))}>
                            <SelectTrigger className="h-9 text-sm bg-zinc-900 border-zinc-600 mt-1">
                              <SelectValue placeholder="Выберите партию МФН..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mfnStock.map((m: any) => (
                                <SelectItem key={m.material_code} value={m.material_code}>
                                  {m.material_name} {m.denier ? `(${m.denier}D)` : ''} — {Number(m.balance_kg).toFixed(1)} кг
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="text-xs text-zinc-500 italic">
                        💡 Сырьё будет списано при завершении производства
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Операторы */}
              <div>
                <Label className="text-zinc-400 mb-3 block">Операторы * (до 2 человек)</Label>
                <div className="flex flex-wrap gap-2">
                  {operators.length === 0 && <p className="text-zinc-500 text-sm">Нет операторов строп в справочнике</p>}
                  {operators.map(emp => {
                    const isFirst = formData.operator_id === emp.id;
                    const isSecond = formData.operator_id_2 === emp.id;
                    const initials = emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleOperator(emp.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          isFirst ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105'
                          : isSecond ? 'bg-violet-600 border-violet-500 text-white shadow-lg scale-105'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isFirst ? 'bg-white text-blue-600'
                          : isSecond ? 'bg-white text-violet-600'
                          : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {isFirst ? '1' : isSecond ? '2' : initials}
                        </div>
                        <span>{emp.full_name}</span>
                        {(isFirst || isSecond) && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
                {(formData.operator_id || formData.operator_id_2) && (
                  <div className="mt-2 text-xs text-zinc-500 flex items-center gap-3">
                    {formData.operator_id && <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-600 inline-flex items-center justify-center text-[10px] font-bold">1</span> {operators.find(o => o.id === formData.operator_id)?.full_name}</span>}
                    {formData.operator_id_2 && <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-violet-600 inline-flex items-center justify-center text-[10px] font-bold">2</span> {operators.find(o => o.id === formData.operator_id_2)?.full_name}</span>}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Ruler size={18} /> Результаты смены</CardTitle></CardHeader>
            <CardContent className="space-y-6">

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-zinc-300 flex items-center gap-2 mb-2"><Ribbon size={16} /> Метров выпущено *</Label>
                  <Input
                    type="number"
                    className="h-16 text-4xl font-bold bg-zinc-950 border-zinc-700 text-white focus:border-blue-500"
                    placeholder="0"
                    value={formData.length}
                    onChange={e => setFormData(prev => ({ ...prev, length: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className={`flex items-center gap-2 mb-2 ${formData.is_finished ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                    <Weight size={16} /> Итоговый вес (кг) {formData.is_finished && '*'}
                  </Label>
                  {formData.is_finished && (
                    <div className="text-xs text-red-300 mb-1">⚠️ Обязательно при завершении</div>
                  )}
                  <Input
                    type="number"
                    step="0.01"
                    className={`h-16 text-3xl font-bold bg-zinc-950 ${formData.is_finished ? 'border-red-600 border-2 text-red-400' : 'border-zinc-700 text-zinc-300'}`}
                    placeholder="0"
                    value={formData.weight}
                    onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-zinc-400">Примечания</Label>
                <Input
                  className="bg-zinc-950 border-zinc-700 text-white mt-1"
                  placeholder="Комментарий к смене..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Блок завершения (аналог "Снять рулон со станка") */}
              {(activeSession || formData.strap_spec_id) && (
                <div className={`p-5 rounded-xl border transition-all ${formData.is_finished ? 'bg-red-900/30 border-red-700' : 'bg-zinc-800/40 border-zinc-700/50'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full transition-colors ${formData.is_finished ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                        <StopCircle size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">Завершить производство?</div>
                        <div className="text-sm text-zinc-400">
                          {formData.is_finished
                            ? '⚠️ Производство будет завершено, сырьё будет списано'
                            : 'Производство продолжится на следующей смене (сырьё НЕ списывается)'}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-7 h-7 accent-red-600 cursor-pointer"
                      checked={formData.is_finished}
                      onChange={e => setFormData(prev => ({ ...prev, is_finished: e.target.checked }))}
                    />
                  </div>

                  {/* Информация о списании при завершении */}
                  {formData.is_finished && currentSpec && (
                    <div className="space-y-3 pt-4 border-t border-zinc-700/50 animate-in fade-in">
                      <div className="text-xs text-red-300 font-bold uppercase mb-2">
                        Будет списано сырья (за всё производство: {totalLength} м)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-red-900/20 border border-red-800/30 rounded">
                          <div className="text-xs text-zinc-400 mb-1">Уток МФН ({currentSpec.utok_denye}D)</div>
                          <div className="text-xs text-red-400">Спишется: ~{weftConsumption} кг</div>
                        </div>
                        <div className="p-3 bg-red-900/20 border border-red-800/30 rounded">
                          <div className="text-xs text-zinc-400 mb-1">Основа {currentSpec.osnova_nit_type} ({currentSpec.osnova_denye}D)</div>
                          <div className="text-xs text-red-400">Спишется: ~{warpConsumption} кг</div>
                        </div>
                      </div>

                      {/* Контроль веса */}
                      {formData.weight && (
                        <div className={`p-4 rounded-lg border-2 ${
                          Math.abs(Number(weightDiffPct)) <= 5 ? 'bg-green-900/20 border-green-800/50' :
                          Math.abs(Number(weightDiffPct)) <= 10 ? 'bg-yellow-900/20 border-yellow-800/50' :
                          'bg-red-900/20 border-red-800/50'
                        }`}>
                          <div className="text-xs font-bold uppercase mb-3 text-zinc-300">Контроль веса</div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <div className="text-xs text-zinc-400">Теоретический</div>
                              <div className="text-lg font-bold text-white">{theoreticalWeight.toFixed(2)} кг</div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Фактический</div>
                              <div className="text-lg font-bold text-white">{totalWeight.toFixed(2)} кг</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
                            <span className="text-xs text-zinc-400">Расхождение:</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xl font-bold ${Math.abs(Number(weightDiffPct)) <= 5 ? 'text-green-400' : Math.abs(Number(weightDiffPct)) <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(2)} кг
                              </span>
                              <span className={`px-2 py-1 rounded font-bold text-sm ${Math.abs(Number(weightDiffPct)) <= 5 ? 'bg-green-600 text-white' : Math.abs(Number(weightDiffPct)) <= 10 ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}`}>
                                {weightDiff > 0 ? '+' : ''}{weightDiffPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Предупреждения */}
              {(() => {
                const missing = [];
                if (!formData.operator_id) missing.push('Выберите оператора');
                if (!activeSession && !formData.strap_spec_id) missing.push('Выберите спецификацию стропы');
                if (!activeSession && selectedSpec && !formData.weft_item_id) missing.push('Выберите партию утка (МФН)');
                if (!activeSession && selectedSpec && !formData.warp_item_id) missing.push('Выберите партию основы');
                if (!formData.length) missing.push('Укажите метры выпущено');
                if (formData.is_finished && !formData.weight) missing.push('⚠️ Укажите итоговый вес (обязательно при завершении)');
                return missing.length > 0 && (
                  <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded p-3">
                    <div className="font-bold mb-2">⚠️ Заполните обязательные поля:</div>
                    <ul className="space-y-1 ml-4">
                      {missing.map((f, i) => <li key={i}>• {f}</li>)}
                    </ul>
                  </div>
                );
              })()}

              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.operator_id || !formData.length || (formData.is_finished && !formData.weight)}
                className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${
                  formData.is_finished ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Сохранение...' : (
                  <span className="flex items-center gap-2">
                    {formData.is_finished ? <CheckCircle2 /> : <Save />}
                    {formData.is_finished ? 'Завершить производство и списать сырьё' : 'Записать данные смены (продолжить)'}
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

export default function StrapsProductionPage() {
  return (
    <Suspense fallback={<div className="page-container text-zinc-400 text-center py-20">Загрузка...</div>}>
      <StrapsProductionContent />
    </Suspense>
  );
}
