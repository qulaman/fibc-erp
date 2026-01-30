'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  Package,
  Warehouse,
  ArrowRight,
  Calendar,
  Newspaper,
  Cake,
  Factory
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [stats, setStats] = useState({
    yarnStock: 0,
    rawMaterialsStock: 0,
    fabricStock: 0,
    weavingRolls: 0,
    laminatedRolls: 0,
    strapsRolls: 0,
  });

  const [birthdays, setBirthdays] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Склад нити
      const { data: yarn } = await supabase
        .from('yarn_inventory')
        .select('quantity_kg');

      const yarnTotal = yarn?.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) || 0;

      // Склад сырья - через VIEW
      const { data: materials } = await supabase
        .from('view_material_balances')
        .select('current_balance');

      const materialsTotal = materials?.reduce((sum, item) => sum + (item.current_balance || 0), 0) || 0;

      // Склад ткани
      const { data: fabricStock } = await supabase
        .from('weaving_rolls')
        .select('total_weight')
        .eq('status', 'completed');

      const fabricTotal = fabricStock?.reduce((sum, item) => sum + (item.total_weight || 0), 0) || 0;

      // Количество рулонов
      const { data: fabricRolls } = await supabase
        .from('weaving_rolls')
        .select('id')
        .eq('status', 'completed');

      const { data: laminatedRolls } = await supabase
        .from('laminated_rolls')
        .select('id')
        .eq('status', 'available');

      const { data: strapsWarehouse } = await supabase
        .from('straps_warehouse')
        .select('id')
        .eq('status', 'available');

      setStats({
        yarnStock: Math.round(yarnTotal),
        rawMaterialsStock: Math.round(materialsTotal),
        fabricStock: Math.round(fabricTotal),
        weavingRolls: fabricRolls?.length || 0,
        laminatedRolls: laminatedRolls?.length || 0,
        strapsRolls: strapsWarehouse?.length || 0,
      });
    };

    const fetchBirthdays = async () => {
      const today = new Date();

      const { data } = await supabase
        .from('employees')
        .select('full_name, birth_date')
        .eq('is_active', true)
        .not('birth_date', 'is', null)
        .order('full_name');

      if (data) {
        // Сортируем сотрудников: сначала с днем рождения сегодня, потом ближайшие 7 дней
        const upcomingBirthdays = data
          .map(emp => {
            const birthDate = new Date(emp.birth_date);
            const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

            // Если день рождения уже прошел в этом году, берем следующий год
            if (thisYearBirthday < today) {
              thisYearBirthday.setFullYear(today.getFullYear() + 1);
            }

            const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return {
              ...emp,
              daysUntil,
              isToday: daysUntil === 0,
              birthDate: thisYearBirthday
            };
          })
          .filter(emp => emp.daysUntil >= 0 && emp.daysUntil <= 7) // Показываем только ближайшие 7 дней
          .sort((a, b) => a.daysUntil - b.daysUntil);

        setBirthdays(upcomingBirthdays);
      }
    };

    fetchStats();
    fetchBirthdays();
  }, []);

  const warehouseCards = [
    {
      title: 'Склад Нити',
      description: 'ПП нить готовая',
      href: '/warehouse/yarn',
      icon: Package,
      color: 'bg-indigo-600',
      hoverColor: 'hover:border-indigo-600',
      value: stats.yarnStock,
      unit: 'кг'
    },
    {
      title: 'Склад Ткани',
      description: 'Рулоны готовой ткани',
      href: '/warehouse/fabric',
      icon: Warehouse,
      color: 'bg-purple-600',
      hoverColor: 'hover:border-purple-600',
      value: stats.fabricStock,
      unit: 'кг',
      extra: `Рулонов: ${stats.weavingRolls}`
    },
    {
      title: 'Ламинированная ткань',
      description: 'Готовая к упаковке',
      href: '/warehouse/laminated',
      icon: Warehouse,
      color: 'bg-orange-600',
      hoverColor: 'hover:border-orange-600',
      value: stats.laminatedRolls,
      unit: 'рулонов'
    },
    {
      title: 'Склад Строп',
      description: 'Готовые стропы',
      href: '/warehouse/straps',
      icon: Warehouse,
      color: 'bg-blue-600',
      hoverColor: 'hover:border-blue-600',
      value: stats.strapsRolls,
      unit: 'рулонов'
    },
    {
      title: 'Склад Сырья',
      description: 'Материалы на складе',
      href: '/inventory',
      icon: Warehouse,
      color: 'bg-green-600',
      hoverColor: 'hover:border-green-600',
      value: stats.rawMaterialsStock,
      unit: 'кг'
    }
  ];

  const quickActions = [
    {
      title: 'Производство',
      description: 'Обзор всех цехов',
      href: '/production',
      icon: Factory,
      color: 'bg-[#E60012]'
    },
    {
      title: 'Склады',
      description: 'Управление складами',
      href: '/warehouse/yarn',
      icon: Warehouse,
      color: 'bg-indigo-600'
    },
    {
      title: 'Сырье',
      description: 'Контроль материалов',
      href: '/inventory',
      icon: Package,
      color: 'bg-green-600'
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <div className="bg-[#E60012] p-2 md:p-3 rounded-xl">
            <Activity size={24} className="md:hidden text-white" />
            <Activity size={32} className="hidden md:block text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">Добро пожаловать в FIBC KZ ERP</h1>
            <p className="text-zinc-500 mt-1 text-xs md:text-sm">Система управления производством</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 md:mt-4 text-zinc-400">
          <Calendar size={14} className="md:hidden" />
          <Calendar size={16} className="hidden md:block" />
          <span className="text-xs md:text-sm">
            Сегодня: {new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">

        {/* Левая колонка: Новости и Быстрые действия */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">

          {/* Новости */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <Newspaper size={20} className="md:hidden text-[#E60012]" />
              <Newspaper size={24} className="hidden md:block text-[#E60012]" />
              Последние обновления
            </h2>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="border-l-2 border-[#E60012] pl-4 py-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-500/10 p-2 rounded">
                      <Factory size={16} className="text-[#E60012]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Улучшена система учета сырья</h4>
                      <p className="text-sm text-zinc-400">Списание материалов теперь происходит автоматически через систему транзакций</p>
                      <p className="text-xs text-zinc-600 mt-2">{new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-amber-500 pl-4 py-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-500/10 p-2 rounded">
                      <Factory size={16} className="text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Запущены модули Ткачество и Стропы</h4>
                      <p className="text-sm text-zinc-400">Теперь доступен полный цикл производства от нити до готовой продукции</p>
                      <p className="text-xs text-zinc-600 mt-2">{new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white text-sm">
                    Все новости <ArrowRight size={14} className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Быстрые действия */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <ArrowRight size={20} className="md:hidden text-[#E60012]" />
              <ArrowRight size={24} className="hidden md:block text-[#E60012]" />
              Быстрый доступ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105 cursor-pointer h-full">
                      <CardContent className="p-4 md:p-6">
                        <div className={`${action.color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4`}>
                          <Icon size={20} className="md:hidden text-white" />
                          <Icon size={24} className="hidden md:block text-white" />
                        </div>
                        <h3 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">{action.title}</h3>
                        <p className="text-xs md:text-sm text-zinc-400">{action.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Правая колонка: Склады и Дни рождения */}
        <div className="space-y-6 md:space-y-8">

          {/* Складские запасы */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <Warehouse size={20} className="md:hidden text-green-600" />
              <Warehouse size={24} className="hidden md:block text-green-600" />
              Складские запасы
            </h2>
            <div className="space-y-2 md:space-y-3">
              {warehouseCards.map((warehouse) => {
                const Icon = warehouse.icon;
                return (
                  <Link key={warehouse.href} href={warehouse.href}>
                    <Card className={`bg-zinc-900 border-zinc-800 ${warehouse.hoverColor} transition-colors cursor-pointer`}>
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className={`${warehouse.color} w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0`}>
                            <Icon size={16} className="md:hidden text-white" />
                            <Icon size={20} className="hidden md:block text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-xs md:text-sm truncate">{warehouse.title}</h3>
                            <p className="text-[10px] md:text-xs text-zinc-500">{warehouse.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-base md:text-lg font-bold text-white">{warehouse.value}</div>
                            <div className="text-[10px] md:text-xs text-zinc-500">{warehouse.unit}</div>
                            {warehouse.extra && (
                              <div className="text-[10px] md:text-xs text-zinc-600 mt-0.5">{warehouse.extra}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Дни рождения */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <Cake size={20} className="md:hidden text-pink-500" />
              <Cake size={24} className="hidden md:block text-pink-500" />
              С днем рождения!
            </h2>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                {birthdays.length > 0 ? (
                  <div className="space-y-3">
                    {birthdays.map((person, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          person.isToday
                            ? 'bg-pink-500/20 border-pink-500/40 animate-pulse'
                            : 'bg-pink-500/5 border-pink-500/10'
                        }`}
                      >
                        <div className={`shrink-0 ${person.isToday ? 'text-pink-400' : 'text-pink-600'}`}>
                          <Cake size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white">{person.full_name}</p>
                          <p className="text-xs text-zinc-400">
                            {person.isToday ? (
                              <>🎉 Сегодня день рождения!</>
                            ) : person.daysUntil === 1 ? (
                              <>🎂 Завтра день рождения</>
                            ) : (
                              <>📅 Через {person.daysUntil} {person.daysUntil === 2 ? 'дня' : 'дней'}</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm text-center py-6">
                    <Cake size={32} className="mx-auto mb-2 text-zinc-700" />
                    <p>Нет дней рождения в ближайшие 7 дней</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Уведомления */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <Activity size={20} className="md:hidden text-blue-500" />
              <Activity size={24} className="hidden md:block text-blue-500" />
              Уведомления
            </h2>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-zinc-500 text-sm text-center py-8">
                  Уведомления появятся здесь
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
