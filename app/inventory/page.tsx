import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import AddMaterialForm from './AddMaterialForm';
import DeleteButton from './DeleteButton';
import TransactionDialog from './TransactionDialog';
import InventoryCharts from './InventoryCharts'; // Импорт графиков

// Функция для красивого форматирования чисел (например: 1 200.50)
const formatNumber = (num: number) => new Intl.NumberFormat('ru-RU').format(num);

export default async function InventoryPage() {
  // 1. Запрашиваем данные из "Умного вида" (VIEW), 
  // который сам считает остатки (Приход - Расход)
  const { data: materials, error } = await supabase
    .from('view_material_balances')
    .select('*')
    .order('name');

  if (error) return <div className="text-white p-8">Ошибка загрузки: {error.message}</div>;

  return (
    <div className="p-8 font-sans bg-black min-h-screen text-white">
      
      {/* --- ВЕРХНЯЯ ЧАСТЬ: Заголовок и Кнопки --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#E60012]">Склад сырья (FIBC)</h1>
          <p className="text-zinc-400 text-sm mt-1">Текущие остатки и управление запасами</p>
        </div>
        
        <div className="flex gap-4 items-center self-end md:self-auto">
          <div className="text-right text-sm text-zinc-400 hidden md:block">
            <p>Всего позиций: <span className="text-white font-bold">{materials?.length}</span></p>
          </div>
          
          {/* Кнопка перехода к журналу */}
          <Link href="/inventory/history">
            <Button variant="outline" className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 gap-2">
              📜 История операций
            </Button>
          </Link>
        </div>
      </div>

      {/* --- ИНФОГРАФИКА --- */}
      {/* Передаем данные о материалах в графики */}
      <InventoryCharts materials={materials || []} />

      {/* --- ФОРМА ДОБАВЛЕНИЯ --- */}
      <AddMaterialForm />

      {/* --- ТАБЛИЦА ОСТАТКОВ --- */}
      <div className="bg-zinc-900 text-white shadow-xl rounded-lg overflow-hidden border border-zinc-800 mt-8">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Наименование</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Тип</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">Остаток</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider pl-4">Ед. изм.</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {materials?.map((item) => {
              // Проверяем, не упал ли остаток ниже минимума
              const isCritical = item.current_balance <= item.min_stock && item.min_stock > 0;
              
              return (
                <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    {item.name}
                    {isCritical && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-100 border border-red-700 animate-pulse">
                        МАЛО!
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{item.type}</td>
                  
                  {/* Цвет цифры: Зеленый если есть, Серый если 0, Красный если минус (ошибка учета) */}
                  <td className={`px-6 py-4 text-right font-mono font-bold text-lg 
                    ${item.current_balance > 0 ? 'text-green-400' : 'text-zinc-500'}
                    ${item.current_balance < 0 ? 'text-red-500' : ''}
                  `}>
                    {formatNumber(item.current_balance)}
                  </td>
                  
                  <td className="px-6 py-4 text-zinc-500 text-sm">{item.unit}</td>
                  
                  <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                    {/* Кнопка Приход/Расход */}
                    <TransactionDialog 
                      materialId={item.id} 
                      materialName={item.name} 
                    />
                    
                    {/* Кнопка Удалить */}
                    <DeleteButton id={item.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-center text-xs text-zinc-600">
        Данные синхронизируются в реальном времени с Supabase PostgreSQL
      </div>
    </div>
  );
}