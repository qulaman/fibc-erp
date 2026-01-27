'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Edit, Power, Search } from "lucide-react";

const EQUIPMENT_TYPES = [
  { value: 'extruder', label: 'Экструдер' },
  { value: 'weaving', label: 'Ткацкий станок' },
  { value: 'lamination', label: 'Ламинатор' },
  { value: 'cutting', label: 'Резка' },
  { value: 'sewing', label: 'Швейная машина' },
];

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    is_active: true
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase.from('equipment').select('*').order('name');
    if (data) {
      // Если is_active отсутствует в БД, считаем все активными
      const normalizedData = data.map(eq => ({
        ...eq,
        is_active: eq.is_active !== undefined ? eq.is_active : true
      }));
      setEquipment(normalizedData);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.type) return alert('Введите код, название и тип');

    const payload: any = {
      name: formData.name,
      code: formData.code,
      type: formData.type
    };

    // Добавляем is_active только если колонка существует
    // Попробуем сначала с is_active, если ошибка - без него
    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('equipment')
        .update(payload)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('equipment')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      setIsDialogOpen(false);
      resetForm();
      fetchEquipment();
    }
  };

  const startEdit = (eq: any) => {
    setEditingId(eq.id);
    setFormData({
      name: eq.name,
      code: eq.code || '',
      type: eq.type,
      is_active: eq.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', type: '', is_active: true });
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('equipment').update({ is_active: !currentStatus }).eq('id', id);
    if (error) {
      alert('Колонка is_active не существует в таблице equipment. Добавьте её в БД.');
    } else {
      fetchEquipment();
    }
  };

  const filteredEquipment = equipment.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    EQUIPMENT_TYPES.find(t => t.value === e.type)?.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-green-600 p-2 rounded-lg">
              <Settings size={24} className="text-white" />
            </div>
            Управление Оборудованием
          </h1>
          <p className="page-description">Станки и оборудование предприятия</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-white text-black hover:bg-zinc-200 font-bold gap-2">
          <Plus size={18} /> Добавить оборудование
        </Button>
      </div>

      <div className="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Поиск по названию или типу..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div className="text-zinc-500">Загрузка...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEquipment.map((eq) => {
            const typeLabel = EQUIPMENT_TYPES.find(t => t.value === eq.type)?.label || eq.type;

            return (
              <Card key={eq.id} className={`border-zinc-800 bg-zinc-900 transition-all ${!eq.is_active ? 'opacity-50 grayscale' : ''}`}>
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-400">
                    <Settings size={20}/>
                  </div>
                  <Badge variant="outline" className={eq.is_active ? "text-green-400 border-green-900 bg-green-900/10" : "text-red-400 border-red-900"}>
                    {eq.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-lg text-white mb-1">{eq.name}</div>
                  <div className="text-sm text-zinc-400 mb-4">{typeLabel}</div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800" onClick={() => startEdit(eq)}>
                      <Edit size={14} className="mr-2"/> Изменить
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={eq.is_active ? "text-red-500 hover:text-red-400 hover:bg-red-950" : "text-green-500 hover:text-green-400 hover:bg-green-950"}
                      onClick={() => toggleStatus(eq.id, eq.is_active)}
                      title={eq.is_active ? "Деактивировать" : "Активировать"}
                    >
                      <Power size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать оборудование' : 'Новое оборудование'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Код {editingId && <span className="text-zinc-600">(только для нового)</span>}</label>
              <Input
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="EXT-01"
                className="bg-zinc-900 border-zinc-700 font-mono"
                disabled={!!editingId}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Название</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Экструдер №1"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Тип оборудования</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Выберите тип..." />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 font-bold mt-4">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
