'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, Trash2, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MaterialRecord {
  id: string;
  name: string;
  type: string;
  unit: string;
  current_balance: number;
  min_stock: number;
}

export default function RawMaterialsWarehousePage() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'available' | 'all'>('available');
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Для добавления материала
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('кг');
  const [newMaterialMinStock, setNewMaterialMinStock] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Для движения материалов (приход/расход)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionQuantity, setTransactionQuantity] = useState('');
  const [transactionBatch, setTransactionBatch] = useState('');
  const [transactionCounterparty, setTransactionCounterparty] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, [view]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('view_material_balances')
        .select('*')
        .neq('type', 'МФН')
        .order('name');

      if (view === 'available') {
        query = query.gt('current_balance', 0);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      toast.error('Только администраторы могут удалять записи');
      return;
    }

    if (!confirm(`Удалить материал "${name}"?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Запись успешно удалена');
      fetchMaterials();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      if (err.code === '23503') {
        toast.error('Невозможно удалить материал', {
          description: `Материал "${name}" связан с другими данными в системе (транзакции). Сначала удалите связанные записи.`
        });
      } else {
        toast.error('Ошибка удаления: ' + err.message);
      }
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Только администраторы могут добавлять материалы');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('raw_materials')
        .insert([{
          name: newMaterialName,
          type: newMaterialType,
          unit: newMaterialUnit,
          min_stock: parseFloat(newMaterialMinStock) || 0,
        }]);

      if (error) throw error;

      toast.success('Материал успешно добавлен');
      setIsAddDialogOpen(false);
      setNewMaterialName('');
      setNewMaterialType('');
      setNewMaterialUnit('кг');
      setNewMaterialMinStock('0');
      fetchMaterials();
    } catch (err: any) {
      console.error('Error adding material:', err);
      toast.error('Ошибка добавления: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTransactionDialog = (material: MaterialRecord) => {
    setSelectedMaterial(material);
    setTransactionType('in');
    setTransactionQuantity('');
    setTransactionBatch('');
    setTransactionCounterparty('');
    setIsTransactionDialogOpen(true);
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    setIsSubmitting(true);
    try {
      // Генерируем номер документа
      const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const docPrefix = transactionType === 'in' ? 'PRH' : 'PCX';
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const docNumber = `${docPrefix}-${datePrefix}-${randomSuffix}`;

      const { error } = await supabase
        .from('inventory_transactions')
        .insert([{
          material_id: selectedMaterial.id,
          type: transactionType,
          quantity: Number(transactionQuantity),
          batch_number: transactionBatch || null,
          doc_number: docNumber,
          counterparty: transactionCounterparty || (transactionType === 'in' ? 'Поставщик' : 'Производство'),
        }]);

      if (error) throw error;

      toast.success(`${transactionType === 'in' ? 'Приход' : 'Расход'} успешно зарегистрирован`, {
        description: `Документ: ${docNumber}`
      });
      setIsTransactionDialogOpen(false);
      fetchMaterials();
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      toast.error('Ошибка регистрации движения: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMaterials = materials.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.type?.toLowerCase().includes(searchLower);
  });

  const totalItems = filteredMaterials.length;
  const itemsWithStock = filteredMaterials.filter(i => i.current_balance > 0).length;
  const totalBalance = filteredMaterials.reduce((sum, i) => sum + (i.current_balance || 0), 0);
  const criticalItems = filteredMaterials.filter(i => i.current_balance <= i.min_stock && i.min_stock > 0).length;

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="text-green-500" size={20} />
            <span className="hidden sm:inline">Склад сырья (FIBC)</span>
            <span className="sm:hidden">Сырье</span>
          </h1>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <Link
              href="/warehouse/raw-materials/history"
              className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-base bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors border border-zinc-700 text-center"
            >
              <span className="hidden sm:inline">📜 История операций</span>
              <span className="sm:hidden">📜 История</span>
            </Link>
            {isAdmin && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <button className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-base bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2">
                    <Plus size={16} />
                    <span className="hidden sm:inline">Добавить материал</span>
                    <span className="sm:hidden">Добавить</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg md:text-xl">Добавить материал</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddMaterial} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-zinc-400 text-xs md:text-sm">Название материала</Label>
                      <Input
                        id="name"
                        value={newMaterialName}
                        onChange={(e) => setNewMaterialName(e.target.value)}
                        placeholder="Напр: ПП Марка 030"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type" className="text-zinc-400 text-xs md:text-sm">Тип материала</Label>
                      <Input
                        id="type"
                        value={newMaterialType}
                        onChange={(e) => setNewMaterialType(e.target.value)}
                        placeholder="Напр: Полипропилен, Краска, и т.д."
                        className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="unit" className="text-zinc-400 text-xs md:text-sm">Единица измерения</Label>
                        <Input
                          id="unit"
                          value={newMaterialUnit}
                          onChange={(e) => setNewMaterialUnit(e.target.value)}
                          placeholder="кг"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="min_stock" className="text-zinc-400 text-xs md:text-sm">Мин. запас</Label>
                        <Input
                          id="min_stock"
                          type="number"
                          step="0.01"
                          value={newMaterialMinStock}
                          onChange={(e) => setNewMaterialMinStock(e.target.value)}
                          placeholder="0"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm md:text-base"
                    >
                      {isSubmitting ? 'Добавление...' : 'Добавить материал'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <p className="text-xs md:text-base text-zinc-400">Текущие остатки и управление запасами</p>
      </div>

      {/* View Toggle */}
      <div className="mb-4 md:mb-6 flex gap-2 md:gap-3">
        <button
          onClick={() => setView('available')}
          className={`flex-1 sm:flex-none px-3 md:px-6 py-2 md:py-3 rounded-lg text-xs md:text-base font-medium transition-colors ${
            view === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span className="hidden sm:inline">В наличии</span>
          <span className="sm:hidden">Есть</span>
        </button>
        <button
          onClick={() => setView('all')}
          className={`flex-1 sm:flex-none px-3 md:px-6 py-2 md:py-3 rounded-lg text-xs md:text-base font-medium transition-colors ${
            view === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span className="hidden sm:inline">Все записи</span>
          <span className="sm:hidden">Все</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 md:mb-6">
        <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2 text-zinc-400">Поиск</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Название материала..."
          className="w-full md:w-1/3 px-3 md:px-4 py-2 text-xs md:text-base bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-zinc-400 mb-1">Всего позиций</p>
          <p className="text-xl md:text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-green-400 mb-1">
            <span className="hidden sm:inline">С остатком</span>
            <span className="sm:hidden">Есть</span>
          </p>
          <p className="text-xl md:text-2xl font-bold text-green-500">{itemsWithStock}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-green-400 mb-1">Общий вес</p>
          <p className="text-xl md:text-2xl font-bold text-green-500">{totalBalance.toFixed(1)} кг</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-red-400 mb-1">
            <span className="hidden sm:inline">Критичные</span>
            <span className="sm:hidden">Мало</span>
          </p>
          <p className="text-xl md:text-2xl font-bold text-red-500">{criticalItems}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">
          Загрузка данных...
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Нет данных на складе
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold">
                    <span className="hidden sm:inline">Наименование</span>
                    <span className="sm:hidden">Название</span>
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold hidden md:table-cell">Тип</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right font-semibold">Остаток</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold hidden sm:table-cell">
                    <span className="hidden md:inline">Ед. изм.</span>
                    <span className="md:hidden">Ед.</span>
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-center font-semibold">
                    <span className="hidden sm:inline">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredMaterials.map((item) => {
                  const isCritical = item.current_balance <= item.min_stock && item.min_stock > 0;
                  const isNegative = item.current_balance < 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isCritical && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-100 border border-red-700 animate-pulse">
                              МАЛО!
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 md:hidden">{item.type}</div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-zinc-400 hidden md:table-cell">
                        {item.type}
                      </td>
                      <td className={`px-2 md:px-4 py-2 md:py-3 text-right font-bold text-sm md:text-lg ${
                        isNegative ? 'text-red-500' :
                        item.current_balance > 0 ? 'text-green-400' : 'text-zinc-500'
                      }`}>
                        {item.current_balance.toLocaleString('ru-RU')}
                        <span className="sm:hidden text-[10px] ml-1 font-normal">{item.unit}</span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-zinc-500 hidden sm:table-cell">
                        {item.unit}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => openTransactionDialog(item)}
                            className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
                            title="Приход/Расход"
                          >
                            ⚖️ <span className="hidden sm:inline">Движение</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 md:p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded transition-colors"
                              title="Удалить запись"
                            >
                              <Trash2 size={14} className="md:hidden" />
                              <Trash2 size={16} className="hidden md:block" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-[10px] md:text-xs text-zinc-600">
        Данные синхронизируются в реальном времени с Supabase PostgreSQL
      </div>

      {/* Диалог движения материалов */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Движение: {selectedMaterial?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransaction} className="space-y-4">
            {/* Переключатель типа операции */}
            <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setTransactionType('in')}
                className={`flex-1 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                  transactionType === 'in'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📥 <span className="hidden sm:inline">Приход (Закуп)</span><span className="sm:hidden">Приход</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('out')}
                className={`flex-1 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                  transactionType === 'out'
                    ? 'bg-[#E60012] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📤 <span className="hidden sm:inline">Расход (В цех)</span><span className="sm:hidden">Расход</span>
              </button>
            </div>

            <div>
              <Label htmlFor="quantity" className="text-zinc-400 text-xs md:text-sm">
                Количество ({selectedMaterial?.unit})
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={transactionQuantity}
                onChange={(e) => setTransactionQuantity(e.target.value)}
                className="bg-white text-black text-base md:text-lg font-bold mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="batch" className="text-zinc-400 text-xs md:text-sm">
                Партия (LOT)
              </Label>
              <Input
                id="batch"
                value={transactionBatch}
                onChange={(e) => setTransactionBatch(e.target.value)}
                placeholder={transactionType === 'in' ? 'Новый номер партии' : 'Из какой партии списываем?'}
                className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
              />
            </div>

            <div>
              <Label htmlFor="counterparty" className="text-zinc-400 text-xs md:text-sm">
                {transactionType === 'in' ? 'Поставщик' : 'Куда списали (Цех)'}
              </Label>
              <Input
                id="counterparty"
                value={transactionCounterparty}
                onChange={(e) => setTransactionCounterparty(e.target.value)}
                placeholder={transactionType === 'in' ? 'ООО Полимер' : 'Экструзия №1'}
                className="bg-zinc-800 border-zinc-700 text-white text-sm md:text-base mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium text-sm md:text-base"
            >
              {isSubmitting ? 'Проводка...' : 'Провести документ'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
