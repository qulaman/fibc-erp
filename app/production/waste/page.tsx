'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, AlertTriangle, Plus, Filter } from 'lucide-react';

interface WasteMaterial {
  id: string;
  created_at: string;
  workshop: string;
  material_type: string;
  material_description: string;
  quantity: number;
  unit: string;
  reason: string;
  notes: string;
}

interface DefectMaterial {
  id: string;
  created_at: string;
  workshop: string;
  material_type: string;
  material_description: string;
  quantity: number;
  unit: string;
  defect_type: string;
  reason: string;
  notes: string;
}

const WORKSHOPS = [
  { value: 'extrusion', label: 'Экструзия' },
  { value: 'weaving', label: 'Ткачество' },
  { value: 'lamination', label: 'Ламинация' },
  { value: 'straps', label: 'Стропы' },
  { value: 'cutting', label: 'Крой' },
  { value: 'sewing', label: 'Пошив' },
  { value: 'qc', label: 'ОТК' }
];

const UNITS = [
  { value: 'kg', label: 'кг' },
  { value: 'meters', label: 'метры' },
  { value: 'pieces', label: 'штуки' },
  { value: 'rolls', label: 'рулоны' }
];

const DEFECT_TYPES = [
  { value: 'visual', label: 'Визуальный дефект' },
  { value: 'size', label: 'Несоответствие размеров' },
  { value: 'strength', label: 'Прочность' },
  { value: 'color', label: 'Дефект цвета' },
  { value: 'contamination', label: 'Загрязнение' },
  { value: 'mechanical', label: 'Механическое повреждение' },
  { value: 'other', label: 'Другое' }
];

export default function WasteManagementPage() {
  // Waste form state
  const [wasteForm, setWasteForm] = useState({
    workshop: '',
    material_type: '',
    material_description: '',
    quantity: '',
    unit: 'kg',
    reason: '',
    notes: ''
  });

  // Defect form state
  const [defectForm, setDefectForm] = useState({
    workshop: '',
    material_type: '',
    material_description: '',
    quantity: '',
    unit: 'kg',
    defect_type: '',
    reason: '',
    notes: ''
  });

  // Journal data
  const [wasteJournal, setWasteJournal] = useState<WasteMaterial[]>([]);
  const [defectJournal, setDefectJournal] = useState<DefectMaterial[]>([]);

  // Filter state
  const [filterWorkshop, setFilterWorkshop] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('waste');

  // Fetch waste materials
  const fetchWasteJournal = async () => {
    try {
      let query = supabase
        .from('waste_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterWorkshop) {
        query = query.eq('workshop', filterWorkshop);
      }
      if (filterDateFrom) {
        query = query.gte('created_at', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('created_at', filterDateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setWasteJournal(data || []);
    } catch (error) {
      console.error('Error fetching waste journal:', error);
    }
  };

  // Fetch defect materials
  const fetchDefectJournal = async () => {
    try {
      let query = supabase
        .from('defect_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterWorkshop) {
        query = query.eq('workshop', filterWorkshop);
      }
      if (filterDateFrom) {
        query = query.gte('created_at', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('created_at', filterDateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDefectJournal(data || []);
    } catch (error) {
      console.error('Error fetching defect journal:', error);
    }
  };

  useEffect(() => {
    fetchWasteJournal();
    fetchDefectJournal();
  }, [filterWorkshop, filterDateFrom, filterDateTo]);

  // Add waste material
  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('waste_materials')
        .insert([{
          workshop: wasteForm.workshop,
          material_type: wasteForm.material_type,
          material_description: wasteForm.material_description,
          quantity: parseFloat(wasteForm.quantity),
          unit: wasteForm.unit,
          reason: wasteForm.reason,
          notes: wasteForm.notes
        }]);

      if (error) throw error;

      // Reset form
      setWasteForm({
        workshop: '',
        material_type: '',
        material_description: '',
        quantity: '',
        unit: 'kg',
        reason: '',
        notes: ''
      });

      fetchWasteJournal();
      alert('Отход успешно добавлен');
    } catch (error) {
      console.error('Error adding waste:', error);
      alert('Ошибка при добавлении отхода');
    } finally {
      setLoading(false);
    }
  };

  // Add defect material
  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('defect_materials')
        .insert([{
          workshop: defectForm.workshop,
          material_type: defectForm.material_type,
          material_description: defectForm.material_description,
          quantity: parseFloat(defectForm.quantity),
          unit: defectForm.unit,
          defect_type: defectForm.defect_type,
          reason: defectForm.reason,
          notes: defectForm.notes
        }]);

      if (error) throw error;

      // Reset form
      setDefectForm({
        workshop: '',
        material_type: '',
        material_description: '',
        quantity: '',
        unit: 'kg',
        defect_type: '',
        reason: '',
        notes: ''
      });

      fetchDefectJournal();
      alert('Брак успешно добавлен');
    } catch (error) {
      console.error('Error adding defect:', error);
      alert('Ошибка при добавлении брака');
    } finally {
      setLoading(false);
    }
  };

  // Delete waste entry
  const handleDeleteWaste = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;

    try {
      const { error } = await supabase
        .from('waste_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchWasteJournal();
    } catch (error) {
      console.error('Error deleting waste:', error);
      alert('Ошибка при удалении записи');
    }
  };

  // Delete defect entry
  const handleDeleteDefect = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;

    try {
      const { error } = await supabase
        .from('defect_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDefectJournal();
    } catch (error) {
      console.error('Error deleting defect:', error);
      alert('Ошибка при удалении записи');
    }
  };

  const getWorkshopLabel = (value: string) => {
    return WORKSHOPS.find(w => w.value === value)?.label || value;
  };

  const getDefectTypeLabel = (value: string) => {
    return DEFECT_TYPES.find(d => d.value === value)?.label || value;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Учет отходов и брака</h1>

      {/* Filters */}
      <Card className="mb-6 bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Цех</Label>
              <Select value={filterWorkshop || undefined} onValueChange={(value) => setFilterWorkshop(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все цеха" />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOPS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterWorkshop && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterWorkshop('')}
                  className="mt-1 h-6 text-xs"
                >
                  Сбросить
                </Button>
              )}
            </div>
            <div>
              <Label>Дата с</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Дата по</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="waste" className="flex items-center gap-2">
            <Trash2 size={16} />
            Отходы
          </TabsTrigger>
          <TabsTrigger value="defect" className="flex items-center gap-2">
            <AlertTriangle size={16} />
            Брак
          </TabsTrigger>
        </TabsList>

        {/* Waste Tab */}
        <TabsContent value="waste">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Waste Form */}
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} />
                  Добавить отход
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddWaste} className="space-y-4">
                  <div>
                    <Label>Цех *</Label>
                    <Select
                      value={wasteForm.workshop}
                      onValueChange={(value) => setWasteForm({ ...wasteForm, workshop: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите цех" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKSHOPS.map(w => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Тип материала *</Label>
                    <Input
                      value={wasteForm.material_type}
                      onChange={(e) => setWasteForm({ ...wasteForm, material_type: e.target.value })}
                      placeholder="Нить, ткань, пленка и т.д."
                      required
                    />
                  </div>

                  <div>
                    <Label>Описание материала</Label>
                    <Input
                      value={wasteForm.material_description}
                      onChange={(e) => setWasteForm({ ...wasteForm, material_description: e.target.value })}
                      placeholder="Артикул, цвет и т.д."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Количество *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={wasteForm.quantity}
                        onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Единица измерения *</Label>
                      <Select
                        value={wasteForm.unit}
                        onValueChange={(value) => setWasteForm({ ...wasteForm, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Причина</Label>
                    <Input
                      value={wasteForm.reason}
                      onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                      placeholder="Причина образования отхода"
                    />
                  </div>

                  <div>
                    <Label>Примечания</Label>
                    <Textarea
                      value={wasteForm.notes}
                      onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                      placeholder="Дополнительная информация"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Добавление...' : 'Добавить отход'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Waste Journal */}
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle>Журнал отходов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {wasteJournal.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4">Нет записей</p>
                  ) : (
                    wasteJournal.map((entry) => (
                      <Card key={entry.id} className="bg-zinc-900 border-zinc-700">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-orange-400">
                                {getWorkshopLabel(entry.workshop)}
                              </p>
                              <p className="text-sm text-zinc-400">
                                {new Date(entry.created_at).toLocaleString('ru-RU')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWaste(entry.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-zinc-400">Материал:</span> {entry.material_type}</p>
                            {entry.material_description && (
                              <p><span className="text-zinc-400">Описание:</span> {entry.material_description}</p>
                            )}
                            <p className="text-lg font-bold text-orange-500">
                              {entry.quantity} {entry.unit}
                            </p>
                            {entry.reason && (
                              <p><span className="text-zinc-400">Причина:</span> {entry.reason}</p>
                            )}
                            {entry.notes && (
                              <p><span className="text-zinc-400">Примечания:</span> {entry.notes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Defect Tab */}
        <TabsContent value="defect">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Defect Form */}
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} />
                  Добавить брак
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddDefect} className="space-y-4">
                  <div>
                    <Label>Цех *</Label>
                    <Select
                      value={defectForm.workshop}
                      onValueChange={(value) => setDefectForm({ ...defectForm, workshop: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите цех" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKSHOPS.map(w => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Тип материала *</Label>
                    <Input
                      value={defectForm.material_type}
                      onChange={(e) => setDefectForm({ ...defectForm, material_type: e.target.value })}
                      placeholder="Нить, ткань, мешок и т.д."
                      required
                    />
                  </div>

                  <div>
                    <Label>Описание материала</Label>
                    <Input
                      value={defectForm.material_description}
                      onChange={(e) => setDefectForm({ ...defectForm, material_description: e.target.value })}
                      placeholder="Артикул, цвет, размер и т.д."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Количество *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defectForm.quantity}
                        onChange={(e) => setDefectForm({ ...defectForm, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Единица измерения *</Label>
                      <Select
                        value={defectForm.unit}
                        onValueChange={(value) => setDefectForm({ ...defectForm, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Тип дефекта *</Label>
                    <Select
                      value={defectForm.defect_type}
                      onValueChange={(value) => setDefectForm({ ...defectForm, defect_type: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип дефекта" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFECT_TYPES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Причина</Label>
                    <Input
                      value={defectForm.reason}
                      onChange={(e) => setDefectForm({ ...defectForm, reason: e.target.value })}
                      placeholder="Причина брака"
                    />
                  </div>

                  <div>
                    <Label>Примечания</Label>
                    <Textarea
                      value={defectForm.notes}
                      onChange={(e) => setDefectForm({ ...defectForm, notes: e.target.value })}
                      placeholder="Дополнительная информация"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Добавление...' : 'Добавить брак'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Defect Journal */}
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle>Журнал брака</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {defectJournal.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4">Нет записей</p>
                  ) : (
                    defectJournal.map((entry) => (
                      <Card key={entry.id} className="bg-zinc-900 border-zinc-700">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-red-400">
                                {getWorkshopLabel(entry.workshop)}
                              </p>
                              <p className="text-sm text-zinc-400">
                                {new Date(entry.created_at).toLocaleString('ru-RU')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDefect(entry.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-zinc-400">Материал:</span> {entry.material_type}</p>
                            {entry.material_description && (
                              <p><span className="text-zinc-400">Описание:</span> {entry.material_description}</p>
                            )}
                            <p className="text-lg font-bold text-red-500">
                              {entry.quantity} {entry.unit}
                            </p>
                            <p className="text-yellow-500">
                              {getDefectTypeLabel(entry.defect_type)}
                            </p>
                            {entry.reason && (
                              <p><span className="text-zinc-400">Причина:</span> {entry.reason}</p>
                            )}
                            {entry.notes && (
                              <p><span className="text-zinc-400">Примечания:</span> {entry.notes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
