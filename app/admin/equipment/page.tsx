'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/my-select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Settings, Plus, Edit, Power, Search } from "lucide-react";

const EQUIPMENT_TYPES = [
  { value: 'extruder',   label: 'Экструдер',               department: 'Экструзия' },
  { value: 'weaving',    label: 'Ткацкий станок (рукав)',   department: 'Ткачество' },
  { value: 'loom_flat',  label: 'Плоскоткацкий станок',     department: 'Ткачество' },
  { value: 'lamination', label: 'Ламинатор',                department: 'Ламинация' },
  { value: 'cutting',    label: 'Резка / Крой',             department: 'Крой' },
  { value: 'sewing',     label: 'Швейная машина',           department: 'Пошив и ОТК' },
];

const DEPARTMENTS = [
  { name: 'Экструзия',              color: 'bg-red-900/40 border-red-800',       badge: 'text-red-400 border-red-800',       types: ['extruder'] },
  { name: 'Ткачество — Круглоткацкие', color: 'bg-orange-900/30 border-orange-800',  badge: 'text-orange-400 border-orange-800', types: ['weaving'] },
  { name: 'Ткачество — Плоскоткацкие', color: 'bg-amber-900/30 border-amber-700',    badge: 'text-amber-400 border-amber-700',   types: ['loom_flat'] },
  { name: 'Ламинация',              color: 'bg-purple-900/30 border-purple-800',  badge: 'text-purple-400 border-purple-800', types: ['lamination'] },
  { name: 'Крой',                   color: 'bg-yellow-900/20 border-yellow-800',  badge: 'text-yellow-400 border-yellow-800', types: ['cutting'] },
  { name: 'Пошив и ОТК',           color: 'bg-blue-900/30 border-blue-800',      badge: 'text-blue-400 border-blue-800',     types: ['sewing'] },
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
      setEquipment(data.map(eq => ({ ...eq, is_active: eq.is_active !== undefined ? eq.is_active : true })));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.type) {
      toast.warning('Введите код, название и тип');
      return;
    }

    const payload = { name: formData.name, code: formData.code, type: formData.type };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('equipment').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('equipment').insert([payload]));
    }

    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success(editingId ? 'Обновлено' : 'Добавлено');
      setIsDialogOpen(false);
      resetForm();
      fetchEquipment();
    }
  };

  const startEdit = (eq: any) => {
    setEditingId(eq.id);
    setFormData({ name: eq.name, code: eq.code || '', type: eq.type, is_active: eq.is_active });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', type: '', is_active: true });
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('equipment').update({ is_active: !currentStatus }).eq('id', id);
    if (error) toast.error('Ошибка: ' + error.message);
    else fetchEquipment();
  };

  const getTypeLabel = (type: string) =>
    EQUIPMENT_TYPES.find(t => t.value === type)?.label || type;

  const filtered = search
    ? equipment.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        getTypeLabel(e.type).toLowerCase().includes(search.toLowerCase()) ||
        e.code?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const EquipmentCard = ({ eq, badgeClass }: { eq: any; badgeClass: string }) => (
    <Card className={`border-zinc-800 bg-zinc-900 transition-all ${!eq.is_active ? 'opacity-50 grayscale' : ''}`}>
      <CardHeader className="flex flex-row justify-between items-start pb-2">
        <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Settings size={18}/>
        </div>
        <Badge variant="outline" className={eq.is_active ? "text-green-400 border-green-900 bg-green-900/10" : "text-red-400 border-red-900"}>
          {eq.is_active ? 'Активен' : 'Неактивен'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-white mb-0.5">{eq.name}</div>
        <div className="text-xs text-zinc-500 mb-2">{getTypeLabel(eq.type)}</div>
        {eq.code && (
          <div className="text-xs font-mono text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded inline-block mb-3">
            {eq.code}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-xs" onClick={() => startEdit(eq)}>
            <Edit size={13} className="mr-1.5"/> Изменить
          </Button>
          <Button
            variant="ghost" size="icon"
            className={eq.is_active ? "text-red-500 hover:text-red-400 hover:bg-red-950" : "text-green-500 hover:text-green-400 hover:bg-green-950"}
            onClick={() => toggleStatus(eq.id, eq.is_active)}
            title={eq.is_active ? "Деактивировать" : "Активировать"}
          >
            <Power size={15} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-container">

      <div className="page-header flex-col sm:flex-row gap-3 sm:gap-0">
        <div>
          <h1 className="h1-bold text-lg md:text-2xl">
            <div className="bg-green-600 p-1.5 md:p-2 rounded-lg">
              <Settings size={18} className="text-white md:hidden" />
              <Settings size={24} className="text-white hidden md:block" />
            </div>
            <span className="hidden sm:inline">Управление Оборудованием</span>
            <span className="sm:hidden">Оборудование</span>
          </h1>
          <p className="page-description text-xs md:text-sm">Станки и оборудование предприятия</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-white text-black hover:bg-zinc-200 font-bold gap-2 text-xs md:text-sm w-full sm:w-auto">
          <Plus size={16} /> <span className="hidden sm:inline">Добавить оборудование</span><span className="sm:hidden">Добавить</span>
        </Button>
      </div>

      <div className="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Поиск по названию, коду или типу..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div className="text-zinc-500">Загрузка...</div> : (
        search && filtered ? (
          /* Результаты поиска — плоский список */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length === 0
              ? <div className="col-span-full text-zinc-500">Ничего не найдено</div>
              : filtered.map(eq => <EquipmentCard key={eq.id} eq={eq} badgeClass="" />)
            }
          </div>
        ) : (
          /* Группировка по цехам */
          <div className="space-y-8">
            {DEPARTMENTS.map(dept => {
              const items = equipment.filter(e => dept.types.includes(e.type));
              return (
                <div key={dept.name}>
                  <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border ${dept.color}`}>
                    <span className={`font-bold text-sm ${dept.badge.split(' ')[0]}`}>{dept.name}</span>
                    <span className="text-zinc-500 text-xs">{items.length} ед.</span>
                    <span className="text-zinc-600 text-xs ml-auto">
                      {items.filter(e => e.is_active).length} активных
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-zinc-600 text-sm pl-2">Нет оборудования</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map(eq => <EquipmentCard key={eq.id} eq={eq} badgeClass={dept.badge} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Оборудование с неизвестным типом */}
            {(() => {
              const knownTypes = DEPARTMENTS.flatMap(d => d.types);
              const unknown = equipment.filter(e => !knownTypes.includes(e.type));
              if (unknown.length === 0) return null;
              return (
                <div>
                  <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border bg-zinc-800/40 border-zinc-700">
                    <span className="font-bold text-sm text-zinc-400">Прочее</span>
                    <span className="text-zinc-500 text-xs">{unknown.length} ед.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unknown.map(eq => <EquipmentCard key={eq.id} eq={eq} badgeClass="" />)}
                  </div>
                </div>
              );
            })()}
          </div>
        )
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать оборудование' : 'Новое оборудование'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Код</label>
              <Input
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="LT-1"
                className="bg-zinc-900 border-zinc-700 font-mono"
              />
              <p className="text-xs text-zinc-500">Используется в номерах партий и документов</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Название</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Плоскоткацкий станок №1"
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
                  {DEPARTMENTS.map(dept => (
                    <div key={dept.name}>
                      <div className="px-2 py-1 text-xs text-zinc-500 font-semibold uppercase tracking-wide">
                        {dept.name}
                      </div>
                      {EQUIPMENT_TYPES.filter(t => dept.types.includes(t.value)).map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </div>
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
