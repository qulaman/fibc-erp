import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Plus } from "lucide-react";
import ExtrusionDetailsDialog from './ExtrusionDetailsDialog';

// Форматирование даты
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default async function ExtrusionHistoryPage() {
  
  // Сложный запрос с "подтягиванием" связей (JOIN)
  const { data: logs, error } = await supabase
    .from('production_extrusion')
    .select(`
      *,
      equipment (name),
      operator_extruder:employees!operator_extruder_id (full_name),
      operator_winder1:employees!operator_winder1_id (full_name),
      operator_winder2:employees!operator_winder2_id (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50); // Берем последние 50 записей

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error.message}</div>;

  return (
    <div className="page-container">

      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/extrusion">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-[#E60012] p-2 rounded-lg">
                <FileText size={24} className="text-white" />
              </div>
              Журнал Производства Экструзии
            </h1>
            <p className="page-description">История смен экструзии</p>
          </div>
        </div>

        <Link href="/production/extrusion">
          <Button className="bg-[#E60012] hover:bg-red-700 text-white font-bold gap-2">
            <Plus size={18} /> Новая смена
          </Button>
        </Link>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Дата / Смена</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Партия</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Продукт</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs hidden md:table-cell">Оператор</th>
                <th className="px-4 py-4 text-right font-bold text-zinc-500 uppercase text-xs">Бобин</th>
                <th className="px-4 py-4 text-right font-bold text-[#E60012] uppercase text-xs">Вес Нетто</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs?.length === 0 ? (
                <tr>
                   <td colSpan={7} className="text-center py-12 text-zinc-500">Записей пока нет</td>
                </tr>
              ) : (
                logs?.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                    
                    {/* Дата и Смена */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                           <Calendar size={12} className="text-zinc-500"/> {formatDate(row.date)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {row.shift === 'День' ? '☀️ День' : '🌙 Ночь'}
                        </span>
                      </div>
                    </td>

                    {/* Партия */}
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      <div className="flex flex-col">
                         <span>{row.batch_number}</span>
                         <span className="text-[10px] text-zinc-600">{row.doc_number}</span>
                      </div>
                    </td>

                    {/* Продукт и Линия */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.yarn_name || `Нить ${row.yarn_denier}D`}</div>
                      <div className="text-xs text-zinc-500">{row.equipment?.name}</div>
                    </td>

                    {/* Оператор */}
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {row.operator_extruder?.full_name?.split(' ')[0] || '—'}
                    </td>

                    {/* Бобины */}
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {row.output_bobbins}
                    </td>

                    {/* Вес */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#E60012] text-base">
                      {row.output_weight_net}
                    </td>

                    {/* Кнопка Деталей */}
                    <td className="px-4 py-3 text-center">
                      <ExtrusionDetailsDialog record={row} />
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}