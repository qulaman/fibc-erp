'use client'

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Cable,
  Spool,
  ClipboardList,
  FileText,
  TrendingUp,
  Home,
  Warehouse,
  ShieldCheck,
  Layers,
  Scissors,
  Calculator,
  Grid3x3,
  Ribbon,
  LogOut,
  User as UserIcon,
  X,
  AlertTriangle,
  FlaskConical,
  Stamp,
  Target,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth-context';

const navigationItems = [
  {
    name: 'Главная',
    href: '/',
    icon: Home
  },
  {
    name: 'Экструзия',
    href: '/production/extrusion',
    icon: Cable,
    submenu: [
      { name: 'Заказы', href: '/production/extrusion/orders' },
      { name: 'Производство', href: '/production/extrusion/input' },
      { name: 'Журнал', href: '/production/extrusion/history' },
      { name: 'Простои', href: '/production/extrusion/downtimes' },
      { name: 'Табель', href: '/production/extrusion/timesheet' },
      { name: 'Обслуживание оборудования', href: '/production/extrusion/maintenance' },
      { name: 'Персонал', href: '/production/extrusion/personnel' },
      { name: 'Задачи', href: '/tasks/extrusion' },
    ]
  },
  {
    name: 'Ткачество',
    href: '/production/weaving',
    icon: Grid3x3,
    submenu: [
      { name: 'Заказы', href: '/production/weaving/orders' },
      { name: 'Статус станков', href: '/production/weaving/machines' },
      { name: 'Журнал', href: '/production/weaving/history' },
      { name: 'Простои', href: '/production/weaving/downtimes' },
      { name: 'Заправочные карты', href: '/production/weaving/weaving-setup' },
      { name: 'Табель', href: '/production/weaving/timesheet' },
      { name: 'Обслуживание оборудования', href: '/production/weaving/maintenance' },
      { name: 'Персонал', href: '/production/weaving/personnel' },
      { name: 'Задачи', href: '/tasks/weaving' },
    ]
  },
  {
    name: 'Ламинация',
    href: '/production/lamination',
    icon: Layers,
    submenu: [
      { name: 'Заказы', href: '/production/lamination/orders' },
      { name: 'Производство', href: '/production/lamination/input' },
      { name: 'Журнал', href: '/production/lamination/history' },
      { name: 'Табель', href: '/production/lamination/timesheet' },
      { name: 'Обслуживание оборудования', href: '/production/lamination/maintenance' },
      { name: 'Персонал', href: '/production/lamination/personnel' },
      { name: 'Задачи', href: '/tasks/lamination' },
    ]
  },
  {
    name: 'Стропы',
    href: '/production/straps',
    icon: Ribbon,
    submenu: [
      { name: 'Заказы', href: '/production/straps/orders' },
      { name: 'Статус станков', href: '/production/straps/machines' },
      { name: 'Журнал', href: '/production/straps/history' },
      { name: 'Табель', href: '/production/straps/timesheet' },
      { name: 'Персонал', href: '/production/straps/personnel' },
      { name: 'Задачи', href: '/tasks/straps' },
    ]
  },
  {
    name: 'Крой',
    href: '/production/cutting',
    icon: Scissors,
    submenu: [
      { name: 'Заказы', href: '/production/cutting/orders' },
      { name: 'Производство', href: '/production/cutting' },
      { name: 'Журнал', href: '/production/cutting/history' },
      { name: 'Рулоны в крое', href: '/production/cutting/rolls' },
      { name: 'Справочник деталей', href: '/production/cutting/cutting-types' },
      { name: 'Табель', href: '/production/cutting/timesheet' },
      { name: 'Персонал', href: '/production/cutting/personnel' },
      { name: 'Задачи', href: '/tasks/cutting' },
    ]
  },
  {
    name: 'Печать',
    href: '/production/printing',
    icon: Stamp,
    submenu: [
      { name: 'Производство', href: '/production/printing' },
      { name: 'Журнал', href: '/production/printing/history' },
      { name: 'Персонал', href: '/production/printing/personnel' },
      { name: 'Задачи', href: '/tasks/printing' },
    ]
  },
  {
    name: 'Пошив и ОТК',
    href: '/production/sewing',
    icon: Spool,
    submenu: [
      { name: 'Заказы', href: '/production/sewing/orders' },
      { name: 'Главная', href: '/production/sewing' },
      { name: 'Биг-Бэг', href: '/production/sewing/bigbag' },
      { name: 'Вкладыши', href: '/production/sewing/liners' },
      { name: 'Приёмка ОТК', href: '/production/qc' },
      { name: 'Журнал пошива', href: '/production/sewing/history' },
      { name: 'Журнал ОТК', href: '/production/qc/history' },
      { name: 'Спецификации (BOM)', href: '/production/sewing-specs' },
      { name: 'Табель', href: '/production/sewing/timesheet' },
      { name: 'Персонал', href: '/production/sewing/personnel' },
      { name: 'Задачи', href: '/tasks/sewing' },
    ]
  },
  {
    name: 'Отходы и брак',
    href: '/production/waste',
    icon: AlertTriangle,
    submenu: [
      { name: 'Внести данные', href: '/production/waste' },
      { name: 'Журнал', href: '/production/waste/journal' },
    ]
  },
  {
    name: 'Лаборатория',
    href: '/production/laboratory',
    icon: FlaskConical,
    submenu: [
      { name: 'Внести данные', href: '/production/laboratory' },
      { name: 'Журнал', href: '/production/laboratory/journal' },
    ]
  },
  {
    name: 'Планирование',
    href: '/planning',
    icon: Target,
    submenu: [
      { name: 'Журнал заказов', href: '/planning' },
      { name: 'Новый заказ', href: '/planning/new' },
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
      { name: 'Отпуск ГП клиентам', href: '/warehouse/finished-goods/shipment' },
      { name: 'Журнал отпусков', href: '/warehouse/finished-goods/shipment/history' },
      { name: 'Сырье', href: '/warehouse/raw-materials' },
    ]
  },
  {
    name: 'Задачи',
    href: '/tasks/management',
    icon: ClipboardList,
    submenu: [
      { name: 'Управление задачами', href: '/tasks/management' },
      { name: 'Задачи офиса', href: '/tasks/office' },
    ]
  },
  {
    name: 'Отчеты',
    href: '/reports',
    icon: TrendingUp
  },
  {
    name: 'Администрирование',
    href: '/admin',
    icon: ShieldCheck,
    submenu: [
      { name: 'Мониторинг заказов', href: '/admin/orders' },
      { name: 'Пользователи', href: '/admin/users' },
      { name: 'Сотрудники', href: '/admin/employees' },
      { name: 'Оборудование', href: '/admin/equipment' },
      { name: 'Управление данными', href: '/admin/data-management' },
    ]
  },
];

export default function Navigation({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      await signOut();
      router.push('/login');
    }
  };

  const isActive = (item: any) => {
    if (item.href === '/') return pathname === '/';

    const matchesPath = (href: string) => pathname === href || pathname.startsWith(href + '/');

    if (matchesPath(item.href)) return true;

    if (item.submenu) {
      return item.submenu.some((subitem: any) => matchesPath(subitem.href));
    }

    return false;
  };

  return (
    <>
      {/* Backdrop для мобильных */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Навигация */}
      <nav className={`
        fixed left-0 top-0 h-screen w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Кнопка закрытия на мобильных */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors z-10"
          aria-label="Закрыть меню"
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="px-2 py-6 border-b border-zinc-800 flex items-center justify-center">
          <Link href="/" className="group block w-full">
            <Logo className="group-hover:opacity-90 transition-opacity h-20 w-full" />
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 dark-scrollbar">
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
        <div className="p-4 border-t border-zinc-800 space-y-2">
        {/* User Info */}
        {profile && (
          <div className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#E60012] flex items-center justify-center">
                <UserIcon size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name || profile.email || 'Пользователь'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {profile.role === 'admin' && 'Администратор'}
                  {profile.role === 'manager' && 'Менеджер'}
                  {profile.role === 'operator' && 'Оператор'}
                  {profile.role === 'warehouse' && 'Кладовщик'}
                  {profile.role === 'qc' && 'ОТК'}
                  {profile.role === 'accountant' && 'Бухгалтер'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings & Logout */}
        <div className="space-y-1">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/10 transition-all text-sm"
          >
            <LogOut size={18} />
            <span className="font-medium">Выход</span>
          </button>
        </div>

        {/* Версия */}
        <p className="text-[10px] text-zinc-600 text-center pt-2">
          Версия 1.1 FIBC KZ x Akdaulet Almas (C)
        </p>
        </div>
      </nav>
    </>
  );
}
