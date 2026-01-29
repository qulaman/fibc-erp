'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KPICard from "@/components/reports/KPICard";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Warehouse,
  Factory,
  Grid3x3,
  Layers,
  Ribbon,
  Scissors,
  CheckCircle2,
  Download,
  Users,
  Clock
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DepartmentData {
  date: string;
  value: number;
  unit: string;
}

interface QualityStats {
  totalGood: number;
  totalDefect: number;
  defectRate: number;
}

interface WarehouseItem {
  name: string;
  balance: number;
  unit: string;
  status: 'ok' | 'low' | 'critical';
}

interface TopOperator {
  name: string;
  department: string;
  total: number;
  unit: string;
}

const PERIOD_OPTIONS = [
  { label: 'Сегодня', days: 0 },
  { label: 'Вчера', days: 1 },
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
];

export default function ReportsPage() {
  const { profile, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  const [extrusionData, setExtrusionData] = useState<DepartmentData[]>([]);
  const [weavingData, setWeavingData] = useState<DepartmentData[]>([]);
  const [laminationData, setLaminationData] = useState<DepartmentData[]>([]);
  const [strapsData, setStrapsData] = useState<DepartmentData[]>([]);
  const [sewingData, setSewingData] = useState<DepartmentData[]>([]);

  const [qualityStats, setQualityStats] = useState<QualityStats>({
    totalGood: 0,
    totalDefect: 0,
    defectRate: 0,
  });

  const [warehouseData, setWarehouseData] = useState<WarehouseItem[]>([]);
  const [topOperators, setTopOperators] = useState<TopOperator[]>([]);

  useEffect(() => {
    if (!hasRole(['admin', 'manager'])) {
      alert('Доступ запрещен. Требуются права администратора или менеджера.');
      window.location.href = '/';
      return;
    }

    fetchReportsData();
  }, [period, hasRole]);

  const fetchReportsData = async () => {
    setLoading(true);

    const startDate = period === 0
      ? startOfDay(new Date())
      : startOfDay(subDays(new Date(), period));
    const endDate = endOfDay(new Date());

    await Promise.all([
      fetchExtrusionData(startDate, endDate),
      fetchWeavingData(startDate, endDate),
      fetchLaminationData(startDate, endDate),
      fetchStrapsData(startDate, endDate),
      fetchSewingData(startDate, endDate),
      fetchQualityStats(startDate, endDate),
      fetchWarehouseData(),
      fetchTopOperators(startDate, endDate),
    ]);

    setLoading(false);
  };

  const generateDateRange = (startDate: Date, endDate: Date) => {
    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const fetchExtrusionData = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('production_extrusion')
        .select('date, output_weight_net')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      const dates = generateDateRange(startDate, endDate);
      const grouped: { [key: string]: number } = {};

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        grouped[dateStr] = 0;
      });

      (data || []).forEach(record => {
        grouped[record.date] = (grouped[record.date] || 0) + (record.output_weight_net || 0);
      });

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: ru }),
        value: Math.round(value as number),
        unit: 'кг',
      }));

      setExtrusionData(chartData);
    } catch (error) {
      console.error('Error fetching extrusion data:', error);
      setExtrusionData([]);
    }
  };

  const fetchWeavingData = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('production_weaving')
        .select('date, produced_weight')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      const dates = generateDateRange(startDate, endDate);
      const grouped: { [key: string]: number } = {};

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        grouped[dateStr] = 0;
      });

      (data || []).forEach(record => {
        grouped[record.date] = (grouped[record.date] || 0) + (record.produced_weight || 0);
      });

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: ru }),
        value: Math.round(value as number),
        unit: 'кг',
      }));

      setWeavingData(chartData);
    } catch (error) {
      console.error('Error fetching weaving data:', error);
      setWeavingData([]);
    }
  };

  const fetchLaminationData = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('production_lamination')
        .select('date, output_weight')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      const dates = generateDateRange(startDate, endDate);
      const grouped: { [key: string]: number } = {};

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        grouped[dateStr] = 0;
      });

      (data || []).forEach(record => {
        grouped[record.date] = (grouped[record.date] || 0) + (record.output_weight || 0);
      });

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: ru }),
        value: Math.round(value as number),
        unit: 'кг',
      }));

      setLaminationData(chartData);
    } catch (error) {
      console.error('Error fetching lamination data:', error);
      setLaminationData([]);
    }
  };

  const fetchStrapsData = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('production_straps')
        .select('date, produced_weight')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      const dates = generateDateRange(startDate, endDate);
      const grouped: { [key: string]: number } = {};

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        grouped[dateStr] = 0;
      });

      (data || []).forEach(record => {
        grouped[record.date] = (grouped[record.date] || 0) + (record.produced_weight || 0);
      });

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: ru }),
        value: Math.round(value as number),
        unit: 'кг',
      }));

      setStrapsData(chartData);
    } catch (error) {
      console.error('Error fetching straps data:', error);
      setStrapsData([]);
    }
  };

  const fetchSewingData = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('production_sewing')
        .select('date, quantity')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      const dates = generateDateRange(startDate, endDate);
      const grouped: { [key: string]: number } = {};

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        grouped[dateStr] = 0;
      });

      (data || []).forEach(record => {
        grouped[record.date] = (grouped[record.date] || 0) + (record.quantity || 0);
      });

      const chartData = Object.entries(grouped).map(([date, value]) => ({
        date: format(parseISO(date), 'dd MMM', { locale: ru }),
        value: value as number,
        unit: 'шт',
      }));

      setSewingData(chartData);
    } catch (error) {
      console.error('Error fetching sewing data:', error);
      setSewingData([]);
    }
  };

  const fetchQualityStats = async (startDate: Date, endDate: Date) => {
    try {
      const { data } = await supabase
        .from('qc_inspections')
        .select('quantity_good, quantity_defect')
        .gte('inspection_date', startDate.toISOString().split('T')[0])
        .lte('inspection_date', endDate.toISOString().split('T')[0]);

      const totalGood = (data || []).reduce((sum, r) => sum + (r.quantity_good || 0), 0);
      const totalDefect = (data || []).reduce((sum, r) => sum + (r.quantity_defect || 0), 0);
      const defectRate = totalGood + totalDefect > 0
        ? (totalDefect / (totalGood + totalDefect)) * 100
        : 0;

      setQualityStats({
        totalGood,
        totalDefect,
        defectRate: parseFloat(defectRate.toFixed(2)),
      });
    } catch (error) {
      console.error('Error fetching quality stats:', error);
    }
  };

  const fetchWarehouseData = async () => {
    try {
      const [yarn, fabricRolls, laminatedRolls, straps, sewn] = await Promise.all([
        supabase.from('yarn_inventory').select('quantity_kg').gt('quantity_kg', 0),
        supabase.from('weaving_rolls').select('total_weight').eq('status', 'completed'),
        supabase.from('laminated_rolls').select('weight').eq('status', 'available'),
        supabase.from('straps_warehouse').select('weight').in('status', ['available', 'in_stock']),
        supabase.from('view_sewn_products_balance').select('balance'),
      ]);

      const items: WarehouseItem[] = [];

      // Нить (ПП)
      const yarnTotal = (yarn.data || []).reduce((sum, r) => sum + (r.quantity_kg || 0), 0);
      items.push({
        name: 'Нить (ПП)',
        balance: Math.round(yarnTotal),
        unit: 'кг',
        status: yarnTotal < 1000 ? 'critical' : yarnTotal < 3000 ? 'low' : 'ok',
      });

      const fabricTotal = (fabricRolls.data || []).reduce((sum, r) => sum + (r.total_weight || 0), 0);
      if (fabricTotal > 0 || fabricRolls.data?.length === 0) {
        items.push({
          name: 'Ткань',
          balance: Math.round(fabricTotal),
          unit: 'кг',
          status: fabricTotal < 500 ? 'critical' : fabricTotal < 1500 ? 'low' : 'ok',
        });
      }

      const laminatedTotal = (laminatedRolls.data || []).reduce((sum, r) => sum + (r.weight || 0), 0);
      if (laminatedTotal > 0 || laminatedRolls.data?.length === 0) {
        items.push({
          name: 'Ламинированная ткань',
          balance: Math.round(laminatedTotal),
          unit: 'кг',
          status: laminatedTotal < 300 ? 'critical' : laminatedTotal < 1000 ? 'low' : 'ok',
        });
      }

      const strapsTotal = (straps.data || []).reduce((sum, r) => sum + (r.weight || 0), 0);
      if (strapsTotal > 0 || straps.data?.length === 0) {
        items.push({
          name: 'Стропы',
          balance: Math.round(strapsTotal),
          unit: 'кг',
          status: strapsTotal < 200 ? 'critical' : strapsTotal < 600 ? 'low' : 'ok',
        });
      }

      const sewnTotal = (sewn.data || []).reduce((sum, r) => sum + (r.balance || 0), 0);
      items.push({
        name: 'Готовая продукция',
        balance: sewnTotal,
        unit: 'шт',
        status: sewnTotal < 50 ? 'critical' : sewnTotal < 150 ? 'low' : 'ok',
      });

      setWarehouseData(items);
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
    }
  };

  const fetchTopOperators = async (startDate: Date, endDate: Date) => {
    try {
      const { data: sewingData } = await supabase
        .from('production_sewing')
        .select(`
          quantity,
          employees:shift_master_id (full_name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const operatorTotals: { [key: string]: number } = {};

      (sewingData || []).forEach(record => {
        const name = record.employees?.full_name || 'Неизвестно';
        operatorTotals[name] = (operatorTotals[name] || 0) + (record.quantity || 0);
      });

      const top = Object.entries(operatorTotals)
        .map(([name, total]) => ({
          name,
          department: 'Пошив',
          total,
          unit: 'шт',
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setTopOperators(top);
    } catch (error) {
      console.error('Error fetching top operators:', error);
    }
  };

  const getTotalProduction = () => {
    const extTotal = extrusionData.reduce((sum, d) => sum + d.value, 0);
    const weavTotal = weavingData.reduce((sum, d) => sum + d.value, 0);
    const lamTotal = laminationData.reduce((sum, d) => sum + d.value, 0);
    const strapTotal = strapsData.reduce((sum, d) => sum + d.value, 0);
    return Math.round(extTotal + weavTotal + lamTotal + strapTotal);
  };

  const getCombinedChartData = () => {
    const combined: { [key: string]: any } = {};

    extrusionData.forEach(d => {
      if (!combined[d.date]) combined[d.date] = { date: d.date };
      combined[d.date].Экструзия = d.value;
    });

    weavingData.forEach(d => {
      if (!combined[d.date]) combined[d.date] = { date: d.date };
      combined[d.date].Ткачество = d.value;
    });

    laminationData.forEach(d => {
      if (!combined[d.date]) combined[d.date] = { date: d.date };
      combined[d.date].Ламинация = d.value;
    });

    strapsData.forEach(d => {
      if (!combined[d.date]) combined[d.date] = { date: d.date };
      combined[d.date].Стропы = d.value;
    });

    return Object.values(combined);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-500">Загрузка отчетов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
            Отчеты и Аналитика
          </h1>
          <p className="page-description">Производство, качество и складские остатки</p>
        </div>
      </div>

      {/* Фильтр периода */}
      <div className="mb-6 flex gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.days}
            variant={period === option.days ? "default" : "outline"}
            onClick={() => setPeriod(option.days)}
            className={period === option.days ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* KPI Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Произведено (кг)"
          value={getTotalProduction().toLocaleString('ru-RU')}
          subtitle={`За ${period === 0 ? 'сегодня' : period === 1 ? 'вчера' : `последние ${period} дней`}`}
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Готовая продукция"
          value={sewingData.reduce((sum, d) => sum + d.value, 0).toLocaleString('ru-RU')}
          subtitle="МКР изготовлено"
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Процент брака"
          value={`${qualityStats.defectRate}%`}
          subtitle={`${qualityStats.totalDefect} из ${qualityStats.totalGood + qualityStats.totalDefect} шт`}
          icon={AlertTriangle}
          color={qualityStats.defectRate > 5 ? "red" : qualityStats.defectRate > 2 ? "yellow" : "green"}
        />
        <KPICard
          title="Критичные остатки"
          value={warehouseData.filter(w => w.status === 'critical').length}
          subtitle="Требуют пополнения"
          icon={Warehouse}
          color="red"
        />
      </div>

      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            <TrendingUp size={16} className="mr-2" />
            Общий обзор
          </TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-blue-600">
            <Factory size={16} className="mr-2" />
            По цехам
          </TabsTrigger>
          <TabsTrigger value="warehouse" className="data-[state=active]:bg-blue-600">
            <Warehouse size={16} className="mr-2" />
            Склады
          </TabsTrigger>
        </TabsList>

        {/* Общий обзор */}
        <TabsContent value="overview" className="space-y-6">
          {/* Основной график производства */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">Динамика производства</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={getCombinedChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Экструзия" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Ткачество" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Ламинация" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Стропы" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Топ операторов */}
          {topOperators.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users size={20} />
                  Топ мастеров смены
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topOperators.map((op, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{op.name}</div>
                        <div className="text-xs text-zinc-500">{op.department}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{op.total.toLocaleString('ru-RU')}</div>
                        <div className="text-xs text-zinc-500">{op.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* По цехам */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Экструзия */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Factory size={20} className="text-blue-400" />
                  Экструзия
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white">
                    {extrusionData.reduce((s, d) => s + d.value, 0).toLocaleString('ru-RU')} кг
                  </div>
                  <div className="text-sm text-zinc-500">Всего за период</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={extrusionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ткачество */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Grid3x3 size={20} className="text-green-400" />
                  Ткачество
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white">
                    {weavingData.reduce((s, d) => s + d.value, 0).toLocaleString('ru-RU')} кг
                  </div>
                  <div className="text-sm text-zinc-500">Всего за период</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weavingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ламинация */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers size={20} className="text-purple-400" />
                  Ламинация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white">
                    {laminationData.reduce((s, d) => s + d.value, 0).toLocaleString('ru-RU')} кг
                  </div>
                  <div className="text-sm text-zinc-500">Всего за период</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={laminationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Стропы */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Ribbon size={20} className="text-yellow-400" />
                  Стропы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white">
                    {strapsData.reduce((s, d) => s + d.value, 0).toLocaleString('ru-RU')} кг
                  </div>
                  <div className="text-sm text-zinc-500">Всего за период</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={strapsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Пошив */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package size={20} className="text-cyan-400" />
                  Пошив
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white">
                    {sewingData.reduce((s, d) => s + d.value, 0).toLocaleString('ru-RU')} шт
                  </div>
                  <div className="text-sm text-zinc-500">Всего за период</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sewingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Склады */}
        <TabsContent value="warehouse">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Warehouse size={20} />
                Складские остатки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouseData.map((item, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-lg bg-zinc-950 border-2 border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-zinc-400 text-sm mb-1">{item.name}</div>
                        <div className="text-3xl font-bold text-white">
                          {item.balance.toLocaleString('ru-RU')}
                          <span className="text-lg text-zinc-500 ml-2">{item.unit}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${
                          item.status === 'ok' ? 'text-green-400 border-green-900 bg-green-950/20' :
                          item.status === 'low' ? 'text-yellow-400 border-yellow-900 bg-yellow-950/20' :
                          'text-red-400 border-red-900 bg-red-950/20'
                        } font-semibold`}
                      >
                        {item.status === 'ok' ? '✓ В норме' : item.status === 'low' ? '⚠ Низкий' : '✕ Критично'}
                      </Badge>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          item.status === 'ok' ? 'bg-green-500' :
                          item.status === 'low' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{
                          width: item.status === 'ok' ? '100%' : item.status === 'low' ? '50%' : '20%'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
