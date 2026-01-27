import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

// Полная типизация (все поля из базы)
export type TkanSpecFull = {
  id: number;
  nazvanie_tkani: string;
  kod_tkani: string;
  shirina_polotna_sm: number;
  plotnost_polotna_gr_m2: number;
  tip: string;               // рукав / фальц
  osobennosti_polotna: string; // обычное / шахматное
  
  // Основа
  osnova_denye: number;
  osnova_shirina_niti_sm: number;
  osnova_plotnost_na_10sm: number;
  osnova_kol_nitey_shpulyarnik: number;
  osnova_ves_9m_gr: number;
  osnova_itogo_kg: number;

  // Уток
  utok_denye: number;
  utok_shirina_niti_sm: number;
  utok_plotnost_na_10sm: number;
  utok_kol_nitey_shpulyarnik: number;
  utok_ves_9m_gr: number;
  utok_itogo_kg: number;

  // Физика
  razryv_po_osnove_kg_s: number;
  elastichnost_po_osnove: string;
  razryv_po_utku_kg_s: number;
  elastichnost_po_utku: string;

  // Вес и экономика
  ves_1_pogonnogo_m_gr: number;
  shirina_v_razvorote_mm: number;
  udelny_ves_m: number;
  percent_othodov: number;

  // Рецепт
  receptura_pp_kg: number;
  receptura_karbonat_kg: number;
  receptura_uf_stabilizator_kg: number;
  receptura_krasitel_kg: number;
};

export default function SpecDetailsDialog({ spec }: { spec: TkanSpecFull }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#E60012] hover:bg-red-900/20">
          <Eye size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 text-white border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#E60012] mb-1">
            {spec.nazvanie_tkani}
          </DialogTitle>
          <div className="text-zinc-400 text-sm">
            {spec.kod_tkani && <span>Код: {spec.kod_tkani}</span>}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          
          {/* БЛОК 1: НИТИ (Основа и Уток) */}
          <div className="space-y-4">
            {/* Карточка Основы */}
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-700 pb-2">🧬 Нить Основы (Warp)</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Денье:</span>
                <span className="font-mono">{spec.osnova_denye} D</span>
                
                <span className="text-zinc-500">Ширина нити:</span>
                <span className="font-mono">{spec.osnova_shirina_niti_sm} мм</span>
                
                <span className="text-zinc-500">Плотность (10см):</span>
                <span className="font-mono">{spec.osnova_plotnost_na_10sm} шт</span>
                
                <span className="text-zinc-500">Кол-во нитей:</span>
                <span className="font-mono text-yellow-500 font-bold">{spec.osnova_kol_nitey_shpulyarnik} шт</span>
                
                <span className="text-zinc-500">Вес в 1м ткани:</span>
                <span className="font-mono font-bold">{spec.osnova_itogo_kg?.toFixed(4)} кг</span>
              </div>
            </div>

            {/* Карточка Утка - ИСПРАВЛЕНА */}
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-700 pb-2">🧶 Нить Утка (Weft)</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Денье:</span>
                <span className="font-mono">{spec.utok_denye} D</span>
                
                <span className="text-zinc-500">Ширина нити:</span>
                <span className="font-mono">{spec.utok_shirina_niti_sm} мм</span>
                
                <span className="text-zinc-500">Плотность (10см):</span>
                <span className="font-mono">{spec.utok_plotnost_na_10sm} шт</span>
                
                <span className="text-zinc-500">Кол-во нитей:</span>
                <span className="font-mono text-yellow-500 font-bold">{spec.utok_kol_nitey_shpulyarnik} шт</span>
                
                <span className="text-zinc-500">Вес в 1м ткани:</span>
                <span className="font-mono font-bold">{spec.utok_itogo_kg?.toFixed(4)} кг</span>
              </div>
            </div>
          </div>

          {/* БЛОК 2: ФИЗИКА И ЭКОНОМИКА */}
          <div className="space-y-4">
            
            {/* Карточка Свойств - ИСПРАВЛЕНА (Добавлен тип плетения) */}
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-700 pb-2">💪 Свойства полотна</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Тип полотна:</span>
                <span className="font-mono text-white capitalize">{spec.tip}</span>
                
                <span className="text-zinc-500">Плетение:</span>
                <span className="font-mono text-[#E60012] font-bold uppercase">{spec.osobennosti_polotna}</span>

                <span className="text-zinc-500 mt-2">Разрыв (Основа):</span>
                <span className="font-mono mt-2">{spec.razryv_po_osnove_kg_s} кг/с</span>
                
                <span className="text-zinc-500">Разрыв (Уток):</span>
                <span className="font-mono">{spec.razryv_po_utku_kg_s} кг/с</span>
                
                <span className="text-zinc-500 mt-2">Вес 1 п.м.:</span>
                <span className="font-mono text-xl text-[#E60012] font-bold mt-2">{spec.ves_1_pogonnogo_m_gr} г</span>
              </div>
            </div>

            {/* Карточка Рецептуры */}
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3 border-b border-zinc-700 pb-2">🧪 Расход сырья (Рецепт)</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Полипропилен:</span>
                <span className="font-mono text-green-400">{spec.receptura_pp_kg?.toFixed(4)} кг</span>
                
                <span className="text-zinc-500">Карбонат (Мел):</span>
                <span className="font-mono">{spec.receptura_karbonat_kg?.toFixed(4)} кг</span>
                
                <span className="text-zinc-500">УФ-стабилизатор:</span>
                <span className="font-mono">{spec.receptura_uf_stabilizator_kg?.toFixed(4)} кг</span>
                
                <span className="text-zinc-500">Краситель:</span>
                <span className="font-mono">{spec.receptura_krasitel_kg?.toFixed(4)} кг</span>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}