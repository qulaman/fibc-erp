import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: KPICardProps) {
  const colorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-600",
    purple: "bg-purple-600",
  }[color] || "bg-blue-600";

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-zinc-400 font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white">{value}</h3>
              {trend && (
                <span className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.isPositive ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <div className={`${colorClasses} p-3 rounded-lg`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
