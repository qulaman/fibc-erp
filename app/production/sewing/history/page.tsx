import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Plus, Scissors } from "lucide-react";
import SewingDetailsDialog from './SewingDetailsDialog';

// Форматирование даты
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const formatTime = (timeStr: string) => {
  return timeStr?.slice(0, 5) || '—';
}

export default async function SewingHistoryPage() {

  // Загружаем записи производства пошива
  const { data: logs, error } = await supabase
    .from('production_sewing')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); // Берем последние 100 записей

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error.message}</div>;

  // Группируем по дате для статистики
  const totalAmount = logs?.reduce((sum, log) => sum + (log.amount_kzt || 0), 0) || 0;
  const totalGood = logs?.reduce((sum, log) => sum + (log.quantity_good || 0), 0) || 0;
  const totalDefect = logs?.reduce((sum, log) => sum + (log.quantity_defect || 0), 0) || 0;

  return (
    <div className="page-container">

      {/* Заголовок */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link href="/production/sewing">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="h1-bold">
              <div className="bg-pink-600 p-2 rounded-lg">
                <Scissors size={24} className="text-white" />
              </div>
              Журнал Производства Пошива
            </h1>
            <p className="page-description">История операций пошива</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/production/sewing/daily">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white font-bold gap-2">
              <Plus size={18} /> Дневной отчет
            </Button>
          </Link>
        </div>
      </div>

      {/* Статистика */}
      {logs && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Всего операций</div>
            <div className="text-2xl font-bold text-white">{logs.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Годных изделий</div>
            <div className="text-2xl font-bold text-green-400">{totalGood}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Брак</div>
            <div className="text-2xl font-bold text-red-400">{totalDefect}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">Сумма оплаты</div>
            <div className="text-2xl font-bold text-pink-400">{totalAmount.toLocaleString('ru-RU')} ₸</div>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Дата / Время</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Документ</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs">Швея</th>
                <th className="px-4 py-4 text-left font-bold text-zinc-500 uppercase text-xs hidden lg:table-cell">Операция</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Годных</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Брак</th>
                <th className="px-4 py-4 text-right font-bold text-pink-500 uppercase text-xs">Сумма</th>
                <th className="px-4 py-4 text-center font-bold text-zinc-500 uppercase text-xs">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs?.length === 0 ? (
                <tr>
                   <td colSpan={8} className="text-center py-12 text-zinc-500">Записей пока нет</td>
                </tr>
              ) : (
                logs?.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">

                    {/* Дата и Время */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2">
                           <Calendar size={12} className="text-zinc-500"/> {formatDate(row.date)}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {formatTime(row.time)}
                        </span>
                      </div>
                    </td>

                    {/* Документ */}
                    <td className="px-4 py-3 font-mono text-zinc-300 text-xs">
                      {row.doc_number}
                    </td>

                    {/* Швея */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{row.seamstress}</div>
                      <div className="text-xs text-zinc-500">
                        {row.shift_master ? `Мастер: ${row.shift_master}` : '—'}
                      </div>
                    </td>

                    {/* Операция */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="font-medium text-white">{row.operation_name}</div>
                      <div className="text-xs text-zinc-500">{row.operation_category}</div>
                    </td>

                    {/* Годных */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-green-400 border-green-700 font-mono">
                        {row.quantity_good}
                      </Badge>
                    </td>

                    {/* Брак */}
                    <td className="px-4 py-3 text-center">
                      {row.quantity_defect > 0 ? (
                        <Badge variant="outline" className="text-red-400 border-red-700 font-mono">
                          {row.quantity_defect}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Сумма */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-pink-400 text-base">
                      {row.amount_kzt?.toLocaleString('ru-RU')} ₸
                    </td>

                    {/* Кнопка Деталей */}
                    <td className="px-4 py-3 text-center">
                      <SewingDetailsDialog record={row} />
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
