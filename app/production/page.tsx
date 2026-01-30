'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Grid3x3, Layers, Scissors, Calendar, TrendingUp, ArrowRight } from "lucide-react";

export default function ProductionDashboard() {
  const [stats, setStats] = useState({
    todayProduction: 0,
    activeShifts: 0,
    weavingProduction: 0,
    weavingRolls: 0,
    laminationProduction: 0,
    laminatedRolls: 0,
    strapsProduction: 0,
    strapsRolls: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Производство экструзии за сегодня
    const { data: production } = await supabase
      .from('production_extrusion')
      .select('output_weight_net')
      .eq('date', today);

    const todayProd = production?.reduce((sum, item) => sum + (item.output_weight_net || 0), 0) || 0;

    // Ткачество: производство за сегодня
    const { data: weaving } = await supabase
      .from('production_weaving')
      .select('output_length')
      .eq('date', today);

    const weavingProd = weaving?.reduce((sum, item) => sum + (item.output_length || 0), 0) || 0;

    // Ткачество: склад рулонов ткани
    const { data: fabricRolls } = await supabase
      .from('weaving_rolls')
      .select('id')
      .eq('status', 'available');

    // Ламинация: производство за сегодня
    const { data: lamination } = await supabase
      .from('production_lamination')
      .select('output_length')
      .eq('date', today);

    const laminationProd = lamination?.reduce((sum, item) => sum + (item.output_length || 0), 0) || 0;

    // Ламинация: склад ламинированной ткани
    const { data: laminatedRolls } = await supabase
      .from('laminated_rolls')
      .select('id')
      .eq('status', 'available');

    // Стропы: производство за сегодня
    const { data: straps } = await supabase
      .from('production_straps')
      .select('produced_length')
      .eq('date', today);

    const strapsProd = straps?.reduce((sum, item) => sum + (item.produced_length || 0), 0) || 0;

    // Стропы: склад строп
    const { data: strapsWarehouse } = await supabase
      .from('straps_warehouse')
      .select('id')
      .eq('status', 'available');

    setStats({
      todayProduction: Math.round(todayProd),
      activeShifts: production?.length || 0,
      weavingProduction: Math.round(weavingProd),
      weavingRolls: fabricRolls?.length || 0,
      laminationProduction: Math.round(laminationProd),
      laminatedRolls: laminatedRolls?.length || 0,
      strapsProduction: Math.round(strapsProd),
      strapsRolls: strapsWarehouse?.length || 0,
    });

    setLoading(false);
  };

  const workshops = [
    {
      name: 'Экструзия',
      icon: Factory,
      color: 'bg-[#E60012]',
      hoverColor: 'hover:border-[#E60012]',
      textColor: 'text-[#E60012]',
      production: stats.todayProduction,
      unit: 'кг',
      extra: `Смен: ${stats.activeShifts}`,
      href: '/production/extrusion',
      historyHref: '/production/extrusion/history',
      tasksHref: '/tasks/extrusion'
    },
    {
      name: 'Ткачество',
      icon: Grid3x3,
      color: 'bg-amber-600',
      hoverColor: 'hover:border-amber-600',
      textColor: 'text-amber-400',
      production: stats.weavingProduction,
      unit: 'м',
      extra: `Рулонов на складе: ${stats.weavingRolls}`,
      href: '/production/weaving',
      historyHref: '/production/weaving/history',
      tasksHref: '/tasks/weaving'
    },
    {
      name: 'Ламинация',
      icon: Layers,
      color: 'bg-orange-600',
      hoverColor: 'hover:border-orange-600',
      textColor: 'text-orange-400',
      production: stats.laminationProduction,
      unit: 'м',
      extra: `Рулонов на складе: ${stats.laminatedRolls}`,
      href: '/production/lamination',
      historyHref: '/production/lamination/history',
      tasksHref: '/tasks/lamination'
    },
    {
      name: 'Стропы',
      icon: Scissors,
      color: 'bg-blue-600',
      hoverColor: 'hover:border-blue-600',
      textColor: 'text-blue-400',
      production: stats.strapsProduction,
      unit: 'м',
      extra: `Рулонов на складе: ${stats.strapsRolls}`,
      href: '/production/straps',
      historyHref: '/production/straps/history',
      tasksHref: '/tasks/straps'
    }
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-[#E60012] p-2 rounded-lg">
              <Factory size={24} className="text-white" />
            </div>
            Производство
          </h1>
          <p className="page-description">Обзор производственных цехов</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Сегодня</div>
            <div className="stat-value text-white flex items-center gap-2">
              <Calendar size={16} className="text-zinc-500" />
              {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Production Stats by Workshop */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={24} className="text-[#E60012]" />
          Производство по цехам (сегодня)
        </h2>

        {loading ? (
          <div className="text-center text-zinc-500 py-10">Загрузка статистики...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workshops.map((workshop) => {
              const Icon = workshop.icon;
              return (
                <Card key={workshop.name} className={`bg-zinc-900 border-zinc-800 ${workshop.hoverColor} transition-colors cursor-pointer group`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-zinc-500 font-normal flex items-center gap-2">
                      <Icon size={16} />
                      {workshop.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">
                      {workshop.production} <span className="text-lg text-zinc-500">{workshop.unit}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{workshop.extra}</p>

                    {/* Quick Links */}
                    <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={workshop.href} className="flex-1">
                        <button className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 px-2 rounded transition-colors">
                          Открыть
                        </button>
                      </Link>
                      <Link href={workshop.historyHref} className="flex-1">
                        <button className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 px-2 rounded transition-colors">
                          Журнал
                        </button>
                      </Link>
                      <Link href={workshop.tasksHref} className="flex-1">
                        <button className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 px-2 rounded transition-colors">
                          Задачи
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ArrowRight size={24} className="text-[#E60012]" />
          Быстрые действия
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workshops.map((workshop) => {
            const Icon = workshop.icon;
            return (
              <Link key={workshop.name} href={workshop.href}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className={`${workshop.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-white mb-2">{workshop.name}</h3>
                    <p className="text-sm text-zinc-400">Открыть производство</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Additional Links */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Factory size={24} className="text-[#E60012]" />
          Дополнительно
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/production/specs">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-pink-600 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="bg-pink-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Factory size={24} className="text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">Спецификации</h3>
                <p className="text-sm text-zinc-400">Рецептуры и настройки производства</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
