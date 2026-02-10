'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PREFIXES: Record<string, string> = {
  yarn: 'LAB-YARN',
  extruder: 'LAB-EXT',
  machine: 'LAB-MCH',
  fabric: 'LAB-FAB',
  strap: 'LAB-STR',
  lamination: 'LAB-LAM',
  mfi: 'LAB-MFI',
};

// ─── Начальные состояния форм ────────────────────────────────────────────────
const INITIAL_YARN = { yarn_code: '', batch: '', denier: '', strength: '', elasticity: '', width: '', operator: '', result: '', notes: '' };
const INITIAL_EXTRUDER = { shift: 'День', machine: '', temp1: '', temp2: '', temp3: '', temp4: '', temp5: '', annealing: '', d1: '', d2: '', d3: '', d4: '', d5: '', d6: '', operator: '', result: '', notes: '' };
const INITIAL_MACHINE = { machine_number: '', width: '', visual_check: '', defects: '', operator: '', result: '', notes: '' };
const INITIAL_FABRIC = { machine_number: '', roll_number: '', fabric_code: '', warp_strength_kg: '', warp_strength_n: '', warp_elasticity: '', weft_strength_kg: '', weft_strength_n: '', weft_elasticity: '', density: '', operator: '', result: '', notes: '' };
const INITIAL_STRAP = { batch_number: '', strap_type: '', tension_kg: '', tension_n: '', elasticity: '', density: '', operator: '', result: '', notes: '' };
const INITIAL_LAMINATION = { roll_number: '', roll_info: '', width: '', warp_strength_kg: '', warp_strength_n: '', warp_elasticity: '', weft_strength_kg: '', weft_strength_n: '', weft_elasticity: '', density: '', adhesion: '', operator: '', result: '', notes: '' };
const INITIAL_MFI = { material_type: '', material_code: '', batch: '', mfi: '', temperature: '', load: '', operator: '', result: '', notes: '' };

export default function LaboratoryPage() {
  const [loading, setLoading] = useState(false);

  const [yarnForm, setYarnForm] = useState(INITIAL_YARN);
  const [extruderForm, setExtruderForm] = useState(INITIAL_EXTRUDER);
  const [machineForm, setMachineForm] = useState(INITIAL_MACHINE);
  const [fabricForm, setFabricForm] = useState(INITIAL_FABRIC);
  const [strapForm, setStrapForm] = useState(INITIAL_STRAP);
  const [laminationForm, setLaminationForm] = useState(INITIAL_LAMINATION);
  const [mfiForm, setMfiForm] = useState(INITIAL_MFI);

  const handleSubmit = async (testType: string, formData: Record<string, string>, resetFn: () => void) => {
    setLoading(true);
    try {
      const { operator, result, notes, ...testData } = formData;

      const { data: docNumber, error: rpcErr } = await supabase.rpc('generate_lab_doc_number', {
        p_prefix: PREFIXES[testType],
      });
      if (rpcErr) throw rpcErr;

      const { error } = await supabase.from('lab_tests').insert([
        { doc_number: docNumber, test_type: testType, operator, result, notes, test_data: testData },
      ]);
      if (error) throw error;

      resetFn();
      alert('Записано: ' + docNumber);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  // ─── Общие поля (оператор / результат / примечания) ─────────────────────────
  const renderCommon = (form: Record<string, string>, setForm: (v: Record<string, string>) => void) => (
    <>
      <div>
        <Label>Оператор</Label>
        <Input value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} placeholder="ФИО" />
      </div>
      <div>
        <Label>Результат *</Label>
        <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите результат" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Годен">Годен</SelectItem>
            <SelectItem value="Брак">Брак</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Примечания</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
    </>
  );

  // ─── Секция «Основа / Уток» (ткань + ламинация) ─────────────────────────────
  const renderWarpWeft = (form: Record<string, string>, setForm: (v: Record<string, string>) => void) => (
    <>
      <p className="text-sm text-zinc-400 font-medium pt-2">Основа</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Прочность кг</Label>
          <Input type="number" step="0.01" value={form.warp_strength_kg} onChange={(e) => setForm({ ...form, warp_strength_kg: e.target.value })} />
        </div>
        <div>
          <Label>Прочность Н</Label>
          <Input type="number" step="0.01" value={form.warp_strength_n} onChange={(e) => setForm({ ...form, warp_strength_n: e.target.value })} />
        </div>
        <div>
          <Label>Эластичность</Label>
          <Input type="number" step="0.01" value={form.warp_elasticity} onChange={(e) => setForm({ ...form, warp_elasticity: e.target.value })} />
        </div>
      </div>
      <p className="text-sm text-zinc-400 font-medium pt-2">Уток</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Прочность кг</Label>
          <Input type="number" step="0.01" value={form.weft_strength_kg} onChange={(e) => setForm({ ...form, weft_strength_kg: e.target.value })} />
        </div>
        <div>
          <Label>Прочность Н</Label>
          <Input type="number" step="0.01" value={form.weft_strength_n} onChange={(e) => setForm({ ...form, weft_strength_n: e.target.value })} />
        </div>
        <div>
          <Label>Эластичность</Label>
          <Input type="number" step="0.01" value={form.weft_elasticity} onChange={(e) => setForm({ ...form, weft_elasticity: e.target.value })} />
        </div>
      </div>
    </>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Лаборатория</h1>

      <Tabs defaultValue="yarn">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-900 p-1 mb-6">
          <TabsTrigger value="yarn">Нить</TabsTrigger>
          <TabsTrigger value="extruder">Экструдер</TabsTrigger>
          <TabsTrigger value="machine">Станки КТС</TabsTrigger>
          <TabsTrigger value="fabric">Ткань КТС</TabsTrigger>
          <TabsTrigger value="strap">Стропы ПТС</TabsTrigger>
          <TabsTrigger value="lamination">Ламинация</TabsTrigger>
          <TabsTrigger value="mfi">ПТР Сырья</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            1. НИТЬ
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="yarn">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание нити</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('yarn', yarnForm as unknown as Record<string, string>, () => setYarnForm(INITIAL_YARN)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Код нити *</Label>
                    <Input value={yarnForm.yarn_code} onChange={(e) => setYarnForm({ ...yarnForm, yarn_code: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Партия</Label>
                    <Input value={yarnForm.batch} onChange={(e) => setYarnForm({ ...yarnForm, batch: e.target.value })} />
                  </div>
                  <div>
                    <Label>Денье</Label>
                    <Input type="number" value={yarnForm.denier} onChange={(e) => setYarnForm({ ...yarnForm, denier: e.target.value })} />
                  </div>
                  <div>
                    <Label>Прочность</Label>
                    <Input type="number" step="0.01" value={yarnForm.strength} onChange={(e) => setYarnForm({ ...yarnForm, strength: e.target.value })} />
                  </div>
                  <div>
                    <Label>Эластичность</Label>
                    <Input type="number" step="0.01" value={yarnForm.elasticity} onChange={(e) => setYarnForm({ ...yarnForm, elasticity: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ширина (см)</Label>
                    <Input type="number" step="0.1" value={yarnForm.width} onChange={(e) => setYarnForm({ ...yarnForm, width: e.target.value })} />
                  </div>
                </div>
                {renderCommon(yarnForm as unknown as Record<string, string>, (v) => setYarnForm(v as typeof INITIAL_YARN))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            2. ЭКСТРУДЕР
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="extruder">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание экструдера</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('extruder', extruderForm as unknown as Record<string, string>, () => setExtruderForm(INITIAL_EXTRUDER)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Смена</Label>
                    <Select value={extruderForm.shift} onValueChange={(v) => setExtruderForm({ ...extruderForm, shift: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="День">День</SelectItem>
                        <SelectItem value="Ночь">Ночь</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Станок *</Label>
                    <Input value={extruderForm.machine} onChange={(e) => setExtruderForm({ ...extruderForm, machine: e.target.value })} required />
                  </div>
                </div>

                <p className="text-sm text-zinc-400 font-medium pt-2">Температуры (°C)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>T1</Label><Input type="number" step="0.1" value={extruderForm.temp1} onChange={(e) => setExtruderForm({ ...extruderForm, temp1: e.target.value })} /></div>
                  <div><Label>T2</Label><Input type="number" step="0.1" value={extruderForm.temp2} onChange={(e) => setExtruderForm({ ...extruderForm, temp2: e.target.value })} /></div>
                  <div><Label>T3</Label><Input type="number" step="0.1" value={extruderForm.temp3} onChange={(e) => setExtruderForm({ ...extruderForm, temp3: e.target.value })} /></div>
                  <div><Label>T4</Label><Input type="number" step="0.1" value={extruderForm.temp4} onChange={(e) => setExtruderForm({ ...extruderForm, temp4: e.target.value })} /></div>
                  <div><Label>T5</Label><Input type="number" step="0.1" value={extruderForm.temp5} onChange={(e) => setExtruderForm({ ...extruderForm, temp5: e.target.value })} /></div>
                  <div><Label>Отжиг</Label><Input type="number" step="0.1" value={extruderForm.annealing} onChange={(e) => setExtruderForm({ ...extruderForm, annealing: e.target.value })} /></div>
                </div>

                <p className="text-sm text-zinc-400 font-medium pt-2">Дозаторы</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Дозатор 1</Label><Input type="number" step="0.01" value={extruderForm.d1} onChange={(e) => setExtruderForm({ ...extruderForm, d1: e.target.value })} /></div>
                  <div><Label>Дозатор 2</Label><Input type="number" step="0.01" value={extruderForm.d2} onChange={(e) => setExtruderForm({ ...extruderForm, d2: e.target.value })} /></div>
                  <div><Label>Дозатор 3</Label><Input type="number" step="0.01" value={extruderForm.d3} onChange={(e) => setExtruderForm({ ...extruderForm, d3: e.target.value })} /></div>
                  <div><Label>Дозатор 4</Label><Input type="number" step="0.01" value={extruderForm.d4} onChange={(e) => setExtruderForm({ ...extruderForm, d4: e.target.value })} /></div>
                  <div><Label>Дозатор 5</Label><Input type="number" step="0.01" value={extruderForm.d5} onChange={(e) => setExtruderForm({ ...extruderForm, d5: e.target.value })} /></div>
                  <div><Label>Дозатор 6</Label><Input type="number" step="0.01" value={extruderForm.d6} onChange={(e) => setExtruderForm({ ...extruderForm, d6: e.target.value })} /></div>
                </div>

                {renderCommon(extruderForm as unknown as Record<string, string>, (v) => setExtruderForm(v as typeof INITIAL_EXTRUDER))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            3. СТАНКИ КТС
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="machine">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание станка КТС</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('machine', machineForm as unknown as Record<string, string>, () => setMachineForm(INITIAL_MACHINE)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>№ станка *</Label>
                    <Input value={machineForm.machine_number} onChange={(e) => setMachineForm({ ...machineForm, machine_number: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Ширина (см)</Label>
                    <Input type="number" step="0.1" value={machineForm.width} onChange={(e) => setMachineForm({ ...machineForm, width: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Визуальный осмотр</Label>
                  <Textarea value={machineForm.visual_check} onChange={(e) => setMachineForm({ ...machineForm, visual_check: e.target.value })} rows={2} placeholder="Описание осмотра" />
                </div>
                <div>
                  <Label>Дефекты</Label>
                  <Input value={machineForm.defects} onChange={(e) => setMachineForm({ ...machineForm, defects: e.target.value })} placeholder="Описание дефектов или «нет»" />
                </div>
                {renderCommon(machineForm as unknown as Record<string, string>, (v) => setMachineForm(v as typeof INITIAL_MACHINE))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            4. ТКАНЬ КТС
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="fabric">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание ткани КТС</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('fabric', fabricForm as unknown as Record<string, string>, () => setFabricForm(INITIAL_FABRIC)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>№ станка</Label>
                    <Input value={fabricForm.machine_number} onChange={(e) => setFabricForm({ ...fabricForm, machine_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>№ рулона</Label>
                    <Input value={fabricForm.roll_number} onChange={(e) => setFabricForm({ ...fabricForm, roll_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Код ткани</Label>
                    <Input value={fabricForm.fabric_code} onChange={(e) => setFabricForm({ ...fabricForm, fabric_code: e.target.value })} />
                  </div>
                </div>
                {renderWarpWeft(fabricForm as unknown as Record<string, string>, (v) => setFabricForm(v as typeof INITIAL_FABRIC))}
                <div>
                  <Label>Плотность</Label>
                  <Input type="number" step="0.01" value={fabricForm.density} onChange={(e) => setFabricForm({ ...fabricForm, density: e.target.value })} />
                </div>
                {renderCommon(fabricForm as unknown as Record<string, string>, (v) => setFabricForm(v as typeof INITIAL_FABRIC))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            5. СТРОПЫ ПТС
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="strap">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание строп ПТС</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('strap', strapForm as unknown as Record<string, string>, () => setStrapForm(INITIAL_STRAP)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>№ партии</Label>
                    <Input value={strapForm.batch_number} onChange={(e) => setStrapForm({ ...strapForm, batch_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Тип стропы</Label>
                    <Input value={strapForm.strap_type} onChange={(e) => setStrapForm({ ...strapForm, strap_type: e.target.value })} />
                  </div>
                  <div>
                    <Label>Натяжение кг</Label>
                    <Input type="number" step="0.01" value={strapForm.tension_kg} onChange={(e) => setStrapForm({ ...strapForm, tension_kg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Натяжение Н</Label>
                    <Input type="number" step="0.01" value={strapForm.tension_n} onChange={(e) => setStrapForm({ ...strapForm, tension_n: e.target.value })} />
                  </div>
                  <div>
                    <Label>Эластичность</Label>
                    <Input type="number" step="0.01" value={strapForm.elasticity} onChange={(e) => setStrapForm({ ...strapForm, elasticity: e.target.value })} />
                  </div>
                  <div>
                    <Label>Плотность</Label>
                    <Input type="number" step="0.01" value={strapForm.density} onChange={(e) => setStrapForm({ ...strapForm, density: e.target.value })} />
                  </div>
                </div>
                {renderCommon(strapForm as unknown as Record<string, string>, (v) => setStrapForm(v as typeof INITIAL_STRAP))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            6. ЛАМИНАЦИЯ
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="lamination">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Испытание ламинации</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('lamination', laminationForm as unknown as Record<string, string>, () => setLaminationForm(INITIAL_LAMINATION)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>№ рулона</Label>
                    <Input value={laminationForm.roll_number} onChange={(e) => setLaminationForm({ ...laminationForm, roll_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Информация рулона</Label>
                    <Input value={laminationForm.roll_info} onChange={(e) => setLaminationForm({ ...laminationForm, roll_info: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ширина (см)</Label>
                    <Input type="number" step="0.1" value={laminationForm.width} onChange={(e) => setLaminationForm({ ...laminationForm, width: e.target.value })} />
                  </div>
                </div>
                {renderWarpWeft(laminationForm as unknown as Record<string, string>, (v) => setLaminationForm(v as typeof INITIAL_LAMINATION))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Плотность</Label>
                    <Input type="number" step="0.01" value={laminationForm.density} onChange={(e) => setLaminationForm({ ...laminationForm, density: e.target.value })} />
                  </div>
                  <div>
                    <Label>Адгезия</Label>
                    <Input value={laminationForm.adhesion} onChange={(e) => setLaminationForm({ ...laminationForm, adhesion: e.target.value })} />
                  </div>
                </div>
                {renderCommon(laminationForm as unknown as Record<string, string>, (v) => setLaminationForm(v as typeof INITIAL_LAMINATION))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            7. ПТР СЫРЬЯ
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mfi">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>ПТР сырья</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit('mfi', mfiForm as unknown as Record<string, string>, () => setMfiForm(INITIAL_MFI)); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Тип материала</Label>
                    <Input value={mfiForm.material_type} onChange={(e) => setMfiForm({ ...mfiForm, material_type: e.target.value })} />
                  </div>
                  <div>
                    <Label>Код материала</Label>
                    <Input value={mfiForm.material_code} onChange={(e) => setMfiForm({ ...mfiForm, material_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>Партия</Label>
                    <Input value={mfiForm.batch} onChange={(e) => setMfiForm({ ...mfiForm, batch: e.target.value })} />
                  </div>
                  <div>
                    <Label>ПТР (г/10мин)</Label>
                    <Input type="number" step="0.01" value={mfiForm.mfi} onChange={(e) => setMfiForm({ ...mfiForm, mfi: e.target.value })} />
                  </div>
                  <div>
                    <Label>Температура (°C)</Label>
                    <Input type="number" step="0.1" value={mfiForm.temperature} onChange={(e) => setMfiForm({ ...mfiForm, temperature: e.target.value })} />
                  </div>
                  <div>
                    <Label>Нагрузка (кг)</Label>
                    <Input type="number" step="0.01" value={mfiForm.load} onChange={(e) => setMfiForm({ ...mfiForm, load: e.target.value })} />
                  </div>
                </div>
                {renderCommon(mfiForm as unknown as Record<string, string>, (v) => setMfiForm(v as typeof INITIAL_MFI))}
                <Button type="submit" className="w-full" disabled={loading}>Сохранить</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
