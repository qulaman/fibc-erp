'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface WarehouseStat {
  name: string;
  shortName: string;
  href: string;
  positions: number;
  mainMetric: number;
  unit: string;
  color: string;
}

const COLORS = ['#E60012', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

const sum = (arr: any[] | null | undefined, key: string) =>
  (arr || []).reduce((s: number, r: any) => s + (Number(r[key]) || 0), 0);

export default function WarehousePage() {
  const [stats, setStats] = useState<WarehouseStat[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllWarehouseData();
  }, []);

  const fetchAllWarehouseData = async () => {
    try {
      const [
        yarnRes,
        mfnRes,
        fabricRes,
        laminatedRes,
        strapsRes,
        cuttingRes,
        finishedRes,
        rawRes
      ] = await Promise.all([
        supabase.from('yarn_inventory').select('quantity_kg'),
        supabase.from('view_mfn_balance').select('balance_kg'),
        supabase.from('weaving_rolls').select('total_length').eq('status', 'completed').gt('total_length', 0),
        supabase.from('laminated_rolls').select('length').eq('status', 'available').gt('length', 0),
        supabase.from('straps_warehouse').select('length').eq('status', 'available').gt('length', 0),
        supabase.from('cutting_parts_balance').select('balance'),
        supabase.from('view_finished_goods_balance').select('balance'),
        supabase.from('view_material_balances').select('current_balance').neq('type', 'МФН')
      ]);

      // Загружаем детальные данные по сырью
      const { data: rawMaterialsData } = await supabase
        .from('view_material_balances')
        .select('name, current_balance, type')
        .neq('type', 'МФН')
        .gt('current_balance', 0)
        .order('name');

      setRawMaterials(rawMaterialsData || []);

      setStats([
        { name: 'Нить (ПП)',        shortName: 'Нить',    href: '/warehouse/yarn',          positions: yarnRes.data?.length || 0,      mainMetric: sum(yarnRes.data, 'quantity_kg'),      unit: 'кг',       color: COLORS[0] },
        { name: 'МФН',              shortName: 'МФН',     href: '/warehouse/mfn',           positions: mfnRes.data?.length || 0,      mainMetric: sum(mfnRes.data, 'balance_kg'),       unit: 'кг',       color: COLORS[1] },
        { name: 'Ткань',            shortName: 'Ткань',   href: '/warehouse/fabric',        positions: fabricRes.data?.length || 0,   mainMetric: sum(fabricRes.data, 'total_length'),  unit: 'м',        color: COLORS[2] },
        { name: 'Ламинат',          shortName: 'Ламин.',  href: '/warehouse/laminated',     positions: laminatedRes.data?.length || 0, mainMetric: sum(laminatedRes.data, 'length'),    unit: 'м',        color: COLORS[3] },
        { name: 'Стропы',           shortName: 'Стропы',  href: '/warehouse/straps',        positions: strapsRes.data?.length || 0,   mainMetric: sum(strapsRes.data, 'length'),        unit: 'м',        color: COLORS[4] },
        { name: 'Кроеные детали',   shortName: 'Кроеные', href: '/warehouse/cutting-parts', positions: cuttingRes.data?.length || 0,  mainMetric: sum(cuttingRes.data, 'balance'),      unit: 'шт',       color: COLORS[5] },
        { name: 'Готовая продукция',shortName: 'Готовая', href: '/warehouse/finished-goods',positions: finishedRes.data?.length || 0, mainMetric: sum(finishedRes.data, 'balance'),     unit: 'шт',       color: COLORS[6] },
        { name: 'Сырье',            shortName: 'Сырье',   href: '/warehouse/raw-materials', positions: rawRes.data?.length || 0,     mainMetric: rawRes.data?.length || 0,             unit: 'позиций',  color: COLORS[7] },
      ]);
    } catch (err) {
      console.error('Error fetching warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pieData = stats.filter(s => s.positions > 0).map(s => ({ name: s.name, value: s.positions }));

  // Графики по единицам измерения
  const weightData = stats.filter(s => s.unit === 'кг').map(s => ({ name: s.shortName, value: s.mainMetric }));
  const lengthData = stats.filter(s => s.unit === 'м').map(s => ({ name: s.shortName, value: s.mainMetric }));
  const quantityData = stats.filter(s => s.unit === 'шт').map(s => ({ name: s.shortName, value: s.mainMetric }));

  const totalPositions = stats.reduce((s, w) => s + w.positions, 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="text-center py-16 text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Склад</h1>
        <p className="text-zinc-400">Обзор всех складов · {totalPositions} позиций</p>
      </div>

      {/* Карточки складов */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
              <p className="text-sm text-zinc-400 truncate">{stat.name}</p>
            </div>
            <p className="text-2xl font-bold">
              {stat.mainMetric.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.unit} · {stat.positions} поз.</p>
          </Link>
        ))}
      </div>

      {/* Сырье */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          Остатки сырья
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rawMaterials.map((material) => (
            <div key={material.name} className="bg-gradient-to-br from-orange-900/20 to-orange-950/20 border-2 border-orange-800 rounded-xl p-5">
              <p className="text-sm text-orange-400 font-bold mb-2 uppercase">{material.name}</p>
              <p className="text-3xl font-bold text-white mb-1">
                {material.current_balance.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-zinc-500">кг</p>
            </div>
          ))}
        </div>
      </div>

      {/* Графики остатков */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-bold mb-4 uppercase">По весу (кг)</h3>
          <div className="h-64" style={{ minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={weightData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} formatter={(value) => [Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 }), 'кг']} />
                <Bar dataKey="value" fill="#E60012" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-bold mb-4 uppercase">По длине (м)</h3>
          <div className="h-64" style={{ minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={lengthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} formatter={(value) => [Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 }), 'м']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-bold mb-4 uppercase">По количеству (шт)</h3>
          <div className="h-64" style={{ minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={quantityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis stroke="#52525B" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} formatter={(value) => [Number(value).toLocaleString('ru-RU'), 'шт']} />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
