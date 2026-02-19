'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { toast } from 'sonner';
import { X, Plus, Minus, CheckCircle, CheckCircle2, Loader2, Sun, Moon, Users, Package, AlertTriangle } from "lucide-react";
import Link from 'next/link';

interface Employee {
  id: string;
  full_name: string;
}

interface SewingOperation {
  code: string;
  name: string;
  category: string;
  rate_kzt: number;
  time_norm_minutes: number;
}

interface Product {
  code: string;
  name: string;
  category: string;
}

interface FinishedProductItem {
  id: string;
  productCode: string;
  quantity: number;
}

interface Specification {
  cutting_part_code: string;
  cutting_part_name: string;
  quantity: number;
}

type SeamstressOps = Record<string, Record<string, { good: number; defect: number }>>;

interface Props {
  productType: 'Биг-Бэг' | 'Вкладыш';
  title: string;
  accentColor: 'pink' | 'blue';
}

export function SewingProductionPage({ productType, title, accentColor }: Props) {
  const isPink = accentColor === 'pink';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'День' | 'Ночь'>('День');
  const [shiftMaster, setShiftMaster] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setOperations] = useState<SewingOperation[]>([]);
  const [masters, setMasters] = useState<Employee[]>([]);
  const [specsCache, setSpecsCache] = useState<Record<string, Specification[]>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProductItem[]>([]);

  const [seamstressOps, setSeamstressOps] = useState<SeamstressOps>({});
  const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);
  const [selectedOpCode, setSelectedOpCode] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [defect, setDefect] = useState(0);

  useEffect(() => {
    fetchData();
  }, [productType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('is_active', true)
        .in('role', ['operator_sewing', 'seamstress'])
        .order('full_name');

      // Try filtering by product_type; fall back to all if column doesn't exist
      let opsData: SewingOperation[] = [];
      const { data: filteredOps, error: opsError } = await supabase
        .from('sewing_operations')
        .select('code, name, category, rate_kzt, time_norm_minutes')
        .in('product_type', [productType, 'Общее'])
        .order('category');

      if (opsError) {
        const { data: allOps } = await supabase
          .from('sewing_operations')
          .select('code, name, category, rate_kzt, time_norm_minutes')
          .order('category');
        opsData = allOps || [];
      } else {
        opsData = filteredOps || [];
      }

      const { data: mastersData } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('role', ['master_sewing', 'shift_master'])
        .eq('is_active', true)
        .order('full_name');

      // Load products filtered by type
      const { data: productsData } = await supabase
        .from('product_catalog')
        .select('code, name, category')
        .eq('category', productType)
        .eq('is_active', true)
        .order('name');

      setEmployees(empData || []);
      setOperations(opsData);
      setMasters(mastersData || []);
      setProducts(productsData || []);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpec = async (opCode: string): Promise<Specification[]> => {
    if (specsCache[opCode]) return specsCache[opCode];
    const { data } = await supabase
      .from('sewing_specifications')
      .select('cutting_part_code, cutting_part_name, quantity')
      .eq('sewing_operation_code', opCode)
      .eq('status', 'Активно');
    const spec = data || [];
    setSpecsCache(prev => ({ ...prev, [opCode]: spec }));
    return spec;
  };

  const groupedOps = operations.reduce<Record<string, SewingOperation[]>>((acc, op) => {
    if (!acc[op.category]) acc[op.category] = [];
    acc[op.category].push(op);
    return acc;
  }, {});

  const getEmpStats = (empId: string) => {
    const ops = seamstressOps[empId];
    if (!ops) return { count: 0, total: 0 };
    let count = 0, total = 0;
    for (const [code, val] of Object.entries(ops)) {
      count++;
      const op = operations.find(o => o.code === code);
      total += (op?.rate_kzt || 0) * val.good;
    }
    return { count, total };
  };

  const grandTotal = Object.values(seamstressOps).reduce((sum, empOps) =>
    sum + Object.entries(empOps).reduce((s, [code, val]) => {
      const op = operations.find(o => o.code === code);
      return s + (op?.rate_kzt || 0) * val.good;
    }, 0), 0);

  const activeSeamstresses = Object.keys(seamstressOps).filter(id => Object.keys(seamstressOps[id]).length > 0).length;
  const totalOps = Object.values(seamstressOps).reduce((sum, ops) => sum + Object.keys(ops).length, 0);

  const openModal = (emp: Employee) => {
    setModalEmployee(emp);
    setSelectedOpCode(null);
    setQty(1);
    setDefect(0);
  };

  const closeModal = () => {
    setModalEmployee(null);
    setSelectedOpCode(null);
    setQty(1);
    setDefect(0);
  };

  const selectOp = (opCode: string) => {
    if (selectedOpCode === opCode) {
      setSelectedOpCode(null);
      return;
    }
    setSelectedOpCode(opCode);
    const existing = modalEmployee ? seamstressOps[modalEmployee.id]?.[opCode] : null;
    setQty(existing ? existing.good : 1);
    setDefect(existing ? existing.defect : 0);
  };

  const addOp = () => {
    if (!modalEmployee || !selectedOpCode || qty <= 0) return;
    const empId = modalEmployee.id;
    setSeamstressOps(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [selectedOpCode]: { good: qty, defect } }
    }));
    setSelectedOpCode(null);
    setQty(1);
    setDefect(0);
  };

  const removeOp = (empId: string, opCode: string) => {
    setSeamstressOps(prev => {
      const updated = { ...(prev[empId] || {}) };
      delete updated[opCode];
      if (Object.keys(updated).length === 0) {
        const { [empId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [empId]: updated };
    });
  };

  // Finished products management
  const addFinishedProduct = () => {
    setFinishedProducts(prev => [...prev, {
      id: Date.now().toString(),
      productCode: '',
      quantity: 1
    }]);
  };

  const updateFinishedProduct = (id: string, field: keyof FinishedProductItem, value: any) => {
    setFinishedProducts(prev => prev.map(fp =>
      fp.id === id ? { ...fp, [field]: value } : fp
    ));
  };

  const deleteFinishedProduct = (id: string) => {
    setFinishedProducts(prev => prev.filter(fp => fp.id !== id));
  };

  const handleSubmit = async () => {
    if (!date || !shiftMaster) {
      toast.error('Заполните дату и мастера смены!');
      return;
    }
    if (totalOps === 0) {
      toast.error('Добавьте хотя бы одну операцию!');
      return;
    }
    setSubmitting(true);
    try {
      let successCount = 0;
      for (const [empId, ops] of Object.entries(seamstressOps)) {
        const employee = employees.find(e => e.id === empId);
        if (!employee) continue;

        for (const [opCode, val] of Object.entries(ops)) {
          if (val.good <= 0) continue;
          const operation = operations.find(o => o.code === opCode);
          if (!operation) continue;

          const docNumber = `SEW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          const amount = operation.rate_kzt * val.good;
          const totalTime = operation.time_norm_minutes * val.good;

          // Списываем детали
          const spec = await fetchSpec(opCode);
          for (const part of spec) {
            const { error: wErr } = await supabase.from('cutting_parts_warehouse').insert([{
              doc_number: docNumber,
              date,
              time: new Date().toTimeString().split(' ')[0],
              operation: 'Расход',
              cutting_type_code: part.cutting_part_code,
              cutting_type_name: part.cutting_part_name,
              category: '',
              quantity: part.quantity * val.good,
              source_number: docNumber,
              operator: employee.full_name,
              status: 'Проведено'
            }]);
            if (wErr) throw new Error(`Ошибка списания ${part.cutting_part_name}: ${wErr.message}`);
          }

          // Запись в production_sewing
          const { error: pErr } = await supabase.from('production_sewing').insert([{
            doc_number: docNumber,
            date,
            time: new Date().toTimeString().split(' ')[0],
            seamstress: employee.full_name,
            operation_code: operation.code,
            operation_name: operation.name,
            operation_category: operation.category,
            quantity_good: val.good,
            quantity_defect: val.defect,
            time_norm_minutes: totalTime,
            amount_kzt: amount,
            shift_master: shiftMaster,
            status: 'Проведено'
          }]);
          if (pErr) throw new Error(`Ошибка записи: ${pErr.message}`);
          successCount++;
        }
      }

      // Save finished products to warehouse
      for (const fp of finishedProducts) {
        if (!fp.productCode || fp.quantity <= 0) continue;
        const product = products.find(p => p.code === fp.productCode);
        if (!product) continue;

        const fpDocNumber = `SEW-FP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        const { error: fpErr } = await supabase.from('sewn_products_warehouse').insert([{
          doc_number: fpDocNumber,
          operation_date: date,
          operation_time: new Date().toTimeString().split(' ')[0],
          operation_type: 'Приход',
          product_code: product.code,
          product_name: product.name,
          product_type: product.category,
          quantity: fp.quantity,
          source_doc_number: fpDocNumber,
          source_doc_type: 'Пошив',
          employee_name: shiftMaster,
          shift: shift,
          notes: `Готовая продукция к ОТК - ${shift} смена`,
          status: 'Активно'
        }]);

        if (fpErr) throw new Error(`Ошибка сохранения готовой продукции: ${fpErr.message}`);
      }

      const finishedInfo = finishedProducts.length > 0
        ? ` · ${finishedProducts.reduce((s, fp) => s + fp.quantity, 0)} изделий к ОТК`
        : '';

      toast.success(`Проведено ${successCount} операций${finishedInfo} · ${grandTotal.toFixed(0)}₸`);
      setSeamstressOps({});
      setFinishedProducts([]);
      setDate(new Date().toISOString().split('T')[0]);
      setShiftMaster('');
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`animate-spin ${isPink ? 'text-pink-400' : 'text-blue-400'}`} size={40} />
      </div>
    );
  }

  const modalEmpOps = modalEmployee ? (seamstressOps[modalEmployee.id] || {}) : {};
  const selectedOp = selectedOpCode ? operations.find(o => o.code === selectedOpCode) : null;

  // Проверка обязательных полей
  const missingFields = [];
  if (!date) missingFields.push('Укажите дату');
  if (!shiftMaster) missingFields.push('Выберите мастера смены');
  if (totalOps === 0) missingFields.push('Добавьте операции пошива');

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6 pb-32">
      {/* Header */}
      <div className="mb-4">
        <h1 className={`text-xl md:text-3xl font-bold flex items-center gap-2 ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
          <Package size={24} /> {title}
        </h1>
      </div>

      {/* Индикатор обязательных полей */}
      {missingFields.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-2 border-yellow-600/50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="text-yellow-500 font-bold text-lg mb-2">Заполните обязательные поля</h3>
              <ul className="space-y-1 text-zinc-300">
                {missingFields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-yellow-500">•</span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Дата</label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-zinc-950 border-zinc-700 w-40"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Смена</label>
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-700">
            <button
              onClick={() => setShift('День')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${shift === 'День' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Sun size={14} /> День
            </button>
            <button
              onClick={() => setShift('Ночь')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${shift === 'Ночь' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Moon size={14} /> Ночь
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Мастер смены *</label>
          {masters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {masters.map(m => {
                const isSelected = shiftMaster === m.full_name;
                const initials = m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setShiftMaster(m.full_name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                      isSelected
                        ? `${isPink ? 'bg-pink-600 border-pink-500' : 'bg-blue-600 border-blue-500'} text-white shadow-lg scale-105`
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? `bg-white ${isPink ? 'text-pink-600' : 'text-blue-600'}`
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {initials}
                    </div>
                    <span>{m.full_name}</span>
                    {isSelected && <CheckCircle2 size={14} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-500 text-sm p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              Нет мастеров. Добавьте в <Link href="/production/sewing/personnel" className="text-pink-400 underline">персонал</Link>.
            </div>
          )}
        </div>
      </div>

      {/* Seamstress Grid */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className={isPink ? 'text-pink-400' : 'text-blue-400'} />
          <span className="text-sm font-bold text-zinc-300">Швеи ({employees.length})</span>
        </div>
        {employees.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
            Нет швей в базе. Добавьте сотрудников с ролью &quot;Швея&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {employees.map(emp => {
              const { count, total } = getEmpStats(emp.id);
              const hasOps = count > 0;
              return (
                <button
                  key={emp.id}
                  onClick={() => openModal(emp)}
                  className={`relative p-3 rounded-xl border text-left transition-all duration-150 ${
                    hasOps
                      ? isPink
                        ? 'bg-pink-900/40 border-pink-600 shadow-lg shadow-pink-900/20'
                        : 'bg-blue-900/40 border-blue-600 shadow-lg shadow-blue-900/20'
                      : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`text-xs font-bold leading-tight ${hasOps ? 'text-white' : 'text-zinc-300'}`}>
                    {emp.full_name.split(' ').slice(0, 2).join('\u00A0')}
                  </div>
                  {hasOps && (
                    <div className={`text-[10px] mt-1 font-medium ${isPink ? 'text-pink-300' : 'text-blue-300'}`}>
                      {count} оп · {total.toFixed(0)}₸
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalEmployee && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
              <div>
                <div className={`text-[10px] font-bold uppercase mb-0.5 ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                  {productType}
                </div>
                <h3 className="text-lg font-bold text-white">{modalEmployee.full_name}</h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable operations */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.keys(groupedOps).length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  Нет операций. Добавьте операции в справочнике.
                </div>
              )}
              {Object.entries(groupedOps).map(([category, ops]) => (
                <div key={category}>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{category}</div>
                  <div className="space-y-1.5">
                    {ops.map(op => {
                      const isSelected = selectedOpCode === op.code;
                      const alreadyAdded = !!modalEmpOps[op.code];
                      return (
                        <div key={op.code}>
                          <button
                            onClick={() => selectOp(op.code)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? isPink
                                  ? 'bg-pink-900/40 border-pink-600 text-white'
                                  : 'bg-blue-900/40 border-blue-600 text-white'
                                : alreadyAdded
                                ? 'bg-zinc-800/60 border-zinc-600 text-zinc-200'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{op.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {alreadyAdded && !isSelected && (
                                  <span className={`text-xs font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                                    ✓ {modalEmpOps[op.code].good} шт
                                  </span>
                                )}
                                <span className="text-xs text-zinc-400">{op.rate_kzt}₸</span>
                              </div>
                            </div>
                          </button>

                          {/* Inline stepper when selected */}
                          {isSelected && (
                            <div className="mt-1.5 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                              <div className="flex items-end gap-3 mb-2">
                                <div className="flex-1">
                                  <div className="text-[10px] text-zinc-500 mb-1.5">Годных</div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setQty(q => Math.max(1, q - 1))}
                                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <Input
                                      type="number"
                                      value={qty}
                                      onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-16 h-8 text-center text-base font-bold bg-zinc-950 border-zinc-700 p-0"
                                    />
                                    <button
                                      onClick={() => setQty(q => q + 1)}
                                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="w-20">
                                  <div className="text-[10px] text-zinc-500 mb-1.5">Брак</div>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={defect}
                                    onChange={e => setDefect(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="h-8 text-center bg-zinc-950 border-zinc-700"
                                  />
                                </div>
                                <div className="text-right pb-0.5">
                                  <div className={`text-base font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                                    {(op.rate_kzt * qty).toFixed(0)}₸
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={addOp}
                                className={`w-full h-9 text-sm font-bold text-white ${isPink ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                Добавить
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Added ops list */}
            {Object.keys(modalEmpOps).length > 0 && (
              <div className="border-t border-zinc-800 p-4 shrink-0">
                <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2">
                  Добавлено — {Object.values(modalEmpOps).reduce((s, v) => s + (operations.find(o => o.code === Object.keys(modalEmpOps).find(k => modalEmpOps[k] === v) || '')?.rate_kzt || 0) * v.good, 0).toFixed(0)}₸
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {Object.entries(modalEmpOps).map(([code, val]) => {
                    const op = operations.find(o => o.code === code);
                    return (
                      <div key={code} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-zinc-300 truncate flex-1 mr-2">{op?.name}</span>
                        <span className={`font-bold mr-2 shrink-0 ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                          {val.good} × {op?.rate_kzt}₸
                        </span>
                        <button
                          onClick={() => removeOp(modalEmployee.id, code)}
                          className="text-zinc-500 hover:text-red-400 shrink-0 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished Products Section */}
      {products.length > 0 && (
        <div className="mb-24 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`text-base font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                Готовая продукция к ОТК
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Отшитая продукция за смену для проверки ОТК
              </p>
            </div>
            <Button
              onClick={addFinishedProduct}
              size="sm"
              className={`text-white ${isPink ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Plus size={16} className="mr-1" />
              Добавить
            </Button>
          </div>

          {finishedProducts.length === 0 ? (
            <div className="text-center text-zinc-500 py-6 bg-zinc-950 border border-zinc-800 rounded-lg">
              <Package className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm">Нет готовой продукции</p>
              <p className="text-xs mt-1">Добавьте изделия, отшитые за смену</p>
            </div>
          ) : (
            <div className="space-y-2">
              {finishedProducts.map(fp => {
                const product = products.find(p => p.code === fp.productCode);
                return (
                  <div key={fp.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <Select
                        value={fp.productCode}
                        onValueChange={v => updateFinishedProduct(fp.id, 'productCode', v)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectValue placeholder="Выберите изделие..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        min="1"
                        value={fp.quantity}
                        onChange={e => updateFinishedProduct(fp.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-9 bg-zinc-900 border-zinc-700 text-center"
                        placeholder="Кол-во"
                      />
                    </div>

                    {product && (
                      <div className={`text-xs font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                        {product.name}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFinishedProduct(fp.id)}
                      className="h-9 text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                );
              })}
              <div className="text-right text-sm text-zinc-400 pt-2">
                Всего изделий: <span className={`font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
                  {finishedProducts.reduce((sum, fp) => sum + fp.quantity, 0)} шт
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-40 ring-1 ring-white/10 max-w-[95vw]">
        <div className="text-sm text-zinc-400">
          <span className="font-bold text-white">{activeSeamstresses}</span> швей ·{' '}
          <span className="font-bold text-white">{totalOps}</span> оп.
        </div>
        <div className={`text-lg font-bold ${isPink ? 'text-pink-400' : 'text-blue-400'}`}>
          {grandTotal.toFixed(0)}₸
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting || totalOps === 0}
          size="lg"
          className={`font-bold text-white text-lg px-12 py-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            isPink
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
          }`}
        >
          {submitting
            ? <><Loader2 className="animate-spin mr-2" size={20} /> Проведение...</>
            : <><CheckCircle size={20} className="mr-2" /> Провести</>
          }
        </Button>
      </div>
    </div>
  );
}
