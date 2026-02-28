'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Plus, Trash2, Calendar, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';

function getToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const MAINTENANCE_TYPES = [
  { value: 'maintenance', label: 'ТО', color: 'bg-blue-600' },
  { value: 'repair', label: 'Ремонт', color: 'bg-red-600' },
  { value: 'inspection', label: 'Осмотр', color: 'bg-green-600' },
];

const SHIFTS = [
  { value: 'day', label: '☀️ День' },
  { value: 'night', label: '🌙 Ночь' },
];

type PartUsed = { name: string; quantity: string; unit: string; cost: string };

type Equipment = { id: string; name: string; code: string; type: string; is_active: boolean };
type Employee = { id: string; full_name: string };
type MaintenanceRecord = {
  id: string;
  date: string;
  maintenance_type: string;
  description: string;
  performed_by_name: string;
  shift: string;
  downtime_hours: number;
  parts_used: PartUsed[];
  total_cost: number;
  status: string;
  notes: string;
  created_at: string;
  equipment: { name: string; code: string } | null;
};

function ButtonGroup({
  label, required, options, value, onChange, accentColor = 'blue',
}: {
  label: string; required?: boolean;
  options: { value: string; label: string; color?: string }[];
  value: string; onChange: (v: string) => void;
  accentColor?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          const colorClass = opt.color || (accentColor === 'blue' ? 'bg-blue-600' : 'bg-zinc-600');
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? `${colorClass} text-white border-transparent`
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MaintenancePage({
  equipmentType,
  title,
  icon: Icon = Wrench,
}: {
  equipmentType: string;
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [date, setDate] = useState(getToday());
  const [equipmentId, setEquipmentId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [shift, setShift] = useState('day');
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [downtimeHours, setDowntimeHours] = useState('');
  const [notes, setNotes] = useState('');
  const [parts, setParts] = useState<PartUsed[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: equipData },
      { data: empData },
      { data: maintenanceData },
    ] = await Promise.all([
      supabase
        .from('equipment')
        .select('id, name, code, type, is_active')
        .eq('type', equipmentType)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('employees')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name'),
      supabase
        .from('equipment_maintenance')
        .select('*, equipment(name, code)')
        .in('equipment_id', (await supabase.from('equipment').select('id').eq('type', equipmentType)).data?.map(e => e.id) || [])
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setEquipment(equipData || []);
    setEmployees(empData || []);
    setRecords((maintenanceData as MaintenanceRecord[]) || []);
    setLoading(false);
  };

  const addPart = () => {
    setParts([...parts, { name: '', quantity: '1', unit: 'шт', cost: '0' }]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof PartUsed, value: string) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const totalCost = parts.reduce((sum, p) => sum + (parseFloat(p.cost) || 0) * (parseFloat(p.quantity) || 0), 0);

  const resetForm = () => {
    setEquipmentId('');
    setMaintenanceType('');
    setDescription('');
    setPerformedBy('');
    setDowntimeHours('');
    setNotes('');
    setParts([]);
  };

  const handleSubmit = async () => {
    if (!equipmentId) { toast.error('Выберите оборудование'); return; }
    if (!maintenanceType) { toast.error('Выберите тип работы'); return; }
    if (!description.trim()) { toast.error('Введите описание работ'); return; }

    setSubmitting(true);
    try {
      const employee = employees.find(e => e.id === performedBy);

      const { error } = await supabase.from('equipment_maintenance').insert({
        equipment_id: equipmentId,
        date,
        maintenance_type: maintenanceType,
        description: description.trim(),
        performed_by: performedBy || null,
        performed_by_name: employee?.full_name || null,
        shift,
        downtime_hours: parseFloat(downtimeHours) || 0,
        parts_used: parts.filter(p => p.name.trim()),
        total_cost: totalCost,
        status: 'completed',
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast.success('Запись добавлена', {
        description: `${MAINTENANCE_TYPES.find(t => t.value === maintenanceType)?.label} — ${equipment.find(e => e.id === equipmentId)?.name}`,
      });

      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error('Ошибка сохранения', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    const { error } = await supabase.from('equipment_maintenance').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Запись удалена');
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const typeLabel = (type: string) => MAINTENANCE_TYPES.find(t => t.value === type)?.label || type;
  const typeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return 'bg-blue-900/50 text-blue-400 border-blue-800';
      case 'repair': return 'bg-red-900/50 text-red-400 border-red-800';
      case 'inspection': return 'bg-green-900/50 text-green-400 border-green-800';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  // Stats
  const thisMonth = records.filter(r => r.date?.startsWith(getToday().substring(0, 7)));
  const totalDowntime = thisMonth.reduce((s, r) => s + (r.downtime_hours || 0), 0);
  const totalPartsCost = thisMonth.reduce((s, r) => s + (r.total_cost || 0), 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64 text-zinc-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Шапка */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <Icon size={28} className="text-blue-500" />
            {title}
          </h1>
          <p className="page-description">Журнал обслуживания и ремонта оборудования</p>
        </div>
        <div className="stats-container">
          <div className="stat-card">
            <p className="stat-label">За месяц</p>
            <p className="stat-value text-blue-400">{thisMonth.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Простои (ч)</p>
            <p className="stat-value text-yellow-400">{totalDowntime.toFixed(1)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Затраты (₸)</p>
            <p className="stat-value text-red-400">{totalPartsCost.toLocaleString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* Кнопка добавления */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            showForm
              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {showForm ? <ChevronUp size={18} /> : <Plus size={18} />}
          {showForm ? 'Свернуть форму' : 'Добавить запись'}
        </button>
      </div>

      {/* Форма */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8 space-y-5">

          {/* Дата и смена */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar size={14} className="inline mr-1" /> Дата <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              />
            </div>
            <ButtonGroup
              label="Смена"
              options={SHIFTS}
              value={shift}
              onChange={setShift}
            />
          </div>

          {/* Оборудование */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Оборудование <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {equipment.map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setEquipmentId(eq.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    equipmentId === eq.id
                      ? 'bg-blue-600 text-white border-transparent'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {eq.name}
                </button>
              ))}
            </div>
          </div>

          {/* Тип работы */}
          <ButtonGroup
            label="Тип работы"
            required
            options={MAINTENANCE_TYPES}
            value={maintenanceType}
            onChange={setMaintenanceType}
          />

          {/* Исполнитель */}
          <div>
            <label className="block text-sm font-medium mb-2">Исполнитель</label>
            <select
              value={performedBy}
              onChange={e => setPerformedBy(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            >
              <option value="">Не указан</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Описание работ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Что было сделано..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Время простоя */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock size={14} className="inline mr-1" /> Время простоя (часы)
            </label>
            <input
              type="number"
              value={downtimeHours}
              onChange={e => setDowntimeHours(e.target.value)}
              min="0"
              step="0.5"
              placeholder="0"
              className="w-32 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            />
          </div>

          {/* Запчасти и расходники */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Запчасти и расходники</label>
              <button
                type="button"
                onClick={addPart}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus size={14} /> Добавить
              </button>
            </div>
            {parts.length > 0 ? (
              <div className="space-y-2">
                {parts.map((part, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px_100px_32px] gap-2 items-center">
                    <input
                      placeholder="Название"
                      value={part.name}
                      onChange={e => updatePart(i, 'name', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Кол-во"
                      value={part.quantity}
                      onChange={e => updatePart(i, 'quantity', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                    <input
                      placeholder="Ед."
                      value={part.unit}
                      onChange={e => updatePart(i, 'unit', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Цена ₸"
                      value={part.cost}
                      onChange={e => updatePart(i, 'cost', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePart(i)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {totalCost > 0 && (
                  <p className="text-sm text-zinc-400 text-right mt-1">
                    Итого: <span className="text-white font-bold">{totalCost.toLocaleString('ru-RU')} ₸</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Нет добавленных запчастей</p>
            )}
          </div>

          {/* Примечания */}
          <div>
            <label className="block text-sm font-medium mb-2">Примечания</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            />
          </div>

          {/* Кнопка сохранения */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white font-bold rounded-xl text-lg transition-all"
          >
            {submitting ? 'Сохранение...' : 'Сохранить запись'}
          </button>
        </div>
      )}

      {/* Журнал записей */}
      <div>
        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">
          Последние записи
        </p>

        {records.length === 0 ? (
          <div className="empty-state">
            <Wrench size={32} className="mx-auto mb-3 opacity-30" />
            <p>Нет записей обслуживания</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Верхняя строка: тип + оборудование + дата */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${typeColor(record.maintenance_type)}`}>
                        {typeLabel(record.maintenance_type)}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {record.equipment?.name || '—'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {record.equipment?.code}
                      </span>
                      <span className="text-xs text-zinc-500 ml-auto">
                        {new Date(record.date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    {/* Описание */}
                    <p className="text-sm text-zinc-300 mb-2">{record.description}</p>

                    {/* Детали */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {record.performed_by_name && (
                        <span>Исполнитель: <span className="text-zinc-300">{record.performed_by_name}</span></span>
                      )}
                      {record.downtime_hours > 0 && (
                        <span>Простой: <span className="text-yellow-400">{record.downtime_hours} ч</span></span>
                      )}
                      {record.total_cost > 0 && (
                        <span>Затраты: <span className="text-red-400">{record.total_cost.toLocaleString('ru-RU')} ₸</span></span>
                      )}
                      {record.shift && (
                        <span>Смена: {record.shift === 'day' ? 'День' : 'Ночь'}</span>
                      )}
                    </div>

                    {/* Запчасти */}
                    {record.parts_used && record.parts_used.length > 0 && record.parts_used.some(p => p.name) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {record.parts_used.filter(p => p.name).map((p, i) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                            {p.name} ×{p.quantity}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Примечания */}
                    {record.notes && (
                      <p className="text-xs text-zinc-600 mt-1 italic">{record.notes}</p>
                    )}
                  </div>

                  {/* Кнопка удаления */}
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
