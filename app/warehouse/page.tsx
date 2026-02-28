'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

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
        .select('name, current_balance, min_stock, unit, type')
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
          {rawMaterials.map((material) => {
            const isCritical = material.min_stock > 0 && material.current_balance <= material.min_stock;
            return (
              <div
                key={material.name}
                className={`rounded-xl p-5 border-2 ${
                  isCritical
                    ? 'bg-gradient-to-br from-red-900/30 to-red-950/30 border-red-700 animate-pulse'
                    : 'bg-gradient-to-br from-orange-900/20 to-orange-950/20 border-orange-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-bold uppercase ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>
                    {material.name}
                  </p>
                  {isCritical && <AlertTriangle size={16} className="text-red-400" />}
                </div>
                <p className={`text-3xl font-bold mb-1 ${isCritical ? 'text-red-300' : 'text-white'}`}>
                  {material.current_balance.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{material.unit || 'кг'}</p>
                  {isCritical && (
                    <p className="text-[10px] text-red-400 font-medium">
                      мин: {material.min_stock}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
