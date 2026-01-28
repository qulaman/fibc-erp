'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { FileText, Package, Plus, Trash2, Edit, Save, X, AlertCircle } from "lucide-react";

interface SewingOperation {
  code: string;
  name: string;
  category: string;
  rate_kzt: number;
}

interface Specification {
  id: string;
  sewing_operation_code: string;
  cutting_part_code: string;
  cutting_part_name: string;
  quantity: number;
  status: string;
}

interface CuttingType {
  code: string;
  name: string;
  category: string;
  material_type: string;
}

export default function SewingSpecificationsPage() {
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<SewingOperation[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [cuttingTypes, setCuttingTypes] = useState<CuttingType[]>([]);

  const [expandedOperation, setExpandedOperation] = useState<string | null>(null);
  const [addingToOperation, setAddingToOperation] = useState<string | null>(null);
  const [editingOperation, setEditingOperation] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем операции пошива
      const { data: opsData } = await supabase
        .from('sewing_operations')
        .select('*')
        .order('category', { ascending: true })
        .order('name');

      // Загружаем все спецификации
      const { data: specsData } = await supabase
        .from('sewing_specifications')
        .select('*')
        .eq('status', 'Активно');

      // Загружаем типы кроя
      const { data: cuttingData } = await supabase
        .from('cutting_types')
        .select('code, name, category, material_type')
        .eq('status', 'Активно')
        .order('category')
        .order('name');

      setOperations(opsData || []);
      setSpecifications(specsData || []);
      setCuttingTypes(cuttingData || []);
    } catch (error: any) {
      console.error('Ошибка загрузки:', error);
    }
    setLoading(false);
  };

  const getSpecsForOperation = (operationCode: string) => {
    return specifications.filter(s => s.sewing_operation_code === operationCode);
  };

  const toggleOperation = (operationCode: string) => {
    setExpandedOperation(expandedOperation === operationCode ? null : operationCode);
  };

  const deleteSpecification = async (specId: string) => {
    if (!confirm('Удалить эту деталь из спецификации?')) return;

    try {
      const { error } = await supabase
        .from('sewing_specifications')
        .delete()
        .eq('id', specId);

      if (error) throw error;

      alert('✅ Деталь удалена из спецификации');
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const updateQuantity = async (specId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      alert('Количество должно быть больше 0');
      return;
    }

    try {
      const { error } = await supabase
        .from('sewing_specifications')
        .update({ quantity: newQuantity })
        .eq('id', specId);

      if (error) throw error;

      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const updateOperationName = async (operationCode: string, newName: string) => {
    if (!newName.trim()) {
      alert('Название операции не может быть пустым');
      return;
    }

    try {
      const { error } = await supabase
        .from('sewing_operations')
        .update({ name: newName.trim() })
        .eq('code', operationCode);

      if (error) throw error;

      alert('✅ Название операции обновлено');
      setEditingOperation(null);
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const updateOperationCategory = async (operationCode: string, newCategory: string) => {
    if (!newCategory.trim()) {
      alert('Категория операции не может быть пустой');
      return;
    }

    try {
      const { error } = await supabase
        .from('sewing_operations')
        .update({ category: newCategory.trim() })
        .eq('code', operationCode);

      if (error) throw error;

      alert('✅ Категория операции обновлена');
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const deleteOperation = async (operationCode: string, operationName: string) => {
    const specs = getSpecsForOperation(operationCode);

    let confirmMessage = `Вы уверены, что хотите удалить операцию "${operationName}"?`;

    if (specs.length > 0) {
      confirmMessage += `\n\n⚠️ У этой операции есть ${specs.length} спецификаций, которые также будут удалены!`;
    }

    confirmMessage += '\n\n❗ Это действие необратимо!';

    if (!confirm(confirmMessage)) return;

    try {
      // Сначала удаляем все спецификации
      if (specs.length > 0) {
        const { error: specsError } = await supabase
          .from('sewing_specifications')
          .delete()
          .eq('sewing_operation_code', operationCode);

        if (specsError) throw specsError;
      }

      // Затем удаляем саму операцию
      const { error } = await supabase
        .from('sewing_operations')
        .delete()
        .eq('code', operationCode);

      if (error) throw error;

      alert('✅ Операция успешно удалена');
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={24} className="text-white" />
            </div>
            Спецификации операций пошива
          </h1>
          <p className="page-description">Управление составом деталей для каждой операции (BOM)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {operations.map(operation => {
            const specs = getSpecsForOperation(operation.code);
            const isExpanded = expandedOperation === operation.code;

            return (
              <Card key={operation.code} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {editingOperation === operation.code ? (
                        <OperationNameEditor
                          operation={operation}
                          onSave={updateOperationName}
                          onCancel={() => setEditingOperation(null)}
                        />
                      ) : editingCategory === operation.code ? (
                        <CategoryEditor
                          operation={operation}
                          onSave={updateOperationCategory}
                          onCancel={() => setEditingCategory(null)}
                        />
                      ) : (
                        <>
                          <div
                            className="text-white font-bold cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => toggleOperation(operation.code)}
                          >
                            {operation.name}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOperation(operation.code);
                            }}
                            className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                          >
                            <Edit size={14} />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-blue-400 border-blue-700 cursor-pointer hover:bg-blue-900/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(operation.code);
                              }}
                            >
                              {operation.category}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(operation.code);
                              }}
                              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                            >
                              <Edit size={12} />
                            </Button>
                          </div>
                          {specs.length > 0 && (
                            <Badge variant="outline" className="text-green-400 border-green-700">
                              <Package size={12} className="mr-1" />
                              {specs.length} дет.
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOperation(operation.code, operation.name);
                            }}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                    <div
                      className="text-zinc-500 cursor-pointer"
                      onClick={() => toggleOperation(operation.code)}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {/* Список деталей */}
                    {specs.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {specs.map(spec => (
                          <SpecificationItem
                            key={spec.id}
                            spec={spec}
                            onDelete={deleteSpecification}
                            onUpdateQuantity={updateQuantity}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-4 mb-3 bg-zinc-950 border border-zinc-800 rounded">
                        <AlertCircle className="mx-auto mb-2" size={24} />
                        Нет деталей в спецификации
                      </div>
                    )}

                    {/* Добавление детали */}
                    {addingToOperation === operation.code ? (
                      <AddSpecificationForm
                        operationCode={operation.code}
                        cuttingTypes={cuttingTypes}
                        existingSpecs={specs}
                        onSave={() => {
                          setAddingToOperation(null);
                          fetchData();
                        }}
                        onCancel={() => setAddingToOperation(null)}
                      />
                    ) : (
                      <Button
                        onClick={() => setAddingToOperation(operation.code)}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus size={16} className="mr-1" /> Добавить деталь
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {operations.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-12 text-center text-zinc-500">
                <AlertCircle className="mx-auto mb-2" size={40} />
                <p>Нет операций пошива</p>
                <p className="text-sm mt-2">Добавьте операции в справочник sewing_operations</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Компонент элемента спецификации
function SpecificationItem({
  spec,
  onDelete,
  onUpdateQuantity
}: {
  spec: Specification;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(spec.quantity);

  const handleSave = () => {
    onUpdateQuantity(spec.id, quantity);
    setEditing(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <Package size={16} className="text-orange-400" />
        <div className="flex-1">
          <div className="text-white font-medium">{spec.cutting_part_name}</div>
          <div className="text-xs text-zinc-500">Код: {spec.cutting_part_code}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 h-8 bg-zinc-900 border-zinc-700 text-center"
            />
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
            >
              <Save size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuantity(spec.quantity);
                setEditing(false);
              }}
              className="h-8 w-8 p-0 text-zinc-400"
            >
              <X size={14} />
            </Button>
          </>
        ) : (
          <>
            <Badge variant="outline" className="text-green-400 border-green-700">
              {spec.quantity} шт
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
            >
              <Edit size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(spec.id)}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Форма добавления детали
function AddSpecificationForm({
  operationCode,
  cuttingTypes,
  existingSpecs,
  onSave,
  onCancel
}: {
  operationCode: string;
  cuttingTypes: CuttingType[];
  existingSpecs: Specification[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [selectedCode, setSelectedCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  // Фильтруем детали, которые уже добавлены
  const existingCodes = existingSpecs.map(s => s.cutting_part_code);
  const availableTypes = cuttingTypes.filter(ct => !existingCodes.includes(ct.code));

  const handleSave = async () => {
    if (!selectedCode || quantity <= 0) {
      alert('Заполните все поля!');
      return;
    }

    setSaving(true);
    try {
      const selectedType = cuttingTypes.find(ct => ct.code === selectedCode);
      if (!selectedType) throw new Error('Деталь не найдена');

      const { error } = await supabase
        .from('sewing_specifications')
        .insert([{
          sewing_operation_code: operationCode,
          cutting_part_code: selectedType.code,
          cutting_part_name: selectedType.name,
          quantity: quantity,
          status: 'Активно'
        }]);

      if (error) throw error;

      alert('✅ Деталь добавлена в спецификацию');
      onSave();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-700 rounded p-3 space-y-3">
      <div className="text-sm font-medium text-white">Добавить деталь</div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Деталь *</label>
        <Select value={selectedCode} onValueChange={setSelectedCode}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="Выберите деталь..." />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.length === 0 ? (
              <div className="p-2 text-xs text-zinc-500">Все детали уже добавлены</div>
            ) : (
              availableTypes.map(ct => (
                <SelectItem key={ct.code} value={ct.code}>
                  <div className="flex items-center gap-2">
                    <span>{ct.name}</span>
                    <span className="text-xs text-zinc-500">({ct.material_type})</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-500">Количество на 1 изделие *</label>
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(parseInt(e.target.value) || 1)}
          className="bg-zinc-900 border-zinc-700 text-white"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !selectedCode}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Save size={16} className="mr-1" />
          Сохранить
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="flex-1 text-zinc-400"
        >
          <X size={16} className="mr-1" />
          Отмена
        </Button>
      </div>
    </div>
  );
}

// Компонент редактирования названия операции
function OperationNameEditor({
  operation,
  onSave,
  onCancel
}: {
  operation: SewingOperation;
  onSave: (code: string, name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(operation.name);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Название не может быть пустым');
      return;
    }
    onSave(operation.code, name);
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        className="h-9 bg-zinc-900 border-zinc-700 text-white flex-1"
        placeholder="Название операции"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Button
        size="sm"
        onClick={handleSave}
        className="h-9 bg-green-600 hover:bg-green-700"
      >
        <Save size={14} />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-9 text-zinc-400"
      >
        <X size={14} />
      </Button>
    </div>
  );
}

// Компонент редактирования категории операции
function CategoryEditor({
  operation,
  onSave,
  onCancel
}: {
  operation: SewingOperation;
  onSave: (code: string, category: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(operation.category);

  const handleSave = () => {
    if (!category.trim()) {
      alert('Категория не может быть пустой');
      return;
    }
    onSave(operation.code, category);
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="text-white font-medium">{operation.name}</div>
      <Input
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="h-9 bg-zinc-900 border-zinc-700 text-white w-48"
        placeholder="Категория"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Button
        size="sm"
        onClick={handleSave}
        className="h-9 bg-green-600 hover:bg-green-700"
      >
        <Save size={14} />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-9 text-zinc-400"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
