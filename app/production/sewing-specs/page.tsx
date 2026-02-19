'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { FileText, Package, Plus, Trash2, Edit2, Save, X, AlertCircle, ChevronRight } from "lucide-react";

interface SewingOperation {
  code: string;
  name: string;
  category: string;
  rate_kzt: number;
  time_norm_minutes: number;
  product_type?: string;
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

interface ProductType {
  code: string;
  name: string;
  category: string;
  is_active: boolean;
}

export default function SewingSpecificationsPage() {
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<SewingOperation[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [cuttingTypes, setCuttingTypes] = useState<CuttingType[]>([]);

  const [expandedOperation, setExpandedOperation] = useState<string | null>(null);
  const [editingOperation, setEditingOperation] = useState<string | null>(null);
  const [addingToOperation, setAddingToOperation] = useState<string | null>(null);

  // Edit state for single operation
  const [editForm, setEditForm] = useState<SewingOperation | null>(null);

  // Add new operation state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOperation, setNewOperation] = useState<SewingOperation>({
    code: '',
    name: '',
    category: '',
    rate_kzt: 0,
    time_norm_minutes: 0,
    product_type: 'Биг-Бэг'
  });

  // Products management state
  const [isManagingProducts, setIsManagingProducts] = useState(false);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [newProduct, setNewProduct] = useState({ code: '', name: '', category: 'Биг-Бэг' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: opsData } = await supabase
        .from('sewing_operations')
        .select('code, name, category, rate_kzt, time_norm_minutes, product_type')
        .order('category', { ascending: true })
        .order('name');

      const { data: specsData } = await supabase
        .from('sewing_specifications')
        .select('*')
        .eq('status', 'Активно');

      const { data: cuttingData } = await supabase
        .from('cutting_types')
        .select('code, name, category, material_type')
        .eq('status', 'Активно')
        .order('category')
        .order('name');

      const { data: productsData } = await supabase
        .from('product_catalog')
        .select('code, name, category, is_active')
        .eq('is_active', true)
        .order('category')
        .order('name');

      setOperations(opsData || []);
      setSpecifications(specsData || []);
      setCuttingTypes(cuttingData || []);
      setProducts(productsData || []);
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

  const startEditing = (operation: SewingOperation) => {
    setEditingOperation(operation.code);
    setEditForm({ ...operation });
  };

  const cancelEditing = () => {
    setEditingOperation(null);
    setEditForm(null);
  };

  const saveOperation = async () => {
    if (!editForm) return;

    if (!editForm.name.trim() || !editForm.category.trim() || !editForm.code.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (editForm.rate_kzt <= 0 || editForm.time_norm_minutes <= 0) {
      alert('Цена и норма времени должны быть больше 0');
      return;
    }

    try {
      const oldCode = operations.find(o => o === editForm)?.code || editForm.code;

      // Check if code changed and is unique
      if (oldCode !== editForm.code) {
        const { data: existing } = await supabase
          .from('sewing_operations')
          .select('code')
          .eq('code', editForm.code)
          .maybeSingle();

        if (existing) {
          alert('❌ Операция с таким кодом уже существует');
          return;
        }

        // Update specifications if code changed
        await supabase
          .from('sewing_specifications')
          .update({ sewing_operation_code: editForm.code })
          .eq('sewing_operation_code', oldCode);
      }

      const { error } = await supabase
        .from('sewing_operations')
        .update({
          code: editForm.code,
          name: editForm.name,
          category: editForm.category,
          rate_kzt: editForm.rate_kzt,
          time_norm_minutes: editForm.time_norm_minutes,
          product_type: editForm.product_type || 'Биг-Бэг'
        })
        .eq('code', oldCode);

      if (error) throw error;

      alert('✅ Операция обновлена');
      setEditingOperation(null);
      setEditForm(null);
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
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

  const deleteOperation = async (operationCode: string, operationName: string) => {
    const specs = getSpecsForOperation(operationCode);

    let confirmMessage = `Вы уверены, что хотите удалить операцию "${operationName}"?`;

    if (specs.length > 0) {
      confirmMessage += `\n\n⚠️ У этой операции есть ${specs.length} спецификаций, которые также будут удалены!`;
    }

    confirmMessage += '\n\n❗ Это действие необратимо!';

    if (!confirm(confirmMessage)) return;

    try {
      if (specs.length > 0) {
        const { error: specsError } = await supabase
          .from('sewing_specifications')
          .delete()
          .eq('sewing_operation_code', operationCode);

        if (specsError) throw specsError;
      }

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

  const createNewOperation = async () => {
    if (!newOperation.code.trim() || !newOperation.name.trim() || !newOperation.category.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (newOperation.rate_kzt <= 0 || newOperation.time_norm_minutes <= 0) {
      alert('Цена и норма времени должны быть больше 0');
      return;
    }

    try {
      // Check if code is unique
      const { data: existing } = await supabase
        .from('sewing_operations')
        .select('code')
        .eq('code', newOperation.code.trim())
        .maybeSingle();

      if (existing) {
        alert('❌ Операция с таким кодом уже существует');
        return;
      }

      const { error } = await supabase
        .from('sewing_operations')
        .insert([{
          code: newOperation.code.trim(),
          name: newOperation.name.trim(),
          category: newOperation.category.trim(),
          rate_kzt: newOperation.rate_kzt,
          time_norm_minutes: newOperation.time_norm_minutes,
          product_type: newOperation.product_type || 'Биг-Бэг'
        }]);

      if (error) throw error;

      alert('✅ Операция создана');
      setIsAddingNew(false);
      setNewOperation({
        code: '',
        name: '',
        category: '',
        rate_kzt: 0,
        time_norm_minutes: 0
      });
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const createProduct = async () => {
    if (!newProduct.code.trim() || !newProduct.name.trim()) {
      alert('Заполните код и название продукта');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('product_catalog')
        .select('code')
        .eq('code', newProduct.code.trim())
        .maybeSingle();

      if (existing) {
        alert('❌ Продукт с таким кодом уже существует');
        return;
      }

      const { error } = await supabase
        .from('product_catalog')
        .insert([{
          code: newProduct.code.trim(),
          name: newProduct.name.trim(),
          category: newProduct.category,
          is_active: true
        }]);

      if (error) throw error;

      alert('✅ Продукт создан');
      setNewProduct({ code: '', name: '', category: 'Биг-Бэг' });
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const deleteProduct = async (productCode: string, productName: string) => {
    if (!confirm(`Удалить продукт "${productName}"?`)) return;

    try {
      const { error } = await supabase
        .from('product_catalog')
        .update({ is_active: false })
        .eq('code', productCode);

      if (error) throw error;

      alert('✅ Продукт удалён');
      fetchData();
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex-1">
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={24} className="text-white" />
            </div>
            Спецификации операций пошива
          </h1>
          <p className="page-description">Управление операциями, ценами и составом деталей (BOM)</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsManagingProducts(true)}
            variant="outline"
            className="border-purple-700 text-purple-400 hover:bg-purple-950"
          >
            <Package size={18} className="mr-2" />
            Готовая продукция
          </Button>
          <Button
            onClick={() => setIsAddingNew(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            Добавить операцию
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {/* Add New Operation Form */}
          {isAddingNew && (
            <Card className="bg-zinc-900 border-green-700">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">Новая операция</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewOperation({ code: '', name: '', category: '', rate_kzt: 0, time_norm_minutes: 0, product_type: 'Биг-Бэг' });
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Код операции *</label>
                      <Input
                        value={newOperation.code}
                        onChange={e => setNewOperation({ ...newOperation, code: e.target.value })}
                        className="bg-zinc-950 border-zinc-700 text-white"
                        placeholder="Например: SEW-001"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Название операции *</label>
                      <Input
                        value={newOperation.name}
                        onChange={e => setNewOperation({ ...newOperation, name: e.target.value })}
                        className="bg-zinc-950 border-zinc-700 text-white"
                        placeholder="Например: Пришивание ручек"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Тип продукта *</label>
                      <Select
                        value={newOperation.product_type || 'Биг-Бэг'}
                        onValueChange={v => setNewOperation({ ...newOperation, product_type: v })}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Биг-Бэг">Биг-Бэг</SelectItem>
                          <SelectItem value="Вкладыш">Вкладыш</SelectItem>
                          <SelectItem value="Общее">Общее (для обоих)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Категория *</label>
                      <Input
                        value={newOperation.category}
                        onChange={e => setNewOperation({ ...newOperation, category: e.target.value })}
                        className="bg-zinc-950 border-zinc-700 text-white"
                        placeholder="Например: Биг-Бэг"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Цена за единицу (₸) *</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newOperation.rate_kzt}
                        onChange={e => setNewOperation({ ...newOperation, rate_kzt: parseFloat(e.target.value) || 0 })}
                        className="bg-zinc-950 border-zinc-700 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Норма времени (мин) *</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={newOperation.time_norm_minutes}
                        onChange={e => setNewOperation({ ...newOperation, time_norm_minutes: parseFloat(e.target.value) || 0 })}
                        className="bg-zinc-950 border-zinc-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={createNewOperation}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save size={16} className="mr-2" />
                      Создать операцию
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewOperation({ code: '', name: '', category: '', rate_kzt: 0, time_norm_minutes: 0, product_type: 'Биг-Бэг' });
                      }}
                      variant="ghost"
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} className="mr-2" />
                      Отмена
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Management Modal */}
          {isManagingProducts && (
            <Card className="bg-zinc-900 border-purple-700">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Справочник готовой продукции</h4>
                      <p className="text-xs text-zinc-500 mt-1">Управление типами готовых изделий для учёта ОТК</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsManagingProducts(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  {/* Add new product form */}
                  <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-3">
                    <div className="text-xs font-bold text-zinc-400 uppercase mb-3">Добавить новый продукт</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Код *</label>
                        <Input
                          value={newProduct.code}
                          onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9"
                          placeholder="BB-1000"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Название *</label>
                        <Input
                          value={newProduct.name}
                          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9"
                          placeholder="Биг-Бэг 1000кг"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Тип *</label>
                        <Select
                          value={newProduct.category}
                          onValueChange={v => setNewProduct({ ...newProduct, category: v })}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Биг-Бэг">Биг-Бэг</SelectItem>
                            <SelectItem value="Вкладыш">Вкладыш</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={createProduct}
                      size="sm"
                      className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    >
                      <Plus size={14} className="mr-1" />
                      Создать
                    </Button>
                  </div>

                  {/* Products list by category */}
                  <div className="space-y-3">
                    {['Биг-Бэг', 'Вкладыш'].map(cat => {
                      const categoryProducts = products.filter(p => p.category === cat);
                      return (
                        <div key={cat}>
                          <div className="text-xs font-bold text-zinc-400 uppercase mb-2 flex items-center gap-2">
                            <span className={cat === 'Биг-Бэг' ? 'text-pink-400' : 'text-blue-400'}>{cat}</span>
                            <Badge variant="outline" className="text-zinc-500 border-zinc-700">
                              {categoryProducts.length} шт
                            </Badge>
                          </div>
                          {categoryProducts.length === 0 ? (
                            <div className="text-center text-zinc-600 py-4 bg-zinc-950 border border-zinc-800 rounded text-xs">
                              Нет продуктов
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categoryProducts.map(product => (
                                <div key={product.code} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{product.name}</div>
                                    <div className="text-xs text-zinc-500">{product.code}</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteProduct(product.code, product.name)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 shrink-0"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {operations.map(operation => {
            const specs = getSpecsForOperation(operation.code);
            const isExpanded = expandedOperation === operation.code;
            const isEditing = editingOperation === operation.code;

            return (
              <Card key={operation.code} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                {/* Операция Header */}
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => !isEditing && toggleOperation(operation.code)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight size={20} className="text-zinc-500 mt-0.5" />
                      </div>

                      <div className="flex-1 space-y-2">
                        {/* Main info */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white">{operation.name}</h3>
                          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                            {operation.code}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-700">
                            {operation.category}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          {operation.product_type && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Тип:</span>
                              <span className={`font-bold ${operation.product_type === 'Биг-Бэг' ? 'text-pink-400' : operation.product_type === 'Вкладыш' ? 'text-blue-400' : 'text-green-400'}`}>
                                {operation.product_type}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Цена:</span>
                            <span className="font-bold text-yellow-400">{operation.rate_kzt}₸</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Норма:</span>
                            <span className="font-bold text-purple-400">{operation.time_norm_minutes} мин</span>
                          </div>
                          {specs.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package size={14} className="text-green-400" />
                              <span className="font-bold text-green-400">{specs.length} детал{specs.length === 1 ? 'ь' : specs.length < 5 ? 'и' : 'ей'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(operation);
                        }}
                        className="h-9 text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                      >
                        <Edit2 size={16} className="mr-1" />
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOperation(operation.code, operation.name);
                        }}
                        className="h-9 text-red-400 hover:text-red-300 hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Edit Form */}
                {isEditing && editForm && (
                  <CardContent className="border-t border-zinc-800 bg-zinc-950/50 pt-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Редактирование операции</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Код операции *</label>
                          <Input
                            value={editForm.code}
                            onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                            className="bg-zinc-900 border-zinc-700 text-white"
                            placeholder="Например: SEW-001"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Название операции *</label>
                          <Input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-zinc-900 border-zinc-700 text-white"
                            placeholder="Например: Пришивание ручек"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Тип продукта *</label>
                          <Select
                            value={editForm.product_type || 'Биг-Бэг'}
                            onValueChange={v => setEditForm({ ...editForm, product_type: v })}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Биг-Бэг">Биг-Бэг</SelectItem>
                              <SelectItem value="Вкладыш">Вкладыш</SelectItem>
                              <SelectItem value="Общее">Общее (для обоих)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Категория *</label>
                          <Input
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="bg-zinc-900 border-zinc-700 text-white"
                            placeholder="Например: Биг-Бэг"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Цена за единицу (₸) *</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.rate_kzt}
                            onChange={e => setEditForm({ ...editForm, rate_kzt: parseFloat(e.target.value) || 0 })}
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 block">Норма времени (мин) *</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={editForm.time_norm_minutes}
                            onChange={e => setEditForm({ ...editForm, time_norm_minutes: parseFloat(e.target.value) || 0 })}
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={saveOperation}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save size={16} className="mr-2" />
                          Сохранить изменения
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="ghost"
                          className="text-zinc-400 hover:text-white"
                        >
                          <X size={16} className="mr-2" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}

                {/* Спецификации */}
                {isExpanded && !isEditing && (
                  <CardContent className="border-t border-zinc-800">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">Состав деталей (BOM)</h4>
                      </div>

                      {specs.length > 0 ? (
                        <div className="space-y-2">
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
                        <div className="text-center text-zinc-500 py-8 bg-zinc-950 border border-zinc-800 rounded-lg">
                          <AlertCircle className="mx-auto mb-2" size={24} />
                          <p className="text-sm">Нет деталей в спецификации</p>
                        </div>
                      )}

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
                          <Plus size={16} className="mr-2" />
                          Добавить деталь
                        </Button>
                      )}
                    </div>
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
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Package size={18} className="text-orange-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{spec.cutting_part_name}</div>
            <div className="text-xs text-zinc-500">Код: {spec.cutting_part_code}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-20 h-9 bg-zinc-900 border-zinc-700 text-center"
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
                onClick={() => {
                  setQuantity(spec.quantity);
                  setEditing(false);
                }}
                className="h-9 text-zinc-400"
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
                className="h-9 text-blue-400 hover:text-blue-300"
              >
                <Edit2 size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(spec.id)}
                className="h-9 text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
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
    <div className="bg-zinc-950 border border-blue-700 rounded-lg p-4 space-y-3">
      <h5 className="text-sm font-bold text-white">Добавить деталь в спецификацию</h5>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-1">
          <label className="text-xs text-zinc-500 mb-1.5 block">Деталь *</label>
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

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Количество на 1 изделие *</label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
            className="bg-zinc-900 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !selectedCode}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Save size={16} className="mr-2" />
          Сохранить
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="flex-1 text-zinc-400"
        >
          <X size={16} className="mr-2" />
          Отмена
        </Button>
      </div>
    </div>
  );
}
