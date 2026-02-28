'use client' // <--- САМОЕ ВАЖНОЕ: Делаем компонент клиентским

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, User, Cable, Scale } from "lucide-react"

// Типизация входящих данных
export default function ExtrusionDetailsDialog({ record }: { record: any }) {
  
  // Парсим дозаторы (они лежат в JSON)
  const dosators = Array.isArray(record.dosators_data) ? record.dosators_data : [];
  
  // Считаем баланс на лету
  const totalInput = dosators.reduce((sum: number, d: any) => sum + (Number(d.weight) || 0), 0);
  const totalOutput = (record.output_weight_net || 0) + (record.waste_weight || 0);
  const balance = totalInput - totalOutput;
  const isBalanced = Math.abs(balance) < 1; // Допускаем погрешность 1 кг

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Eye size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start pr-4">
            <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span className="text-[#E60012]">{record.batch_number}</span>
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-normal">
                    {record.doc_number}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">
                  {new Date(record.date).toLocaleDateString('ru-RU')} • Смена {record.shift}
                </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          
          {/* Блок 1: Оборудование и Команда */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
             <div>
                <span className="text-xs text-zinc-500 uppercase flex items-center gap-1 mb-1"><Cable size={12}/> Линия</span>
                <div className="font-bold">{record.equipment?.name || 'Не указано'}</div>
             </div>
             <div>
                <span className="text-xs text-zinc-500 uppercase flex items-center gap-1 mb-1"><User size={12}/> Экструдерщик</span>
                <div className="font-medium">{record.operator_extruder?.full_name || '-'}</div>
             </div>
             <div className="col-span-2 border-t border-zinc-800 pt-2 flex gap-4 text-sm">
                <span className="text-zinc-500">Намотчики:</span>
                <span>{record.operator_winder1?.full_name || '-'}</span>
                <span>{record.operator_winder2?.full_name || '-'}</span>
                {record.operator_winder3?.full_name && <span>{record.operator_winder3.full_name}</span>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Блок 2: ВХОД (Сырье) */}
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-800 pb-2">📥 Загружено (Input)</h3>
                <div className="space-y-2">
                  {dosators.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm items-center bg-zinc-900/50 p-2 rounded">
                       <div>
                         {/* Если в базе пока нет имен, выводим заглушку */}
                         <div className="font-medium">{d.material_id ? 'Сырье (ID)' : 'Сырье'}</div> 
                         {d.batch && <div className="text-[10px] text-zinc-500 font-mono">Партия: {d.batch}</div>}
                       </div>
                       <div className="font-mono">{Number(d.weight).toFixed(1)} кг</div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-zinc-800">
                    <span>Всего сырья:</span>
                    <span>{totalInput.toFixed(1)} кг</span>
                  </div>
                </div>
              </div>

              {/* Блок 3: ВЫХОД (Продукция) */}
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-800 pb-2">📤 Получено (Output)</h3>
                <div className="bg-zinc-900 p-3 rounded-lg space-y-3">
                   <div>
                      <div className="text-xs text-zinc-500">Продукт</div>
                      <div className="font-bold text-[#E60012]">{record.yarn_types?.name}</div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-zinc-500">Кол-во бобин</div>
                        <div className="font-mono text-lg">{record.output_bobbins} шт</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Вес Нетто</div>
                        <div className="font-mono text-lg text-green-400 font-bold">{record.output_weight_net} кг</div>
                      </div>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <span className="text-sm text-zinc-400">Отходы</span>
                      <span className="font-mono text-red-400">{record.waste_weight} кг</span>
                   </div>
                </div>
              </div>
          </div>

          {/* Блок 4: БАЛАНС */}
          <div className={`p-3 rounded-lg border flex justify-between items-center ${isBalanced ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'}`}>
             <div className="flex items-center gap-2">
                <Scale size={18} className={isBalanced ? "text-green-500" : "text-red-500"} />
                <span className="text-sm font-medium">Материальный баланс</span>
             </div>
             <div className={`font-mono font-bold ${isBalanced ? "text-green-400" : "text-red-400"}`}>
                {balance > 0 ? `+${balance.toFixed(1)}` : balance.toFixed(1)} кг
             </div>
          </div>

          {record.notes && (
            <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800 text-sm text-zinc-400 italic">
               "{record.notes}"
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}