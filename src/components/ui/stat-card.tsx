import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue'
}: StatCardProps) {

    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
        red: 'from-red-500 to-red-600',
    };

    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl transform rotate-1 group-hover:rotate-2 transition-transform duration-300"></div>

            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                        <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>

                        {trend && (
                            <div className="flex items-center gap-1">
                                <span className={cn(
                                    "text-xs font-semibold",
                                    trend.isPositive ? "text-green-600" : "text-red-600"
                                )}>
                                    {trend.isPositive ? '↑' : '↓'} {trend.value}
                                </span>
                                <span className="text-xs text-gray-500">من الشهر الماضي</span>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
                        colorClasses[color]
                    )}>
                        <Icon size={28} />
                    </div>
                </div>
            </div>
        </div>
    );
}
