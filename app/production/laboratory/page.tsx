'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FlaskConical, BookOpen, CheckCircle2, XCircle, Save } from 'lucide-react';
import Link from 'next/link';

// ─── Утилиты ─────────────────────────────────────────────────────────────────
function getToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const PREFIXES: Record<string, string> = {
  yarn: 'LAB-YARN',
  extruder: 'LAB-EXT',
  machine: 'LAB-MCH',
  fabric: 'LAB-FAB',
  strap: 'LAB-STR',
  lamination: 'LAB-LAM',
  mfi: 'LAB-MFI',
};

const TEST_TABS = [
  { value: 'yarn',       label: 'Нить' },
  { value: 'extruder',   label: 'Экструдер' },
  { value: 'machine',    label: 'Станки КТС' },
  { value: 'fabric',     label: 'Ткань КТС' },
  { value: 'strap',      label: 'Стропы ПТС' },
  { value: 'lamination', label: 'Ламинация' },
  { value: 'mfi',        label: 'ПТР Сырья' },
];

// ─── Начальные состояния ──────────────────────────────────────────────────────
const base = { date: getToday(), operator: '', result: '', notes: '' };

const INIT = {
  yarn:       { ...base, yarn_code: '', batch: '', denier: '', strength: '', elasticity: '', width: '' },
  extruder:   { ...base, shift: 'День', machine: '', temp1: '', temp2: '', temp3: '', temp4: '', temp5: '', annealing: '', d1: '', d2: '', d3: '', d4: '', d5: '', d6: '' },
  machine:    { ...base, machine_number: '', width: '', visual_check: '', defects: '' },
  fabric:     { ...base, machine_number: '', roll_number: '', fabric_code: '', warp_strength_kg: '', warp_strength_n: '', warp_elasticity: '', weft_strength_kg: '', weft_strength_n: '', weft_elasticity: '', density: '' },
  strap:      { ...base, batch_number: '', strap_type: '', tension_kg: '', tension_n: '', elasticity: '', density: '' },
  lamination: { ...base, roll_number: '', roll_info: '', width: '', warp_strength_kg: '', warp_strength_n: '', warp_elasticity: '', weft_strength_kg: '', weft_strength_n: '', weft_elasticity: '', density: '', adhesion: '' },
  mfi:        { ...base, material_type: '', material_code: '', batch: '', mfi: '', temperature: '', load: '' },
};

type TestType = keyof typeof INIT;
type FormData = Record<string, string>;

// ─── Компоненты ───────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = '0.01', placeholder = '' }: { value: string; onChange: (v: string) => void; step?: string; placeholder?: string }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  );
}

function TextInput({ value, onChange, placeholder = '', required }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest pt-2 pb-1 border-b border-zinc-800">{children}</p>;
}

// Кнопки выбора (2-4 варианта)
function ToggleGroup({ options, value, onChange, accent = 'blue' }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent?: 'blue' | 'green' | 'red';
}) {
  const activeClass = {
    blue:  'bg-blue-600 border-blue-500 text-white',
    green: 'bg-green-600 border-green-500 text-white',
    red:   'bg-red-600 border-red-500 text-white',
  }[accent];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            value === opt.value ? activeClass : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Блок основа/уток (переиспользуется в ткань + ламинация)
function WarpWeft({ form, setForm }: { form: FormData; setForm: (v: FormData) => void }) {
  return (
    <>
      <SectionTitle>Основа</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Прочность кг"><NumInput value={form.warp_strength_kg} onChange={(v) => setForm({ ...form, warp_strength_kg: v })} /></Field>
        <Field label="Прочность Н"><NumInput value={form.warp_strength_n} onChange={(v) => setForm({ ...form, warp_strength_n: v })} /></Field>
        <Field label="Эластичность %"><NumInput value={form.warp_elasticity} onChange={(v) => setForm({ ...form, warp_elasticity: v })} /></Field>
      </div>
      <SectionTitle>Уток</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Прочность кг"><NumInput value={form.weft_strength_kg} onChange={(v) => setForm({ ...form, weft_strength_kg: v })} /></Field>
        <Field label="Прочность Н"><NumInput value={form.weft_strength_n} onChange={(v) => setForm({ ...form, weft_strength_n: v })} /></Field>
        <Field label="Эластичность %"><NumInput value={form.weft_elasticity} onChange={(v) => setForm({ ...form, weft_elasticity: v })} /></Field>
      </div>
    </>
  );
}

// Общие поля (дата / оператор / результат / примечания) — верх формы
function CommonHeader({ form, setForm }: { form: FormData; setForm: (v: FormData) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-zinc-800">
      <Field label="Дата" required>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </Field>
      <Field label="Лаборант">
        <TextInput value={form.operator} onChange={(v) => setForm({ ...form, operator: v })} placeholder="ФИО" />
      </Field>
    </div>
  );
}

// Финальные поля (результат + примечания) — низ формы
function CommonFooter({ form, setForm }: { form: FormData; setForm: (v: FormData) => void }) {
  return (
    <div className="space-y-4 pt-4 border-t border-zinc-800">
      <Field label="Результат" required>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, result: 'Годен' })}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-bold text-sm transition-all ${
              form.result === 'Годен'
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-400'
            }`}
          >
            <CheckCircle2 size={16} />
            Годен
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, result: 'Брак' })}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-bold text-sm transition-all ${
              form.result === 'Брак'
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-red-700 hover:text-red-400'
            }`}
          >
            <XCircle size={16} />
            Брак
          </button>
        </div>
      </Field>
      <Field label="Примечания">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Дополнительная информация..."
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </Field>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function LaboratoryPage() {
  const [activeTab, setActiveTab] = useState<TestType>('yarn');
  const [loading, setLoading] = useState(false);

  const [forms, setForms] = useState<{ [K in TestType]: FormData }>({
    yarn:       { ...INIT.yarn },
    extruder:   { ...INIT.extruder },
    machine:    { ...INIT.machine },
    fabric:     { ...INIT.fabric },
    strap:      { ...INIT.strap },
    lamination: { ...INIT.lamination },
    mfi:        { ...INIT.mfi },
  });

  const form = forms[activeTab];
  const setForm = (data: FormData) => setForms((prev) => ({ ...prev, [activeTab]: data }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.result) {
      toast.warning('Укажите результат испытания (Годен / Брак)');
      return;
    }
    setLoading(true);
    try {
      const { operator, result, notes, date, ...testData } = form;

      const { data: docNumber, error: rpcErr } = await supabase.rpc('generate_lab_doc_number', {
        p_prefix: PREFIXES[activeTab],
      });
      if (rpcErr) throw rpcErr;

      const { error } = await supabase.from('lab_tests').insert([{
        created_at: date + 'T12:00:00',
        doc_number: docNumber,
        test_type: activeTab,
        operator,
        result,
        notes,
        test_data: testData,
      }]);
      if (error) throw error;

      toast.success('Испытание сохранено', {
        description: `${docNumber} — ${result}`,
      });

      // Сбрасываем форму, сохраняя дату и оператора
      setForms((prev) => ({
        ...prev,
        [activeTab]: { ...INIT[activeTab], date: form.date, operator: form.operator },
      }));
    } catch (err: any) {
      toast.error('Ошибка сохранения', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Заголовок */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-700 p-2 rounded-lg inline-flex items-center justify-center">
              <FlaskConical size={24} className="text-white" />
            </div>
            Лаборатория
          </h1>
          <p className="page-description">Испытания и контроль качества материалов</p>
        </div>
        <Link
          href="/production/laboratory/journal"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-blue-600 text-zinc-300 hover:text-blue-400 rounded-lg transition-all text-sm font-medium"
        >
          <BookOpen size={16} />
          Журнал испытаний
        </Link>
      </div>

      {/* Выбор типа испытания */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TEST_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as TestType)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.value
                ? 'bg-blue-700 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Форма */}
      <div className="max-w-2xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">
            {TEST_TABS.find((t) => t.value === activeTab)?.label} — внести данные
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <CommonHeader form={form} setForm={setForm} />

            {/* ── Нить ─────────────────────────────────────────────────────── */}
            {activeTab === 'yarn' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Код нити" required>
                    <TextInput value={form.yarn_code} onChange={(v) => setForm({ ...form, yarn_code: v })} required placeholder="YARN-001" />
                  </Field>
                  <Field label="Партия">
                    <TextInput value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} />
                  </Field>
                  <Field label="Денье">
                    <NumInput value={form.denier} onChange={(v) => setForm({ ...form, denier: v })} step="1" />
                  </Field>
                  <Field label="Прочность">
                    <NumInput value={form.strength} onChange={(v) => setForm({ ...form, strength: v })} />
                  </Field>
                  <Field label="Эластичность %">
                    <NumInput value={form.elasticity} onChange={(v) => setForm({ ...form, elasticity: v })} />
                  </Field>
                  <Field label="Ширина см">
                    <NumInput value={form.width} onChange={(v) => setForm({ ...form, width: v })} step="0.1" />
                  </Field>
                </div>
              </>
            )}

            {/* ── Экструдер ────────────────────────────────────────────────── */}
            {activeTab === 'extruder' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Смена">
                    <ToggleGroup
                      options={[{ value: 'День', label: '☀️ День' }, { value: 'Ночь', label: '🌙 Ночь' }]}
                      value={form.shift}
                      onChange={(v) => setForm({ ...form, shift: v })}
                    />
                  </Field>
                  <Field label="Станок" required>
                    <TextInput value={form.machine} onChange={(v) => setForm({ ...form, machine: v })} required placeholder="Э-01" />
                  </Field>
                </div>
                <SectionTitle>Температуры (°C)</SectionTitle>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {['temp1','temp2','temp3','temp4','temp5'].map((k, i) => (
                    <Field key={k} label={`T${i + 1}`}><NumInput value={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} step="0.1" /></Field>
                  ))}
                  <Field label="Отжиг"><NumInput value={form.annealing} onChange={(v) => setForm({ ...form, annealing: v })} step="0.1" /></Field>
                </div>
                <SectionTitle>Дозаторы</SectionTitle>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {['d1','d2','d3','d4','d5','d6'].map((k, i) => (
                    <Field key={k} label={`Доз. ${i + 1}`}><NumInput value={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} /></Field>
                  ))}
                </div>
              </>
            )}

            {/* ── Станки КТС ───────────────────────────────────────────────── */}
            {activeTab === 'machine' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="№ станка" required>
                    <TextInput value={form.machine_number} onChange={(v) => setForm({ ...form, machine_number: v })} required placeholder="КТС-01" />
                  </Field>
                  <Field label="Ширина см">
                    <NumInput value={form.width} onChange={(v) => setForm({ ...form, width: v })} step="0.1" />
                  </Field>
                </div>
                <Field label="Визуальный осмотр">
                  <textarea
                    value={form.visual_check}
                    onChange={(e) => setForm({ ...form, visual_check: e.target.value })}
                    rows={2}
                    placeholder="Описание осмотра..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </Field>
                <Field label="Дефекты">
                  <TextInput value={form.defects} onChange={(v) => setForm({ ...form, defects: v })} placeholder="Нет / описание дефектов" />
                </Field>
              </>
            )}

            {/* ── Ткань КТС ────────────────────────────────────────────────── */}
            {activeTab === 'fabric' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="№ станка">
                    <TextInput value={form.machine_number} onChange={(v) => setForm({ ...form, machine_number: v })} />
                  </Field>
                  <Field label="№ рулона">
                    <TextInput value={form.roll_number} onChange={(v) => setForm({ ...form, roll_number: v })} />
                  </Field>
                  <Field label="Код ткани">
                    <TextInput value={form.fabric_code} onChange={(v) => setForm({ ...form, fabric_code: v })} />
                  </Field>
                </div>
                <WarpWeft form={form} setForm={setForm} />
                <Field label="Плотность">
                  <NumInput value={form.density} onChange={(v) => setForm({ ...form, density: v })} />
                </Field>
              </>
            )}

            {/* ── Стропы ПТС ───────────────────────────────────────────────── */}
            {activeTab === 'strap' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="№ партии">
                    <TextInput value={form.batch_number} onChange={(v) => setForm({ ...form, batch_number: v })} />
                  </Field>
                  <Field label="Тип стропы">
                    <TextInput value={form.strap_type} onChange={(v) => setForm({ ...form, strap_type: v })} placeholder="ПС-50, УС-35..." />
                  </Field>
                  <Field label="Натяжение кг">
                    <NumInput value={form.tension_kg} onChange={(v) => setForm({ ...form, tension_kg: v })} />
                  </Field>
                  <Field label="Натяжение Н">
                    <NumInput value={form.tension_n} onChange={(v) => setForm({ ...form, tension_n: v })} />
                  </Field>
                  <Field label="Эластичность %">
                    <NumInput value={form.elasticity} onChange={(v) => setForm({ ...form, elasticity: v })} />
                  </Field>
                  <Field label="Плотность">
                    <NumInput value={form.density} onChange={(v) => setForm({ ...form, density: v })} />
                  </Field>
                </div>
              </>
            )}

            {/* ── Ламинация ────────────────────────────────────────────────── */}
            {activeTab === 'lamination' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="№ рулона">
                    <TextInput value={form.roll_number} onChange={(v) => setForm({ ...form, roll_number: v })} />
                  </Field>
                  <Field label="Информация рулона">
                    <TextInput value={form.roll_info} onChange={(v) => setForm({ ...form, roll_info: v })} />
                  </Field>
                  <Field label="Ширина см">
                    <NumInput value={form.width} onChange={(v) => setForm({ ...form, width: v })} step="0.1" />
                  </Field>
                </div>
                <WarpWeft form={form} setForm={setForm} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Плотность">
                    <NumInput value={form.density} onChange={(v) => setForm({ ...form, density: v })} />
                  </Field>
                  <Field label="Адгезия">
                    <TextInput value={form.adhesion} onChange={(v) => setForm({ ...form, adhesion: v })} />
                  </Field>
                </div>
              </>
            )}

            {/* ── ПТР Сырья ────────────────────────────────────────────────── */}
            {activeTab === 'mfi' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Тип материала">
                    <TextInput value={form.material_type} onChange={(v) => setForm({ ...form, material_type: v })} placeholder="ПП, ПЭВП..." />
                  </Field>
                  <Field label="Код материала">
                    <TextInput value={form.material_code} onChange={(v) => setForm({ ...form, material_code: v })} />
                  </Field>
                  <Field label="Партия">
                    <TextInput value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} />
                  </Field>
                  <Field label="ПТР (г/10мин)">
                    <NumInput value={form.mfi} onChange={(v) => setForm({ ...form, mfi: v })} />
                  </Field>
                  <Field label="Температура °C">
                    <NumInput value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} step="0.1" />
                  </Field>
                  <Field label="Нагрузка кг">
                    <NumInput value={form.load} onChange={(v) => setForm({ ...form, load: v })} />
                  </Field>
                </div>
              </>
            )}

            <CommonFooter form={form} setForm={setForm} />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Сохранение...' : 'Сохранить испытание'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
