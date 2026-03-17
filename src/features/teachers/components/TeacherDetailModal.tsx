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
import { TeacherCollectionTab } from './TeacherCollectionTab';
import { TeacherAttendanceTab } from './TeacherAttendanceTab';
import { TeacherPayrollTab } from './TeacherPayrollTab';

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
    interface CollectedPayment {
        id: string;
        feeId: string;
        studentId: string;
        studentName: string;
        amount: number;
        date: string;
        status: 'active' | 'archived';
        transferStatus: string;
        groupName: string;
    }

    const collectedPayments: CollectedPayment[] = (() => {
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

    interface UnpaidStudent {
        id: string;
        name: string;
        groupName: string;
        expectedAmount: number;
        paidAmount: number;
        remaining: number;
        isExempted: boolean;
        enrollmentDate?: string;
    }

    const unpaidStudents: UnpaidStudent[] = (() => {
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
            // تبويب التحصيل (Collection)
            // ----------------------------------------
            case 'collection':  
                return (
                    <TeacherCollectionTab
                        teacher={teacher}
                        isTeacher={isTeacher}
                        updateMonth={updateMonth}
                        selectedMonthRaw={selectedMonthRaw}
                        amount={amount}
                        setAmount={setAmount}
                        notes={notes}
                        setNotes={setNotes}
                        handleCollectionSubmit={handleCollectionSubmit}
                        expectedExpenses={expectedExpenses}
                        totalCollected={totalCollected}
                        totalCollectedByManager={totalCollectedByManager}
                        totalHandedOver={totalHandedOver}
                        collectionHistoryMapped={collectionHistoryMapped}
                        setShowCollectedDetails={setShowCollectedDetails}
                        setShowManagerCollectedDetails={setShowManagerCollectedDetails}
                        setShowDeficitDetails={setShowDeficitDetails}
                        realDeficit={realDeficit}
                        unpaidStudents={unpaidStudents}
                        handleDeleteFee={handleDeleteFee}
                    />
                );
            // --------------------------------------------------------------------------------
            // تبويب الحضور والانصراف (Attendance)
            // ----------------------------------------
            case 'attendance':
                return (
                    <TeacherAttendanceTab
                        updateMonth={updateMonth}
                        selectedMonthRaw={selectedMonthRaw}
                        selectedMonth={selectedMonth}
                        attendanceData={attendanceData}
                        isTeacher={isTeacher}
                        activeDayMenu={activeDayMenu}
                        setActiveDayMenu={setActiveDayMenu}
                        setTempStatus={setTempStatus}
                        tempStatus={tempStatus}
                        handleAddDiscipline={handleAddDiscipline}
                        tempAmount={tempAmount}
                        setTempAmount={setTempAmount}
                        tempReason={tempReason}
                        setTempReason={setTempReason}
                        dayDetails={dayDetails}
                        setDayDetails={setDayDetails}
                        updateAttendanceAsync={updateAttendanceAsync}
                        dailyRate={dailyRate}
                    />
                );
            // --------------------------------------------------------------------------------
            // تبويب الراتب والمحاسبة المالية (Payroll)
            // ----------------------------------------
            case 'payroll':
                return (
                    <TeacherPayrollTab
                        selectedMonth={selectedMonth}
                        selectedMonthRaw={selectedMonthRaw}
                        updateMonth={updateMonth}
                        basicSalary={basicSalary}
                        autoRewards={autoRewards}
                        manualRewardsTotal={manualRewardsTotal}
                        autoDeductions={autoDeductions}
                        manualDeductionsTotal={manualDeductionsTotal}
                        totalPaid={totalPaid}
                        totalEntitlement={totalEntitlement}
                        remainingToPay={remainingToPay}
                        isTeacher={isTeacher}
                        paymentsHistory={paymentsHistory}
                        handlePaySalary={handlePaySalary}
                        handleSendReport={handleSendReport}
                        deleteSalaryMutation={deleteSalaryMutation}
                    />
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