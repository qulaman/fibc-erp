'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Factory, Package, Warehouse, Calendar, Cake,
  Grid3x3, Layers, Scissors, Ribbon, ShieldCheck,
  ClipboardList, TrendingUp, FileText, Calculator,
  AlertTriangle, Microscope, Printer, CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Logo } from '@/components/Logo';

// ─── Утилиты ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function formatDate() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Модули ───────────────────────────────────────────────────────────────────
const MODULES = [
  {
    group: 'Производство',
    items: [
      { name: 'Экструзия',      href: '/production/extrusion',  icon: Factory,       color: 'bg-red-700',    desc: 'Нить и экструдеры' },
      { name: 'Ткачество',      href: '/production/weaving',    icon: Grid3x3,       color: 'bg-purple-700', desc: 'Станки и рулоны' },
      { name: 'Ламинация',      href: '/production/lamination', icon: Layers,        color: 'bg-blue-700',   desc: 'Ламинированная ткань' },
      { name: 'Стропы',         href: '/production/straps',     icon: Ribbon,        color: 'bg-orange-700', desc: 'Выпуск строп' },
      { name: 'Крой',           href: '/production/cutting',    icon: Scissors,      color: 'bg-yellow-700', desc: 'Кроёные детали' },
      { name: 'Печать',         href: '/production/printing',   icon: Printer,       color: 'bg-pink-700',   desc: 'Трафаретная печать' },
      { name: 'Пошив и ОТК',    href: '/production/sewing',     icon: CheckCircle2,  color: 'bg-green-700',  desc: 'Пошив и контроль качества' },
      { name: 'Отходы и брак',  href: '/production/waste',      icon: AlertTriangle, color: 'bg-yellow-600', desc: 'Учёт отходов' },
      { name: 'Лаборатория',    href: '/production/laboratory', icon: Microscope,    color: 'bg-cyan-700',   desc: 'Испытания материалов' },
    ],
  },
  {
    group: 'Управление',
    items: [
      { name: 'Склады',         href: '/warehouse',             icon: Warehouse,     color: 'bg-indigo-700', desc: 'Все складские остатки' },
      { name: 'Задачи',         href: '/tasks/management',      icon: ClipboardList, color: 'bg-violet-700', desc: 'Управление задачами' },
      { name: 'Спецификации',   href: '/production/specs',      icon: FileText,      color: 'bg-teal-700',   desc: 'BOM и спецификации' },
      { name: 'Инструменты',    href: '/tools/calculatorBB',    icon: Calculator,    color: 'bg-zinc-600',   desc: 'Калькуляторы' },
      { name: 'Отчёты',         href: '/reports',               icon: TrendingUp,    color: 'bg-emerald-700',desc: 'Аналитика и отчёты' },
      { name: 'Администрация',  href: '/admin',                 icon: ShieldCheck,   color: 'bg-rose-800',   desc: 'Пользователи и данные' },
    ],
  },
];

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function Home() {
  const { profile } = useAuth();

  const [warehouse, setWarehouse] = useState({
    yarn: 0, rawMaterials: 0, fabric: 0, fabricRolls: 0,
    laminatedRolls: 0, strapsRolls: 0,
  });

  const [birthdays, setBirthdays] = useState<{ full_name: string; daysUntil: number; isToday: boolean }[]>([]);

  useEffect(() => {
    fetchWarehouse();
    fetchBirthdays();
  }, []);

  const fetchWarehouse = async () => {
    const [
      { data: yarn },
      { data: materials },
      { data: fabric },
      { data: fabricRolls },
      { data: laminatedRolls },
      { data: strapsWarehouse },
    ] = await Promise.all([
      supabase.from('yarn_inventory').select('quantity_kg'),
      supabase.from('view_material_balances').select('current_balance'),
      supabase.from('weaving_rolls').select('total_weight').eq('status', 'completed'),
      supabase.from('weaving_rolls').select('id').eq('status', 'completed'),
      supabase.from('laminated_rolls').select('id').eq('status', 'available'),
      supabase.from('straps_warehouse').select('id').eq('status', 'available'),
    ]);

    setWarehouse({
      yarn: Math.round(yarn?.reduce((s, i) => s + (i.quantity_kg || 0), 0) || 0),
      rawMaterials: Math.round(materials?.reduce((s, i) => s + (i.current_balance || 0), 0) || 0),
      fabric: Math.round(fabric?.reduce((s, i) => s + (i.total_weight || 0), 0) || 0),
      fabricRolls: fabricRolls?.length || 0,
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
      .not('birth_date', 'is', null);

    if (!data) return;

    const upcoming = data
      .map((emp) => {
        const b = new Date(emp.birth_date);
        const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
        return { full_name: emp.full_name, daysUntil, isToday: daysUntil === 0 };
      })
      .filter((e) => e.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    setBirthdays(upcoming);
  };

  const firstName = profile?.full_name?.split(' ')[0] || profile?.email || '';

  const warehouseRows = [
    { label: 'Нить (ПП)',      value: warehouse.yarn,          unit: 'кг',    href: '/warehouse/yarn' },
    { label: 'Сырьё',          value: warehouse.rawMaterials,  unit: 'кг',    href: '/warehouse/raw-materials' },
    { label: 'Ткань',          value: warehouse.fabric,        unit: 'кг',    href: '/warehouse/fabric', extra: `${warehouse.fabricRolls} рул.` },
    { label: 'Ламинат',        value: warehouse.laminatedRolls, unit: 'рул.', href: '/warehouse/laminated' },
    { label: 'Стропы',         value: warehouse.strapsRolls,   unit: 'рул.', href: '/warehouse/straps' },
  ];

  return (
    <div className="page-container">

      {/* ── Шапка ──────────────────────────────────────────────────────────── */}
      <div className="mb-8 pb-6 border-b border-zinc-800 flex items-center justify-between gap-6">
        <div>
          <p className="text-zinc-500 text-sm mb-1 flex items-center gap-2">
            <Calendar size={14} />
            {formatDate()}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <Logo className="h-14 shrink-0 hidden sm:flex" />
      </div>

      {/* ── Основная сетка ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Левая часть: модули */}
        <div className="xl:col-span-2 space-y-8">
          {MODULES.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">{group.group}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {group.items.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-zinc-800/60"
                    >
                      <div className={`${mod.color} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{mod.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{mod.desc}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-zinc-700 group-hover:text-zinc-400 shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Правая часть: склад + дни рождения */}
        <div className="space-y-6">

          {/* Складские остатки */}
          <div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">Склады</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {warehouseRows.map((row, i) => (
                <Link
                  key={row.href}
                  href={row.href}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-800/60 transition-colors ${
                    i !== warehouseRows.length - 1 ? 'border-b border-zinc-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="text-sm text-zinc-400">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      {row.value.toLocaleString('ru-RU')}
                    </span>
                    <span className="text-xs text-zinc-600 ml-1">{row.unit}</span>
                    {row.extra && (
                      <span className="text-xs text-zinc-600 ml-2">{row.extra}</span>
                    )}
                  </div>
                </Link>
              ))}
              <Link
                href="/warehouse"
                className="flex items-center justify-center gap-1 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors border-t border-zinc-800"
              >
                Все склады <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Дни рождения */}
          <div>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">
              Дни рождения
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {birthdays.length > 0 ? (
                birthdays.map((person, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i !== birthdays.length - 1 ? 'border-b border-zinc-800' : ''
                    } ${person.isToday ? 'bg-pink-950/30' : ''}`}
                  >
                    <Cake
                      size={16}
                      className={person.isToday ? 'text-pink-400' : 'text-zinc-600'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{person.full_name}</p>
                    </div>
                    <span className={`text-xs shrink-0 ${person.isToday ? 'text-pink-400 font-bold' : 'text-zinc-500'}`}>
                      {person.isToday
                        ? 'Сегодня!'
                        : person.daysUntil === 1
                        ? 'Завтра'
                        : `Через ${person.daysUntil} дн.`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-zinc-600 text-sm">
                  <Cake size={24} className="mx-auto mb-2 opacity-30" />
                  Нет в ближайшие 7 дней
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
