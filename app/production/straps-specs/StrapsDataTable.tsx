'use client'

import { useState } from 'react';
import { Search, Package, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StrapsDetailsDialog, { StrapSpecFull } from './StrapsDetailsDialog';

type SortField = 'name' | 'width' | 'density' | 'weight' | 'osnova' | 'utok';
type SortDirection = 'asc' | 'desc' | null;

export default function StrapsDataTable({ specs }: { specs: StrapSpecFull[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [osnovaFilter, setOsnovaFilter] = useState('all'); // 'all', 'pp', 'mfn'
  const [purchaseFilter, setPurchaseFilter] = useState('all'); // 'all', 'fully', 'mixed'
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Функция обработки сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Циклическая смена: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Логика фильтрации и сортировки
  const filteredSpecs = specs
    .filter(item => {
      // 1. Фильтр по поиску (ищем по названию или ширине)
      const matchesSearch = item.nazvanie.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.shirina_mm.toString().includes(searchTerm);

      // 2. Фильтр по типу основы
      let matchesOsnova = true;
      if (osnovaFilter === 'pp') matchesOsnova = item.osnova_nit_type === 'ПП';
      if (osnovaFilter === 'mfn') matchesOsnova = item.osnova_nit_type === 'МФН';

      // 3. Фильтр по типу производства
      let matchesPurchase = true;
      if (purchaseFilter === 'fully') matchesPurchase = item.is_fully_purchased === true;
      if (purchaseFilter === 'mixed') matchesPurchase = !item.is_fully_purchased;

      return matchesSearch && matchesOsnova && matchesPurchase;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;

      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'name':
          return direction * a.nazvanie.localeCompare(b.nazvanie);
        case 'width':
          return direction * (a.shirina_mm - b.shirina_mm);
        case 'density':
          return direction * (a.plotnost_gr_mp - b.plotnost_gr_mp);
        case 'weight':
          return direction * ((a.ves_1_pogonnogo_m_gr || 0) - (b.ves_1_pogonnogo_m_gr || 0));
        case 'osnova':
          return direction * ((a.osnova_denye || 0) - (b.osnova_denye || 0));
        case 'utok':
          return direction * ((a.utok_denye || 0) - (b.utok_denye || 0));
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">

      {/* --- ПАНЕЛЬ УПРАВЛЕНИЯ --- */}
      <div className="flex flex-col gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">

        {/* Первая строка: Поиск */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
            <Input
              placeholder="Поиск по названию или ширине..."
              className="pl-10 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-[#E60012]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Вторая строка: Фильтр по типу основы */}
        <div className="flex items-center gap-3">
          <Package className="text-zinc-500 h-5 w-5" />
          <span className="text-zinc-400 text-sm font-medium">Основа:</span>
          <div className="flex gap-2">
            <Button
              variant={osnovaFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOsnovaFilter('all')}
              className={osnovaFilter === 'all'
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              Все
            </Button>
            <Button
              variant={osnovaFilter === 'pp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOsnovaFilter('pp')}
              className={osnovaFilter === 'pp'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              ПП (своё)
            </Button>
            <Button
              variant={osnovaFilter === 'mfn' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOsnovaFilter('mfn')}
              className={osnovaFilter === 'mfn'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              МФН (покупная)
            </Button>
          </div>
        </div>

        {/* Третья строка: Фильтр по типу производства */}
        <div className="flex items-center gap-3">
          <Package className="text-zinc-500 h-5 w-5" />
          <span className="text-zinc-400 text-sm font-medium">Производство:</span>
          <div className="flex gap-2">
            <Button
              variant={purchaseFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPurchaseFilter('all')}
              className={purchaseFilter === 'all'
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              Все
            </Button>
            <Button
              variant={purchaseFilter === 'mixed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPurchaseFilter('mixed')}
              className={purchaseFilter === 'mixed'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              Смешанное (ПП+МФН)
            </Button>
            <Button
              variant={purchaseFilter === 'fully' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPurchaseFilter('fully')}
              className={purchaseFilter === 'fully'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }
            >
              100% МФН
            </Button>
          </div>
        </div>
      </div>

      {/* --- ТАБЛИЦА --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th
                  className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-10 cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    <span>Стропа</span>
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">Инфо</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">Тип производства</th>
                <th
                  className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('width')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>Ширина</span>
                    {sortField === 'width' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('density')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>Плотность</span>
                    {sortField === 'density' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-4 text-right font-bold text-[#E60012] uppercase text-xs tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
                  onClick={() => handleSort('weight')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>Вес 1 п.м.</span>
                    {sortField === 'weight' && (
                      sortDirection === 'asc' ? <ArrowUp size={14} className="text-[#E60012]" /> : <ArrowDown size={14} className="text-[#E60012]" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className="cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-1"
                      onClick={() => handleSort('osnova')}
                      title="Сортировать по основе"
                    >
                      <span>Основа</span>
                      {sortField === 'osnova' && (
                        sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                    <span>/</span>
                    <div
                      className="cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-1"
                      onClick={() => handleSort('utok')}
                      title="Сортировать по утку"
                    >
                      <span>Уток</span>
                      {sortField === 'utok' && (
                        sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredSpecs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500">
                    Ничего не найдено по запросу "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredSpecs.map((item) => (
                  <tr key={item.id} className="group hover:bg-zinc-800/50 transition-all duration-200">
                    {/* Название */}
                    <td className="px-4 py-4 font-medium text-white sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors z-10 border-r border-zinc-800/50">
                      <div className="flex flex-col">
                        <span className="text-base">{item.nazvanie}</span>
                        {item.kod_almas && <span className="text-xs text-zinc-500 font-mono">{item.kod_almas}</span>}
                      </div>
                    </td>

                    {/* Кнопка Глаз */}
                    <td className="px-4 py-4 text-center">
                      <StrapsDetailsDialog spec={item} />
                    </td>

                    {/* Тип производства */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1 items-center">
                        {item.is_fully_purchased ? (
                          <Badge variant="outline" className="border-purple-900 text-purple-400 bg-purple-900/10 hover:bg-purple-900/20">
                            100% МФН
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-900 text-green-400 bg-green-900/10 hover:bg-green-900/20">
                            ПП + МФН
                          </Badge>
                        )}
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                          Основа: {item.osnova_nit_type}
                        </span>
                      </div>
                    </td>

                    {/* Цифры */}
                    <td className="px-4 py-4 text-right font-mono text-zinc-300 text-base">{item.shirina_mm} <span className="text-zinc-600 text-xs">мм</span></td>
                    <td className="px-4 py-4 text-right font-mono text-zinc-300 text-base">{item.plotnost_gr_mp} <span className="text-zinc-600 text-xs">гр/мп</span></td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#E60012] text-lg bg-zinc-900/50">
                      {item.ves_1_pogonnogo_m_gr}
                    </td>

                    {/* Нити (комбинированные) */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2 text-xs">
                         <div className={`px-2 py-1 rounded border ${
                           item.osnova_nit_type === 'ПП'
                             ? 'bg-green-950 border-green-800 text-green-400'
                             : 'bg-purple-950 border-purple-800 text-purple-400'
                         }`} title="Основа">
                           <div className="flex flex-col items-center">
                             <span>↕ {item.osnova_denye}D</span>
                             <span className="text-[10px] text-zinc-600">{item.osnova_shirina_niti_sm} см</span>
                           </div>
                         </div>
                         <div className="bg-purple-950 px-2 py-1 rounded border border-purple-800 text-purple-400" title="Уток (МФН)">
                           <div className="flex flex-col items-center">
                             <span>↔ {item.utok_denye}D</span>
                             <span className="text-[10px] text-zinc-600">МФН</span>
                           </div>
                         </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Футер таблицы */}
        <div className="bg-zinc-950 p-3 text-center text-xs text-zinc-600 border-t border-zinc-800">
           Показано {filteredSpecs.length} из {specs.length} позиций
        </div>
      </div>
    </div>
  );
}
