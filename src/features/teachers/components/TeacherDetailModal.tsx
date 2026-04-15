"use client"; // توجيه لاستخدام المكون في جانب العميل (Client-side)

// ==========================================
// 1. استيراد المكتبات والأدوات الأساسية
// ==========================================
import { useState, useEffect, useRef } from 'react'; // هوكس الحالة والتأثيرات من React
import { motion, AnimatePresence } from 'framer-motion'; // مكتبة الحركات والأنيميشن
import { cn, getWhatsAppUrl } from '@/lib/utils'; // وظيفة لدمج أصناف CSS بشكل ديناميكي
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
import { useTeacherDashboard } from '@/features/teachers/hooks/useTeacherDashboard';
import { TeacherDeficitModal } from './TeacherDeficitModal';
import { TeacherCollectedPaymentsModal } from './TeacherCollectedPaymentsModal';
import { TeacherGroupsTab } from './TeacherGroupsTab';

// ==========================================
// 4. الدوال المساعدة (Helper Functions) - خارج المكون لتحسين الأداء
// ==========================================
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

    const currentMonthLabel = getMonthLabel(0); // الشهر الحالي
    const previousMonthLabel = getMonthLabel(-1); // الشهر السابق

    // ==========================================
    // إدارة حالة الشهر والتواريخ
    // ==========================================
    const currentDate = new Date();
    const currentMonthRaw = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel); // الشهر المعروض للمستخدم
    const [selectedMonthRaw, setSelectedMonthRaw] = useState(currentMonthRaw); // القيمة التقنية للشهر (YYYY-MM)

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
    const [isSettlementMode, setIsSettlementMode] = useState(false); // وضع تصفية الحساب

    const dashboard = useTeacherDashboard(
        teacher,
        students,
        groups,
        allFees,
        handovers,
        exemptions,
        attendanceData,
        deductions,
        paymentsHistory,
        selectedMonthRaw,
        isSettlementMode
    );

    // استخراج النتائج من الخطاف (Dashboard Hook)
    // نستخدم قيم افتراضية في حالة كان الـ dashboard غير موجود حالياً
    const {
        expectedExpenses = 0,
        collectedPayments = [],
        totalCollected = 0,
        managerCollectedPayments = [],
        totalCollectedByManager = 0,
        unpaidStudents = [],
        realDeficit = 0,
        collectionHistoryMapped = [],
        totalHandedOver = 0,
        salaryStats = {
            basicSalary: 0,
            autoRewards: 0,
            manualRewardsTotal: 0,
            autoDeductions: 0,
            manualDeductionsTotal: 0,
            totalPaid: 0,
            totalEntitlement: 0,
            remainingToPay: 0,
            dailyRate: 0
        }
    } = dashboard || {};

    const {
        basicSalary,
        autoRewards,
        manualRewardsTotal,
        autoDeductions,
        manualDeductionsTotal,
        totalPaid,
        totalEntitlement,
        remainingToPay,
        dailyRate
    } = salaryStats;

    // ==========================================
    // الحالات الخاصة بالنماذج (States)
    // ==========================================
    const [showCollectedDetails, setShowCollectedDetails] = useState(false);
    const [showManagerCollectedDetails, setShowManagerCollectedDetails] = useState(false);
    const [showDeficitDetails, setShowDeficitDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('collection'); // التبويب النشط
    const [amount, setAmount] = useState(''); // مبلغ التحصيل
    const [notes, setNotes] = useState(''); // ملاحظات التحصيل

    // حالات الخصم والمكافأة اليدوية
    const [manualEntryType, setManualEntryType] = useState<'reward' | 'discipline'>('reward');
    const [manualEntryAmount, setManualEntryAmount] = useState('');
    const [manualEntryNote, setManualEntryNote] = useState('');

    // حالات عجز المجموعة
    const [deficitTab, setDeficitTab] = useState<'unpaid' | 'exempted'>('unpaid');

    // حالات تقويم الحضور
    const [activeDayMenu, setActiveDayMenu] = useState<number | null>(null);
    const [tempStatus, setTempStatus] = useState<'present' | 'absent' | 'discipline' | 'reward'>('present');
    const [tempAmount, setTempAmount] = useState<'day' | 'half' | 'quarter'>('day');
    const [tempReason, setTempReason] = useState('');
    const [dayDetails, setDayDetails] = useState<Record<number, { reason: string, type: string }>>({});

    // ==========================================
    // معالجات الأحداث (Event Handlers)
    // ==========================================

    // 1. العفو عن طالب
    const handleExemptStudent = async (studentId: string, studentName: string, amount: number) => {
        if (!teacher) return;

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
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['free_exemptions', selectedMonthRaw] });
        } catch (err) {
            // Silently ignore
        }
    };

    // 2. إلغاء العفو
    const handleRemoveExemption = async (studentId: string, studentName: string) => {
        try {
            const { error } = await supabase.from('free_exemptions').delete().eq('student_id', studentId).eq('month', selectedMonthRaw);
            if (error) {
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['free_exemptions', selectedMonthRaw] });
        } catch (err) {
            // Silently ignore
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

        const whatsappUrl = getWhatsAppUrl(teacher.phone, report);
        window.open(whatsappUrl, '_blank');
    };

    // 7. إسناد مجموعة للمعلم
    const handleAssignGroup = async (groupId: string) => {
        if (!teacher) return;
        try {
            await updateGroup(groupId, { teacherId: teacher.id });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
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
            const todayStr = now.toISOString().split('T')[0];
            
            // تاريخ المعاملة لأغراض المحاسبة (Accounting Date)
            // إذا كان الشهر المختار هو الشهر الحالي، نستخدم تاريخ اليوم
            // أما إذا كان شهراً مختلفاً، نستخدم اليوم الأول من ذلك الشهر ليظهر في إحصائياته
            const transactionDate = selectedMonthRaw === currentMonthRaw ? todayStr : `${selectedMonthRaw}-01`;

            // تجهيز الوصف: إضافة التاريخ الفعلي للاستلام إذا كان مختلفاً عن شهر الإحصائية
            let finalDescription = notes || `تحصيل من المدرس ${teacher.fullName}`;
            if (selectedMonthRaw !== todayStr.substring(0, 7)) {
                const formattedToday = new Intl.DateTimeFormat('ar-EG', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                }).format(now);
                finalDescription += ` (استلم فعلياً بتاريخ: ${formattedToday})`;
            }

            await addTransaction({
                amount: Number(amount),
                type: 'income',
                category: 'تحصيل من مدرس',
                date: transactionDate,
                description: finalDescription,
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

    // معالجة الضغط على زر الرجوع في المتصفح لإغلاق النافذة
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const handlePopState = () => {
            onCloseRef.current();
        };

        if (isOpen) {
            window.history.pushState({ isTeacherModalOpen: true }, '');
            window.addEventListener('popstate', handlePopState);
            
            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.isTeacherModalOpen) {
                    window.history.back();
                }
            };
        }
    }, [isOpen]);

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
                return (
                    <TeacherGroupsTab
                        teacher={teacher}
                        groups={groups || []}
                        students={students || []}
                        teachers={teachers || []}
                        isDirector={isDirector}
                        onAssignGroup={handleAssignGroup}
                        onRemoveGroup={handleRemoveGroup}
                    />
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
                        deductions={deductions}
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
                        isSettlementMode={isSettlementMode}
                        setIsSettlementMode={setIsSettlementMode}
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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl h-[95vh] bg-white rounded-[40px] md:rounded-[56px] shadow-2xl z-[201] overflow-hidden flex flex-col border border-white/20"
                    >
                        {/* رأس النافذة (Header) */}
                        <div className="p-5 md:p-8 relative bg-white border-b border-gray-50 shrink-0">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-3">
                                    <div className="text-right min-w-0">
                                            <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate leading-tight">{teacher!.fullName}</h2>
                                        {isDirector ? (
                                            <div className="flex flex-row-reverse items-center justify-end gap-1 mt-1">
                                                <button onClick={() => onDelete?.(teacher!)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="حذف"><Trash2 size={16} /></button>
                                                <button onClick={() => onEdit?.(teacher!)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="تعديل"><Edit3 size={16} /></button>
                                                <a href={`tel:${teacher!.phone}`} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="اتصال"><Phone size={16} /></a>
                                                <button onClick={() => window.open(getWhatsAppUrl(teacher!.phone), '_blank')} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all" title="واتساب"><MessageCircle size={16} /></button>
                                            </div>
                                        ) : (
                                            <p className="text-blue-500 font-bold text-[10px] md:text-sm mt-0.5 whitespace-nowrap">الملف الشخصي للمدرس</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 md:gap-3">

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

                    {/* نافذة تفاصيل تحصيل المدرس */}
                    <TeacherCollectedPaymentsModal
                        isOpen={showCollectedDetails}
                        onClose={() => setShowCollectedDetails(false)}
                        title="تفاصيل ما حصله المدرس"
                        totalAmount={totalCollected}
                        payments={collectedPayments}
                        isDirector={isDirector}
                        onDeleteFee={handleDeleteFee}
                        accentColor="blue"
                    />

                    {/* نافذة تفاصيل تحصيل المدير */}
                    <TeacherCollectedPaymentsModal
                        isOpen={showManagerCollectedDetails}
                        onClose={() => setShowManagerCollectedDetails(false)}
                        title="ما حصله المدير من المجموعة"
                        totalAmount={totalCollectedByManager}
                        payments={managerCollectedPayments}
                        isDirector={isDirector}
                        onDeleteFee={handleDeleteFee}
                        accentColor="indigo"
                    />

                    {/* نافذة تفاصيل عجز المجموعة الحقيقي - الطلاب المدينين */}
                    <TeacherDeficitModal
                        isOpen={showDeficitDetails}
                        onClose={() => setShowDeficitDetails(false)}
                        realDeficit={realDeficit}
                        unpaidStudents={unpaidStudents}
                        deficitTab={deficitTab as 'unpaid' | 'exempted'}
                        setDeficitTab={(tab) => setDeficitTab(tab)}
                        isDirector={isDirector}
                        handleExemptStudent={handleExemptStudent}
                        handleRemoveExemption={handleRemoveExemption}
                    />
                </>
            )}
        </AnimatePresence>
    );
}