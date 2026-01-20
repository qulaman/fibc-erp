import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Функция для красивой даты (19.01.2026 14:30)
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default async function HistoryPage() {
  // Запрашиваем транзакции и СРАЗУ подтягиваем имя сырья
  const { data: transactions, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      raw_materials (name, unit)
    `)
    .order('created_at', { ascending: false }); // Сначала новые

  if (error) return <div className="text-white p-8">Ошибка: {error.message}</div>;

  return (
    <div className="p-8 font-sans bg-black min-h-screen text-white">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/inventory">
          <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
             <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[#E60012]">Журнал операций</h1>
          <p className="text-zinc-400 text-sm">Полная история движений по складу</p>
        </div>
      </div>

      <div className="bg-zinc-900 text-white shadow-xl rounded-lg overflow-hidden border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase">Дата / Время</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase">Документ</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase">Тип</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase">Сырье</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase">Кол-во</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase pl-8">Партия (LOT)</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase">Контрагент / Цех</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-sm">
            {transactions?.map((item: any) => (
              <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-zinc-300">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-zinc-500">
                  {item.doc_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Красивые цветные бейджики как в Excel */}
                  {item.type === 'in' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                      📥 Приход
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
                      📤 Расход
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {item.raw_materials?.name || 'Удалено'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${item.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.type === 'in' ? '+' : '-'}{item.quantity} {item.raw_materials?.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-400 pl-8 font-mono text-xs">
                  {item.batch_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-300">
                  {item.counterparty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}