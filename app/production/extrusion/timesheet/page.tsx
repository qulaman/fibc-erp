'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
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
  shift_type: string; // 'Day' | 'Night'
}

export default function ExtrusionTimesheetPage() {
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [paintHours, setPaintHours] = useState<string>("6");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => { fetchData(); }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('is_active', true)
        .in('role', ['operator_extruder', 'operator_winder', 'mixer'])
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
      toast.error('Не удалось загрузить данные табеля.');
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

  const getDateStr = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const toggleAttendance = async (employeeId: string, day: number, shiftType: 'Day' | 'Night') => {
    const dateStr = getDateStr(day);
    const existing = attendance.find(
      r => r.employee_id === employeeId && r.date === dateStr && r.shift_type === shiftType
    );

    if (existing) {
      setAttendance(prev => prev.filter(r => !(r.employee_id === employeeId && r.date === dateStr && r.shift_type === shiftType)));
      await supabase.from('employee_attendance').delete().match({ employee_id: employeeId, date: dateStr, shift_type: shiftType });
    } else {
      const hoursValue = parseFloat(paintHours) || 0;
      if (hoursValue <= 0) return;
      const newRecord = { employee_id: employeeId, date: dateStr, status: 'present', hours: hoursValue, shift_type: shiftType };
      setAttendance(prev => [...prev, newRecord]);
      await supabase.from('employee_attendance').insert([newRecord]);
    }
  };

  const getEmployeeTotalHours = (empId: string) =>
    attendance.filter(a => a.employee_id === empId).reduce((sum, r) => sum + (r.hours || 0), 0);

  const adjustHours = (delta: number) => {
    setPaintHours(prev => {
      const val = (parseFloat(prev) || 0) + delta;
      return val > 0 ? val.toString() : "1";
    });
  };

  const exportToCSV = () => {
    const daysHeader = daysArray.join(';');
    let csv = `Сотрудник;Должность;${daysHeader};Итого часов\n`;
    employees.forEach(emp => {
      const totalHours = getEmployeeTotalHours(emp.id);
      const daysData = daysArray.map(day => {
        const dateStr = getDateStr(day);
        const dayRec = attendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift_type === 'Day');
        const nightRec = attendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift_type === 'Night');
        if (dayRec && nightRec) return `Д${dayRec.hours}+Н${nightRec.hours}`;
        if (dayRec) return `Д${dayRec.hours}`;
        if (nightRec) return `Н${nightRec.hours}`;
        return '';
      }).join(';');
      csv += `${emp.full_name};${emp.role};${daysData};${String(totalHours).replace('.', ',')}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Табель_Экструзия_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container max-w-[100vw] overflow-x-hidden p-3 md:p-6 pb-32 md:pb-40">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <Calendar className="text-[#E60012]" size={20} />
            <span className="hidden sm:inline">Табель Экструзии</span><span className="sm:hidden">Табель</span>
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
            <Download size={18} className="text-emerald-500" />
          </Button>
        </div>
      </div>

      {/* ТАБЛИЦА */}
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
                <th className="p-2 md:p-4 text-left min-w-[120px] md:min-w-[220px] sticky left-0 bg-zinc-950 z-20 font-bold text-zinc-300 border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)] text-xs md:text-sm">
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
                    <th key={day} className={`p-0 min-w-[40px] text-center border-r border-zinc-800/50 font-normal select-none
                      ${isWeekend ? 'text-red-400 bg-red-900/10' : 'text-zinc-400'}
                      ${isToday ? 'bg-indigo-900/30 text-indigo-400 font-bold border-b-2 border-indigo-500' : ''}
                    `}>
                      <div className="text-[10px] uppercase opacity-50 pt-1">{date.toLocaleString('ru', { weekday: 'short' })}</div>
                      <div className="text-base pb-1">{day}</div>
                      <div className="flex border-t border-zinc-800/50">
                        <div className="flex-1 flex items-center justify-center h-4 text-[8px] text-amber-500/60 border-r border-zinc-800/30"><Sun size={7}/></div>
                        <div className="flex-1 flex items-center justify-center h-4 text-[8px] text-indigo-400/60"><Moon size={7}/></div>
                      </div>
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
                    <td className="p-2 md:p-3 sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors border-r border-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="font-bold text-white whitespace-nowrap text-xs md:text-sm">{emp.full_name}</div>
                      <div className="text-[10px] md:text-xs text-zinc-500 hidden sm:block">{emp.role}</div>
                    </td>
                    <td className="p-2 text-center border-r border-zinc-800 font-bold text-white bg-zinc-900/30">
                      {totalHours}
                    </td>
                    {daysArray.map(day => {
                      const dateStr = getDateStr(day);
                      const dayRecord = attendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift_type === 'Day');
                      const nightRecord = attendance.find(a => a.employee_id === emp.id && a.date === dateStr && a.shift_type === 'Night');
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <td key={day} className={`p-0 border-r border-zinc-800/30 text-center ${isWeekend ? 'bg-zinc-950/30' : ''}`}>
                          <div className="flex">
                            {/* День */}
                            <div
                              onClick={() => toggleAttendance(emp.id, day, 'Day')}
                              className={`flex-1 flex flex-col items-center justify-center cursor-pointer h-10 border-r border-zinc-800/30 transition-colors
                                ${dayRecord ? 'bg-amber-600 text-white' : 'hover:bg-amber-900/20 text-zinc-700'}`}
                            >
                              {dayRecord ? (
                                <>
                                  <Sun size={8} className="opacity-80" />
                                  <span className="text-[10px] font-bold leading-none mt-[1px]">{dayRecord.hours}</span>
                                </>
                              ) : (
                                <Sun size={8} className="opacity-20" />
                              )}
                            </div>
                            {/* Ночь */}
                            <div
                              onClick={() => toggleAttendance(emp.id, day, 'Night')}
                              className={`flex-1 flex flex-col items-center justify-center cursor-pointer h-10 transition-colors
                                ${nightRecord ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-900/20 text-zinc-700'}`}
                            >
                              {nightRecord ? (
                                <>
                                  <Moon size={8} className="opacity-80" />
                                  <span className="text-[10px] font-bold leading-none mt-[1px]">{nightRecord.hours}</span>
                                </>
                              ) : (
                                <Moon size={8} className="opacity-20" />
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={35} className="p-12 text-center text-zinc-500">
                    В цехе экструзии нет сотрудников.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <div className="fixed bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 z-50 animate-in slide-in-from-bottom-10 ring-1 ring-white/10 max-w-[95vw]">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-600"/><Sun size={10}/> День</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-indigo-600"/><Moon size={10}/> Ночь</div>
        </div>
        <div className="w-px h-8 bg-zinc-800"/>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Часы</span>
          <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400" onClick={() => adjustHours(-1)}>
              <Minus size={14} />
            </Button>
            <div className="relative mx-1">
              <Input
                type="number"
                value={paintHours}
                onChange={e => setPaintHours(e.target.value)}
                className="w-14 h-8 text-center text-lg font-bold bg-zinc-950 border-zinc-700 text-white p-0"
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 pointer-events-none">ч</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400" onClick={() => adjustHours(1)}>
              <Plus size={14} />
            </Button>
          </div>
        </div>
        <div className="hidden md:block text-xs text-zinc-500 border-l border-zinc-800 pl-3">
          Кликайте на ячейку смены
        </div>
      </div>

    </div>
  );
}
