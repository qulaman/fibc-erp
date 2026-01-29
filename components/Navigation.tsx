'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Factory,
  Package,
  ClipboardList,
  Users,
  FileText,
  TrendingUp,
  Settings,
  Home,
  Warehouse,
  ShieldCheck,
  Layers,
  Scissors,
  Calculator,
  CheckCircle2,
  Grid3x3,
  Ribbon
} from 'lucide-react';
import { Logo } from './Logo';

const navigationItems = [
  {
    name: 'Главная',
    href: '/',
    icon: Home
  },
  {
    name: 'Экструзия',
    href: '/production/extrusion',
    icon: Factory,
    submenu: [
      { name: 'Производство', href: '/production/extrusion' },
      { name: 'Журнал', href: '/production/extrusion/history' },
      { name: 'Табель', href: '/production/extrusion/timesheet' },
    ]
  },
  {
    name: 'Ткачество',
    href: '/production/weaving',
    icon: Grid3x3,
    submenu: [
      { name: 'Производство', href: '/production/weaving' },
      { name: 'Журнал', href: '/production/weaving/history' },
      { name: 'Табель', href: '/production/weaving/timesheet' },
    ]
  },
  {
    name: 'Ламинация',
    href: '/production/lamination',
    icon: Layers,
    submenu: [
      { name: 'Производство', href: '/production/lamination' },
      { name: 'Журнал', href: '/production/lamination/history' },
      { name: 'Табель', href: '/production/lamination/timesheet' },
    ]
  },
  {
    name: 'Стропы',
    href: '/production/straps',
    icon: Ribbon,
    submenu: [
      { name: 'Производство', href: '/production/straps' },
      { name: 'Журнал', href: '/production/straps/history' },
      { name: 'Табель', href: '/production/straps/timesheet' },
    ]
  },
  {
    name: 'Крой',
    href: '/production/cutting',
    icon: Scissors,
    submenu: [
      { name: 'Производство', href: '/production/cutting' },
      { name: 'Журнал', href: '/production/cutting/history' },
      { name: 'Табель', href: '/production/cutting/timesheet' },
    ]
  },
  {
    name: 'Пошив',
    href: '/production/sewing/daily',
    icon: Package,
    submenu: [
      { name: 'Производство', href: '/production/sewing/daily' },
      { name: 'Журнал', href: '/production/sewing/history' },
      { name: 'Спецификации (BOM)', href: '/production/sewing-specs' },
      { name: 'Табель', href: '/production/sewing/timesheet' },
    ]
  },
  {
    name: 'ОТК',
    href: '/production/qc',
    icon: CheckCircle2,
    submenu: [
      { name: 'Приёмка ОТК', href: '/production/qc' },
      { name: 'Журнал', href: '/production/qc/history' },
    ]
  },
  {
    name: 'Спецификации',
    href: '/production/specs',
    icon: FileText,
    submenu: [
      { name: 'Спецификации тканей', href: '/production/specs' },
      { name: 'Спецификации строп', href: '/production/straps-specs' },
    ]
  },
  {
    name: 'Инструменты',
    href: '/tools/calculatorBB',
    icon: Calculator,
    submenu: [
      { name: 'Калькулятор Биг-Бэг', href: '/tools/calculatorBB' },
      { name: 'Калькулятор Денье', href: '/tools/calculatorDN' },
    ]
  },
  {
    name: 'Склад',
    href: '/warehouse',
    icon: Warehouse,
    submenu: [
      { name: 'Склад нити (ПП)', href: '/warehouse/yarn' },
      { name: 'Склад МФН', href: '/warehouse/mfn' },
      { name: 'Склад ткани', href: '/warehouse/fabric' },
      { name: 'Ламинированная ткань', href: '/warehouse/laminated' },
      { name: 'Склад строп', href: '/warehouse/straps' },
      { name: 'Кроеные детали', href: '/warehouse/cutting-parts' },
      { name: 'Готовая продукция', href: '/warehouse/finished-goods' },
      { name: 'Сырье (прочее)', href: '/inventory' },
      { name: 'История операций', href: '/inventory/history' },
    ]
  },
  {
    name: 'Заказы',
    href: '/orders',
    icon: ClipboardList,
    badge: 'Скоро'
  },
  {
    name: 'Клиенты',
    href: '/clients',
    icon: Users,
    badge: 'Скоро'
  },
  {
    name: 'Отчеты',
    href: '/reports',
    icon: TrendingUp,
    badge: 'Скоро'
  },
  {
    name: 'Администрирование',
    href: '/admin',
    icon: ShieldCheck,
    submenu: [
      { name: 'Сотрудники', href: '/admin/employees' },
      { name: 'Оборудование', href: '/admin/equipment' },
    ]
  },
];

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (item: any) => {
    if (item.href === '/') return pathname === '/';

    // Проверяем основной href
    if (pathname.startsWith(item.href)) return true;

    // Проверяем submenu если есть
    if (item.submenu) {
      return item.submenu.some((subitem: any) => pathname.startsWith(subitem.href));
    }

    return false;
  };

  return (
    <nav className="fixed left-0 top-0 h-screen w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-zinc-800">
        <Link href="/" className="group block">
          <Logo className="group-hover:opacity-90 transition-opacity h-14 w-full" />
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-base
                    ${active
                      ? 'bg-[#E60012] text-white shadow-lg shadow-red-900/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium">
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Submenu */}
                {item.submenu && active && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className={`
                          block px-4 py-2 rounded-lg text-sm transition-colors font-medium
                          ${pathname === subitem.href
                            ? 'text-white bg-zinc-900'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                          }
                        `}
                      >
                        {subitem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all text-base"
        >
          <Settings size={20} />
          <span className="font-medium">Настройки</span>
        </Link>
      </div>
    </nav>
  );
}
