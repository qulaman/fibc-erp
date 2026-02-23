'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Filter, X, ArrowLeft, Trash } from 'lucide-react';
import Link from 'next/link';

interface WasteEntry {
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

interface DefectEntry {
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

const WORKSHOPS: Record<string, string> = {
  extrusion: 'Экструзия',
  weaving: 'Ткачество',
  lamination: 'Ламинация',
  straps: 'Стропы',
  cutting: 'Крой',
  sewing: 'Пошив',
  printing: 'Печать',
  qc: 'ОТК',
};

const DEFECT_TYPES: Record<string, string> = {
  visual: 'Визуальный',
  size: 'Размер',
  strength: 'Прочность',
  color: 'Цвет',
  contamination: 'Загрязнение',
  mechanical: 'Мех. повреждение',
  other: 'Другое',
};

const WASTE_TYPES: Record<string, string> = {
  trim: 'Обрезки',
  yarn: 'Нить',
  fabric: 'Ткань',
  film: 'Пленка',
  thread: 'Нитки',
  other: 'Другое',
};

const UNIT_LABELS: Record<string, string> = {
  kg: 'кг',
  meters: 'м',
  pieces: 'шт',
  rolls: 'рул',
};

export default function WasteJournalPage() {
  const [activeTab, setActiveTab] = useState<'waste' | 'defect'>('waste');
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [defectEntries, setDefectEntries] = useState<DefectEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [filterWorkshop, setFilterWorkshop] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Статистика
  const [stats, setStats] = useState({ wasteTotal: 0, defectTotal: 0 });

  useEffect(() => {
    fetchAll();
  }, [filterWorkshop, filterDateFrom, filterDateTo]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchWaste(), fetchDefects()]);
    setLoading(false);
  };

  const buildQuery = (table: string) => {
    let q = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(300);
    if (filterWorkshop) q = q.eq('workshop', filterWorkshop);
    if (filterDateFrom) q = q.gte('created_at', filterDateFrom);
    if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59');
    return q;
  };

  const fetchWaste = async () => {
    const { data } = await buildQuery('waste_materials');
    const entries = data || [];
    setWasteEntries(entries);
    setStats(prev => ({ ...prev, wasteTotal: entries.length }));
  };

  const fetchDefects = async () => {
    const { data } = await buildQuery('defect_materials');
    const entries = data || [];
    setDefectEntries(entries);
    setStats(prev => ({ ...prev, defectTotal: entries.length }));
  };

  const handleDeleteWaste = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    const { error } = await supabase.from('waste_materials').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Запись удалена');
      fetchWaste();
    }
  };

  const handleDeleteDefect = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    const { error } = await supabase.from('defect_materials').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Запись удалена');
      fetchDefects();
    }
  };

  const hasFilters = filterWorkshop || filterDateFrom || filterDateTo;

  const resetFilters = () => {
    setFilterWorkshop('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-container">
      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/waste">
            <button className="p-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-yellow-600 p-2 rounded-lg inline-flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              Журнал отходов и брака
            </h1>
            <p className="page-description">История всех зарегистрированных отходов и бракованных изделий</p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
            hasFilters
              ? 'bg-yellow-600/20 border-yellow-600 text-yellow-400'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
          }`}
        >
          <Filter size={16} />
          Фильтры
          {hasFilters && (
            <span className="w-5 h-5 bg-yellow-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
              !
            </span>
          )}
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Отходов</div>
          <div className="text-2xl font-bold text-orange-400">{stats.wasteTotal}</div>
          <div className="text-xs text-zinc-600 mt-1">записей</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Брак</div>
          <div className="text-2xl font-bold text-red-400">{stats.defectTotal}</div>
          <div className="text-xs text-zinc-600 mt-1">записей</div>
        </div>
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase mb-1">Итого записей</div>
          <div className="text-2xl font-bold text-white">{stats.wasteTotal + stats.defectTotal}</div>
          <div className="text-xs text-zinc-600 mt-1">
            {hasFilters ? 'по выбранным фильтрам' : 'за всё время'}
          </div>
        </div>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-zinc-300 uppercase tracking-wide">Фильтры</span>
            {hasFilters && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors">
                <X size={12} />
                Сбросить всё
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase">Цех</label>
              <select
                value={filterWorkshop}
                onChange={(e) => setFilterWorkshop(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              >
                <option value="">Все цеха</option>
                {Object.entries(WORKSHOPS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase">Дата с</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase">Дата по</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
            activeTab === 'waste'
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Trash size={16} />
          Отходы
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'waste' ? 'bg-orange-700' : 'bg-zinc-800 text-zinc-500'}`}>
            {stats.wasteTotal}
          </span>
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'defect' ? 'bg-red-700' : 'bg-zinc-800 text-zinc-500'}`}>
            {stats.defectTotal}
          </span>
        </button>
      </div>

      {/* Таблица отходов */}
      {activeTab === 'waste' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Загрузка...</div>
          ) : wasteEntries.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Нет записей об отходах</p>
              {hasFilters && <p className="text-xs mt-1">Попробуйте изменить фильтры</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                    <th className="text-left px-4 py-3 font-medium">Дата</th>
                    <th className="text-left px-4 py-3 font-medium">Цех</th>
                    <th className="text-left px-4 py-3 font-medium">Тип отхода</th>
                    <th className="text-left px-4 py-3 font-medium">Описание</th>
                    <th className="text-right px-4 py-3 font-medium">Кол-во</th>
                    <th className="text-left px-4 py-3 font-medium">Причина</th>
                    <th className="text-left px-4 py-3 font-medium">Примеч.</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {wasteEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap text-xs">{formatDate(entry.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">
                          {WORKSHOPS[entry.workshop] || entry.workshop}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-orange-400 font-medium whitespace-nowrap">
                        {WASTE_TYPES[entry.material_type] || entry.material_type}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">{entry.material_description || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-white font-bold">{entry.quantity}</span>
                        <span className="text-zinc-500 text-xs ml-1">{UNIT_LABELS[entry.unit] || entry.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[160px] truncate">{entry.reason || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[140px] truncate text-xs">{entry.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteWaste(entry.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Таблица брака */}
      {activeTab === 'defect' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Загрузка...</div>
          ) : defectEntries.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
              <p>Нет записей о браке</p>
              {hasFilters && <p className="text-xs mt-1">Попробуйте изменить фильтры</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                    <th className="text-left px-4 py-3 font-medium">Дата</th>
                    <th className="text-left px-4 py-3 font-medium">Цех</th>
                    <th className="text-left px-4 py-3 font-medium">Материал</th>
                    <th className="text-left px-4 py-3 font-medium">Описание</th>
                    <th className="text-right px-4 py-3 font-medium">Кол-во</th>
                    <th className="text-left px-4 py-3 font-medium">Тип дефекта</th>
                    <th className="text-left px-4 py-3 font-medium">Причина</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {defectEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap text-xs">{formatDate(entry.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">
                          {WORKSHOPS[entry.workshop] || entry.workshop}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{entry.material_type}</td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[160px] truncate">{entry.material_description || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-red-400 font-bold">{entry.quantity}</span>
                        <span className="text-zinc-500 text-xs ml-1">{UNIT_LABELS[entry.unit] || entry.unit}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 border border-yellow-800/50 rounded text-xs font-medium">
                          {DEFECT_TYPES[entry.defect_type] || entry.defect_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[180px] truncate">{entry.reason || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteDefect(entry.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
