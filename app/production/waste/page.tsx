'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Package, Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';

const WORKSHOPS = [
  { value: 'extrusion', label: 'Экструзия' },
  { value: 'weaving', label: 'Ткачество' },
  { value: 'lamination', label: 'Ламинация' },
  { value: 'straps', label: 'Стропы' },
  { value: 'cutting', label: 'Крой' },
  { value: 'sewing', label: 'Пошив' },
  { value: 'printing', label: 'Печать' },
  { value: 'qc', label: 'ОТК' },
];

const UNITS = [
  { value: 'kg', label: 'кг' },
  { value: 'meters', label: 'м' },
  { value: 'pieces', label: 'шт' },
  { value: 'rolls', label: 'рул' },
];

const DEFECT_TYPES = [
  { value: 'visual', label: 'Визуальный' },
  { value: 'size', label: 'Размер' },
  { value: 'strength', label: 'Прочность' },
  { value: 'color', label: 'Цвет' },
  { value: 'contamination', label: 'Загрязнение' },
  { value: 'mechanical', label: 'Мех. повреждение' },
  { value: 'other', label: 'Другое' },
];

const WASTE_TYPES = [
  { value: 'trim', label: 'Обрезки' },
  { value: 'yarn', label: 'Нить' },
  { value: 'fabric', label: 'Ткань' },
  { value: 'film', label: 'Пленка' },
  { value: 'thread', label: 'Нитки' },
  { value: 'other', label: 'Другое' },
];

function getToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const emptyWasteForm = {
  date: getToday(),
  workshop: '',
  material_type: '',
  material_description: '',
  quantity: '',
  unit: 'kg',
  reason: '',
  notes: '',
};

const emptyDefectForm = {
  date: getToday(),
  workshop: '',
  material_type: '',
  material_description: '',
  quantity: '',
  unit: 'pieces',
  defect_type: '',
  reason: '',
  notes: '',
};

// Компонент группы кнопок
function ButtonGroup({
  label,
  required,
  options,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accentColor: 'orange' | 'red';
}) {
  const activeClass =
    accentColor === 'orange'
      ? 'bg-orange-600 border-orange-500 text-white'
      : 'bg-red-600 border-red-500 text-white';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value === value ? '' : opt.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              value === opt.value
                ? activeClass
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WastePage() {
  const [activeTab, setActiveTab] = useState<'waste' | 'defect'>('waste');
  const [wasteForm, setWasteForm] = useState(emptyWasteForm);
  const [defectForm, setDefectForm] = useState(emptyDefectForm);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ wasteTotal: 0, defectTotal: 0, todayWaste: 0, todayDefect: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const todayStr = getToday();
    const [{ count: wasteTotal }, { count: defectTotal }, { count: todayWaste }, { count: todayDefect }] =
      await Promise.all([
        supabase.from('waste_materials').select('*', { count: 'exact', head: true }),
        supabase.from('defect_materials').select('*', { count: 'exact', head: true }),
        supabase.from('waste_materials').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('defect_materials').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
      ]);
    setStats({ wasteTotal: wasteTotal || 0, defectTotal: defectTotal || 0, todayWaste: todayWaste || 0, todayDefect: todayDefect || 0 });
  };

  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteForm.workshop || !wasteForm.material_type || !wasteForm.quantity) {
      toast.warning('Заполните обязательные поля: цех, тип отхода, количество');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('waste_materials').insert([{
        created_at: wasteForm.date + 'T12:00:00',
        workshop: wasteForm.workshop,
        material_type: wasteForm.material_type,
        material_description: wasteForm.material_description,
        quantity: parseFloat(wasteForm.quantity),
        unit: wasteForm.unit,
        reason: wasteForm.reason,
        notes: wasteForm.notes,
      }]);
      if (error) throw error;
      const wLabel = WASTE_TYPES.find(t => t.value === wasteForm.material_type)?.label || wasteForm.material_type;
      const uLabel = UNITS.find(u => u.value === wasteForm.unit)?.label || wasteForm.unit;
      toast.success('Отход зарегистрирован', { description: `${wLabel} — ${wasteForm.quantity} ${uLabel}` });
      setWasteForm({ ...emptyWasteForm, date: wasteForm.date });
      fetchStats();
    } catch (err: any) {
      toast.error('Ошибка', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectForm.workshop || !defectForm.material_type || !defectForm.quantity || !defectForm.defect_type) {
      toast.warning('Заполните обязательные поля: цех, материал, тип дефекта, количество');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('defect_materials').insert([{
        created_at: defectForm.date + 'T12:00:00',
        workshop: defectForm.workshop,
        material_type: defectForm.material_type,
        material_description: defectForm.material_description,
        quantity: parseFloat(defectForm.quantity),
        unit: defectForm.unit,
        defect_type: defectForm.defect_type,
        reason: defectForm.reason,
        notes: defectForm.notes,
      }]);
      if (error) throw error;
      const uLabel = UNITS.find(u => u.value === defectForm.unit)?.label || defectForm.unit;
      toast.success('Брак зарегистрирован', { description: `${defectForm.material_type} — ${defectForm.quantity} ${uLabel}` });
      setDefectForm({ ...emptyDefectForm, date: defectForm.date });
      fetchStats();
    } catch (err: any) {
      toast.error('Ошибка', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Заголовок */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-yellow-600 p-2 rounded-lg inline-flex items-center justify-center">
              <AlertTriangle size={24} className="text-white" />
            </div>
            Отходы и брак
          </h1>
          <p className="page-description">Регистрация производственных отходов и бракованной продукции</p>
        </div>
        <Link
          href="/production/waste/journal"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-yellow-600 text-zinc-300 hover:text-yellow-400 rounded-lg transition-all text-sm font-medium"
        >
          <BookOpen size={16} />
          Журнал записей
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Отходов сегодня</div>
          <div className="text-2xl font-bold text-orange-400">{stats.todayWaste}</div>
          <div className="text-xs text-zinc-600 mt-1">всего: {stats.wasteTotal}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Брак сегодня</div>
          <div className="text-2xl font-bold text-red-400">{stats.todayDefect}</div>
          <div className="text-xs text-zinc-600 mt-1">всего: {stats.defectTotal}</div>
        </div>
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Подсказка</div>
          <p className="text-xs text-zinc-400">
            <span className="text-orange-400 font-medium">Отходы</span> — обрезки, остатки материалов.{' '}
            <span className="text-red-400 font-medium">Брак</span> — изделия или полуфабрикаты с дефектами.
          </p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
            activeTab === 'waste'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Trash2 size={16} />
          Отходы
        </button>
        <button
          onClick={() => setActiveTab('defect')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
            activeTab === 'defect'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <AlertTriangle size={16} />
          Брак
        </button>
      </div>

      {/* Форма: Отходы */}
      {activeTab === 'waste' && (
        <div className="max-w-2xl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-6">
              <Plus size={20} className="text-orange-400" />
              Зарегистрировать отход
            </h2>

            <form onSubmit={handleAddWaste} className="space-y-5">

              {/* Дата */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Дата <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={wasteForm.date}
                  onChange={(e) => setWasteForm({ ...wasteForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Цех */}
              <ButtonGroup
                label="Цех"
                required
                options={WORKSHOPS}
                value={wasteForm.workshop}
                onChange={(v) => setWasteForm({ ...wasteForm, workshop: v })}
                accentColor="orange"
              />

              {/* Тип отхода */}
              <ButtonGroup
                label="Тип отхода"
                required
                options={WASTE_TYPES}
                value={wasteForm.material_type}
                onChange={(v) => setWasteForm({ ...wasteForm, material_type: v })}
                accentColor="orange"
              />

              {/* Описание */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Описание материала</label>
                <input
                  type="text"
                  value={wasteForm.material_description}
                  onChange={(e) => setWasteForm({ ...wasteForm, material_description: e.target.value })}
                  placeholder="Артикул, цвет, марка..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Количество + Единица */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Количество <span className="text-red-400">*</span></label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wasteForm.quantity}
                    onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                  <div className="flex gap-1.5">
                    {UNITS.map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setWasteForm({ ...wasteForm, unit: u.value })}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          wasteForm.unit === u.value
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Причина */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Причина образования</label>
                <input
                  type="text"
                  value={wasteForm.reason}
                  onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                  placeholder="Обрезка при настройке, производственный остаток..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Примечания */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Примечания</label>
                <textarea
                  value={wasteForm.notes}
                  onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                  placeholder="Дополнительная информация..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Package size={18} />
                {loading ? 'Сохранение...' : 'Зарегистрировать отход'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Форма: Брак */}
      {activeTab === 'defect' && (
        <div className="max-w-2xl">
          <div className="bg-zinc-900 border border-red-900/40 rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-6">
              <AlertTriangle size={20} className="text-red-400" />
              Зарегистрировать брак
            </h2>

            <form onSubmit={handleAddDefect} className="space-y-5">

              {/* Дата */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Дата <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={defectForm.date}
                  onChange={(e) => setDefectForm({ ...defectForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* Цех */}
              <ButtonGroup
                label="Цех"
                required
                options={WORKSHOPS}
                value={defectForm.workshop}
                onChange={(v) => setDefectForm({ ...defectForm, workshop: v })}
                accentColor="red"
              />

              {/* Тип дефекта */}
              <ButtonGroup
                label="Тип дефекта"
                required
                options={DEFECT_TYPES}
                value={defectForm.defect_type}
                onChange={(v) => setDefectForm({ ...defectForm, defect_type: v })}
                accentColor="red"
              />

              {/* Материал / Изделие */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Материал / Изделие <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={defectForm.material_type}
                  onChange={(e) => setDefectForm({ ...defectForm, material_type: e.target.value })}
                  placeholder="Нить, ткань, мешок, вкладыш..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* Описание */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Описание</label>
                <input
                  type="text"
                  value={defectForm.material_description}
                  onChange={(e) => setDefectForm({ ...defectForm, material_description: e.target.value })}
                  placeholder="Артикул, размер, цвет..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Количество + Единица */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Количество <span className="text-red-400">*</span></label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defectForm.quantity}
                    onChange={(e) => setDefectForm({ ...defectForm, quantity: e.target.value })}
                    placeholder="0"
                    className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    required
                  />
                  <div className="flex gap-1.5">
                    {UNITS.map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setDefectForm({ ...defectForm, unit: u.value })}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          defectForm.unit === u.value
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Причина */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Причина брака</label>
                <input
                  type="text"
                  value={defectForm.reason}
                  onChange={(e) => setDefectForm({ ...defectForm, reason: e.target.value })}
                  placeholder="Нарушение технологии, ошибка оператора..."
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Примечания */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Примечания</label>
                <textarea
                  value={defectForm.notes}
                  onChange={(e) => setDefectForm({ ...defectForm, notes: e.target.value })}
                  placeholder="Дополнительная информация..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                {loading ? 'Сохранение...' : 'Зарегистрировать брак'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
