"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { UserCheck, UserX, Edit2, Users, Calendar, Phone, CreditCard, MessageSquare, BookOpen, MessageCircle, ChevronDown, LayoutGrid } from 'lucide-react';
import EditStudentModal from '@/features/students/components/EditStudentModal';

import { cn, getWhatsAppUrl } from '@/lib/utils';
import { Student, Group } from '@/types';
import { FeeRecord } from '@/features/students/services/recordsService';

export default function PendingStudentsPage() {
    const queryClient = useQueryClient();
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<Student | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [daysAgoFilter, setDaysAgoFilter] = useState<number | null>(null);
    const [filterGroup, setFilterGroup] = useState<string | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    const { data: allStudents = [], isLoading } = useQuery({
        queryKey: ['students'],
        queryFn: () => getStudents()
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => getGroups()
    });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: currentMonthFees = [] } = useQuery({
        queryKey: ['fees', currentMonthKey],
        queryFn: () => getFeesByMonth(currentMonthKey)
    });

    const paidStudentIds = useMemo(() => new Set(currentMonthFees.map((f: FeeRecord) => f.studentId)), [currentMonthFees]);

    const getDateByDaysAgo = (daysAgo: number) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    };

    const daysAgoLabel = (days: number) => {
        if (days === 0) return 'اليوم';
        if (days === 1) return 'أمس';
        if (days === 2) return 'أول أمس';
        return `قبل ${days} أيام`;
    };

    const daysAgoOptions = [0, 1, 2, 3, 4, 5, 6, 7];

    const allPendingStudents = allStudents.filter(s => s.status === 'pending');
    const pendingStudents = allPendingStudents.filter(s => {
        if (filterGroup !== null && s.groupId !== filterGroup) return false;
        return true;
    });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const allRecentStudents = allStudents
        .filter(s => {
            if (s.status === 'pending') return false;
            if (!s.enrollmentDate) return false;
            const d = new Date(s.enrollmentDate);
            d.setHours(0, 0, 0, 0);
            return d >= sevenDaysAgo && d <= new Date();
        })
        .sort((a, b) => {
            const dateA = new Date(a.enrollmentDate || 0).getTime();
            const dateB = new Date(b.enrollmentDate || 0).getTime();
            return dateB - dateA;
        });
    const recentStudents = allRecentStudents.filter(s => {
        if (filterGroup !== null && s.groupId !== filterGroup) return false;
        if (filterStatus === 'all' && daysAgoFilter === null) return true;
        const hasPaid = paidStudentIds.has(s.id);
        if (filterStatus !== 'all') {
            if (filterStatus === 'paid' && !hasPaid) return false;
            if (filterStatus === 'unpaid' && hasPaid) return false;
        }
        if (daysAgoFilter !== null) {
            const targetDate = getDateByDaysAgo(daysAgoFilter);
            if (s.enrollmentDate !== targetDate) return false;
        }
        return true;
    });

    const getGroupName = (groupId: string | null) => {
        if (!groupId) return 'بدون مجموعة';
        const group = groups.find((g: Group) => g.id === groupId);
        return group?.name || 'مجموعة غير معروفة';
    };

    const handleWelcomeWhatsApp = (student: Student) => {
        const phone = student.parentPhone || student.studentPhone || '';
        const password = phone.length >= 6 ? phone.slice(-6) : phone;
        const message = `السلام عليكم ورحمة الله وبركاته، 🌸
أهلاً بكم في مركز الشاطبي لتحفيظ القرآن الكريم! 📖

يسعدنا انضمام الطالب/ة: *${student.fullName}* إلينا. 🎉

💰 *تفاصيل المصروفات:*
قيمة الاشتراك الشهري هي *${student.monthlyAmount || 80} ج.م* للمجموعة الواحدة.
⚠️ *تنبيه مهم:* تُستحق المصروفات مقدماً مع أول يوم من كل شهر.

🚫 *الغياب والاعتذار:*
في حال الرغبة في التغيب، لابد من إرسال اعتذار مسبق عبر رسالة على الواتساب أو من خلال موقعنا الإلكتروني.

🌐 *بوابة ولي الأمر:*
لمتابعة مستوى الطالب، تقارير الحفظ، وسجل الحضور والغياب، يرجى الدخول إلى حسابكم عبر الرابط التالي:
🔗 https://shatpycenter-um2b.vercel.app/attendance-report

📱 *طريقة الدخول:*
- *اسم المستخدم:* رقم الهاتف المسجل لدينا (${phone}).
- *كلمة المرور:* آخر 6 أرقام من رقم الهاتف (${password}).

متابعتكم المستمرة عبر الموقع تساهم بشكل كبير في تشجيع الطالب ورفع مستواه. 🌟
نسأل الله التوفيق لأبنائنا جميعاً. 🤲`;

        window.open(getWhatsAppUrl(phone, message), '_blank');
    };

    const approveMutation = useMutation({
        mutationFn: (studentId: string) => updateStudent(studentId, { status: 'active' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            alert('✅ تم قبول الطالب بنجاح');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (data: { id: string; reason: string }) =>
            updateStudent(data.id, { notes: `رفض - السبب: ${data.reason}`, status: 'archived' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowRejectModal(null);
            setRejectReason('');
            alert('❌ تم رفض الطالب وأرشفته');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Student> }) =>
            updateStudent(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setEditingStudent(null);
            alert('✅ تم تحديث بيانات الطالب');
        }
    });

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
    };

    const handleCloseEdit = () => {
        setEditingStudent(null);
    };

    const handleApprove = (studentId: string) => {
        if (confirm('هل أنت متأكد من قبول هذا الطالب؟')) {
            approveMutation.mutate(studentId);
        }
    };

    const handleReject = (student: Student) => {
        setShowRejectModal(student);
    };

    const confirmReject = () => {
        if (showRejectModal && rejectReason.trim()) {
            rejectMutation.mutate({ id: showRejectModal.id, reason: rejectReason });
        } else {
            alert('يرجى إدخال سبب الرفض');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-blue-600 text-xl">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24" dir="rtl">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Users size={28} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-black text-gray-900">الطلاب الجدد والمنتظرون</h1>
                            {/* القائمة المنسدلة لحالة الدفع */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                                        filterStatus !== 'all' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    {filterStatus === 'all' ? 'الكل' : filterStatus === 'paid' ? 'مدفوع ✓' : 'غير مدفوع ✗'}
                                    <ChevronDown size={14} />
                                </button>
                                {showStatusDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[300]" onClick={() => setShowStatusDropdown(false)} />
                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-[301] min-w-[160px] p-2">
                                            {[
                                                { key: 'all', label: 'الكل' },
                                                { key: 'paid', label: 'مدفوع ✓' },
                                                { key: 'unpaid', label: 'غير مدفوع ✗' },
                                            ].map(f => (
                                                <button
                                                    key={f.key}
                                                    onClick={() => { setFilterStatus(f.key as 'all' | 'paid' | 'unpaid'); setShowStatusDropdown(false); }}
                                                    className={cn(
                                                        'w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                                                        filterStatus === f.key ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* القائمة المنسدلة لأيام التسجيل */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                                        daysAgoFilter !== null ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    {daysAgoFilter !== null ? daysAgoLabel(daysAgoFilter) : 'الأيام'}
                                    <ChevronDown size={14} />
                                </button>
                                {showDateDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[300]" onClick={() => setShowDateDropdown(false)} />
                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-[301] min-w-[180px] p-2">
                                            <button
                                                onClick={() => { setDaysAgoFilter(null); setShowDateDropdown(false); }}
                                                className={cn(
                                                    'w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                                                    daysAgoFilter === null ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-50'
                                                )}
                                            >
                                                الكل
                                            </button>
                                            {daysAgoOptions.map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => { setDaysAgoFilter(d); setShowDateDropdown(false); }}
                                                    className={cn(
                                                        'w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                                                        daysAgoFilter === d ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-50'
                                                    )}
                                                >
                                                    {daysAgoLabel(d)}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* القائمة المنسدلة للمجموعات */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                                        filterGroup !== null ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    <LayoutGrid size={14} />
                                    {filterGroup !== null ? getGroupName(filterGroup) : 'المجموعات'}
                                    <ChevronDown size={14} />
                                </button>
                                {showGroupDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[300]" onClick={() => setShowGroupDropdown(false)} />
                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-[301] min-w-[180px] p-2 max-h-[300px] overflow-y-auto">
                                            <button
                                                onClick={() => { setFilterGroup(null); setShowGroupDropdown(false); }}
                                                className={cn(
                                                    'w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                                                    filterGroup === null ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                                                )}
                                            >
                                                الكل
                                            </button>
                                            {groups.map((g: Group) => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => { setFilterGroup(g.id); setShowGroupDropdown(false); }}
                                                    className={cn(
                                                        'w-full text-right px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                                                        filterGroup === g.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                                                    )}
                                                >
                                                    {g.name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 font-bold mt-1">
                            {pendingStudents.length + recentStudents.length} طالب جديد أو في انتظار الموافقة
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Students (Last 7 Days) */}
            <div className="space-y-4 mb-8">
                <h2 className="text-xl font-black text-gray-900 px-2 border-r-4 border-green-400">المضافون حديثاً (آخر 7 أيام)</h2>
                {recentStudents.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-bold text-lg">لا يوجد طلاب مضافون حديثاً</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentStudents.map((student) => {
                            const hasPaid = paidStudentIds.has(student.id);
                            return (
                            <div
                                key={student.id}
                                className="bg-white rounded-3xl p-4 shadow-sm border border-green-100 hover:shadow-xl transition-all animate-[fadeIn_0.3s_ease-out]"
                            >
                                {/* Line 1: avatar + name + badges + actions */}
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 shrink-0 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-black text-sm">
                                        {student.fullName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 leading-tight">{student.fullName}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-600 rounded-full">
                                                {student.status === 'active' ? 'نشط' : student.status}
                                            </span>
                                            <span className={cn(
                                                'shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full',
                                                hasPaid ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'
                                            )}>
                                                {hasPaid ? 'مدفوع' : 'غير مدفوع'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => handleEdit(student)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors" title="تعديل"><Edit2 size={15} /></button>
                                        <button onClick={() => handleWelcomeWhatsApp(student)} className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors" title="إرسال ترحيب واتساب"><MessageCircle size={15} /></button>
                                    </div>
                                </div>
                                {/* Line 2: compact info row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600">
                                    <span className="flex items-center gap-1"><Users size={12} className="text-gray-400" /><span className="font-black text-gray-700">{getGroupName(student.groupId)}</span></span>
                                    <span className="flex items-center gap-1"><Phone size={12} className="text-blue-400" /><span className="font-sans">{student.parentPhone}</span></span>
                                    <span className="flex items-center gap-1"><Calendar size={12} className="text-orange-400" /><span>{student.enrollmentDate}</span></span>
                                    {student.monthlyAmount && (
                                        <span className="flex items-center gap-1"><CreditCard size={12} className="text-gray-400" /><span>{student.monthlyAmount} ج.م</span></span>
                                    )}
                                </div>
                                {student.notes && (
                                    <div className="mt-2 pt-2 border-t border-dashed border-gray-100 flex items-start gap-2 text-xs text-gray-500">
                                        <MessageSquare size={13} className="shrink-0 mt-0.5 text-gray-400" />
                                        <span className="leading-relaxed">{student.notes}</span>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pending Students List */}
            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-900 px-2 border-r-4 border-amber-400">في انتظار الموافقة</h2>
                {pendingStudents.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <UserCheck size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-bold text-lg">لا يوجد طلاب في انتظار الموافقة حالياً</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingStudents.map((student) => {
                            const hasPaid = paidStudentIds.has(student.id);
                            return (
                            <div
                                key={student.id}
                                className="bg-white rounded-3xl p-4 shadow-sm border border-amber-100 hover:shadow-xl transition-all animate-[fadeIn_0.3s_ease-out]"
                            >
                                {/* Line 1: avatar + name + badges + actions */}
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 shrink-0 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-black text-sm">
                                        {student.fullName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 leading-tight">{student.fullName}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full">معلق</span>
                                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-full">
                                                {(() => {
                                                    if (!student.enrollmentDate) return '';
                                                    const today = new Date().toISOString().split('T')[0];
                                                    const diff = Math.floor((new Date(today).getTime() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));
                                                    return daysAgoLabel(diff);
                                                })()}
                                            </span>
                                            <span className={cn(
                                                'shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full',
                                                hasPaid ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'
                                            )}>
                                                {hasPaid ? 'مدفوع' : 'غير مدفوع'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => handleEdit(student)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"><Edit2 size={15} /></button>
                                        <button onClick={() => handleApprove(student.id)} className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center transition-colors"><UserCheck size={15} /></button>
                                        <button onClick={() => handleReject(student)} className="w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"><UserX size={15} /></button>
                                    </div>
                                </div>
                                {/* Line 2: compact info row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600">
                                    <span className="flex items-center gap-1"><LayoutGrid size={12} className="text-indigo-400" /><span className="font-black text-gray-700">{getGroupName(student.groupId)}</span></span>
                                    <span className="flex items-center gap-1"><Phone size={12} className="text-blue-400" /><span className="font-sans">{student.parentPhone}</span></span>
                                    <span className="flex items-center gap-1"><Calendar size={12} className="text-orange-400" /><span>{student.enrollmentDate}</span></span>
                                    {student.appointment && (
                                        <span className="flex items-center gap-1"><BookOpen size={12} className="text-indigo-400" /><span>{student.appointment}</span></span>
                                    )}
                                    {student.monthlyAmount && (
                                        <span className="flex items-center gap-1"><CreditCard size={12} className="text-gray-400" /><span>{student.monthlyAmount} ج.م</span></span>
                                    )}
                                </div>
                                {student.notes && (
                                    <div className="mt-2 pt-2 border-t border-dashed border-gray-100 flex items-start gap-2 text-xs text-gray-500">
                                        <MessageSquare size={13} className="shrink-0 mt-0.5 text-gray-400" />
                                        <span className="leading-relaxed">{student.notes}</span>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Student Modal */}
            <EditStudentModal
                student={editingStudent}
                isOpen={!!editingStudent}
                onClose={handleCloseEdit}
            />

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
                    <div
                        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-[slideUp_0.2s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-black text-red-600 mb-4">رفض الطالب</h2>
                        <p className="text-gray-600 mb-4">
                            هل أنت متأكد من رفض طلب <span className="font-bold">{showRejectModal.fullName}</span>؟
                        </p>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">سبب الرفض</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 outline-none"
                                rows={3}
                                placeholder="يرجى توضيح سبب الرفض..."
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={confirmReject}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                تأكيد الرفض
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
