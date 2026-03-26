"use client";
import { ChevronDown } from 'lucide-react';

interface AttendanceFiltersProps {
    groups: any[];
    selectedGroupId: string;
    setSelectedGroupId: (id: string) => void;
    continuousLimit: string;
    setContinuousLimit: (val: string) => void;
    totalLimit: string;
    setTotalLimit: (val: string) => void;
    count: number;
}

export default function AttendanceFilters({
    groups,
    selectedGroupId,
    setSelectedGroupId,
    continuousLimit,
    setContinuousLimit,
    totalLimit,
    setTotalLimit,
    count
}: AttendanceFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm mb-2">
            {/* اختيار الحلقة/المجموعة */}
            <div className="relative flex-1 min-w-[140px]">
                <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="appearance-none w-full bg-gray-50/50 border border-gray-100 hover:border-blue-200 transition-colors px-4 py-2.5 pl-8 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                    <option value="all">كل الحلقات</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {/* فلتر غياب متصل */}
                <div className="flex items-center gap-2 bg-gray-50/50 rounded-xl px-2 py-1.5 border border-gray-100 hover:border-red-200 transition-colors">
                    <span className="text-[10px] font-bold text-gray-500 pr-1 shrink-0">غياب متصل:</span>
                    <input
                        type="number"
                        placeholder="0"
                        value={continuousLimit}
                        onChange={(e) => setContinuousLimit(e.target.value)}
                        className="w-12 h-8 bg-white border border-gray-100 rounded-lg text-center font-black text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs shadow-sm"
                    />
                </div>

                {/* فلتر غياب كلي */}
                <div className="flex items-center gap-2 bg-gray-50/50 rounded-xl px-2 py-1.5 border border-gray-100 hover:border-amber-200 transition-colors">
                    <span className="text-[10px] font-bold text-gray-500 pr-1 shrink-0">غياب كلي:</span>
                    <input
                        type="number"
                        placeholder="0"
                        value={totalLimit}
                        onChange={(e) => setTotalLimit(e.target.value)}
                        className="w-12 h-8 bg-white border border-gray-100 rounded-lg text-center font-black text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}