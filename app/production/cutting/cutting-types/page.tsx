'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Scissors, Plus, Pencil, Trash2, Search, CheckCircle2, XCircle } from "lucide-react";

interface CuttingType {
  id: string;
  code: string;
  category: string;
  name: string;
  material_type: string;
  width_cm: number | null;
  length_cm: number | null;
  consumption_cm: number;
  weight_g: number | null;
  description: string | null;
  status: string;
}

const MATERIAL_TYPES = ['Ткань', 'Ткань/Ламинат', 'Ламинат', 'Стропа'];
const MATERIAL_COLORS: Record<string, string> = {
  'Ткань': 'bg-blue-900/50 text-blue-300 border-blue-800',
  'Ткань/Ламинат': 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
  'Ламинат': 'bg-orange-900/50 text-orange-300 border-orange-800',
  'Стропа': 'bg-green-900/50 text-green-300 border-green-800',
};

const emptyForm = {
  code: '',
  category: '',
  name: '',
  material_type: 'Ткань',
  width_cm: '',
  length_cm: '',
  consumption_cm: '',
  weight_g: '',
  description: '',
  status: 'Активно',
};

export default function CuttingTypesPage() {
  const [items, setItems] = useState<CuttingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cutting_types')
      .select('*')
      .order('material_type')
      .order('category')
      .order('code');
    if (error) toast.error('Ошибка загрузки: ' + error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: CuttingType) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      category: item.category,
      name: item.name,
      material_type: item.material_type,
      width_cm: item.width_cm?.toString() || '',
      length_cm: item.length_cm?.toString() || '',
      consumption_cm: item.consumption_cm?.toString() || '',
      weight_g: item.weight_g?.toString() || '',
      description: item.description || '',
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.category.trim() || !form.consumption_cm) {
      toast.warning('Заполните обязательные поля: код, категория, название, расход');
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      category: form.category.trim(),
      name: form.name.trim(),
      material_type: form.material_type,
      width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
      length_cm: form.length_cm ? parseFloat(form.length_cm) : null,
      consumption_cm: parseFloat(form.consumption_cm),
      weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
      description: form.description || null,
      status: form.status,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('cutting_types').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('cutting_types').insert(payload));
    }

    if (error) {
      toast.error('Ошибка сохранения: ' + error.message);
    } else {
      toast.success(editingId ? 'Запись обновлена' : 'Запись добавлена');
      setDialogOpen(false);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (item: CuttingType) => {
    if (!confirm(`Удалить "${item.name}" (${item.code})?`)) return;
    const { error } = await supabase.from('cutting_types').delete().eq('id', item.id);
    if (error) toast.error('Ошибка удаления: ' + error.message);
    else { toast.success('Запись удалена'); fetchItems(); }
  };

  const handleToggleStatus = async (item: CuttingType) => {
    const newStatus = item.status === 'Активно' ? 'Неактивно' : 'Активно';
    const { error } = await supabase.from('cutting_types').update({ status: newStatus }).eq('id', item.id);
    if (error) toast.error('Ошибка: ' + error.message);
    else { toast.success(`Статус изменён на "${newStatus}"`); fetchItems(); }
  };

  // Авторасчёт расхода при изменении длины
  const handleLengthChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      length_cm: val,
      consumption_cm: val ? (parseFloat(val) + 3).toString() : prev.consumption_cm
    }));
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header mb-6">
        <div>
          <h1 className="h1-bold">
            <div className="bg-teal-600 p-2 rounded-lg">
              <Scissors size={24} className="text-white" />
            </div>
            Справочник типов деталей
          </h1>
          <p className="text-zinc-500 mt-2">Управление справочником кроеных деталей</p>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 h-11">
          <Plus size={18} className="mr-2" />
          Добавить деталь
        </Button>
      </div>

      {/* Поиск */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по коду, названию, категории..."
          className="pl-9 bg-zinc-900 border-zinc-700 text-white"
        />
      </div>

      {/* Таблица */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-20 text-zinc-400">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">Ничего не найдено</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                    <th className="text-left px-4 py-3">Код</th>
                    <th className="text-left px-4 py-3">Категория</th>
                    <th className="text-left px-4 py-3">Название</th>
                    <th className="text-left px-4 py-3">Материал</th>
                    <th className="text-right px-4 py-3">Длина (см)</th>
                    <th className="text-right px-4 py-3">Ширина (см)</th>
                    <th className="text-right px-4 py-3">Расход (см)</th>
                    <th className="text-right px-4 py-3">Вес (г)</th>
                    <th className="text-center px-4 py-3">Статус</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${item.status === 'Неактивно' ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3 font-mono text-teal-400 font-bold whitespace-nowrap">{item.code}</td>
                      <td className="px-4 py-3 text-zinc-400">{item.category}</td>
                      <td className="px-4 py-3 text-white">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded border ${MATERIAL_COLORS[item.material_type] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                          {item.material_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">{item.length_cm ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{item.width_cm ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">{item.consumption_cm}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{item.weight_g ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                            item.status === 'Активно'
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-zinc-500 hover:text-zinc-400'
                          }`}
                        >
                          {item.status === 'Активно' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {item.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Scissors size={20} className="text-teal-400" />
              {editingId ? 'Редактировать деталь' : 'Добавить деталь'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Код и категория */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 mb-1 block">Код * <span className="text-xs text-zinc-600">(уникальный)</span></Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="bg-zinc-900 border-zinc-700 text-white font-mono"
                  placeholder="DON-90-90"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1 block">Категория *</Label>
                <Input
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white"
                  placeholder="Донышко, Боковина, Петля..."
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {[...new Set(items.map(i => i.category))].map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Название */}
            <div>
              <Label className="text-zinc-400 mb-1 block">Название *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white"
                placeholder="Донышко квадратное 90×90 см"
              />
            </div>

            {/* Тип материала */}
            <div>
              <Label className="text-zinc-400 mb-2 block">Тип материала *</Label>
              <div className="flex flex-wrap gap-2">
                {MATERIAL_TYPES.map(mt => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, material_type: mt }))}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.material_type === mt
                        ? 'bg-teal-600 border-teal-500 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            {/* Размеры */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-400 mb-1 block">Длина (см)</Label>
                <Input
                  type="number"
                  value={form.length_cm}
                  onChange={e => handleLengthChange(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-white"
                  placeholder="90"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1 block">Ширина (см)</Label>
                <Input
                  type="number"
                  value={form.width_cm}
                  onChange={e => setForm(prev => ({ ...prev, width_cm: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white"
                  placeholder="90"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1 block">
                  Расход на деталь (см) *
                  <span className="text-xs text-zinc-600 ml-1">авторасчёт</span>
                </Label>
                <Input
                  type="number"
                  value={form.consumption_cm}
                  onChange={e => setForm(prev => ({ ...prev, consumption_cm: e.target.value }))}
                  className="bg-zinc-900 border-teal-700 text-white"
                  placeholder="93"
                />
              </div>
            </div>

            {/* Вес и описание */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 mb-1 block">Вес детали (г)</Label>
                <Input
                  type="number"
                  value={form.weight_g}
                  onChange={e => setForm(prev => ({ ...prev, weight_g: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white"
                  placeholder="180"
                />
              </div>
              <div>
                <Label className="text-zinc-400 mb-1 block">Статус</Label>
                <div className="flex gap-2 mt-1">
                  {['Активно', 'Неактивно'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, status: s }))}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.status === s
                          ? s === 'Активно' ? 'bg-green-700 border-green-600 text-white' : 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 mb-1 block">Описание</Label>
              <Input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white"
                placeholder="Дополнительная информация..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {saving ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Добавить'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
