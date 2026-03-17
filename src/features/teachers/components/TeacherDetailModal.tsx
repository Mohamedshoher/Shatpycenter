"use client"; // توجيه لاستخدام المكون في جانب العميل (Client-side)

// ==========================================
// 1. استيراد المكتبات والأدوات الأساسية
// ==========================================
import { useState, useEffect } from 'react'; // هوكس الحالة والتأثيرات من React
import { motion, AnimatePresence } from 'framer-motion'; // مكتبة الحركات والأنيميشن
import { cn } from '@/lib/utils'; // وظيفة لدمج أصناف CSS بشكل ديناميكي
import { Button } from '@/components/ui/button'; // مكون الزر الجاهز
import { supabase } from '@/lib/supabase'; // عميل قاعدة بيانات Supabase
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // مكتبة إدارة جلب البيانات

// ==========================================
// 2. استيراد الأيقونات
// ==========================================
import {
    X, Calendar, CreditCard, Briefcase, Phone, MessageCircle, FileText,
    Users, Trash2, Edit3, Plus, CircleDollarSign, Coins, CheckCircle2,
    AlertCircle, Loader, UserX, Gift, ChevronRight, ChevronLeft, Layers
} from 'lucide-react';

// ==========================================
// 3. استيراد الأنواع (Types) والخطافات (Hooks) والخدمات (Services)
// ==========================================
import { Teacher } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useTeacherDeductions } from '@/features/teachers/hooks/useTeacherDeductions';
import { useTeacherAttendance } from '@/features/teachers/hooks/useTeacherAttendance';
import { DeductionsList } from '@/features/teachers/components/DeductionsList';
import { getFeesByMonth, deleteFeeRecord } from '@/features/students/services/recordsService';
import { getTeacherHandovers, getTeacherSalaryPayments, deleteTransaction, addTransaction } from '@/features/finance/services/financeService';
import { updateGroup } from '@/features/groups/services/groupService';
import { automationService } from '@/features/automation/services/automationService';

// ==========================================
// 4. تعريف خصائص المكون (Props)
// ==========================================
interface TeacherDetailModalProps {
    teacher: Teacher | null; // بيانات المعلم المختار
    isOpen: boolean; // حالة فتح النافذة
    onClose: () => void; // وظيفة الإغلاق
    onEdit?: (teacher: Teacher) => void; // وظيفة التعديل
    onDelete?: (teacher: Teacher) => void; // وظيفة الحذف
}

// ==========================================
// 5. المكون الرئيسي
// ==========================================
export default function TeacherDetailModal({
    teacher,
    isOpen,
    onClose,
    onEdit,
    onDelete
}: TeacherDetailModalProps) {
    
    // --- تهيئة الأدوات الأساسية ---
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    
    // --- تحديد صلاحيات المستخدم الحالي ---
    const isTeacher = user?.role === 'teacher';
    const isDirectorOnly = user?.role === 'director';
    const isDirector = user?.role === 'director' || user?.role === 'supervisor';

    // --- جلب البيانات العامة ---
    const { data: students } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();
    
    // ==========================================================
    // الدوال المساعدة (Helper Functions)
    // ==========================================================
    
    // دالة لتحويل الأرقام العربية إلى إنجليزية
    const arabicToEnglishNumber = (str: string): number => {
        const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
        const converted = String(str).replace(/[٠-٩]/g, d => arabicNumerals.indexOf(d).toString());
        return parseInt(converted.replace(/[^0-9]/g, '')) || 0;
    };

    // دالة لجلب اسم الشهر والسنة بشكل ديناميكي
    const getMonthLabel = (offset: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + offset);
        return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(d);
    };

    const currentMonthLabel = getMonthLabel(0); // الشهر الحالي
    const previousMonthLabel = getMonthLabel(-1); // الشهر السابق

    // دالة لتوحيد النصوص (إزالة التشكيل والمسافات) للمطابقة الدقيقة
    const normalize = (s: string) => {
        if (!s) return '';
        return s
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ءئؤ]/g, '')
            .replace(/[ًٌٍَُِّ]/g, '')
            .replace(/\s+/g, '')
            .trim();
    };

    // ==========================================
    // إدارة حالة الشهر والتواريخ
    // ==========================================
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel); // الشهر المعروض للمستخدم
    const [selectedMonthRaw, setSelectedMonthRaw] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`); // القيمة التقنية للشهر (YYYY-MM)

    // وظيفة لتحديث الشهر (للأمام/للخلف أو باختيار مباشر)
    const updateMonth = (offsetOrValue: number | string) => {
        let newDate: Date;
        if (typeof offsetOrValue === 'number') {
            const [year, month] = selectedMonthRaw.split('-');
            newDate = new Date(parseInt(year), parseInt(month) - 1 + offsetOrValue, 1);
        } else {
            const [year, month] = offsetOrValue.split('-');
            newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        }

        const yearStr = newDate.getFullYear();
        const monthStr = String(newDate.getMonth() + 1).padStart(2, '0');
        const rawValue = `${yearStr}-${monthStr}`;

        setSelectedMonthRaw(rawValue);
        setSelectedMonth(new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(newDate));
        setActiveDayMenu(null); // إغلاق قائمة التعديل عند تغيير الشهر
    };

    // ==========================================
    // جلب البيانات الخاصة بالمعلم (Queries)
    // ==========================================
    
    // 1. جلب الخصومات
    const { deductions, loading: deductionsLoading, loadDeductions, applyDeduction } = useTeacherDeductions(teacher?.id);

    // 2. جلب الحضور
    const { attendance: attendanceData, updateAttendanceAsync } = useTeacherAttendance(teacher?.id, selectedMonthRaw);

    // 3. جلب المصروفات/الرسوم للشهر المختار
    const { data: allFees = [] } = useQuery({
        queryKey: ['fees', 'month', selectedMonthRaw],
        queryFn: async () => {
            const feesByKey = await getFeesByMonth(selectedMonthRaw);
            const feesByLabel = await getFeesByMonth(selectedMonth);
            // دمج البيانات ومنع التكرار
            const seen = new Set();
            return [...feesByKey, ...feesByLabel].filter(f => {
                if (seen.has(f.id)) return false;
                seen.add(f.id);
                return true;
            });
        },
        enabled: !!selectedMonthRaw && isOpen
    });

    // 4. جلب عمليات تسليم النقدية (ما سلمه المعلم للمدير)
    const { data: handovers = [] } = useQuery({
        queryKey: ['handovers', teacher?.id, selectedMonthRaw],
        queryFn: () => getTeacherHandovers(teacher!.id, selectedMonthRaw),
        enabled: !!teacher?.id && !!selectedMonthRaw && isOpen
    });

    // 5. جلب الإعفاءات
    const { data: exemptions = [] } = useQuery({
        queryKey: ['free_exemptions', selectedMonthRaw],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('free_exemptions')
                .select('*')
                .eq('month', selectedMonthRaw);
            if (error) {
                console.warn('جدول free_exemptions غير موجود أو خطأ:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: isOpen
    });

    // 6. جلب سجل الرواتب
    const { data: paymentsHistory = [], isLoading: paymentsLoading } = useQuery({
        queryKey: ['salaryPayments', teacher?.id, selectedMonthRaw],
        queryFn: async () => {
            if (!teacher?.id) return [];
            try {
                const [year, month] = selectedMonthRaw.split('-').map(Number);
                const result = await getTeacherSalaryPayments(teacher.id, year, month);
                return result || [];
            } catch (err) {
                console.error('Error fetching salary payments:', err);
                return [];
            }
        },
        enabled: !!teacher?.id,
        staleTime: 5 * 60 * 1000 // 5 دقائق
    });

    // 7. ميوتيشن حذف سجل صرف الراتب
    const deleteSalaryMutation = useMutation({
        mutationFn: (paymentId: string) => deleteTransaction(paymentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaryPayments', teacher?.id, selectedMonthRaw] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error) => {
            console.error('خطأ في حذف الراتب:', error);
        }
    });

    // ====================================================================================
    // الحسابات المالية والإحصائيات (Business Logic)
    // ====================================================================================

    // 1. حساب المصروفات المتوقعة (إجمالي المطلوب من طلاب هذا المعلم)
    const expectedExpenses = (() => {
        if (!teacher || !groups || !students) return 0;
        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);

        return students
            .filter(s => {
                const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;

                if (s.enrollmentDate) {
                    const enrollYearMonth = s.enrollmentDate.substring(0, 7);
                    return enrollYearMonth <= selectedMonthRaw;
                }
                return true;
            })
            .reduce((sum, s) => sum + (Number(s.monthlyAmount) || 0), 0);
    })();

    // 2. حساب ما حصله المعلم بنفسه
    const [showCollectedDetails, setShowCollectedDetails] = useState(false);
    const collectedPayments = (() => {
        if (!teacher || !groups || !students || !allFees) return [];
        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);

        return allFees
            .filter(f => {
                const student = students.find(s => s.id === f.studentId);
                const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);

                const isCollectedByTeacher = f.createdBy === teacher.fullName ||
                    f.createdBy === teacher.phone ||
                    (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));

                const isUnclear = !f.createdBy || f.createdBy === 'غير معروف';

                return isCollectedByTeacher || (isTeacherStudent && isUnclear);
            })
            .map(f => {
                const student = students.find(s => s.id === f.studentId);
                const isCurrentTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);

                let transferStatus = '';
                if (student) {
                    if (student.status === 'archived') transferStatus = 'أرشف';
                    else if (!isCurrentTeacherStudent) transferStatus = 'نقل';
                }

                return {
                    id: f.receipt,
                    feeId: f.id,
                    studentId: f.studentId,
                    studentName: student?.fullName || 'طالب غير معروف',
                    amount: Number(f.amount.replace(/[^0-9.]/g, '')) || 0,
                    date: f.date,
                    status: student?.status === 'archived' ? 'archived' : 'active',
                    transferStatus,
                    groupName: groups.find(g => g.id === student?.groupId)?.name || '-'
                };
            });
    })();
    const totalCollected = collectedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 3. حساب ما حصله المدير من طلاب هذا المعلم
    const [showManagerCollectedDetails, setShowManagerCollectedDetails] = useState(false);
    const managerCollectedPayments = (() => {
        if (!teacher || !groups || !students || !allFees) return [];
        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);
        const teacherStudentIds = students.filter(s => s.groupId && teacherGroupIds.includes(s.groupId)).map(s => s.id);

        return allFees
            .filter(f => {
                const isTeacherStudent = teacherStudentIds.includes(f.studentId);
                const isCollectedByTeacher = f.createdBy === teacher.fullName ||
                    f.createdBy === teacher.phone ||
                    (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));

                const isUnclear = !f.createdBy || f.createdBy === 'غير معروف';

                return isTeacherStudent && !isCollectedByTeacher && !isUnclear;
            })
            .map(f => {
                const student = students.find(s => s.id === f.studentId);
                return {
                    id: f.receipt,
                    feeId: f.id,
                    studentId: f.studentId,
                    studentName: student?.fullName || 'طالب غير معروف',
                    amount: Number(f.amount.replace(/[^0-9.]/g, '')) || 0,
                    date: f.date,
                    status: student?.status === 'archived' ? 'archived' : 'active',
                    groupName: groups.find(g => g.id === student?.groupId)?.name || '-'
                };
            });
    })();
    const totalCollectedByManager = managerCollectedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. سجل عمليات التسليم (ما سلمه المدرس للمدير)
    const collectionHistoryMapped = handovers.map(h => ({
        id: h.id,
        date: h.date,
        monthRaw: selectedMonthRaw,
        amount: String(h.amount),
        notes: h.description || '-',
        type: 'تحصيل نقدي'
    }));
    const totalHandedOver = handovers.reduce((sum, h) => sum + Number(h.amount), 0);

    // 5. حساب الطلاب المدينين (الذين لم يدفعوا)
    const [showDeficitDetails, setShowDeficitDetails] = useState(false);
    const [deficitTab, setDeficitTab] = useState<'unpaid' | 'exempted'>('unpaid');
    
    const unpaidStudents = (() => {
        if (!teacher || !groups || !students || !allFees) return [];
        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);
        const teacherStudents = students
            .filter(s => {
                const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;

                if (s.enrollmentDate) {
                    const enrollYearMonth = s.enrollmentDate.substring(0, 7);
                    return enrollYearMonth <= selectedMonthRaw;
                }
                return true;
            });

        const exemptedStudentIds = exemptions.map((e: any) => e.student_id);

        return teacherStudents.map(student => {
            const studentFees = allFees.filter(f => f.studentId === student.id);
            const totalPaidByStudent = studentFees.reduce((sum, f) => sum + (Number(f.amount.replace(/[^0-9.]/g, '')) || 0), 0);
            const expectedAmount = Number(student.monthlyAmount) || 0;
            const remaining = expectedAmount - totalPaidByStudent;
            const isExempted = exemptedStudentIds.includes(student.id);
            const groupName = groups.find(g => g.id === student.groupId)?.name || '-';

            return {
                id: student.id,
                name: student.fullName,
                groupName,
                expectedAmount,
                paidAmount: totalPaidByStudent,
                remaining: Math.max(0, remaining),
                isExempted,
                enrollmentDate: student.enrollmentDate
            };
        }).filter(s => s.remaining > 0 || s.isExempted);
    })();

    // 6. حساب العجز الحقيقي مع استثناء المعفيين
    const realDeficit = (() => {
        const totalUnpaid = unpaidStudents
            .filter(s => !s.isExempted)
            .reduce((sum, s) => sum + s.remaining, 0);
        return totalUnpaid;
    })();

    // 7. حسابات الراتب (الأساسي، الخصومات، المكافآت)
    const basicSalary = teacher?.salary || 1000;
    const dailyRate = basicSalary / 22; // أجر اليوم الواحد 

    const currentDate = new Date();
    const currentMonthRaw = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonthSelected = selectedMonthRaw === currentMonthRaw;

    // خصومات تلقائية (حسب الحضور)
    const autoDeductions = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
        if (status === 'absent') return acc + dailyRate;
        if (status === 'half') return acc + (dailyRate * 0.5);
        if (status === 'quarter') return acc + (dailyRate * 0.25);
        return acc;
    }, 0);

    // مكافآت تلقائية (حسب الحضور)
    const autoRewards = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
        if (status === 'full_reward') return acc + dailyRate;
        if (status === 'half_reward') return acc + (dailyRate * 0.5);
        if (status === 'quarter_reward') return acc + (dailyRate * 0.25);
        return acc;
    }, 0);

    // مكافآت يدوية
    const manualRewardsTotal = deductions
        .filter(d => {
            const dDate = new Date(d.appliedDate);
            const dMonthRaw = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
            return dMonthRaw === selectedMonthRaw && d.reason.startsWith('مكافأة:');
        })
        .reduce((acc: number, curr) => acc + Math.abs(curr.amount), 0);

    // خصومات يدوية
    const manualDeductionsTotal = deductions
        .filter(d => {
            const dDate = new Date(d.appliedDate);
            const dMonthRaw = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
            return dMonthRaw === selectedMonthRaw && !d.reason.startsWith('مكافأة:');
        })
        .reduce((acc: number, curr) => acc + curr.amount, 0);

    // إجمالي ما تم صرفه بالفعل
    const totalPaid = paymentsHistory.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

    // الاستحقاق النهائي
    const totalEntitlement = Math.round((basicSalary + autoRewards + manualRewardsTotal - autoDeductions - manualDeductionsTotal) * 100) / 100;
    const remainingToPay = Math.max(0, Math.round((totalEntitlement - totalPaid) * 100) / 100);

    // ==========================================
    // الحالات الخاصة بالنماذج (States)
    // ==========================================
    const [activeTab, setActiveTab] = useState('collection'); // التبويب النشط
    const [amount, setAmount] = useState(''); // مبلغ التحصيل
    const [notes, setNotes] = useState(''); // ملاحظات التحصيل
    
    // حالات الخصم والمكافأة اليدوية
    const [manualEntryType, setManualEntryType] = useState<'reward' | 'discipline'>('reward');
    const [manualEntryAmount, setManualEntryAmount] = useState('');
    const [manualEntryNote, setManualEntryNote] = useState('');

    // حالات تقويم الحضور
    const [activeDayMenu, setActiveDayMenu] = useState<number | null>(null);
    const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
    const [tempStatus, setTempStatus] = useState<'present' | 'absent' | 'discipline' | 'reward'>('present');
    const [tempAmount, setTempAmount] = useState<'day' | 'half' | 'quarter'>('day');
    const [tempReason, setTempReason] = useState('');
    const [dayDetails, setDayDetails] = useState<Record<number, { reason: string, type: string }>>({});

    // ==========================================
    // معالجات الأحداث (Event Handlers)
    // ==========================================

    // 1. العفو عن طالب
    const handleExemptStudent = async (studentId: string, studentName: string, amount: number) => {
        if (!teacher || !confirm(`هل تريد العفو عن ${studentName} من المبلغ المتبقي (${amount} ج.م) لشهر ${selectedMonth}؟`)) return;

        try {
            const { error } = await supabase.from('free_exemptions').insert([{
                student_id: studentId,
                student_name: studentName,
                teacher_id: teacher.id,
                month: selectedMonthRaw,
                amount: amount,
                exempted_by: user?.displayName || 'المدير',
                created_at: new Date().toISOString()
            }]);

            if (error) {
                console.error('خطأ في حفظ الإعفاء:', error);
                if (error.code === '23505') alert('⚠️ هذا الطالب معفى عنه بالفعل لهذا الشهر.');
                else if (error.code === '42P01' || error.message?.includes('does not exist')) alert('⚠️ جدول free_exemptions غير موجود!');
                else alert('حدث خطأ أثناء حفظ الإعفاء: ' + (error.message || 'خطأ غير معروف'));
                return;
            }

            alert(`✅ تم العفو عن ${studentName} بنجاح لشهر ${selectedMonth}`);
            queryClient.invalidateQueries({ queryKey: ['free_exemptions', selectedMonthRaw] });
        } catch (err) {
            console.error('خطأ غير متوقع:', err);
        }
    };

    // 2. إلغاء العفو
    const handleRemoveExemption = async (studentId: string, studentName: string) => {
        if (!confirm(`هل تريد إلغاء العفو عن ${studentName} لشهر ${selectedMonth}؟`)) return;

        try {
            const { error } = await supabase.from('free_exemptions').delete().eq('student_id', studentId).eq('month', selectedMonthRaw);
            if (error) {
                console.error('خطأ في إلغاء الإعفاء:', error);
                return;
            }
            alert(`تم إلغاء العفو عن ${studentName} لشهر ${selectedMonth}`);
            queryClient.invalidateQueries({ queryKey: ['free_exemptions', selectedMonthRaw] });
        } catch (err) {
            console.error('خطأ غير متوقع:', err);
        }
    };

    // 3. حذف عملية تحصيل خاطئة
    const handleDeleteFee = async (feeId: string, studentName: string) => {
        if (!isDirector) return alert('عذراً، هذه الصلاحية للمدير فقط.');
        if (!confirm(`هل أنت متأكد من حذف عملية التحصيل الخاصة بالطالب ${studentName}؟\nتنبيه: هذا الإجراء لا يمكن التراجع عنه وسيقوم بحذف العملية والمبلغ من الإجماليات.`)) return;

        try {
            await deleteFeeRecord(feeId);
            queryClient.invalidateQueries({ queryKey: ['fees'] });
            queryClient.invalidateQueries({ queryKey: ['fees', 'month', selectedMonthRaw] });
            alert('تم حذف عملية التحصيل بنجاح.');
        } catch (error) {
            console.error('Error deleting fee:', error);
            alert('حدث خطأ أثناء حذف عملية التحصيل');
        }
    };

    // 4. إضافة خصم أو مكافأة يدوية
    const handleAddManualEntry = async () => {
        if (!manualEntryAmount || !teacher) return;
        const prefix = manualEntryType === 'reward' ? 'مكافأة: ' : 'خصم: ';
        const actualAmount = Number(manualEntryAmount);

        try {
            await applyDeduction(teacher.id, teacher.fullName, actualAmount, prefix + (manualEntryNote || 'بدون سبب'));

            try {
                await automationService.sendManualNotification(
                    teacher.id, teacher.fullName, actualAmount,
                    manualEntryType as 'reward' | 'deduction', manualEntryNote,
                    { uid: user?.uid || 'director', displayName: user?.displayName || 'المدير العام' }
                );
            } catch (notifyError) {
                console.error("Failed to notify teacher via chat:", notifyError);
            }

            setManualEntryAmount('');
            setManualEntryNote('');
            loadDeductions();
        } catch (error) {
            console.error("Error adding manual entry:", error);
            alert('حدث خطأ أثناء الإضافة');
        }
    };

    // 5. صرف جزء أو كامل الراتب
    const handlePaySalary = async (amount: number, type: string) => {
        if (amount <= 0 || !teacher) return alert('لا يمكن صرف مبلغ صفر أو سالب');

        try {
            const now = new Date();
            const transactionDate = selectedMonthRaw === currentMonthRaw ? now.toISOString().split('T')[0] : `${selectedMonthRaw}-01`;

            const { data, error } = await supabase.from('financial_transactions').insert([{
                amount: Number(amount),
                type: 'expense',
                category: 'salary',
                date: transactionDate,
                description: `راتب ${teacher.fullName} - ${type}`,
                related_user_id: String(teacher.id),
                performed_by: user?.uid || 'unknown'
            }]).select();

            if (error) return alert('❌ فشل حفظ الراتب:\n' + (error.message || 'خطأ غير معروف'));
            if (!data || data.length === 0) return alert('❌ لم يتم إرجاع البيانات من Supabase');

            alert('✅ تم صرف الراتب بنجاح');
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['salaryPayments', teacher.id, selectedMonthRaw] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }, 500);
        } catch (error) {
            console.error('خطأ في حفظ الراتب:', error);
            alert('❌ حدث خطأ: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
        }
    };

    // 6. إرسال تقرير الراتب عبر الواتساب
    const handleSendReport = () => {
        if (!teacher) return;
        const report = `
تقرير مستحقات المعلم: ${teacher.fullName}
الشهر: ${selectedMonth}
---------------------------
الراتب الأساسي: ${basicSalary} ج.م
المكافآت والحوافز: ${autoRewards + manualRewardsTotal} ج.م
الخصومات والاستقطاعات: ${autoDeductions + manualDeductionsTotal} ج.م
صافي المستحق: ${totalEntitlement} ج.م
---------------------------
تم صرفه: ${totalPaid} ج.م
المتبقي للصرف: ${remainingToPay} ج.م
---------------------------
مركز الشاطبي
        `.trim();

        const whatsappUrl = `https://wa.me/${teacher.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(report)}`;
        window.open(whatsappUrl, '_blank');
    };

    // 7. إسناد مجموعة للمعلم
    const handleAssignGroup = async (groupId: string) => {
        if (!teacher) return;
        try {
            await updateGroup(groupId, { teacherId: teacher.id });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setShowAssignGroupModal(false);
        } catch (error) {
            console.error('Error assigning group:', error);
        }
    };

    // 8. سحب مجموعة من المعلم
    const handleRemoveGroup = async (groupId: string) => {
        if (!teacher || !confirm('هل أنت متأكد من سحب هذه المجموعة من المعلم؟')) return;
        try {
            await updateGroup(groupId, { teacherId: null });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        } catch (error) {
            console.error('Error removing group:', error);
        }
    };

    // 9. إرسال مبلغ تحصيل (تسليم النقدية)
    const handleCollectionSubmit = async () => {
        if (!amount || !teacher || !user) return;

        try {
            const now = new Date();
            const transactionDate = selectedMonthRaw === currentMonthRaw ? now.toISOString().split('T')[0] : `${selectedMonthRaw}-01`;

            await addTransaction({
                amount: Number(amount),
                type: 'income',
                category: 'تحصيل من مدرس',
                date: transactionDate,
                description: notes || `تحصيل من المدرس ${teacher.fullName}`,
                relatedUserId: teacher.id,
                performedBy: user?.uid || user?.displayName || 'غير معروف'
            });
            setAmount('');
            setNotes('');
            queryClient.invalidateQueries({ queryKey: ['handovers', teacher.id, selectedMonthRaw] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            alert('تم تسجيل عملية التحصيل بنجاح');
        } catch (error) {
            console.error("Error submitting collection:", error);
            alert('حدث خطأ أثناء تسجيل العملية');
        }
    };

    // 10. حفظ تعديلات الانضباط/المكافأة من التقويم
    const handleAddDiscipline = async () => {
        if (!activeDayMenu || !teacher) return;

        try {
            const [year, month] = selectedMonthRaw.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();

            if (activeDayMenu > daysInMonth) {
                alert(`اليوم ${activeDayMenu} غير موجود في الشهر المختار.`);
                setActiveDayMenu(null);
                return;
            }

            let finalStatus: any = 'present';
            if (tempStatus === 'present') finalStatus = 'present';
            else if (tempStatus === 'absent') finalStatus = 'absent';
            else if (tempStatus === 'discipline') finalStatus = tempAmount === 'day' ? 'absent' : tempAmount === 'half' ? 'half' : 'quarter';
            else if (tempStatus === 'reward') finalStatus = tempAmount === 'day' ? 'full_reward' : tempAmount === 'half' ? 'half_reward' : 'quarter_reward';

            const date = `${selectedMonthRaw}-${String(activeDayMenu).padStart(2, '0')}`;
            await updateAttendanceAsync({ date, status: finalStatus });

            if (tempStatus === 'discipline' || tempStatus === 'reward') {
                try {
                    const numericAmount = tempAmount === 'day' ? 1 : tempAmount === 'half' ? 0.5 : 0.25;
                    const specificDate = `${selectedMonthRaw}-${String(activeDayMenu).padStart(2, '0')}`;
                    const note = tempReason ? `${tempReason} (بتاريخ ${specificDate})` : `إجراء إداري لليوم الموافق ${specificDate}`;

                    automationService.sendManualNotification(
                        teacher.id, teacher.fullName, numericAmount,
                        tempStatus === 'reward' ? 'reward' : 'deduction', note,
                        { uid: user?.uid || 'director', displayName: user?.displayName || 'المدير العام' }
                    ).catch(err => console.error("Calendar notification failed", err));
                } catch (notifyError) {
                    console.error("Failed to notify teacher from calendar:", notifyError);
                }
            }

            if (tempReason) setDayDetails(prev => ({ ...prev, [activeDayMenu]: { reason: tempReason, type: tempStatus } }));

            setActiveDayMenu(null);
            setTempReason('');
        } catch (error: any) {
            console.error("Error in handleAddDiscipline:", error);
            alert(`حدث خطأ أثناء حفظ التعديلات:\n${error?.message || "خطأ غير معروف"}`);
        }
    };

    // ==========================================
    // تأثيرات جانبية (Effects)
    // ==========================================
    useEffect(() => {
        if (teacher && isOpen) {
            loadDeductions();
        }
    }, [teacher, isOpen, loadDeductions]);

    // ==========================================
    // واجهة المستخدم: تعريف التبويبات
    // ==========================================
    const tabs = [
        { id: 'collection', label: 'التحصيل', icon: CircleDollarSign },
        { id: 'attendance', label: 'الحضور', icon: Calendar },
        { id: 'payroll', label: 'الراتب', icon: CreditCard },
        { id: 'groups', label: 'المجموعات', icon: Layers },
    ].filter(tab => {
        if (user?.role === 'supervisor') return tab.id !== 'payroll' && tab.id !== 'collection';
        return true;
    });

    // ==========================================
    // واجهة المستخدم: محتوى التبويبات (Render)
    // ==========================================
    const renderTabContent = () => {
        switch (activeTab) {
            // ----------------------------------------
            // تبويب المجموعات (Groups)
            // ----------------------------------------
            case 'groups':
                const teacherGroups = groups?.filter(g => g.teacherId === teacher?.id) || [];
                const availableGroups = groups?.filter(g => g.teacherId !== teacher?.id) || [];

                return (
                    <div className="space-y-6">
                        <div className="flex flex-row-reverse items-center justify-between">
                            {isDirector && (
                                <button
                                    onClick={() => setShowAssignGroupModal(true)}
                                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all"
                                >
                                    <Plus size={16} />
                                    إسناد مجموعة
                                </button>
                            )}
                        </div>

                        {teacherGroups.length === 0 ? (
                            <div className="py-20 text-center text-gray-400 text-sm font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                                لا توجد مجموعات مسندة لهذا المعلم حالياً.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teacherGroups.map(group => (
                                    <div key={group.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm group hover:border-blue-200 transition-all flex flex-row-reverse items-center justify-between">
                                        <div className="text-right">
                                            <h4 className="font-bold text-gray-800">{group.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1">
                                                عدد الطلاب: {students?.filter(s => s.groupId === group.id && s.status === 'active').length || 0} طالباً
                                            </p>
                                        </div>
                                        {isDirector && (
                                            <button
                                                onClick={() => handleRemoveGroup(group.id)}
                                                className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                title="سحب المجموعة"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <AnimatePresence>
                            {showAssignGroupModal && (
                                <>
                                    <div className="fixed inset-0 z-[150] bg-black/10 backdrop-blur-[2px]" onClick={() => setShowAssignGroupModal(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-[40px] shadow-2xl border border-gray-100 p-6 z-[151] flex flex-col max-h-[60vh]"
                                    >
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                            <h3 className="font-bold text-gray-900">اختر مجموعة لإسنادها</h3>
                                            <button onClick={() => setShowAssignGroupModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                                            {availableGroups.length === 0 ? (
                                                <p className="text-center py-10 text-xs text-gray-400">لا توجد مجموعات متاحة</p>
                                            ) : (
                                                availableGroups.map(g => (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => handleAssignGroup(g.id)}
                                                        className="w-full text-right p-4 rounded-2xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 group"
                                                    >
                                                        <div className="flex flex-row-reverse items-center justify-between">
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-800">{g.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold mt-1">المعلم الحالي: {teachers?.find(t => t.id === g.teacherId)?.fullName || 'لا يوجد'}</p>
                                                            </div>

                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Plus size={16} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                );
            
            // ----------------------------------------
            // تبويب التحصيل المالي (Collection)
            // ----------------------------------------
            case 'collection':
                return (
                    <div className="space-y-6">
                        {/* اختيار الشهر - تصميم متجاوب للموبايل */}
                        <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                            {/* زر السابق (يمين) */}
                            <button
                                onClick={() => updateMonth(-1)}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <ChevronRight size={16} />
                                <span className="hidden md:inline">الشهر السابق</span>
                            </button>

                            {/* عرض الشهر (منتصف) */}
                            <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                                <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                                    <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                                    <Calendar size={16} className="text-teal-500 shrink-0" />
                                    <input
                                        type="month"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        value={selectedMonthRaw}
                                        onChange={(e) => updateMonth(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* زر الحالي (يسار) */}
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                                    updateMonth(monthStr);
                                }}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <span className="hidden md:inline">الشهر الحالي</span>
                                <ChevronLeft size={16} />
                            </button>
                        </div>

                        {/* نموذج إضافة تحصيل جديد - مخفي للمدرس */}
                        {!isTeacher && (
                            <div className="bg-white p-6 rounded-[32px] border-2 border-teal-500/10 shadow-sm space-y-4">
                                <div className="flex flex-row-reverse items-center gap-2 text-teal-600 mb-2">
                                    <CircleDollarSign size={20} />
                                    <h4 className="font-bold">تسجيل مبلغ محصل من المدرس</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 text-right">
                                        <label className="text-xs font-bold text-gray-500 mr-1">المبلغ (ج.م)</label>
                                        <input
                                            type="number"
                                            placeholder="مثلاً: 500"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <label className="text-xs font-bold text-gray-500 mr-1">ملاحظات (اختياري)</label>
                                        <input
                                            type="text"
                                            placeholder="عن أي مجموعة أو طالب..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleCollectionSubmit}
                                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20"
                                >
                                    تسجيل التحصيل
                                </Button>
                            </div>
                        )}

                        {/* بطاقات الإحصائيات المالية (المصروفات، التحصيل، العجز) */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                            {/* بطاقة المصروفات المتوقعة */}
                            <div className="bg-gradient-to-br from-indigo-50 to-white p-4 md:p-6 rounded-[32px] border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] md:text-xs font-black text-indigo-400 mb-2 uppercase tracking-wide">إجمالي المصروفات المتوقعة</p>
                                <p className="text-xl md:text-3xl font-black text-indigo-700 font-sans">{expectedExpenses.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <div className="mt-4 pt-3 border-t border-indigo-100 w-full flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                        <span>المحصل الكلي:</span>
                                        <span className="text-slate-600 font-sans">{(totalCollected + totalCollectedByManager).toLocaleString()} ج.م</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min(100, ((totalCollected + totalCollectedByManager) / (expectedExpenses || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* بطاقة ما حصله المدرس */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-4 md:p-6 rounded-[32px] border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] md:text-xs font-black text-blue-400 mb-2 uppercase tracking-wide">ما حصله المدرس</p>
                                <p className="text-xl md:text-3xl font-black text-blue-700 font-sans">{totalCollected.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <button onClick={() => setShowCollectedDetails(true)} className="mt-3 px-4 py-1.5 bg-blue-100/50 text-blue-600 rounded-full text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all">كشف تفصيلي</button>
                            </div>

                            {/* بطاقة المحصل من المدير */}
                            <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] md:text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">المحصل من المدير</p>
                                <p className="text-xl md:text-3xl font-black text-slate-800 font-sans">{totalCollectedByManager.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <button onClick={() => setShowManagerCollectedDetails(true)} className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black hover:bg-slate-800 hover:text-white transition-all">عرض الطلاب</button>
                            </div>

                            {/* بطاقة المسلم للمدير */}
                            <div className="bg-gradient-to-br from-emerald-50 to-white p-4 md:p-6 rounded-[32px] border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] md:text-xs font-black text-emerald-400 mb-2 uppercase tracking-wide">المسلم للمدير</p>
                                <p className="text-xl md:text-3xl font-black text-emerald-700 font-sans">{totalHandedOver.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <div className="mt-3 w-10 h-1 bg-emerald-100 rounded-full" />
                            </div>

                            {/* بطاقة عجز التسليم */}
                            <div className="bg-gradient-to-br from-rose-50 to-white p-4 md:p-6 rounded-[32px] border border-rose-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] md:text-xs font-black text-rose-400 mb-2 uppercase tracking-wide">عجز التسليم (معه)</p>
                                <p className="text-xl md:text-3xl font-black text-rose-600 font-sans">{Math.max(0, totalCollected - totalHandedOver).toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <div className="mt-3 flex items-center gap-1">
                                    <AlertCircle size={10} className="text-rose-400" />
                                    <span className="text-[9px] font-bold text-rose-400">عهدة طرف المدرس</span>
                                </div>
                            </div>

                            {/* بطاقة عجز المجموعة الحقيقي */}
                            <div
                                onClick={() => setShowDeficitDetails(true)}
                                className="bg-gradient-to-br from-amber-50 to-white p-4 md:p-6 rounded-[32px] border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform cursor-pointer hover:border-amber-300 group"
                            >
                                <p className="text-[10px] md:text-xs font-black text-amber-500 mb-2 uppercase tracking-wide">عجز المجموعة الحقيقي</p>
                                <p className="text-xl md:text-3xl font-black text-amber-600 font-sans">{realDeficit.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                                <div className="mt-3 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold text-amber-500">{unpaidStudents.filter(s => !s.isExempted).length} طالب لم يدفع بعد</span>
                                    <button className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[9px] font-black group-hover:bg-amber-500 group-hover:text-white transition-all">
                                        عرض التفاصيل
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* تاريخ عمليات التسليم بتصميم البطاقات */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-right pr-2 text-lg">تاريخ عمليات التسليم</h4>
                            {collectionHistoryMapped.length === 0 ? (
                                <div className="bg-white/40 rounded-[32px] border-2 border-dashed border-slate-100 py-12 text-center text-slate-400 text-sm font-bold">
                                    لا توجد عمليات مسجلة لقسم التحصيل.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {collectionHistoryMapped.map(record => (
                                        <div key={record.id} className="bg-white p-5 rounded-[28px] border border-slate-50 shadow-sm hover:border-teal-100 transition-all group">
                                            <div className="flex flex-row-reverse items-start justify-between">
                                                <div className="flex flex-row-reverse items-center gap-3">
                                                    <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                                                        <Coins size={20} />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-slate-900 font-sans">{Number(record.amount).toLocaleString()} ج.م</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{record.date}</p>
                                                    </div>
                                                </div>
                                                {!isTeacher && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
                                                                const { deleteTransaction } = await import('@/features/finance/services/financeService');
                                                                await deleteTransaction(record.id);
                                                                queryClient.invalidateQueries({ queryKey: ['handovers', teacher?.id, selectedMonthRaw] });
                                                            }
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-row-reverse items-center justify-between">
                                                <div className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-bold text-slate-500">{record.type}</div>
                                                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{record.notes}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            
            // ----------------------------------------
            // تبويب سجل الحضور والغياب (Attendance)
            // ----------------------------------------
            case 'attendance':
                // حسابات إحصائية سريعة لأيام الغياب والمكافآت
                const totalAbsenceDays = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
                    if (status === 'absent') return acc + 1;
                    if (status === 'half') return acc + 0.5;
                    if (status === 'quarter') return acc + 0.25;
                    return acc;
                }, 0);

                const totalRewardDays = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
                    if (status === 'full_reward') return acc + 1;
                    if (status === 'half_reward') return acc + 0.5;
                    if (status === 'quarter_reward') return acc + 0.25;
                    return acc;
                }, 0);

                const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

                return (
                    <div className="space-y-6">
                        {/* شريط اختيار الشهر والملخص - تصميم متجاوب */}
                        <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                            {/* زر السابق */}
                            <button
                                onClick={() => updateMonth(-1)}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <ChevronRight size={16} />
                                <span className="hidden md:inline">الشهر السابق</span>
                            </button>

                            {/* الشهر */}
                            <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                                <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                                    <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                                    <Calendar size={16} className="text-gray-400 shrink-0" />
                                    <input
                                        type="month"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        value={selectedMonthRaw}
                                        onChange={(e) => updateMonth(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* زر الحالي */}
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                                    updateMonth(monthStr);
                                }}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <span className="hidden md:inline">الشهر الحالي</span>
                                <ChevronLeft size={16} />
                            </button>
                        </div>

                        {/* كروت ملخص الحضور (الغياب والمكافآت) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-row-reverse items-center justify-between">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 mb-1">  الغياب</p>
                                    <p className="text-2xl font-black text-red-600 font-sans">{Number(totalAbsenceDays)} يوم</p>
                                </div>
                                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                                    <Calendar size={24} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-row-reverse items-center justify-between">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 mb-1"> المكافآت</p>
                                    <p className="text-2xl font-black text-green-600 font-sans">{Number(totalRewardDays)} يوم</p>
                                </div>
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                                    <Calendar size={24} />
                                </div>
                            </div>
                        </div>

                        {/* التقويم الشهري التفاعلي للحضور */}
                        <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                            <h4 className="font-black text-gray-900 text-lg md:text-xl text-center">سجل حضور شهر: {selectedMonth}</h4>

                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {/* رؤوس أيام الأسبوع */}
                                {weekDays.map(day => (
                                    <div key={day} className="text-center text-[8px] md:text-[10px] font-bold text-gray-400 pb-2">{day}</div>
                                ))}

                                {/* موازنة بداية التقويم (Offset) بناءً على أول يوم في الشهر */}
                                {(() => {
                                    const [year, month] = selectedMonthRaw.split('-');
                                    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                                    // تحويل يوم الأسبوع ليتناسب مع يبدأ التقويم بالسبت (Sat: 6 -> 0, Sun: 0 -> 1, ...)
                                    const offset = (firstDay.getDay() + 1) % 7;
                                    return Array.from({ length: offset }).map((_, i) => (
                                        <div key={`empty-${i}`} className="aspect-square w-full" />
                                    ));
                                })()}

                                {/* رسم خلايا الأيام */}
                                {(() => {
                                    const [yearStr, monthStr] = selectedMonthRaw.split('-');
                                    const year = parseInt(yearStr);
                                    const month = parseInt(monthStr);
                                    const daysInMonth = new Date(year, month, 0).getDate();

                                    const now = new Date();
                                    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
                                    const todayDay = now.getDate();

                                    const firstDay = new Date(year, month - 1, 1);
                                    const startOffset = (firstDay.getDay() + 1) % 7;

                                    return Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const rawStatus = (attendanceData as any)[String(day)];

                                        const isFuture = isCurrentMonth ? day > todayDay : (year > now.getFullYear() || (year === now.getFullYear() && month > (now.getMonth() + 1)));
                                        const isToday = isCurrentMonth && day === todayDay;

                                        const status = isFuture ? rawStatus : (rawStatus || 'present');

                                        const weekDayIndex = (i + startOffset) % 7;
                                        const isWeekend = weekDayIndex === 5 || weekDayIndex === 6; // الخميس والجمعة إجازة رسمية

                                        return (
                                            <div key={i} className="relative">
                                                <button
                                                    onClick={() => {
                                                        if (isFuture || isWeekend || isTeacher) return;
                                                        setActiveDayMenu(day);
                                                        setTempStatus(status?.includes('reward') ? 'reward' : (status === 'present' ? 'present' : (status === 'absent' ? 'absent' : 'discipline')));
                                                    }}
                                                    className={cn(
                                                        "aspect-square w-full rounded-xl md:rounded-2xl border flex flex-col items-center justify-center text-xs md:text-sm font-bold transition-all relative shadow-sm",
                                                        isToday ? "border-blue-500 ring-2 ring-blue-500/10 shadow-lg shadow-blue-500/10" : "border-gray-50",
                                                        isWeekend || isTeacher ? "bg-red-50/10 border-red-50 text-red-400 cursor-default" :
                                                            status === 'present' ? "bg-green-50 border-green-100 text-green-600" :
                                                                (status === 'quarter' || status === 'half') ? "bg-orange-50 border-orange-100 text-orange-600" :
                                                                    (status === 'quarter_reward' || status === 'half_reward' || status === 'full_reward') ? "bg-green-50 border-green-200 text-green-600" :
                                                                        status === 'absent' ? "bg-red-50 border-red-100 text-red-600" :
                                                                            "bg-gray-50/50 text-gray-300 border-gray-100 hover:border-blue-200"
                                                    )}
                                                >
                                                    <span className="mb-0.5">{day}</span>
                                                    {isWeekend && <span className="text-[6px] md:text-[7px] mt-0.5 font-black uppercase text-red-500/40">إجازة</span>}
                                                    {(status === 'present' || status?.includes('reward')) && !isWeekend && (
                                                        <CheckCircle2 size={14} className="text-green-600/80" />
                                                    )}
                                                    {(status === 'quarter' || status === 'half' || status === 'quarter_reward' || status === 'half_reward' || status === 'full_reward') && !isWeekend && (
                                                        <div className={cn(
                                                            "w-1 h-1 rounded-full mt-1",
                                                            status?.includes('reward') ? "bg-green-400" : "bg-orange-400"
                                                        )} />
                                                    )}
                                                </button>
                                                {isToday && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white z-10" />}

                                                <AnimatePresence>
                                                    {activeDayMenu === day && !isTeacher && (
                                                        <>
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
                                                                onClick={() => setActiveDayMenu(null)}
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 z-[201] space-y-4"
                                                            >
                                                                <div className="flex flex-row-reverse items-center justify-between border-b border-gray-50 pb-3">
                                                                    <h5 className="font-black text-gray-800 text-base">تعديل سجل يوم {day}</h5>
                                                                    <button onClick={() => setActiveDayMenu(null)} className="text-gray-400 hover:bg-gray-50 p-1 rounded-full transition-all"><X size={20} /></button>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {/* اختيارات الحالة الرئيسية */}
                                                                    {[
                                                                        { id: 'present', label: 'حاضر', color: 'bg-green-500' },
                                                                        { id: 'absent', label: 'غائب', color: 'bg-red-500' },
                                                                        { id: 'discipline', label: 'خصم', color: 'bg-orange-500' },
                                                                        { id: 'reward', label: 'مكافأة', color: 'bg-teal-500' }
                                                                    ].map(opt => (
                                                                        <button
                                                                            key={opt.id}
                                                                            onClick={() => setTempStatus(opt.id as any)}
                                                                            className={cn(
                                                                                "h-10 rounded-xl text-[10px] font-bold border transition-all",
                                                                                tempStatus === opt.id ? `${opt.color} text-white border-transparent shadow-lg shadow-${opt.id}-500/20` : "bg-gray-50 text-gray-500 border-gray-100"
                                                                            )}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* تفاصيل إضافية في حال اختيار خصم أو مكافأة */}
                                                                {(tempStatus === 'discipline' || tempStatus === 'reward') && (
                                                                    <div className="space-y-3 pt-2">
                                                                        <div className="flex flex-row-reverse items-center gap-2">
                                                                            {['day', 'half', 'quarter'].map(amt => (
                                                                                <button
                                                                                    key={amt}
                                                                                    onClick={() => setTempAmount(amt as any)}
                                                                                    className={cn(
                                                                                        "flex-1 h-8 rounded-lg text-[9px] font-bold border transition-all",
                                                                                        tempAmount === amt ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-400 border-gray-100"
                                                                                    )}
                                                                                >
                                                                                    {amt === 'day' ? 'يوم' : amt === 'half' ? 'نصف' : 'ربع'}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <div className="text-right space-y-1">
                                                                            <label className="text-[9px] font-bold text-gray-400 mr-1">السبب / التفاصيل</label>
                                                                            <input
                                                                                type="text"
                                                                                value={tempReason}
                                                                                onChange={(e) => setTempReason(e.target.value)}
                                                                                placeholder="ادخل السبب هنا..."
                                                                                className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-right text-xs focus:ring-2 focus:ring-teal-500/10 outline-none"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <Button onClick={handleAddDiscipline} className="w-full h-10 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-gray-900/20">
                                                                    حفظ التعديلات
                                                                </Button>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })
                                })()}
                            </div>
                        </div>

                        {/* جدول سجل الانضباط والمكافآت التفصيلي */}
                        <div className="space-y-4">
                            <h4 className="font-black text-gray-800 text-center text-lg">سجل الانضباط والمكافآت (الشهر المختار)</h4>
                            <div className="bg-transparent border-none shadow-none overflow-visible">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(() => {
                                        const [year, month] = selectedMonthRaw.split('-');
                                        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                                        const startOffset = (firstDay.getDay() + 1) % 7;

                                        const records = Object.entries(attendanceData)
                                            .filter(([day, status]) => {
                                                const d = Number(day);
                                                const weekDayIdx = (d - 1 + startOffset) % 7;
                                                const isWeekend = weekDayIdx === 5 || weekDayIdx === 6;
                                                return status !== 'present' && !isWeekend;
                                            });

                                        if (records.length === 0) {
                                            return <div className="col-span-full py-8 text-center text-gray-400 text-sm font-bold bg-white rounded-3xl border border-gray-100 md:col-span-2">لا توجد سجلات انضباط أو خصومات لهذا الشهر</div>
                                        }

                                        return records.map(([day, status]: [string, any]) => {
                                            const d = Number(day);
                                            const weekDayIdx = (d - 1 + startOffset) % 7;
                                            const amount = status === 'absent' ? dailyRate :
                                                status === 'half' ? (dailyRate * 0.5) :
                                                    status === 'quarter' ? (dailyRate * 0.25) :
                                                        status === 'half_reward' ? (dailyRate * 0.5) :
                                                        status === 'full_reward' ? dailyRate :
                                                        status === 'quarter_reward' ? (dailyRate * 0.25) : 0;

                                            return (
                                                <div key={day} className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all relative group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-lg text-[10px] font-bold",
                                                            status?.includes('reward') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                                        )}>
                                                            {status?.includes('reward') ? 'مكافأة' : 'خصم'}
                                                        </span>
                                                        <span className="text-xs font-black text-gray-400 font-sans">{day} {selectedMonth.split(' ')[0]}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between mb-3 text-right">
                                                        <h5 className="font-bold text-gray-900 text-sm">
                                                            {dayDetails[Number(day)]?.reason || `تسجيل ${status === 'full_reward' ? 'مكافأة (يوم كامل)' : status === 'half_reward' ? 'مكافأة (نصف يوم)' : status === 'quarter_reward' ? 'مكافأة (ربع يوم)' : 'غياب'} يوم ${weekDays[(d - 1 + startOffset) % 7]}`}
                                                        </h5>
                                                        <span className="font-black font-sans text-gray-800 text-sm">{amount.toFixed(2)} ج.م</span>
                                                    </div>

                                                    {!isTeacher && (
                                                        <button
                                                            onClick={async () => {
                                                                const date = `${selectedMonthRaw}-${String(day).padStart(2, '0')}`;
                                                                await updateAttendanceAsync({ date, status: 'present' });
                                                            }}
                                                            className="w-full py-2 mt-1 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Trash2 size={14} />
                                                            حذف السجل
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div >
                );

            // --------------------------------------------------------------------------------
            // تبويب الراتب والمحاسبة المالية (Payroll)
            // ----------------------------------------
            case 'payroll':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
                        {/* اختيار الشهر في تبويب الراتب - متجاوب */}
                        <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                            {/* زر السابق */}
                            <button
                                onClick={() => updateMonth(-1)}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <ChevronRight size={16} />
                                <span className="hidden md:inline">الشهر السابق</span>
                            </button>

                            {/* الشهر */}
                            <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                                <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                                    <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                                    <Calendar size={14} className="md:w-4 md:h-4 text-gray-400 shrink-0" />
                                    <input
                                        type="month"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        value={selectedMonthRaw}
                                        onChange={(e) => updateMonth(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* زر الحالي */}
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                                    updateMonth(monthStr);
                                }}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                            >
                                <span className="hidden md:inline">الشهر الحالي</span>
                                <ChevronLeft size={16} />
                            </button>
                        </div>

                        {/* بطاقة الراتب والمستحقات (كرت المحاسبة الرئيسي) */}
                        <div className="bg-white rounded-[32px] md:rounded-[48px] border border-gray-100 p-4 md:p-8 shadow-sm space-y-6 md:space-y-8 overflow-hidden relative">
                            {/* أيقونة خلفية جمالية */}
                            <CircleDollarSign size={200} className="absolute -left-10 -bottom-10 text-gray-50/50 -rotate-12 pointer-events-none opacity-20 md:opacity-100" />

                            <div className="flex flex-row-reverse items-start justify-between relative z-10">
                                <div className="text-right">
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight"> الراتب </h3>
                                    <p className="text-gray-400 font-bold text-xs md:text-sm">شهر {selectedMonth}</p>
                                </div>
                                <div className="bg-orange-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-orange-100 flex items-center gap-2 text-[8px] md:text-[10px] font-black text-orange-600">
                                    <span>حالة الصرف:</span>
                                    <span>قيد الانتظار ⌛</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 relative z-10">
                                {/* عرض صافي المستحق والمتبقي */}
                                <div className="md:col-span-4 flex flex-col gap-3 md:gap-4 font-sans">
                                    <div className="bg-gray-50/80 p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 text-center space-y-1 md:space-y-2 backdrop-blur-sm">
                                        <p className="text-[10px] md:text-xs font-bold text-gray-400">إجمالي الاستحقاق</p>
                                        <p className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{totalEntitlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-teal-600 p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-center space-y-1 md:space-y-2 shadow-xl shadow-teal-600/30 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                            <CircleDollarSign size={60} className="md:w-20 md:h-20" />
                                        </div>
                                        <p className="text-[10px] md:text-xs font-bold text-teal-100/80 relative z-10">المتبقي للصرف</p>
                                        <p className="text-2xl md:text-4xl font-black text-white tracking-tight relative z-10">{remainingToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-[8px] md:text-[10px] font-black text-teal-200/60 uppercase tracking-widest relative z-10">EGYPTIAN POUND</p>
                                    </div>
                                </div>

                                {/* تفاصيل بنود الحساب (أساسي، حوافز، استقطاعات) */}
                                <div className="md:col-span-8 flex flex-col gap-3">
                                    <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-gray-50/30 rounded-[20px] md:rounded-[24px] border border-gray-50 hover:bg-gray-50 transition-colors">
                                        <span className="text-xs md:text-sm font-bold text-gray-500">الراتب الأساسي/الشراكة:</span>
                                        <span className="text-sm md:text-lg font-black font-sans text-gray-900">{basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                    </div>
                                    <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-green-50/30 rounded-[20px] md:rounded-[24px] border border-green-50 hover:bg-green-50 transition-colors">
                                        <div className="text-right">
                                            <p className="text-xs md:text-sm font-bold text-green-700">مكافآت وحوافز:</p>
                                            <p className="text-[8px] md:text-[9px] font-bold text-green-600/60 leading-none mt-1">(حضور + يدوي)</p>
                                        </div>
                                        <span className="text-sm md:text-lg font-black font-sans text-green-600">+{(autoRewards + manualRewardsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                    </div>
                                    <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-red-50/30 rounded-[20px] md:rounded-[24px] border border-red-50 hover:bg-red-50 transition-colors">
                                        <div className="text-right">
                                            <p className="text-xs md:text-sm font-bold text-red-700">خصومات واستقطاعات:</p>
                                            <p className="text-[8px] md:text-[9px] font-bold text-red-600/60 leading-none mt-1">(غياب + يدوي)</p>
                                        </div>
                                        <span className="text-sm md:text-lg font-black font-sans text-red-600">-{(autoDeductions + manualDeductionsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                    </div>
                                    <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-purple-50/30 rounded-[20px] md:rounded-[24px] border border-purple-50 hover:bg-purple-50 transition-colors">
                                        <span className="text-xs md:text-sm font-bold text-purple-700">تم صرفه للمدرس:</span>
                                        <span className="text-sm md:text-lg font-black font-sans text-purple-600">-{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                    </div>
                                </div>
                            </div>

                            {/* سجل الدفعات النقدية المصروفة لهذا الشهر */}
                            <div className="space-y-4 pt-4 border-t border-gray-50 relative z-10">
                                <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-3">
                                    <h4 className="text-lg font-black text-gray-800">سجل صرف الراتب</h4>
                                    {!isTeacher && (
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const amountStr = prompt('أدخل المبلغ المسلم للمدرس:');
                                                    if (amountStr) {
                                                        const amount = parseFloat(amountStr);
                                                        if (!isNaN(amount)) handlePaySalary(amount, 'مصروف راتب (يدوي)');
                                                    }
                                                }}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                                            >
                                                + مصروف راتب (يدوي)
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4 md:p-8 text-center">
                                    {paymentsHistory.length === 0 ? (
                                        <p className="text-gray-400 text-sm font-bold">لا توجد دفعات مسجلة لهذا الشهر.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {paymentsHistory.map(p => (
                                                <div key={p.id} className="flex flex-row-reverse items-center justify-between text-xs font-bold bg-white p-3 rounded-xl border border-gray-100">
                                                    <span className="text-gray-500">{new Date(p.date).toLocaleDateString('ar-EG')}</span>
                                                    <span className="text-blue-600">{p.description}</span>
                                                    <span className="text-gray-900">{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                                    {!isTeacher && <button
                                                        onClick={() => deleteSalaryMutation.mutate(p.id)}
                                                        disabled={deleteSalaryMutation.isPending}
                                                        className="text-red-400 hover:text-red-600 disabled:opacity-50"
                                                    >
                                                        {deleteSalaryMutation.isPending ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* أزرار الإجراءات النهائية (صرف كامل المتبقي أو إرسال تقرير) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {!isTeacher && (
                                    <button
                                        onClick={() => handlePaySalary(remainingToPay, 'صرف نهائي')}
                                        disabled={remainingToPay <= 0}
                                        className="h-14 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        صرف المتبقي ({remainingToPay.toLocaleString()} ج.م) نهائياً 💸
                                    </button>
                                )}
                                {!isTeacher && (
                                    <button
                                        onClick={handleSendReport}
                                        className="h-14 bg-green-50 text-green-700 border border-green-100 rounded-[24px] font-black hover:bg-green-100 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={18} />
                                        إرسال التقرير للمدرس 💬
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    // ==========================================
    // واجهة المستخدم: الهيكل الرئيسي (Main Return JSX)
    // ==========================================
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* خلفية النافذة (Backdrop) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200]"
                    />

                    {/* جسم النافذة المنبثقة (Modal Body) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[98%] md:w-[95%] md:max-w-6xl h-[95vh] md:h-fit md:max-h-[95vh] bg-white rounded-[40px] md:rounded-[56px] shadow-2xl z-[201] overflow-hidden flex flex-col border border-white/20"
                    >
                        {/* رأس النافذة (Header) */}
                        <div className="p-5 md:p-8 relative bg-white border-b border-gray-50 shrink-0">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-3">
                                    <div className="text-right min-w-0">
                                        <div className="flex items-center justify-end gap-2">
                                            <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate leading-tight">{teacher!.fullName}</h2>
                                            {!isTeacher && (
                                                <button
                                                    onClick={() => onEdit?.(teacher!)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="تعديل بيانات المعلم"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-blue-500 font-bold text-[10px] md:text-sm mt-0.5">الملف الشخصي للمدرس</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 md:gap-3">
                                    <div className="hidden sm:flex items-center gap-2">
                                        {!isTeacher && (
                                            <>
                                                <button onClick={() => onDelete?.(teacher!)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                <button onClick={() => onEdit?.(teacher!)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                                            </>
                                        )}
                                        <a href={`tel:${teacher!.phone}`} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Phone size={18} /></a>
                                        <button onClick={() => window.open(`https://wa.me/${teacher!.phone.replace(/[^0-9]/g, '')}`, '_blank')} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"><MessageCircle size={18} /></button>
                                    </div>

                                    <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 bg-slate-100/80 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* شريط التبويبات (Navigation Tabs) */}
                        <div className="flex flex-row border-b border-gray-50 px-2 md:px-8 bg-white sticky top-0 z-10 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap md:justify-start justify-around">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex flex-row items-center gap-1 md:gap-2 px-4 md:px-6 py-4 md:py-6 text-[11px] md:text-[13px] font-black transition-all relative shrink-0",
                                            isActive ? "text-blue-600 scale-105" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Icon size={18} className={cn(isActive ? "text-blue-600" : "text-slate-300")} />
                                        <span className="hidden md:inline">{tab.label}</span>
                                        {isActive && (
                                            <motion.div layoutId="teacherTab" className="absolute bottom-0 left-0 right-0 h-[4px] bg-blue-600 rounded-t-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* مساحة عرض المحتوى (Main Content Area) */}
                        <div className="flex-1 overflow-y-auto bg-[#FBFDFF] p-4 md:p-10 no-scrollbar">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-5xl mx-auto"
                            >
                                {renderTabContent()}
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* ========================================== */}
                    {/* النوافذ الفرعية (Sub-modals for details) */}
                    {/* ========================================== */}

                    {/* نافذة تفاصيل ما حصله المدرس */}
                    <AnimatePresence>
                        {showCollectedDetails && (
                            <>
                                <div className="fixed inset-0 z-[250] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowCollectedDetails(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-3xl bg-white rounded-[40px] shadow-2xl border border-gray-100 p-6 z-[251] h-[80vh] flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                                <CircleDollarSign size={24} />
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-bold text-gray-900">تفاصيل ما حصله المدرس</h3>
                                                <p className="text-xs text-gray-400 font-bold">إجمالي: {totalCollected.toLocaleString()} ج.م • <span className="text-blue-500">{collectedPayments.length} وصل/سند</span></p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowCollectedDetails(false)}
                                            className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                                        <div className="space-y-3">
                                            {(() => {
                                                if (collectedPayments.length === 0) {
                                                    return (
                                                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                                                            لا توجد عمليات تحصيل مسجلة لهذا الشهر.
                                                        </div>
                                                    );
                                                }

                                                const sorted = [...collectedPayments].sort((a, b) => arabicToEnglishNumber(a.id) - arabicToEnglishNumber(b.id));
                                                const cards: React.ReactNode[] = [];
                                                let lastId = -1;

                                                sorted.forEach((payment, index) => {
                                                    const currentId = arabicToEnglishNumber(payment.id);

                                                    if (lastId !== -1 && currentId > lastId + 1) {
                                                        const missingCount = currentId - lastId - 1;
                                                        cards.push(
                                                            <div key={`gap-${index}`} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between text-red-600">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center font-black text-xs">
                                                                        <AlertCircle size={18} />
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black">سقوط في أرقام الوصل</p>
                                                                        <p className="text-[10px] font-bold opacity-70">
                                                                            {missingCount === 1 ? `الوصل رقم #${lastId + 1} مفقود` : `الوصولات من #${lastId + 1} إلى #${currentId - 1} مفقودة`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    cards.push(
                                                        <div key={payment.id + index} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-xs text-gray-400 font-sans border border-gray-100">
                                                                    #{payment.id}
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="flex items-center gap-2 justify-end">
                                                                        {payment.transferStatus && (
                                                                            <span className={cn(
                                                                                "text-[9px] px-1.5 py-0.5 rounded-md font-black shrink-0",
                                                                                payment.transferStatus === 'أرشف' ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-600 border border-amber-100"
                                                                            )}>
                                                                                {payment.transferStatus}
                                                                            </span>
                                                                        )}
                                                                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{payment.studentName}</h4>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1 justify-end">
                                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">{payment.groupName}</span>
                                                                        <span className="text-[10px] text-gray-400 font-bold font-sans" dir="ltr">{payment.date}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-left font-sans flex flex-col items-end gap-2">
                                                                <p className="text-lg font-black text-green-600">{payment.amount.toLocaleString()} <span className="text-[10px] font-bold">ج.م</span></p>
                                                                {isDirector && (
                                                                    <button
                                                                        onClick={() => handleDeleteFee(payment.feeId, payment.studentName)}
                                                                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                                                        title="حذف هذا الوصل"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    lastId = currentId;
                                                });
                                                return cards;
                                            })()}
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* نافذة تفاصيل التحصيل من قبل المدير */}
                    <AnimatePresence>
                        {showManagerCollectedDetails && (
                            <>
                                <div className="fixed inset-0 z-[250] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowManagerCollectedDetails(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-3xl bg-white rounded-[40px] shadow-2xl border border-gray-100 p-6 z-[251] h-[80vh] flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <CircleDollarSign size={24} />
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-bold text-gray-900">ما حصله المدير من المجموعة</h3>
                                                <p className="text-xs text-gray-400 font-bold">إجمالي: {totalCollectedByManager.toLocaleString()} ج.م</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowManagerCollectedDetails(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                                        <div className="space-y-3">
                                            {(() => {
                                                if (managerCollectedPayments.length === 0) {
                                                    return (
                                                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                                                            لا توجد عمليات تحصيل للمدير مسجلة لهذا الشهر.
                                                        </div>
                                                    );
                                                }

                                                const sorted = [...managerCollectedPayments].sort((a, b) => arabicToEnglishNumber(a.id) - arabicToEnglishNumber(b.id));
                                                const cards: React.ReactNode[] = [];
                                                let lastId = -1;

                                                sorted.forEach((payment, index) => {
                                                    const currentId = arabicToEnglishNumber(payment.id);

                                                    if (lastId !== -1 && currentId > lastId + 1) {
                                                        const missingCount = currentId - lastId - 1;
                                                        cards.push(
                                                            <div key={`mgr-gap-${index}`} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between text-red-600">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center font-black text-xs">
                                                                        <AlertCircle size={18} />
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black">سقوط في أرقام الوصل (مدير)</p>
                                                                        <p className="text-[10px] font-bold opacity-70">
                                                                            {missingCount === 1 ? `الوصل رقم #${lastId + 1} مفقود` : `الوصولات من #${lastId + 1} إلى #${currentId - 1} مفقودة`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    cards.push(
                                                        <div key={payment.id + index} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-xs text-gray-400 font-sans border border-gray-100">
                                                                    #{payment.id}
                                                                </div>
                                                                <div className="text-right">
                                                                    <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{payment.studentName}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold">{payment.groupName}</span>
                                                                        <span className="text-[10px] text-gray-400 font-bold font-sans" dir="ltr">{payment.date}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-left font-sans flex flex-col items-end gap-2">
                                                                <p className="text-lg font-black text-emerald-600">{payment.amount.toLocaleString()} <span className="text-[10px] font-bold">ج.م</span></p>
                                                                {isDirector && (
                                                                    <button
                                                                        onClick={() => handleDeleteFee(payment.feeId, payment.studentName)}
                                                                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                                                        title="حذف هذا الوصل"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                    lastId = currentId;
                                                });
                                                return cards;
                                            })()}
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* نافذة تفاصيل عجز المجموعة الحقيقي - الطلاب المدينين */}
                    <AnimatePresence>
                        {showDeficitDetails && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm"
                                    onClick={() => setShowDeficitDetails(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[600px] max-h-[85vh] bg-white rounded-[40px] shadow-2xl border border-amber-100 z-[301] flex flex-col overflow-hidden"
                                >
                                    {/* رأس النافذة */}
                                    <div className="px-4 py-4 border-b border-amber-50 bg-gradient-to-br from-amber-50 to-white flex flex-row-reverse items-center justify-between shrink-0">
                                        <div className="text-right">
                                            <h3 className="text-lg font-black text-amber-800">تفاصيل عجز المجموعة</h3>
                                        </div>
                                        <button
                                            onClick={() => setShowDeficitDetails(false)}
                                            className="w-10 h-10 bg-amber-100/50 hover:bg-amber-200 rounded-2xl flex items-center justify-center transition-all"
                                        >
                                            <X size={18} className="text-amber-700" />
                                        </button>
                                    </div>

                                    {/* ملخص سريع للطلاب */}
                                    <div className="px-6 py-4 bg-amber-50/30 border-b border-amber-100/50 shrink-0">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white rounded-2xl p-3 text-center border border-amber-100">
                                                <p className="text-[9px] font-bold text-amber-500">إجمالي العجز</p>
                                                <p className="text-lg font-black text-amber-700 font-sans">{realDeficit.toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => setDeficitTab('unpaid')}
                                                className={cn(
                                                    "rounded-2xl p-3 text-center border transition-all",
                                                    deficitTab === 'unpaid'
                                                        ? "bg-red-50 border-red-200 ring-2 ring-red-500/10"
                                                        : "bg-white border-red-50 hover:bg-red-50/50"
                                                )}
                                            >
                                                <p className="text-[9px] font-bold text-red-500">لم يدفعوا</p>
                                                <p className="text-lg font-black text-red-600 font-sans">{unpaidStudents.filter(s => !s.isExempted).length}</p>
                                            </button>
                                            <button
                                                onClick={() => setDeficitTab('exempted')}
                                                className={cn(
                                                    "rounded-2xl p-3 text-center border transition-all",
                                                    deficitTab === 'exempted'
                                                        ? "bg-green-50 border-green-200 ring-2 ring-green-500/10"
                                                        : "bg-white border-green-50 hover:bg-green-50/50"
                                                )}
                                            >
                                                <p className="text-[9px] font-bold text-green-500">معفيين</p>
                                                <p className="text-lg font-black text-green-600 font-sans">{unpaidStudents.filter(s => s.isExempted).length}</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* قائمة الطلاب في النافذة */}
                                    <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                                        <div className="space-y-3">
                                            {(() => {
                                                const displayedStudents = unpaidStudents.filter(s =>
                                                    deficitTab === 'unpaid' ? !s.isExempted : s.isExempted
                                                );

                                                if (displayedStudents.length === 0) {
                                                    return (
                                                        <div className="py-16 text-center text-gray-400 text-sm font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                                                            {deficitTab === 'unpaid' ? (
                                                                <>
                                                                    <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
                                                                    جميع الطلاب قاموا بالدفع! 🎉
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Gift size={40} className="mx-auto mb-3 text-gray-300" />
                                                                    لا يوجد طلاب معفيين.
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return displayedStudents.map((student, index) => (
                                                    <div
                                                        key={student.id}
                                                        className={cn(
                                                            "bg-white rounded-2xl p-4 border shadow-sm transition-all",
                                                            student.isExempted
                                                                ? "border-green-200 bg-green-50/30"
                                                                : "border-amber-100 hover:border-amber-200"
                                                        )}
                                                    >
                                                        <div className="flex flex-row-reverse items-start justify-between gap-3">
                                                            {/* معلومات الطالب */}
                                                            <div className="flex flex-row-reverse items-center gap-3 flex-1">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm font-sans shrink-0",
                                                                    student.isExempted
                                                                        ? "bg-green-100 text-green-600"
                                                                        : "bg-amber-100 text-amber-600"
                                                                )}>
                                                                    {student.isExempted ? <Gift size={18} /> : index + 1}
                                                                </div>
                                                                <div className="text-right flex-1 min-w-0">
                                                                    <h4 className="font-bold text-gray-900 truncate">{student.name}</h4>
                                                                    <div className="flex flex-row-reverse items-center gap-2 mt-1 flex-wrap">
                                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{student.groupName}</span>
                                                                        {student.enrollmentDate && (
                                                                            <span className="text-[10px] text-gray-400 font-bold font-sans" dir="ltr">{student.enrollmentDate}</span>
                                                                        )}
                                                                        {student.isExempted && (
                                                                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-md font-bold">تم العفو</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* تفاصيل المبالغ */}
                                                            <div className="text-left shrink-0">
                                                                <div className="text-[9px] font-bold text-gray-400 mb-1">المتبقي</div>
                                                                <p className={cn(
                                                                    "text-lg font-black font-sans",
                                                                    student.isExempted ? "text-green-600 line-through" : "text-red-600"
                                                                )}>
                                                                    {student.remaining.toLocaleString()} <span className="text-[9px]">ج.م</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* تفاصيل الدفع وزر العفو */}
                                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-row-reverse items-center justify-between gap-2">
                                                            <div className="flex flex-row-reverse items-center gap-3 text-[10px] font-bold">
                                                                <span className="text-gray-400">المطلوب: <span className="text-gray-600 font-sans">{student.expectedAmount}</span></span>
                                                                <span className="text-gray-400">المدفوع: <span className="text-green-600 font-sans">{student.paidAmount}</span></span>
                                                            </div>

                                                            {/* زر العفو أو إلغاء العفو */}
                                                            {isDirector && (
                                                                student.isExempted ? (
                                                                    <button
                                                                        onClick={() => handleRemoveExemption(student.id, student.name)}
                                                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                                                                    >
                                                                        <UserX size={12} />
                                                                        إلغاء العفو
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleExemptStudent(student.id, student.name, student.remaining)}
                                                                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
                                                                    >
                                                                        <Gift size={12} />
                                                                        العفو عن المبلغ
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* ذيل النافذة */}
                                    <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/30 shrink-0">
                                        <p className="text-[10px] font-bold text-amber-600/70 text-center">
                                            💡 العفو عن طالب يعني إزالته من قائمة الديون لهذا الشهر فقط
                                        </p>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}