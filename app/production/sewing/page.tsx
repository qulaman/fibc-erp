'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { Scissors, Package, AlertCircle, Trash2, Plus } from "lucide-react";

interface SewingOperation {
  code: string;
  name: string;
  category: string;
  complexity: number;
  time_norm_minutes: number;
  rate_kzt: number;
}

interface Employee {
  id: string;
  full_name: string;
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

interface OperationCard {
  id: number;
  seamstress: string;
  operationCode: string;
  quantityGood: number;
  quantityDefect: number;
  notes: string;
}

export default function SewingPage() {
  const [loading, setLoading] = useState(false);
  const [operationCounter, setOperationCounter] = useState(0);
  const [loadError, setLoadError] = useState<string>('');

  // Справочники
  const [sewingOperations, setSewingOperations] = useState<SewingOperation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [specificationsCache, setSpecificationsCache] = useState<{ [key: string]: Specification[] }>({});
  const [partBalances, setPartBalances] = useState<PartBalance[]>([]);

  // Общие данные
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftMaster, setShiftMaster] = useState('');

  // Операции
  const [operations, setOperations] = useState<OperationCard[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');

    try {
      // Проверяем аутентификацию
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Текущий пользователь:', user?.email || 'не аутентифицирован');

      // Загружаем операции пошива
      console.log('🔍 Попытка загрузки операций пошива...');
      const { data: operationsData, error: opError, status, statusText } = await supabase
        .from('sewing_operations')
        .select('*')
        .order('category', { ascending: true });

      console.log('📊 Результат запроса операций:', {
        data: operationsData,
        error: opError,
        status,
        statusText,
        dataLength: operationsData?.length
      });

      if (opError) {
        console.error('❌ Ошибка загрузки операций:', opError);
        setLoadError(`❌ Таблица sewing_operations не найдена! Выполните SQL-скрипт: supabase/sewing-module-schema.sql`);
        setLoading(false);
        return;
      }

      if (operationsData) {
        console.log('✅ Загружено операций пошива:', operationsData.length, operationsData);
        setSewingOperations(operationsData);
      } else {
        console.warn('⚠️ operationsData is null или undefined');
      }

      // Загружаем швей из таблицы employees (все активные сотрудники)
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name');

      if (empError) {
        console.error('Ошибка загрузки сотрудников:', empError);
      } else if (employeesData) {
        setEmployees(employeesData);
      }

      // Загружаем остатки кроеных деталей через VIEW
      const { data: balancesData, error: balError } = await supabase
        .from('view_cutting_parts_balance')
        .select('*');

      if (balError) {
        console.error('Ошибка загрузки остатков:', balError);
      } else if (balancesData) {
        setPartBalances(balancesData);
      }

      // Добавляем первую операцию
      addOperation();
    } catch (error: any) {
      console.error('Критическая ошибка:', error);
      setLoadError(`Ошибка подключения к базе данных: ${error.message}`);
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

  const addOperation = () => {
    const newId = operationCounter + 1;
    setOperationCounter(newId);

    // Копируем швею из предыдущей операции
    let previousSeamstress = '';
    if (operations.length > 0) {
      previousSeamstress = operations[operations.length - 1].seamstress;
    }

    setOperations([...operations, {
      id: newId,
      seamstress: previousSeamstress,
      operationCode: '',
      quantityGood: 1,
      quantityDefect: 0,
      notes: ''
    }]);
  };

  const deleteOperation = (id: number) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  const updateOperation = (id: number, field: keyof OperationCard, value: any) => {
    setOperations(operations.map(op =>
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  // Расчет общей сводки
  const calculateSummary = () => {
    let totalGood = 0;
    let totalDefect = 0;
    let totalAmount = 0;

    operations.forEach(op => {
      const operation = sewingOperations.find(o => o.code === op.operationCode);
      if (operation && op.quantityGood > 0) {
        totalGood += op.quantityGood;
        totalDefect += op.quantityDefect;
        totalAmount += op.quantityGood * operation.rate_kzt;
      }
    });

    return { totalGood, totalDefect, totalAmount };
  };

  // Расчет сводки по деталям
  const calculatePartsSummary = async () => {
    const partsNeeded: { [key: string]: { name: string; total: number } } = {};

    for (const op of operations) {
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

  const checkAvailability = async () => {
    const partsNeeded = await calculatePartsSummary();
    let hasShortage = false;

    for (const code in partsNeeded) {
      const balance = partBalances.find(pb => pb.code === code)?.balance || 0;
      if (balance < partsNeeded[code].total) {
        hasShortage = true;
        break;
      }
    }

    return !hasShortage;
  };

  const handleSubmit = async () => {
    if (!date || !shiftMaster) {
      alert('Заполните дату и мастера смены!');
      return;
    }

    if (operations.length === 0) {
      alert('Добавьте хотя бы одну операцию!');
      return;
    }

    // Проверяем заполненность всех операций
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op.seamstress || !op.operationCode || op.quantityGood <= 0) {
        alert(`Операция #${i + 1}: заполните все обязательные поля!`);
        return;
      }
    }

    // Проверяем наличие деталей
    const hasEnoughParts = await checkAvailability();
    if (!hasEnoughParts) {
      alert('Недостаточно кроеных деталей на складе!');
      return;
    }

    setLoading(true);

    try {
      let successMessages: string[] = [];

      for (const op of operations) {
        const operation = sewingOperations.find(o => o.code === op.operationCode);
        if (!operation) continue;

        // Генерируем номер документа
        const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const docNumber = `SEW-${datePrefix}-${randomSuffix}`;

        // Списываем детали со склада кроя
        const spec = await fetchSpecification(op.operationCode);
        const writeOffResults: string[] = [];

        for (const part of spec) {
          const requiredQty = part.quantity * op.quantityGood;

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
              operator: op.seamstress,
              status: 'Проведено',
              notes: `Списано на пошив: ${operation.name}`
            }]);

          if (warehouseError) {
            throw new Error(`Не удалось списать деталь ${part.cutting_part_name}: ${warehouseError.message}`);
          }

          writeOffResults.push(`${part.cutting_part_name}: ${requiredQty} шт`);
        }

        // Создаем запись о производстве пошива
        const totalTime = operation.time_norm_minutes * op.quantityGood;
        const amount = operation.rate_kzt * op.quantityGood;

        const { error: productionError } = await supabase
          .from('production_sewing')
          .insert([{
            doc_number: docNumber,
            date: date,
            time: new Date().toTimeString().split(' ')[0],
            seamstress: op.seamstress,
            operation_code: operation.code,
            operation_name: operation.name,
            operation_category: operation.category,
            quantity_good: op.quantityGood,
            quantity_defect: op.quantityDefect,
            time_norm_minutes: totalTime,
            amount_kzt: amount,
            shift_master: shiftMaster,
            notes: op.notes || null,
            status: 'Проведено'
          }]);

        if (productionError) {
          throw new Error(`Ошибка записи производства: ${productionError.message}`);
        }

        // Создаем приход готовой продукции на склад
        await supabase
          .from('finished_goods_warehouse')
          .insert([{
            doc_number: docNumber,
            date: date,
            time: new Date().toTimeString().split(' ')[0],
            operation: 'Приход',
            product_code: operation.code,
            product_name: operation.name,
            quantity: op.quantityGood,
            source_doc: docNumber,
            status: 'Проведено',
            notes: `Произведено швеей: ${op.seamstress}`
          }]);

        const writeOffSummary = writeOffResults.length > 0
          ? '\nСписано: ' + writeOffResults.join(', ')
          : '';

        successMessages.push(
          `✅ ${docNumber}\n` +
          `Швея: ${op.seamstress}\n` +
          `Операция: ${operation.name}\n` +
          `Годных: ${op.quantityGood} шт, Брак: ${op.quantityDefect} шт\n` +
          `Сумма: ${amount.toFixed(0)} ₸` +
          writeOffSummary
        );
      }

      alert('Все операции проведены успешно!\n\n' + successMessages.join('\n\n'));

      // Сбрасываем форму
      setDate(new Date().toISOString().split('T')[0]);
      setShiftMaster('');
      setOperations([]);
      setOperationCounter(0);

      // Обновляем данные
      fetchData();

    } catch (error: any) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка: ' + error.message);
    }

    setLoading(false);
  };

  const summary = calculateSummary();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-pink-600 p-2 rounded-lg">
              <Scissors size={24} className="text-white" />
            </div>
            Цех Пошива
          </h1>
          <p className="page-description">Учет операций пошива с автоматическим списанием деталей</p>
        </div>
      </div>

      {/* Ошибка загрузки */}
      {loadError && (
        <Card className="bg-red-950/20 border-red-800 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 mt-0.5" size={20} />
              <div>
                <p className="text-red-400 font-bold mb-2">Ошибка загрузки данных</p>
                <p className="text-red-300 text-sm whitespace-pre-wrap">{loadError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Общие данные */}
      <Card className="bg-zinc-900 border-zinc-800 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Общие данные</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Дата *</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 bg-zinc-950 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Мастер смены *</label>
              <Input
                value={shiftMaster}
                onChange={e => setShiftMaster(e.target.value)}
                placeholder="ФИО мастера"
                className="h-9 bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Операции швей */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Операции швей</CardTitle>
            <Button
              onClick={addOperation}
              size="sm"
              className="bg-pink-600 hover:bg-pink-700 text-white h-8"
            >
              <Plus size={16} className="mr-1" /> Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {operations.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                Нажмите "Добавить" чтобы создать операцию
              </div>
            ) : (
              operations.map((op, index) => (
                <OperationCardComponent
                  key={op.id}
                  operation={op}
                  index={index}
                  employees={employees}
                  sewingOperations={sewingOperations}
                  specificationsCache={specificationsCache}
                  partBalances={partBalances}
                  fetchSpecification={fetchSpecification}
                  updateOperation={updateOperation}
                  deleteOperation={deleteOperation}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Итоговая сводка */}
      {operations.length > 0 && (
        <Card className="bg-gradient-to-br from-pink-900/20 to-zinc-900 border-pink-800 mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Операций</div>
                <div className="text-lg font-bold text-white">{operations.length}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Годных</div>
                <div className="text-lg font-bold text-white">{summary.totalGood} шт</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Брак</div>
                <div className="text-lg font-bold text-red-400">{summary.totalDefect} шт</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">К оплате</div>
                <div className="text-xl font-bold text-green-400">{summary.totalAmount.toFixed(0)}₸</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Кнопка отправки */}
      <Button
        onClick={handleSubmit}
        disabled={loading || operations.length === 0}
        className="w-full bg-pink-600 hover:bg-pink-700 font-bold text-base h-11"
      >
        {loading ? 'Обработка...' : '✅ Провести операции'}
      </Button>
    </div>
  );
}

// Компонент карточки операции
function OperationCardComponent({
  operation,
  index,
  employees,
  sewingOperations,
  specificationsCache,
  partBalances,
  fetchSpecification,
  updateOperation,
  deleteOperation
}: any) {
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.log('OperationCard - Количество операций:', sewingOperations.length);
    console.log('OperationCard - Количество сотрудников:', employees.length);
  }, []);

  useEffect(() => {
    if (operation.operationCode) {
      loadSpecs();
    } else {
      setSpecs([]);
    }
  }, [operation.operationCode]);

  const loadSpecs = async () => {
    setLoadingSpecs(true);
    const specification = await fetchSpecification(operation.operationCode);
    setSpecs(specification);
    setLoadingSpecs(false);
  };

  const selectedOperation = sewingOperations.find((o: SewingOperation) => o.code === operation.operationCode);

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardContent className="pt-3 pb-3">
        {/* Заголовок с номером и кнопкой удаления */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-pink-500 border-pink-700">Операция #{index + 1}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteOperation(operation.id)}
            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950"
          >
            <Trash2 size={14} />
          </Button>
        </div>

        {/* Швея и Операция в одну строку */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Швея *</label>
            <Select
              value={operation.seamstress}
              onValueChange={(v) => updateOperation(operation.id, 'seamstress', v)}
            >
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-white text-sm">
                <SelectValue placeholder="Выберите..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: Employee) => (
                  <SelectItem key={emp.id} value={emp.full_name}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Операция * ({sewingOperations.length})</label>
            <Select
              value={operation.operationCode}
              onValueChange={(v) => {
                console.log('Выбрана операция:', v);
                updateOperation(operation.id, 'operationCode', v);
              }}
            >
              <SelectTrigger className="h-9 bg-zinc-900 border-zinc-700 text-white text-sm">
                <SelectValue placeholder="Выберите..." />
              </SelectTrigger>
              <SelectContent>
                {sewingOperations.length === 0 && (
                  <div className="p-2 text-xs text-zinc-500">Нет операций</div>
                )}
                {sewingOperations.map((op: SewingOperation) => (
                  <SelectItem key={op.code} value={op.code}>
                    {op.name} - {op.rate_kzt}₸
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Количество годных и брак в одну строку */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Годных *</label>
            <Input
              type="number"
              min="1"
              value={operation.quantityGood}
              onChange={e => updateOperation(operation.id, 'quantityGood', parseInt(e.target.value) || 1)}
              className="h-9 bg-zinc-900 border-zinc-700 text-white text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Брак</label>
            <Input
              type="number"
              min="0"
              value={operation.quantityDefect}
              onChange={e => updateOperation(operation.id, 'quantityDefect', parseInt(e.target.value) || 0)}
              className="h-9 bg-zinc-900 border-zinc-700 text-white text-sm"
            />
          </div>

          {/* Сумма */}
          {selectedOperation && operation.quantityGood > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Сумма</label>
              <div className="h-9 flex items-center justify-end px-3 bg-zinc-900/30 border border-zinc-800 rounded-md">
                <span className="text-green-400 font-bold text-sm">
                  {(selectedOperation.rate_kzt * operation.quantityGood).toFixed(0)}₸
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Спецификация (компактная) */}
        {operation.operationCode && specs.length > 0 && (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded p-2 mb-2">
            <div
              className="text-xs text-pink-400 font-medium flex items-center gap-2 cursor-pointer"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Package size={12} />
              Детали ({specs.length})
              <span className="ml-auto text-zinc-600">{showDetails ? '▼' : '▶'}</span>
            </div>

            {showDetails && (
              <div className="mt-2 space-y-1">
                {specs.map(part => {
                  const balance = partBalances.find((pb: PartBalance) => pb.code === part.cutting_part_code)?.balance || 0;
                  const required = part.quantity * operation.quantityGood;
                  const isAvailable = balance >= required;

                  return (
                    <div key={part.cutting_part_code} className="flex justify-between text-xs">
                      <span className="text-zinc-500 truncate">{part.cutting_part_name}</span>
                      <span className={isAvailable ? 'text-green-400' : 'text-red-400'}>
                        {part.quantity}×{operation.quantityGood}={required} (ост:{balance})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Примечание (скрытое по умолчанию) */}
        {operation.notes && (
          <div className="text-xs text-zinc-500 bg-zinc-900/30 border border-zinc-800 rounded p-2">
            {operation.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
