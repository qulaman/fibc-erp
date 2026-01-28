'use client'

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type StrapSpecFull = {
  id: number;
  kod_almas?: string;
  nazvanie: string;
  shirina_mm: number;
  plotnost_gr_mp: number;
  tip: string;

  // Osnova
  osnova_nit_type: string;
  osnova_denye?: number;
  osnova_shirina_niti_sm?: number;
  osnova_kol_nitey?: number;
  osnova_kol_nitey_shpulyarnik?: number;
  osnova_ves_9m_gr?: number;
  osnova_itogo_kg?: number;

  // Utok
  utok_denye?: number;
  utok_vid_niti?: string;
  utok_percent_v_1m?: number;
  utok_kol_nitey_shpulyarnik?: number;
  utok_ves_9m_gr?: number;
  utok_itogo_kg?: number;

  // Calculations
  math_plotnost_gr_m2?: number;
  razryv_po_osnove?: number;
  elastichnost_po_osnove?: string;

  // Weight
  ves_1_pogonnogo_m_gr?: number;
  shirina_v_razvorote_mm?: number;
  udelny_ves_m?: number;
  percent_othodov?: number;
  perevod_gr_na_kg?: number;

  // Recipe (only for PP-based straps)
  is_fully_purchased: boolean;
  receptura_itogo_kg?: number;
  receptura_pp_kg?: number;
  receptura_karbonat_kg?: number;
  receptura_uf_kg?: number;
  receptura_krasitel_kg?: number;

  // MFN consumption
  mfn_rashod_kg?: number;

  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function StrapsDetailsDialog({ spec }: { spec: StrapSpecFull }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-zinc-800 hover:text-white transition-all"
        >
          <Eye size={18} className="text-zinc-500" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#E60012] flex items-center gap-3">
            {spec.nazvanie}
            {spec.is_fully_purchased && (
              <Badge variant="outline" className="border-purple-700 text-purple-300 bg-purple-900/20">
                100% МФН
              </Badge>
            )}
          </DialogTitle>
          {spec.kod_almas && (
            <p className="text-sm text-zinc-500 font-mono">Код Алмас: {spec.kod_almas}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Основные характеристики */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-300 mb-3">📏 Основные характеристики</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase">Тип</p>
                <p className="text-base text-white font-medium">{spec.tip}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Ширина</p>
                <p className="text-base text-white font-mono">{spec.shirina_mm} мм</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Плотность</p>
                <p className="text-base text-white font-mono">{spec.plotnost_gr_mp} гр/мп</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Вес 1 п.м.</p>
                <p className="text-base text-[#E60012] font-bold font-mono">{spec.ves_1_pogonnogo_m_gr} г</p>
              </div>
            </div>
          </div>

          {/* Основа */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-300 mb-3">
              ↕ Основа
              <Badge
                variant="outline"
                className={spec.osnova_nit_type === 'ПП'
                  ? "ml-2 border-green-700 text-green-300 bg-green-900/20"
                  : "ml-2 border-purple-700 text-purple-300 bg-purple-900/20"
                }
              >
                {spec.osnova_nit_type === 'ПП' ? 'ПП (своё производство)' : 'МФН (покупная)'}
              </Badge>
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {spec.osnova_denye && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Денье нити</p>
                  <p className="text-base text-white font-mono">{spec.osnova_denye}D</p>
                </div>
              )}
              {spec.osnova_shirina_niti_sm && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Ширина нити</p>
                  <p className="text-base text-white font-mono">{spec.osnova_shirina_niti_sm} см</p>
                </div>
              )}
              {spec.osnova_kol_nitey && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Количество нитей</p>
                  <p className="text-base text-white font-mono">{spec.osnova_kol_nitey} шт</p>
                </div>
              )}
              {spec.osnova_kol_nitey_shpulyarnik && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Нити на шпулярнике</p>
                  <p className="text-base text-white font-mono">{spec.osnova_kol_nitey_shpulyarnik} шт</p>
                </div>
              )}
              {spec.osnova_ves_9m_gr && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Вес 9м нити</p>
                  <p className="text-base text-white font-mono">{spec.osnova_ves_9m_gr} г</p>
                </div>
              )}
              {spec.osnova_itogo_kg && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Расход на 1м стропы</p>
                  <p className="text-base text-green-400 font-bold font-mono">{spec.osnova_itogo_kg} кг</p>
                </div>
              )}
            </div>
          </div>

          {/* Уток */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-300 mb-3">
              ↔ Уток
              <Badge variant="outline" className="ml-2 border-purple-700 text-purple-300 bg-purple-900/20">
                МФН (всегда покупная)
              </Badge>
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {spec.utok_denye && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Денье нити</p>
                  <p className="text-base text-white font-mono">{spec.utok_denye}D</p>
                </div>
              )}
              {spec.utok_vid_niti && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Вид нити</p>
                  <p className="text-base text-white font-mono">{spec.utok_vid_niti}</p>
                </div>
              )}
              {spec.utok_percent_v_1m !== undefined && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">% в 1м</p>
                  <p className="text-base text-white font-mono">{spec.utok_percent_v_1m}%</p>
                </div>
              )}
              {spec.utok_kol_nitey_shpulyarnik && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Нити на шпулярнике</p>
                  <p className="text-base text-white font-mono">{spec.utok_kol_nitey_shpulyarnik} шт</p>
                </div>
              )}
              {spec.utok_ves_9m_gr && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Вес 9м нити</p>
                  <p className="text-base text-white font-mono">{spec.utok_ves_9m_gr} г</p>
                </div>
              )}
              {spec.utok_itogo_kg && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Расход на 1м стропы</p>
                  <p className="text-base text-purple-400 font-bold font-mono">{spec.utok_itogo_kg} кг</p>
                </div>
              )}
            </div>
          </div>

          {/* Расчётные характеристики */}
          {(spec.math_plotnost_gr_m2 || spec.razryv_po_osnove || spec.elastichnost_po_osnove) && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-300 mb-3">🧮 Расчётные характеристики</h3>
              <div className="grid grid-cols-3 gap-4">
                {spec.math_plotnost_gr_m2 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Матем. плотность</p>
                    <p className="text-base text-white font-mono">{spec.math_plotnost_gr_m2} г/м²</p>
                  </div>
                )}
                {spec.razryv_po_osnove && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Разрыв по основе</p>
                    <p className="text-base text-white font-mono">{spec.razryv_po_osnove} кг</p>
                  </div>
                )}
                {spec.elastichnost_po_osnove && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Эластичность</p>
                    <p className="text-base text-white font-mono">{spec.elastichnost_po_osnove}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Рецептура - только для ПП-части */}
          {!spec.is_fully_purchased && spec.receptura_itogo_kg && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-green-900/30">
              <h3 className="text-lg font-semibold text-green-300 mb-3">
                🧪 Рецептура ПП-сырья (на 1 метр)
              </h3>
              <p className="text-xs text-zinc-500 mb-3">Только для основы из собственного производства</p>
              <div className="space-y-2">
                {(() => {
                  const totalWeight = spec.receptura_itogo_kg || 0;

                  return (
                    <>
                      {spec.receptura_pp_kg && (
                        <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                          <span className="text-sm text-zinc-400">Полипропилен (ПП)</span>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-green-400">{spec.receptura_pp_kg.toFixed(4)} кг</span>
                            <span className="text-xs text-green-600">
                              ({((spec.receptura_pp_kg / totalWeight) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                      {spec.receptura_karbonat_kg && (
                        <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                          <span className="text-sm text-zinc-400">Карбонат кальция</span>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-zinc-300">{spec.receptura_karbonat_kg.toFixed(4)} кг</span>
                            <span className="text-xs text-zinc-600">
                              ({((spec.receptura_karbonat_kg / totalWeight) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                      {spec.receptura_uf_kg && (
                        <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                          <span className="text-sm text-zinc-400">УФ стабилизатор</span>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-zinc-300">{spec.receptura_uf_kg.toFixed(4)} кг</span>
                            <span className="text-xs text-zinc-600">
                              ({((spec.receptura_uf_kg / totalWeight) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                      {spec.receptura_krasitel_kg && (
                        <div className="flex justify-between items-center p-2 bg-zinc-900 rounded">
                          <span className="text-sm text-zinc-400">Краситель</span>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-zinc-300">{spec.receptura_krasitel_kg.toFixed(4)} кг</span>
                            <span className="text-xs text-zinc-600">
                              ({((spec.receptura_krasitel_kg / totalWeight) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-2 bg-green-900/20 rounded border-t border-green-800 mt-2">
                        <span className="text-sm font-bold text-green-300">Итого ПП-сырья</span>
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-green-400">{totalWeight.toFixed(4)} кг</span>
                          <span className="text-xs text-green-600">(100.0%)</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Расход покупной МФН нити */}
          {spec.mfn_rashod_kg && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-purple-900/30">
              <h3 className="text-lg font-semibold text-purple-300 mb-3">
                💰 Расход покупной МФН нити (на 1 метр)
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                {spec.is_fully_purchased
                  ? 'Уток + Основа (стропа полностью покупная)'
                  : 'Только уток (основа из собственного ПП)'
                }
              </p>
              <div className="flex justify-between items-center p-3 bg-purple-900/10 rounded">
                <span className="text-base text-purple-300">МФН нить</span>
                <span className="font-mono text-xl font-bold text-purple-400">{spec.mfn_rashod_kg.toFixed(4)} кг</span>
              </div>
            </div>
          )}

          {/* Дополнительные параметры */}
          {(spec.shirina_v_razvorote_mm || spec.udelny_ves_m || spec.percent_othodov) && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-300 mb-3">⚙️ Дополнительные параметры</h3>
              <div className="grid grid-cols-3 gap-4">
                {spec.shirina_v_razvorote_mm && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Ширина в развороте</p>
                    <p className="text-base text-white font-mono">{spec.shirina_v_razvorote_mm} мм</p>
                  </div>
                )}
                {spec.udelny_ves_m && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Удельный вес</p>
                    <p className="text-base text-white font-mono">{spec.udelny_ves_m}</p>
                  </div>
                )}
                {spec.percent_othodov !== undefined && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">% отходов</p>
                    <p className="text-base text-white font-mono">{(spec.percent_othodov * 100).toFixed(2)}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
