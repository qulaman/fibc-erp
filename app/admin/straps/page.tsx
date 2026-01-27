'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ribbon, Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import Link from 'next/link';

export default function StrapsAdminPage() {
  const [straps, setStraps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Форма добавления
  const [form, setForm] = useState({
     name: '', 
     code: '', 
     width_mm: '', 
     color: '',
     standard_weight_g_m: ''
  });

  useEffect(() => { fetchStraps(); }, []);

  const fetchStraps = async () => {
    const { data } = await supabase
      .from('strap_types')
      .select('*')
      .order('code');
    if (data) setStraps(data);
  };

  const handleSave = async () => {
     if (!form.code || !form.name) return alert('Укажите Артикул и Название');
     setLoading(true);

     try {
       const { error } = await supabase.from('strap_types').insert([{
          name: form.name,
          code: form.code,
          width_mm: Number(form.width_mm) || 0,
          color: form.color,
          standard_weight_g_m: Number(form.standard_weight_g_m) || 0
       }]);

       if (error) throw error;

       // Сброс формы и обновление
       setForm({ name: '', code: '', width_mm: '', color: '', standard_weight_g_m: '' });
       fetchStraps();
       
     } catch (e: any) {
        alert('Ошибка: ' + e.message);
     } finally {
        setLoading(false);
     }
  };

  const handleDelete = async (id: string) => {
     if (!confirm('Удалить эту спецификацию?')) return;
     await supabase.from('strap_types').delete().eq('id', id);
     fetchStraps();
  };

  return (
    <div className="page-container">
      <div className="header-section">
         <h1 className="h1-bold flex items-center gap-2">
            <Link href="/production/straps" className="text-muted-foreground hover:text-white"><ArrowLeft/></Link> 
            Справочник Строп
         </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* ФОРМА ДОБАВЛЕНИЯ */}
         <div className="lg:col-span-4">
            <Card className="bg-card sticky top-4">
               <CardHeader><CardTitle>Новая спецификация</CardTitle></CardHeader>
               <CardContent className="space-y-4">
                  <div>
                     <Label>Артикул (Code)</Label>
                     <Input placeholder="Напр: S-45-W" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                  </div>
                  <div>
                     <Label>Название</Label>
                     <Input placeholder="Напр: Стропа 45мм Стандарт" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label>Ширина (мм)</Label>
                        <Input type="number" placeholder="45" value={form.width_mm} onChange={e => setForm({...form, width_mm: e.target.value})} />
                     </div>
                     <div>
                        <Label>Вес (г/м)</Label>
                        <Input type="number" placeholder="25.5" value={form.standard_weight_g_m} onChange={e => setForm({...form, standard_weight_g_m: e.target.value})} />
                     </div>
                  </div>
                  <div>
                     <Label>Цвет</Label>
                     <Input placeholder="Белый" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                  </div>
                  
                  <Button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
                     {loading ? '...' : <><Save size={16} className="mr-2"/> Добавить</>}
                  </Button>
               </CardContent>
            </Card>
         </div>

         {/* ТАБЛИЦА СПИСКА */}
         <div className="lg:col-span-8">
            <Card className="bg-card">
               <CardContent className="p-0">
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Артикул</TableHead>
                           <TableHead>Описание</TableHead>
                           <TableHead>Параметры</TableHead>
                           <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {straps.length === 0 ? (
                           <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Нет записей</TableCell></TableRow>
                        ) : (
                           straps.map(s => (
                              <TableRow key={s.id}>
                                 <TableCell className="font-mono font-bold text-white">{s.code}</TableCell>
                                 <TableCell>
                                    <div>{s.name}</div>
                                    <div className="text-xs text-muted-foreground">{s.color}</div>
                                 </TableCell>
                                 <TableCell>
                                    <div className="flex gap-2">
                                       <Badge variant="outline">{s.width_mm} мм</Badge>
                                       {s.standard_weight_g_m > 0 && 
                                          <Badge variant="secondary" className="bg-zinc-800">{s.standard_weight_g_m} г/м</Badge>
                                       }
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-400 hover:bg-red-950/20">
                                       <Trash2 size={16}/>
                                    </Button>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}