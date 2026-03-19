import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Search,
    UserX,
    ChevronRight,
    ChevronLeft,
    Users,
    X,
    FileText
} from 'lucide-react';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useAllAttendance } from '@/features/students/hooks/useAllAttendance';

interface AttendanceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'present' | 'absent';
    data?: any[]; // For compatibility with original usage if needed, but we'll use our own fetcher
}

export default function AttendanceChartModal({ isOpen, onClose, title, type }: AttendanceChartModalProps) {
    const { data: students = [] } = useStudents();
    const { data: groups = [] } = useGroups();

    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');

    const currentYear = currentDisplayDate.getFullYear();
    const currentMonth = currentDisplayDate.getMonth();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthName = currentDisplayDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    const goToPreviousMonth = () => setCurrentDisplayDate(new Date(currentYear, currentMonth - 1, 1));
    const goToNextMonth = () => setCurrentDisplayDate(new Date(currentYear, currentMonth + 1, 1));

    // جلب كل سجلات الحضور لهذا الشهر
    const { data: allAttendance = {}, isLoading: isLoadingAttendance } = useAllAttendance(monthKey);

    const reportData = useMemo(() => {
        return students.map(student => {
            const attendance = allAttendance[student.id] || [];
            const monthlyRecords = attendance.filter((rec: any) => rec.month === monthKey);

            const absentDays = monthlyRecords.filter((rec: any) => rec.status === 'absent').length;
            const presentDays = monthlyRecords.filter((rec: any) => rec.status === 'present').length;
            const totalDays = monthlyRecords.length;

            return {
                id: student.id,
                name: student.fullName,
                group: groups.find(g => g.id === student.groupId)?.name || 'بدون مجموعة',
                absentCount: absentDays,
                presentCount: presentDays,
                percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                status: student.status
            };
        })
            .filter(s => s.status !== 'archived')
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(s => type === 'absent' ? s.absentCount > 0 : s.presentCount > 0)
            .sort((a, b) => type === 'absent' ? b.absentCount - a.absentCount : b.presentCount - a.presentCount);
    }, [students, groups, monthKey, searchQuery, allAttendance, type]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-4xl h-[90vh] max-h-[850px] rounded-[40px] shadow-2xl z-[201] overflow-hidden flex flex-col text-right">

                        {/* Header */}
                        <div className={cn(
                            "p-6 flex items-center justify-between text-white shrink-0",
                            type === 'absent' ? "bg-red-500" : "bg-green-500"
                        )}>
                            <div className="flex items-center gap-3">
                                {type === 'absent' ? <UserX size={24} /> : <FileText size={24} />}
                                <div>
                                    <h3 className="font-black text-xl">{title}</h3>
                                    <p className="text-[10px] font-bold opacity-80">تقرير تفصيلي لشهر {monthName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center hover:bg-black/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/30">
                            <div className="flex items-center gap-3 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                                <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-9 w-9">
                                    <ChevronRight size={18} />
                                </Button>
                                <span className="font-black text-xs text-gray-700 min-w-[100px] text-center">
                                    {monthName}
                                </span>
                                <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-9 w-9">
                                    <ChevronLeft size={18} />
                                </Button>
                            </div>

                            <div className="relative flex-1 w-full md:max-w-xs">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="ابحث عن اسم طالب..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 bg-white border border-gray-100 rounded-xl pr-10 text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoadingAttendance ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="font-bold text-sm">جاري تحميل البيانات...</p>
                                </div>
                            ) : reportData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                    <Users size={48} className="mb-4" />
                                    <p className="font-bold">لا توجد سجلات مطابقة</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        {reportData.map((student) => (
                                            <div key={student.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 hover:border-gray-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                                                        type === 'absent' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                                    )}>
                                                        {type === 'absent' ? student.absentCount : student.percentage + '%'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm">{student.name}</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold">{student.group}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="hidden md:block text-center">
                                                        <p className="text-[10px] font-bold text-gray-400">حضور</p>
                                                        <p className="text-sm font-black text-green-600">{student.presentCount}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-gray-400">غياب</p>
                                                        <p className="text-sm font-black text-red-500">{student.absentCount}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                            <p className="text-[10px] font-bold text-gray-400">إجمالي الطلاب المعروضين: <span className="text-gray-900">{reportData.length}</span></p>
                            <Button onClick={onClose} className="bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800">
                                إغلاق النافذة
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
