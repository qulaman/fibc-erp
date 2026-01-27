import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import SpecsDataTable from './SpecsDataTable'; // <-- Импортируем нашу красоту

export default async function SpecsPage() {
  const { data: specs, error } = await supabase
    .from('tkan_specifications')
    .select('*')
    .order('shirina_polotna_sm', { ascending: true });

  if (error) return <div className="text-white p-8">Ошибка: {error.message}</div>;

  return (
    <div className="p-8 font-sans bg-black min-h-screen text-white">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/production">
            <Button variant="outline" size="icon" className="text-black bg-white hover:bg-gray-200">
               <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#E60012] flex items-center gap-2">
              <FileText /> Спецификации Тканей
            </h1>
            <p className="text-zinc-400 text-sm">База стандартов производства</p>
          </div>
        </div>
      </div>

      {/* Вставляем интерактивную таблицу */}
      <SpecsDataTable specs={specs || []} />
      
    </div>
  );
}