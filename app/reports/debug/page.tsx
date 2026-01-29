'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReportsDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    const info: any = {};

    // Экструзия
    const ext = await supabase
      .from('production_extrusion')
      .select('date, weight_kg')
      .order('date', { ascending: false })
      .limit(10);

    info.extrusion = {
      totalRecords: ext.data?.length || 0,
      sample: ext.data || [],
      error: ext.error?.message,
      latestDate: ext.data?.[0]?.date,
    };

    // Ткачество - production_weaving
    const weav = await supabase
      .from('production_weaving')
      .select('date, length_meters, weight_kg')
      .order('date', { ascending: false })
      .limit(10);

    info.weaving_production = {
      totalRecords: weav.data?.length || 0,
      sample: weav.data || [],
      error: weav.error?.message,
      latestDate: weav.data?.[0]?.date,
    };

    // Ткачество - weaving_rolls
    const rolls = await supabase
      .from('weaving_rolls')
      .select('created_at, total_weight, status')
      .order('created_at', { ascending: false })
      .limit(10);

    info.weaving_rolls = {
      totalRecords: rolls.data?.length || 0,
      sample: rolls.data || [],
      error: rolls.error?.message,
      latestDate: rolls.data?.[0]?.created_at,
    };

    // Ламинация
    const lam = await supabase
      .from('production_lamination')
      .select('date, output_weight')
      .order('date', { ascending: false })
      .limit(10);

    info.lamination = {
      totalRecords: lam.data?.length || 0,
      sample: lam.data || [],
      error: lam.error?.message,
      latestDate: lam.data?.[0]?.date,
    };

    // Стропы
    const straps = await supabase
      .from('production_straps')
      .select('date, weight_kg, spec_name')
      .order('date', { ascending: false })
      .limit(10);

    info.straps = {
      totalRecords: straps.data?.length || 0,
      sample: straps.data || [],
      error: straps.error?.message,
      latestDate: straps.data?.[0]?.date,
    };

    // Пошив
    const sew = await supabase
      .from('production_sewing_daily')
      .select('date, quantity')
      .order('date', { ascending: false })
      .limit(10);

    info.sewing = {
      totalRecords: sew.data?.length || 0,
      sample: sew.data || [],
      error: sew.error?.message,
      latestDate: sew.data?.[0]?.date,
    };

    // Склады
    const fabricRolls = await supabase
      .from('weaving_rolls')
      .select('status, total_weight')
      .eq('status', 'completed');

    info.warehouse_fabric = {
      totalRecords: fabricRolls.data?.length || 0,
      totalWeight: fabricRolls.data?.reduce((sum, r) => sum + (r.total_weight || 0), 0),
      error: fabricRolls.error?.message,
    };

    const laminatedRolls = await supabase
      .from('laminated_rolls')
      .select('status, weight')
      .eq('status', 'available');

    info.warehouse_laminated = {
      totalRecords: laminatedRolls.data?.length || 0,
      totalWeight: laminatedRolls.data?.reduce((sum, r) => sum + (r.weight || 0), 0),
      error: laminatedRolls.error?.message,
    };

    const strapsWarehouse = await supabase
      .from('straps_warehouse')
      .select('status, weight_kg');

    info.warehouse_straps = {
      totalRecords: strapsWarehouse.data?.length || 0,
      totalWeight: strapsWarehouse.data?.reduce((sum, r) => sum + (r.weight_kg || 0), 0),
      error: strapsWarehouse.error?.message,
    };

    const sewnView = await supabase
      .from('view_sewn_products_balance')
      .select('balance');

    info.warehouse_sewn = {
      totalRecords: sewnView.data?.length || 0,
      totalBalance: sewnView.data?.reduce((sum, r) => sum + (r.balance || 0), 0),
      error: sewnView.error?.message,
    };

    setDebugInfo(info);
    setLoading(false);
  };

  if (loading) return <div className="page-container">Загрузка диагностики...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="h1-bold">Отладочная информация по отчетам</h1>
      </div>

      <div className="space-y-6">
        {Object.entries(debugInfo).map(([key, value]: [string, any]) => (
          <Card key={key} className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{key}</span>
                <Badge variant={value.error ? "destructive" : "default"}>
                  {value.totalRecords || value.totalWeight || 0} записей
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {value.error && (
                <div className="text-red-400 text-sm">Ошибка: {value.error}</div>
              )}
              {value.latestDate && (
                <div className="text-zinc-400 text-sm">
                  Последняя дата: {value.latestDate}
                </div>
              )}
              {value.totalWeight !== undefined && (
                <div className="text-zinc-400 text-sm">
                  Общий вес: {Math.round(value.totalWeight)} кг
                </div>
              )}
              {value.totalBalance !== undefined && (
                <div className="text-zinc-400 text-sm">
                  Общий остаток: {value.totalBalance} шт
                </div>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-400 text-sm">
                  Посмотреть примеры данных
                </summary>
                <pre className="mt-2 p-4 bg-zinc-950 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(value.sample, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
