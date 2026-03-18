"use client";
import { CheckCircle2, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceStatsProps {
    presentCount: number;
    absentCount: number;
    showPresentChart: boolean;
    setShowPresentChart: (val: boolean) => void;
    showAbsentChart: boolean;
    setShowAbsentChart: (val: boolean) => void;
}

export default function AttendanceStats({
    presentCount,
    absentCount,
    showPresentChart,
    setShowPresentChart,
    showAbsentChart,
    setShowAbsentChart
}: AttendanceStatsProps) {
    return (
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {/* إحصائية الحاضرين */}
            <button
                onClick={() => setShowPresentChart(!showPresentChart)}
                className={cn(
                    "border rounded-[12px] py-1 px-2.5 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm",
                    showPresentChart ? "bg-green-500 border-green-600 text-white" : "bg-green-50/50 border-green-100 text-green-700"
                )}
            >
                <div className="flex flex-col items-end">
                    <span className={cn("text-[8px] font-black leading-tight", showPresentChart ? "text-green-100" : "text-green-700")}>حاضر</span>
                    <span className={cn("text-lg font-black font-sans leading-none", showPresentChart ? "text-white" : "text-green-600")}>{presentCount}</span>
                </div>
                <CheckCircle2 size={16} className={showPresentChart ? "text-white" : "text-green-500"} />
            </button>

            {/* إحصائية الغائبين */}
            <button
                onClick={() => setShowAbsentChart(!showAbsentChart)}
                className={cn(
                    "border rounded-[12px] py-1 px-2.5 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm",
                    showAbsentChart ? "bg-red-500 border-red-600 text-white" : "bg-red-50/50 border-red-100 text-red-700"
                )}
            >
                <div className="flex flex-col items-end">
                    <span className={cn("text-[8px] font-black leading-tight", showAbsentChart ? "text-red-100" : "text-red-700")}>غائب</span>
                    <span className={cn("text-lg font-black font-sans leading-none", showAbsentChart ? "text-white" : "text-red-500")}>{absentCount}</span>
                </div>
                <BarChart2 size={16} className={showAbsentChart ? "text-white" : "text-red-400"} />
            </button>
        </div>
    );
}