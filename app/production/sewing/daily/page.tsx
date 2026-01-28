'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Plus, Trash2, CheckCircle, AlertCircle, Package, TrendingDown } from "lucide-react";

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

interface EmployeeOperation {
  id: string;
  employeeId: string;
  operationCode: string;
  quantityGood: number;
  quantityDefect: number;
}

interface Specification {
  cutting_part_code: string;
  cutting_part_name: string;
  quantity: number;
}

interface PartBalance {
  code: string;
  name: string;
  balance: number;
}

export default function SewingDailyReportPage() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftMaster, setShiftMaster] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setSewingOperations] = useState<SewingOperation[]>([]);
  const [employeeOperations, setEmployeeOperations] = useState<EmployeeOperation[]>([]);

  const [specificationsCache, setSpecificationsCache] = useState<{ [key: string]: Specification[] }>({});
  const [partBalances, setPartBalances] = useState<PartBalance[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем швей
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('is_active', true)
        .in('role', ['operator_sewing', 'seamstress'])
        .order('full_name');

      // Загружаем операции
      const { data: opData } = await supabase
        .from('sewing_operations')
        .select('*')
        .order('category', { ascending: true });

      // Загружаем остатки кроеных деталей
      const { data: balancesData } = await supabase
        .from('view_cutting_parts_balance')
        .select('*');

      setEmployees(empData || []);
      setSewingOperations(opData || []);
      setPartBalances(balancesData || []);
    } catch (error: any) {
      console.error('Ошибка загрузки:', error);
    }
    setLoading(false);
  };

  const fetchSpecification = async (operationCode: string) => {
    if (specificationsCache[operationCode]) {
      return specificationsCache[operationCode];
    }

    const { data, error } = await supabase
      .from('sewing_specifications')
      .select('*')
      .eq('sewing_operation_code', operationCode)
      .eq('status', 'Активно');

    if (error) {
      console.error('Ошибка загрузки спецификации:', error);
      return [];
    }

    const spec = data || [];
    setSpecificationsCache(prev => ({ ...prev, [operationCode]: spec }));
    return spec;
  };

  const addOperationToEmployee = (employeeId: string) => {
    const newOp: EmployeeOperation = {
      id: `${employeeId}_${Date.now()}`,
      employeeId,
      operationCode: '',
      quantityGood: 1,
      quantityDefect: 0
    };
    setEmployeeOperations([...employeeOperations, newOp]);
  };

  const updateEmployeeOperation = (id: string, field: keyof EmployeeOperation, value: any) => {
    setEmployeeOperations(employeeOperations.map(op =>
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  const deleteEmployeeOperation = (id: string) => {
    setEmployeeOperations(employeeOperations.filter(op => op.id !== id));
  };

  const getEmployeeOperations = (employeeId: string) => {
    return employeeOperations.filter(op => op.employeeId === employeeId);
  };

  const getEmployeeTotal = (employeeId: string) => {
    const ops = getEmployeeOperations(employeeId);
    return ops.reduce((sum, op) => {
      const operation = operations.find(o => o.code === op.operationCode);
      return sum + (operation ? operation.rate_kzt * op.quantityGood : 0);
    }, 0);
  };

  const getGrandTotal = () => {
    return employeeOperations.reduce((sum, op) => {
      const operation = operations.find(o => o.code === op.operationCode);
      return sum + (operation ? operation.rate_kzt * op.quantityGood : 0);
    }, 0);
  };

  // Расчет потребности в деталях
  const calculatePartsSummary = async () => {
    const partsNeeded: { [key: string]: { name: string; total: number } } = {};

    for (const op of employeeOperations) {
      if (!op.operationCode || op.quantityGood <= 0) continue;

      const spec = await fetchSpecification(op.operationCode);
      spec.forEach(part => {
        if (!partsNeeded[part.cutting_part_code]) {
          partsNeeded[part.cutting_part_code] = { name: part.cutting_part_name, total: 0 };
        }
        partsNeeded[part.cutting_part_code].total += part.quantity * op.quantityGood;
      });
    }

    return partsNeeded;
  };

  // Проверка наличия деталей
  const checkAvailability = async () => {
    const partsNeeded = await calculatePartsSummary();
    const shortages: string[] = [];

    for (const code in partsNeeded) {
      const balance = partBalances.find(pb => pb.code === code)?.balance || 0;
      if (balance < partsNeeded[code].total) {
        shortages.push(`${partsNeeded[code].name}: требуется ${partsNeeded[code].total}, остаток ${balance}`);
      }
    }

    return { hasEnough: shortages.length === 0, shortages, partsNeeded };
  };

  const handleSubmit = async () => {
    if (!date || !shiftMaster) {
      alert('Заполните дату и мастера смены!');
      return;
    }

    if (employeeOperations.length === 0) {
      alert('Добавьте хотя бы одну операцию!');
      return;
    }

    // Проверка заполненности
    for (const op of employeeOperations) {
      if (!op.operationCode || op.quantityGood <= 0) {
        alert('Заполните все операции!');
        return;
      }
    }

    // Проверка наличия деталей
    const { hasEnough, shortages, partsNeeded } = await checkAvailability();
    if (!hasEnough) {
      alert('❌ Недостаточно кроеных деталей на складе!\n\n' + shortages.join('\n'));
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      const writeOffSummary: string[] = [];

      for (const empOp of employeeOperations) {
        const employee = employees.find(e => e.id === empOp.employeeId);
        const operation = operations.find(o => o.code === empOp.operationCode);

        if (!employee || !operation) continue;

        const docNumber = `SEW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const totalTime = operation.time_norm_minutes * empOp.quantityGood;
        const amount = operation.rate_kzt * empOp.quantityGood;

        // 1. Списываем детали со склада кроя
        const spec = await fetchSpecification(empOp.operationCode);
        for (const part of spec) {
          const requiredQty = part.quantity * empOp.quantityGood;

          const { error: warehouseError } = await supabase
            .from('cutting_parts_warehouse')
            .insert([{
              doc_number: docNumber,
              date: date,
              time: new Date().toTimeString().split(' ')[0],
              operation: 'Расход',
              cutting_type_code: part.cutting_part_code,
              cutting_type_name: part.cutting_part_name,
              category: '',
              quantity: requiredQty,
              destination_doc: docNumber,
              operator: employee.full_name,
              status: 'Проведено',
              notes: `Списано на пошив: ${operation.name}`
            }]);

          if (warehouseError) {
            throw new Error(`Не удалось списать деталь ${part.cutting_part_name}: ${warehouseError.message}`);
          }

          writeOffSummary.push(`  - ${part.cutting_part_name}: ${requiredQty} шт`);
        }

        // 2. Создаем запись о производстве пошива
        const { error: productionError } = await supabase
          .from('production_sewing')
          .insert([{
            doc_number: docNumber,
            date: date,
            time: new Date().toTimeString().split(' ')[0],
            seamstress: employee.full_name,
            operation_code: operation.code,
            operation_name: operation.name,
            operation_category: operation.category,
            quantity_good: empOp.quantityGood,
            quantity_defect: empOp.quantityDefect,
            time_norm_minutes: totalTime,
            amount_kzt: amount,
            shift_master: shiftMaster,
            status: 'Проведено'
          }]);

        if (productionError) {
          throw new Error(`Ошибка записи производства: ${productionError.message}`);
        }

        // 3. Создаем приход готовой продукции на склад
        await supabase
          .from('finished_goods_warehouse')
          .insert([{
            doc_number: docNumber,
            date: date,
            time: new Date().toTimeString().split(' ')[0],
            operation: 'Приход',
            product_code: operation.code,
            product_name: operation.name,
            quantity: empOp.quantityGood,
            source_doc: docNumber,
            status: 'Проведено',
            notes: `Произведено швеей: ${employee.full_name}`
          }]);

        successCount++;
      }

      const partsInfo = Object.entries(partsNeeded).map(([code, data]) =>
        `${data.name}: ${data.total} шт`
      ).join('\n');

      alert(
        `✅ Успешно проведено ${successCount} операций!\n\n` +
        `📦 Списано деталей:\n${partsInfo}\n\n` +
        `💰 К оплате: ${getGrandTotal().toFixed(0)}₸`
      );

      // Очистка формы
      setEmployeeOperations([]);
      setDate(new Date().toISOString().split('T')[0]);
      setShiftMaster('');

      // Обновляем остатки
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="page-container p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="text-pink-600" />
          Дневной отчет пошива
        </h1>
        <p className="text-zinc-400">Быстрый ввод операций за смену</p>
      </div>

      {/* Общие данные */}
      <Card className="bg-zinc-900 border-zinc-800 mb-4">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Дата *</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Мастер смены *</label>
              <Input
                value={shiftMaster}
                onChange={e => setShiftMaster(e.target.value)}
                placeholder="ФИО мастера"
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица швей и операций */}
      <Card className="bg-zinc-900 border-zinc-800 mb-4">
        <CardHeader>
          <CardTitle className="text-white">Швеи и операции</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.map(employee => {
              const empOps = getEmployeeOperations(employee.id);
              const total = getEmployeeTotal(employee.id);

              return (
                <div key={employee.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  {/* Заголовок швеи */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-white">{employee.full_name}</div>
                      {empOps.length > 0 && (
                        <Badge variant="outline" className="text-green-400 border-green-700">
                          {empOps.length} оп.
                        </Badge>
                      )}
                      {total > 0 && (
                        <span className="text-sm text-green-400 font-bold">
                          {total.toFixed(0)}₸
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addOperationToEmployee(employee.id)}
                      className="bg-pink-600 hover:bg-pink-700 h-8"
                    >
                      <Plus size={16} className="mr-1" /> Операция
                    </Button>
                  </div>

                  {/* Операции швеи */}
                  {empOps.length > 0 ? (
                    <div className="space-y-2">
                      {empOps.map(empOp => {
                        const operation = operations.find(o => o.code === empOp.operationCode);
                        return (
                          <div key={empOp.id} className="bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center gap-2">
                            {/* Операция */}
                            <div className="flex-1">
                              <Select
                                value={empOp.operationCode}
                                onValueChange={(v) => updateEmployeeOperation(empOp.id, 'operationCode', v)}
                              >
                                <SelectTrigger className="h-8 bg-zinc-950 border-zinc-700 text-sm">
                                  <SelectValue placeholder="Выберите операцию..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {operations.map(op => (
                                    <SelectItem key={op.code} value={op.code}>
                                      {op.name} - {op.rate_kzt}₸
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Годных */}
                            <div className="w-20">
                              <Input
                                type="number"
                                min="1"
                                value={empOp.quantityGood}
                                onChange={e => updateEmployeeOperation(empOp.id, 'quantityGood', parseInt(e.target.value) || 1)}
                                className="h-8 bg-zinc-950 border-zinc-700 text-center text-sm"
                                placeholder="Годн."
                              />
                            </div>

                            {/* Брак */}
                            <div className="w-20">
                              <Input
                                type="number"
                                min="0"
                                value={empOp.quantityDefect}
                                onChange={e => updateEmployeeOperation(empOp.id, 'quantityDefect', parseInt(e.target.value) || 0)}
                                className="h-8 bg-zinc-950 border-zinc-700 text-center text-sm"
                                placeholder="Брак"
                              />
                            </div>

                            {/* Сумма */}
                            {operation && (
                              <div className="w-24 text-right text-sm font-bold text-green-400">
                                {(operation.rate_kzt * empOp.quantityGood).toFixed(0)}₸
                              </div>
                            )}

                            {/* Удалить */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmployeeOperation(empOp.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-zinc-600 text-sm py-2">
                      Нет операций
                    </div>
                  )}
                </div>
              );
            })}

            {employees.length === 0 && (
              <div className="text-center text-zinc-500 py-12">
                <AlertCircle className="mx-auto mb-2" size={40} />
                Нет швей в цехе
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Итоговая сводка */}
      {employeeOperations.length > 0 && (
        <>
          <Card className="bg-gradient-to-br from-pink-900/20 to-zinc-900 border-pink-800 mb-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Всего операций</div>
                  <div className="text-2xl font-bold text-white">{employeeOperations.length}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Годных изделий</div>
                  <div className="text-2xl font-bold text-white">
                    {employeeOperations.reduce((sum, op) => sum + op.quantityGood, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">К оплате</div>
                  <div className="text-2xl font-bold text-green-400">
                    {getGrandTotal().toFixed(0)}₸
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Сводка по деталям */}
          <PartsSummaryCard
            employeeOperations={employeeOperations}
            fetchSpecification={fetchSpecification}
            partBalances={partBalances}
          />
        </>
      )}

      {/* Кнопка отправки */}
      <Button
        onClick={handleSubmit}
        disabled={loading || employeeOperations.length === 0}
        className="w-full bg-pink-600 hover:bg-pink-700 font-bold text-base h-12"
      >
        {loading ? 'Обработка...' : (
          <>
            <CheckCircle className="mr-2" size={20} />
            Провести операции ({employeeOperations.length})
          </>
        )}
      </Button>
    </div>
  );
}

// Компонент сводки по деталям
function PartsSummaryCard({
  employeeOperations,
  fetchSpecification,
  partBalances
}: {
  employeeOperations: EmployeeOperation[];
  fetchSpecification: (code: string) => Promise<Specification[]>;
  partBalances: PartBalance[];
}) {
  const [partsNeeded, setPartsNeeded] = useState<{ [key: string]: { name: string; total: number } }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateParts();
  }, [employeeOperations]);

  const calculateParts = async () => {
    setLoading(true);
    const parts: { [key: string]: { name: string; total: number } } = {};

    for (const op of employeeOperations) {
      if (!op.operationCode || op.quantityGood <= 0) continue;

      const spec = await fetchSpecification(op.operationCode);
      spec.forEach(part => {
        if (!parts[part.cutting_part_code]) {
          parts[part.cutting_part_code] = { name: part.cutting_part_name, total: 0 };
        }
        parts[part.cutting_part_code].total += part.quantity * op.quantityGood;
      });
    }

    setPartsNeeded(parts);
    setLoading(false);
  };

  const partsArray = Object.entries(partsNeeded);

  if (partsArray.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-orange-900/20 to-zinc-900 border-orange-800 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Package size={18} className="text-orange-400" />
          Потребность в деталях
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-zinc-500 text-sm">Расчет...</div>
        ) : (
          <div className="space-y-2">
            {partsArray.map(([code, data]) => {
              const balance = partBalances.find(pb => pb.code === code)?.balance || 0;
              const isAvailable = balance >= data.total;

              return (
                <div key={code} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded p-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className={isAvailable ? 'text-green-500' : 'text-red-500'} />
                    <span className="text-sm text-white">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-orange-400 border-orange-700 text-xs">
                      Требуется: {data.total}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${isAvailable ? 'text-green-400 border-green-700' : 'text-red-400 border-red-700'}`}
                    >
                      Остаток: {balance}
                    </Badge>
                    {!isAvailable && (
                      <AlertCircle size={16} className="text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
