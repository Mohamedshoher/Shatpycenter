"use client";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

// المكونات الفرعية
import AttendanceStats from './AttendanceStats';
import AttendanceFilters from './AttendanceFilters';
import StudentReportCard from './StudentReportCard';
import AttendanceChartModal from './AttendanceChartModal';
import { cn } from '@/lib/utils';

// الخدمات والمخازن
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAuthStore } from '@/store/useAuthStore';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';

export default function AttendanceReportPage() {
    const { data: students, archiveStudent } = useStudents();
    const { data: groups } = useGroups();
    const { user } = useAuthStore();

    // حالة التاريخ المختار
    const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const [groupId, setGroupId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [contLimit, setContLimit] = useState('');
    const [totalLimit, setTotalLimit] = useState('');
    const [showAbsentChart, setShowAbsentChart] = useState(false);
    const [showPresentChart, setShowPresentChart] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // 1. جلب بيانات الغياب والملحوظات
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['attendance-report-data-v6', selectedDateStr],
        queryFn: async () => {
            const { supabase } = await import('@/lib/supabase');
            const { getLatestNotes } = await import('@/features/students/services/recordsService');
            
            const [y, m, d] = selectedDateStr.split('-').map(Number);
            const dObj = new Date(y, m - 1, d);
            dObj.setDate(dObj.getDate() - 60); // آخر 60 يوم لحساب المتصل بدقة
            const sinceDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;

            const fetchAllAtt = async () => {
                let allData: any[] = [];
                let from = 0;
                const step = 1000; // Supabase enforced max-rows is usually 1000
                while (true) {
                    const { data, error } = await supabase.from('attendance')
                        .select('student_id, date, status, created_at')
                        .gte('date', sinceDate)
                        .order('created_at', { ascending: false })
                        .range(from, from + step - 1);
                    
                    if (error || !data || data.length === 0) break;
                    allData = [...allData, ...data];
                    
                    // إذا كان الاستعلام أرجع أقل من الحد الأقصى، معناه أننا وصلنا للنهاية
                    if (data.length < step) break;
                    from += step;
                }
                return allData;
            };

            const [attData, notes] = await Promise.all([
                fetchAllAtt(),
                getLatestNotes()
            ]);

            const map: Record<string, any[]> = {};
            (attData || []).forEach(row => {
                if (!map[row.student_id]) map[row.student_id] = [];
                map[row.student_id].push({
                    date: row.date.split('T')[0],
                    status: row.status
                });
            });

            return { attendanceMap: map, notes };
        },
        enabled: !!students
    });

    // 2. معالجة البيانات وحساب الغياب المتصل والكلي
    const processedStudents = useMemo(() => {
        if (!students || !reportData) return [];

        const filteredGroups = groups?.filter(g => {
            if (user?.role === 'teacher') return g.teacherId === user.teacherId;
            if (user?.role === 'supervisor') {
                const sections = user.responsibleSections || [];
                return sections.some(section => g.name.includes(section));
            }
            return true;
        }) || [];
        const groupIds = filteredGroups.map(g => g.id);
        const isControlRole = user?.role === 'director'

        const selectedDate = new Date(selectedDateStr);
        const dayOfWeek = selectedDate.getDay(); 
        const diffFromSat = (dayOfWeek + 1) % 7; // الأسبوع يبدأ من السبت
        const weekStartDate = new Date(selectedDate);
        weekStartDate.setDate(selectedDate.getDate() - diffFromSat);
        const wStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;

        return students
            .filter(s => s.status === 'active' && (isControlRole || groupIds.includes(s.groupId!)))
            .map(s => {
                const history = reportData.attendanceMap[s.id] || [];
                
                // استخراج الحالة الأحدث لكل يوم
                const dailyStatusMap = new Map<string, string>();
                history.forEach(h => {
                    if (!dailyStatusMap.has(h.date)) dailyStatusMap.set(h.date, h.status);
                });

                // 1. حساب الغياب المتصل تنازلياً من اليوم المختار (في حدود الأسبوع فقط)
                const recordedDates = Array.from(dailyStatusMap.keys())
                    .filter(d => d >= wStartStr && d <= selectedDateStr)
                    .sort((a,b) => b.localeCompare(a));
                
                let continuousAbsences = 0;
                for (const d of recordedDates) {
                    if (dailyStatusMap.get(d) === 'absent') {
                        continuousAbsences++;
                    } else if (dailyStatusMap.get(d) === 'present') {
                        break;
                    }
                }

                // 2. حساب الغياب والحضور في الأسبوع الحالي لليوم المختار
                let totalAbsentWeek = 0;
                let totalPresentWeek = 0;
                for (const [d, status] of dailyStatusMap.entries()) {
                    if (d >= wStartStr && d <= selectedDateStr) {
                        if (status === 'absent') totalAbsentWeek++;
                        if (status === 'present') totalPresentWeek++;
                    }
                }
                const totalRecordsWeek = totalAbsentWeek + totalPresentWeek;
                const absencePercentage = totalRecordsWeek > 0 ? Math.round((totalAbsentWeek / totalRecordsWeek) * 100) : 0;
                const presencePercentage = totalRecordsWeek > 0 ? Math.round((totalPresentWeek / totalRecordsWeek) * 100) : 0;

                return {
                    ...s,
                    groupName: groups?.find(g => g.id === s.groupId)?.name || 'بدون حلقة',
                    totalAbsences: totalAbsentWeek,
                    continuousAbsences,
                    absencePercentage,
                    presencePercentage,
                    currentStatus: dailyStatusMap.get(selectedDateStr) || 'not_recorded',
                    lastNote: reportData.notes[s.id]?.text || "لا توجد ملحوظات",
                    lastNoteDate: reportData.notes[s.id]?.date ? new Date(reportData.notes[s.id].date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : ""
                };
            });
    }, [students, reportData, groups, user, selectedDateStr]);

    // 3. الفلترة النهائية للعرض وحساب إحصائيات المخططات
    const { displayStudents, chartData } = useMemo(() => {
        const filtered = processedStudents.filter(s => {
            const matchesGroup = groupId === 'all' || s.groupId === groupId;
            const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
            const cL = Number(contLimit);
            const tL = Number(totalLimit);

            if (!matchesSearch || !matchesGroup) return false;

            // إذا لم يتم تحديد فلاتر أرقام، اظهر الغائبين اليوم فقط
            if (!cL && !tL) return s.currentStatus === 'absent';

            // إذا تم تحديد أرقام، اظهر من يطابق الشرط أو الغائب اليوم
            return s.currentStatus === 'absent' || (cL > 0 && s.continuousAbsences >= cL) || (tL > 0 && s.totalAbsences >= tL);
        }).sort((a, b) => b.totalAbsences - a.totalAbsences);

        const getGroupStats = (list: any[]) => {
            const counts: Record<string, number> = {};
            list.forEach(s => { counts[s.groupName] = (counts[s.groupName] || 0) + 1; });
            return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        };

        return {
            displayStudents: filtered,
            chartData: {
                present: getGroupStats(processedStudents.filter(s => s.currentStatus === 'present')),
                absent: getGroupStats(processedStudents.filter(s => s.currentStatus === 'absent'))
            }
        };
    }, [processedStudents, groupId, searchQuery, contLimit, totalLimit]);

    // حساب إحصائيات اليوم
    const dailyStats = useMemo(() => {
        const p = processedStudents.filter(s => s.currentStatus === 'present').length;
        const a = processedStudents.filter(s => s.currentStatus === 'absent').length;
        return { p, a };
    }, [processedStudents]);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right">
            {/* Header */}
            <div className="sticky top-0 z-[70] bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-2">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex bg-gray-100 p-1 rounded-xl items-center gap-2">
                        <input 
                            type="date" 
                            value={selectedDateStr}
                            onChange={(e) => setSelectedDateStr(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-white border flex-1 border-gray-200 text-sm font-bold text-gray-700 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button onClick={() => {
                            const d = new Date();
                            setSelectedDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                        }} className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            اليوم
                        </button>
                    </div>
                    <AttendanceStats
                        presentCount={dailyStats.p} absentCount={dailyStats.a}
                        showPresentChart={showPresentChart} setShowPresentChart={setShowPresentChart}
                        showAbsentChart={showAbsentChart} setShowAbsentChart={setShowAbsentChart}
                    />
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-4 space-y-4">
                {/* شريط البحث */}
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="ابحث عن طالب بالاسم..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-100 pr-12 pl-4 py-3 rounded-[20px] text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Users size={20} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center font-black text-gray-400">جاري تحميل البيانات...</div>
                ) : (
                    <>
                        <AttendanceFilters
                            groups={groups?.filter(g => {
                                if (user?.role === 'teacher') return g.teacherId === user.teacherId;
                                if (user?.role === 'supervisor') {
                                    const sections = user.responsibleSections || [];
                                    return sections.some(section => g.name.includes(section));
                                }
                                return true;
                            }) || []}
                            selectedGroupId={groupId} setSelectedGroupId={setGroupId}
                            continuousLimit={contLimit} setContinuousLimit={setContLimit}
                            totalLimit={totalLimit} setTotalLimit={setTotalLimit}
                            count={displayStudents.length}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {displayStudents.length > 0 ? (
                                displayStudents.map((s, i) => (
                                    <StudentReportCard key={s.id} student={s} index={i} userRole={user?.role} onArchive={archiveStudent} onOpenDetails={setSelectedStudent} />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 text-gray-400 font-bold">لا توجد بيانات غياب مطابقة للبحث</div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <AttendanceChartModal isOpen={showAbsentChart} onClose={() => setShowAbsentChart(false)} type="absent" title="توزيع الغياب" data={chartData.absent} />
            <AttendanceChartModal isOpen={showPresentChart} onClose={() => setShowPresentChart(false)} type="present" title="توزيع الحضور" data={chartData.present} />

            <StudentDetailModal student={selectedStudent} isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} initialTab="attendance" />
        </div>
    );
}