'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, ChevronLeft, ChevronRight, Moon, Sun,
  Minus, Plus, Download, Loader2
} from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface AttendanceRecord {
  employee_id: string;
  date: string;
  status: string;
  hours: number;
  shift_type: string;
}

export default function StrapsTimesheetPage() {
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [paintHours, setPaintHours] = useState<string>("12");
  const [paintShift, setPaintShift] = useState<'Day' | 'Night'>('Day');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем сотрудников цеха строп
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('is_active', true)
        .in('role', ['strap_operator', 'strap_master'])
        .order('full_name');

      if (empError) throw empError;
      setEmployees(empData || []);

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data: attData, error: attError } = await supabase
          .from('employee_attendance')
          .select('employee_id, date, status, hours, shift_type')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

      if (attError) throw attError;
      setAttendance(attData || []);
    } catch (e: any) {
      console.error('Ошибка загрузки:', e.message);
      alert('Не удалось загрузить данные табеля.');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const daysArray = getDaysInMonth();
  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const toggleAttendance = async (employeeId: string, day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const existingRecord = attendance.find(r => r.employee_id === employeeId && r.date === dateStr);

    if (existingRecord) {
        setAttendance(prev => prev.filter(r => r !== existingRecord));
        await supabase.from('employee_attendance').delete().match({ employee_id: employeeId, date: dateStr });
    } else {
        const hoursValue = parseFloat(paintHours) || 0;
        if (hoursValue <= 0) return alert("Введите корректное количество часов!");

        const newRecord = {
            employee_id: employeeId,
            date: dateStr,
            status: 'present',
            hours: hoursValue,
            shift_type: paintShift
        };

        setAttendance(prev => [...prev, newRecord]);
        await supabase.from('employee_attendance').insert([newRecord]);
    }
  };

  const getEmployeeTotalHours = (empId: string) => {
    return attendance.filter(a => a.employee_id === empId).reduce((sum, record) => sum + (record.hours || 0), 0);
  };

  const adjustHours = (delta: number) => {
      setPaintHours(prev => {
          const val = (parseFloat(prev) || 0) + delta;
          return val > 0 ? val.toString() : "1";
      });
  };

  const exportToCSV = () => {
    const daysHeader = daysArray.map(d => d).join(';');
    let csvContent = `Сотрудник;Должность;${daysHeader};Итого часов\n`;

    employees.forEach(emp => {
        const totalHours = getEmployeeTotalHours(emp.id);
        const daysData = daysArray.map(day => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = attendance.find(a => a.employee_id === emp.id && a.date === dateStr);
            return record ? String(record.hours).replace('.', ',') : '';
        }).join(';');

        csvContent += `${emp.full_name};${emp.role};${daysData};${String(totalHours).replace('.', ',')}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Табель_Строп_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-6 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-3xl font-bold flex items-center gap-2">
             <Calendar className="text-[#E60012]" /> Табель Строп
           </h1>
           <p className="text-zinc-400 capitalize">{monthName}</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800">
           <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
              <span className="w-32 text-center font-bold capitalize select-none">{monthName}</span>
              <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}><ChevronRight /></Button>
           </div>

           <Button variant="outline" size="icon" className="bg-zinc-950 border-zinc-700 hover:bg-zinc-800" onClick={exportToCSV} title="Скачать в Excel">
              <Download size={18} className="text-emerald-500"/>
           </Button>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl relative min-h-[400px]">
        {loading && (
           <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                 <Loader2 className="animate-spin text-[#E60012]" size={40} />
                 <span className="text-white font-bold">Загрузка табеля...</span>
              </div>
           </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800">
                <th className="p-4 text-left min-w-[220px] sticky left-0 bg-zinc-950 z-20 font-bold text-zinc-300 border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                    Сотрудник
                </th>
                <th className="p-2 text-center min-w-[70px] font-bold text-[#E60012] border-r border-zinc-800 bg-zinc-950/50">
                    Итого
                </th>
                {daysArray.map(day => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <th key={day} className={`p-1 min-w-[40px] text-center border-r border-zinc-800/50 font-normal select-none
                            ${isWeekend ? 'text-red-400 bg-red-900/10' : 'text-zinc-400'}
                            ${isToday ? 'bg-indigo-900/30 text-indigo-400 font-bold border-b-2 border-indigo-500' : ''}
                        `}>
                            <div className="text-[10px] uppercase opacity-50">{date.toLocaleString('ru', { weekday: 'short' })}</div>
                            <div className="text-lg">{day}</div>
                        </th>
                    );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
               {employees.map(emp => {
                   const totalHours = getEmployeeTotalHours(emp.id);

                   return (
                       <tr key={emp.id} className="hover:bg-zinc-800/30 transition-colors group">
                           <td className="p-3 sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors border-r border-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                               <div className="font-bold text-white whitespace-nowrap">{emp.full_name}</div>
                               <div className="text-xs text-zinc-500">{emp.role}</div>
                           </td>

                           <td className="p-2 text-center border-r border-zinc-800 font-bold text-white bg-zinc-900/30">
                               {totalHours}
                           </td>

                           {daysArray.map(day => {
                               const year = currentDate.getFullYear();
                               const month = currentDate.getMonth();
                               const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                               const record = attendance.find(a => a.employee_id === emp.id && a.date === dateStr);
                               const date = new Date(year, month, day);
                               const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                               let cellColor = '';
                               if (record) {
                                   if (record.shift_type === 'Night') cellColor = 'bg-indigo-600 shadow-indigo-900/20';
                                   else cellColor = 'bg-amber-600 shadow-amber-900/20';
                               }

                               return (
                                   <td key={day} onClick={() => toggleAttendance(emp.id, day)} className={`p-0 border-r border-zinc-800/30 cursor-pointer text-center relative h-12 ${isWeekend ? 'bg-zinc-950/30' : ''} hover:bg-zinc-800 transition-colors`}>
                                      {record ? (
                                          <div className={`h-9 w-9 mx-auto my-1 rounded-md flex flex-col items-center justify-center text-white shadow-lg animate-in zoom-in duration-200 ${cellColor}`}>
                                              <span className="text-[10px] leading-none opacity-80 mb-[2px]">
                                                  {record.shift_type === 'Night' ? <Moon size={10}/> : <Sun size={10}/>}
                                              </span>
                                              <span className="text-xs font-bold leading-none">{record.hours}</span>
                                          </div>
                                      ) : (
                                          <div className="h-full w-full hover:bg-white/5 transition-colors"></div>
                                      )}
                                   </td>
                               );
                           })}
                       </tr>
                   );
               })}

               {!loading && employees.length === 0 && (
                  <tr>
                     <td colSpan={35} className="p-12 text-center text-zinc-500">
                        В цехе строп нет сотрудников.
                     </td>
                  </tr>
               )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 p-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 z-50 animate-in slide-in-from-bottom-10 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Смена</span>
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                  <button onClick={() => setPaintShift('Day')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium ${paintShift === 'Day' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>
                      <Sun size={18} /> День
                  </button>
                  <button onClick={() => setPaintShift('Night')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium ${paintShift === 'Night' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>
                      <Moon size={18} /> Ночь
                  </button>
              </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-zinc-800"></div>

          <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Часы</span>
              <div className="flex items-center bg-zinc-900 rounded-lg p-1 border-zinc-800">
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-800 text-zinc-400" onClick={() => adjustHours(-1)}>
                      <Minus size={16}/>
                  </Button>
                  <div className="relative mx-1">
                      <Input type="number" value={paintHours} onChange={(e) => setPaintHours(e.target.value)} className="w-16 h-10 text-center text-xl font-bold bg-zinc-950 border-zinc-700 text-white focus:ring-amber-600 p-0"/>
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 pointer-events-none">ч</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-800 text-zinc-400" onClick={() => adjustHours(1)}>
                      <Plus size={16}/>
                  </Button>
              </div>
          </div>

          <div className="hidden md:block px-3 text-xs text-zinc-500 border-l border-zinc-800 pl-4">
              1. Настройте смену и часы<br/>2. Кликайте по ячейкам
          </div>
      </div>
    </div>
  );
}
