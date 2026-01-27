'use client'

import { useState } from 'react';
import { Search, Filter, Layers, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpecDetailsDialog, { TkanSpecFull } from './SpecDetailsDialog';

export default function SpecsDataTable({ specs }: { specs: TkanSpecFull[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'sleeve', 'fold'

  // Логика фильтрации
  const filteredSpecs = specs.filter(item => {
    // 1. Фильтр по поиску (ищем по названию или ширине)
    const matchesSearch = item.nazvanie_tkani.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.shirina_polotna_sm.toString().includes(searchTerm);
    
    // 2. Фильтр по вкладкам (Рукав / Фальц)
    let matchesTab = true;
    if (activeTab === 'sleeve') matchesTab = item.tip.toLowerCase().includes('рукав');
    if (activeTab === 'fold') matchesTab = item.tip.toLowerCase().includes('фальц');

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      
      {/* --- ПАНЕЛЬ УПРАВЛЕНИЯ --- */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        
        {/* Поиск */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
          <Input 
            placeholder="Поиск по названию или ширине..." 
            className="pl-10 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-[#E60012]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Вкладки (Tabs) */}
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-950 border border-zinc-800 text-zinc-400">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Все</TabsTrigger>
            <TabsTrigger value="sleeve" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
               <Box className="w-4 h-4 mr-2" /> Рукав
            </TabsTrigger>
            <TabsTrigger value="fold" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
               <Layers className="w-4 h-4 mr-2" /> Фальц
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* --- ТАБЛИЦА --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs tracking-wider sticky left-0 bg-zinc-950 z-10">Ткань</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">Инфо</th> 
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs tracking-wider">Тип / Плетение</th>
                <th className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs tracking-wider">Ширина</th>
                <th className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs tracking-wider">Плотность</th>
                <th className="px-4 py-4 text-right font-bold text-[#E60012] uppercase text-xs tracking-wider">Вес 1 п.м.</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs tracking-wider">Основа / Уток</th>
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
                        <span className="text-base">{item.nazvanie_tkani}</span>
                        {item.kod_tkani && <span className="text-xs text-zinc-500 font-mono">{item.kod_tkani}</span>}
                      </div>
                    </td>
                    
                    {/* Кнопка Глаз */}
                    <td className="px-4 py-4 text-center">
                      <SpecDetailsDialog spec={item} />
                    </td>
                    
                    {/* Тип с Бейджами */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1 items-start">
                        {item.tip.toLowerCase().includes('рукав') ? (
                           <Badge variant="outline" className="border-blue-900 text-blue-400 bg-blue-900/10 hover:bg-blue-900/20">Рукав</Badge>
                        ) : (
                           <Badge variant="outline" className="border-orange-900 text-orange-400 bg-orange-900/10 hover:bg-orange-900/20">Фальц</Badge>
                        )}
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide ml-1">{item.osobennosti_polotna}</span>
                      </div>
                    </td>

                    {/* Цифры */}
                    <td className="px-4 py-4 text-right font-mono text-zinc-300 text-base">{item.shirina_polotna_sm} <span className="text-zinc-600 text-xs">см</span></td>
                    <td className="px-4 py-4 text-right font-mono text-zinc-300 text-base">{item.plotnost_polotna_gr_m2} <span className="text-zinc-600 text-xs">г/м²</span></td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#E60012] text-lg bg-zinc-900/50">
                      {item.ves_1_pogonnogo_m_gr}
                    </td>

                    {/* Нити (комбинированные) */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2 text-xs">
                         <div className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400" title="Основа">
                           ↕ {item.osnova_denye}D
                         </div>
                         <div className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400" title="Уток">
                           ↔ {item.utok_denye}D
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