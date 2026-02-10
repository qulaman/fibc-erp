import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default async function HistoryPage() {
  const { data: transactions, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      raw_materials (name, unit)
    `)
    .order('created_at', { ascending: false });

  if (error) return <div className="text-white p-8">Ошибка: {error.message}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/inventory">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200 h-9 w-9 md:h-10 md:w-10">
              <ArrowLeft size={18} className="md:hidden" />
              <ArrowLeft size={20} className="hidden md:block" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <div className="bg-green-600 p-1.5 md:p-2 rounded-lg">
                <FileText size={18} className="text-white md:hidden" />
                <FileText size={24} className="text-white hidden md:block" />
              </div>
              <span className="hidden sm:inline">Журнал операций склада сырья</span>
              <span className="sm:hidden">Журнал операций</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1">Полная история движений по складу</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 text-white shadow-xl rounded-lg overflow-hidden border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Дата</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden sm:table-cell">Документ</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Тип</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Сырье</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Кол-во</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden lg:table-cell">Партия</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-bold text-zinc-400 uppercase hidden md:table-cell">Контрагент</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs md:text-sm">
              {transactions?.map((item: any) => (
                <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-300 text-[11px] md:text-sm">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap font-mono text-[10px] md:text-xs text-zinc-500 hidden sm:table-cell">
                    {item.doc_number}
                  </td>
                  <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                    {item.type === 'in' ? (
                      <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-green-900 text-green-200">
                        <span className="hidden md:inline">📥 </span>Приход
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-red-900 text-red-200">
                        <span className="hidden md:inline">📤 </span>Расход
                      </span>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-2.5 md:py-4 font-medium text-[11px] md:text-sm max-w-[120px] md:max-w-none truncate">
                    {item.raw_materials?.name || 'Удалено'}
                  </td>
                  <td className={`px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-right font-bold text-[11px] md:text-sm ${item.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                    {item.type === 'in' ? '+' : '-'}{item.quantity} {item.raw_materials?.unit}
                  </td>
                  <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-400 font-mono text-[10px] md:text-xs hidden lg:table-cell">
                    {item.batch_number || '-'}
                  </td>
                  <td className="px-3 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-zinc-300 text-[11px] md:text-sm hidden md:table-cell">
                    {item.counterparty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
