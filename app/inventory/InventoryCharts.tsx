'use client'

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#E60012', '#FFFFFF', '#A1A1AA', '#52525B', '#7F1D1D', '#FCA5A5'];

// ВАЖНО: здесь должно быть написано export DEFAULT function
export default function InventoryCharts({ materials }: { materials: any[] }) {
  
  // Защита от ошибок: если данные не пришли, не ломаем сайт
  if (!materials) return null;

  const pieData = materials
    .filter(m => m.current_balance > 0)
    .map(m => ({
      name: m.name,
      value: Number(m.current_balance)
    }));

  const barData = materials
    .slice(0, 7)
    .map(m => ({
      name: m.name.split(' ')[0],
      Остаток: m.current_balance,
      Минимум: m.min_stock
    }));

  if (pieData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
        <h3 className="text-zinc-400 text-sm font-bold mb-4 uppercase">Структура запасов (кг)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} itemStyle={{ color: '#fff' }}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
        <h3 className="text-zinc-400 text-sm font-bold mb-4 uppercase">Остаток vs Минимум</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#52525B" fontSize={12} />
              <YAxis stroke="#52525B" fontSize={12} />
              <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
              <Bar dataKey="Остаток" fill="#E60012" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Минимум" fill="#52525B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}