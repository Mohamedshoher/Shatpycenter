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
        <div className="flex items-center gap-1.5 pb-1">
            {/* اختيار الحلقة/المجموعة */}
            <div className="relative shrink min-w-0">
                <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="appearance-none bg-white border border-gray-100 px-6 py-2.5 pr-2 rounded-[16px] text-[10px] font-black text-gray-600 focus:outline-none shadow-sm cursor-pointer w-full"
                >
                    <option value="all">كل الحلقات</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* فلتر غياب متصل */}
            <div className="flex items-center bg-gray-100/50 rounded-[16px] p-0.5 border border-gray-100 shadow-sm shrink-0">
                <input
                    type="number"
                    placeholder="0"
                    value={continuousLimit}
                    onChange={(e) => setContinuousLimit(e.target.value)}
                    className="w-8 h-8 bg-white rounded-[12px] text-center font-black text-blue-600 focus:outline-none text-[11px]"
                />
                <span className="text-[8px] font-black text-blue-800/60 px-1.5">متصل</span>
            </div>

            {/* فلتر غياب كلي */}
            <div className="flex items-center bg-gray-100/50 rounded-[16px] p-0.5 border border-gray-100 shadow-sm shrink-0">
                <input
                    type="number"
                    placeholder="0"
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(e.target.value)}
                    className="w-8 h-8 bg-white rounded-[12px] text-center font-black text-amber-600 focus:outline-none text-[11px]"
                />
                <span className="text-[8px] font-black text-amber-800/60 px-1.5">كلي</span>
            </div>

            {/* عدد النتائج المصفاة */}
            <div className="w-9 h-9 bg-blue-600 rounded-[16px] flex items-center justify-center shadow-lg shadow-blue-200 shrink-0 mr-auto">
                <span className="text-sm font-black text-white font-sans">{count}</span>
            </div>
        </div>
    );
}