// ============================================================================
// القسم الأول: الاستيرادات (Imports)
// ============================================================================

// استيراد أدوات مكتبة React Query المسؤولة عن جلب البيانات وإدارة ذاكرة التخزين المؤقت (Cache)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// استيراد دوال الخدمات (Services) والأنواع (Types) الخاصة بسجل الحضور
import { 
    getTeacherAttendance, 
    getAllTeachersAttendance, 
    updateTeacherAttendance, 
    TeacherAttendanceStatus 
} from "../services/attendanceService";

// ============================================================================
// القسم الثاني: خطاف (Hook) إدارة حضور معلم واحد (useTeacherAttendance)
// ============================================================================

export const useTeacherAttendance = (teacherId?: string, monthKey?: string) => {
    // تهيئة أداة التحكم في الـ Cache
    const queryClient = useQueryClient();

    // 1. استعلام جلب بيانات الحضور لمعلم محدد في شهر محدد
    const attendanceQuery = useQuery({
        queryKey: ['teacher-attendance', teacherId, monthKey], // مفتاح الاستعلام الفريد
        // دالة الجلب: تتأكد من وجود المعرف والشهر قبل إرسال الطلب للخادم
        queryFn: () => teacherId && monthKey ? getTeacherAttendance(teacherId, monthKey) : Promise.resolve({}),
        enabled: !!teacherId && !!monthKey, // تفعيل الاستعلام فقط إذا توفرت المعطيات
    });

    // 2. عملية تحديث (Mutation) لتسجيل أو تعديل حالة الحضور
    const updateAttendanceMutation = useMutation({
        // الدالة المسؤولة عن إرسال التحديث الفعلي للخادم
        mutationFn: ({ date, status, notes }: { date: string, status: TeacherAttendanceStatus, notes?: string }) =>
            teacherId ? updateTeacherAttendance(teacherId, date, status, notes) : Promise.reject("No teacher selected"),
        
        // التحديث المتفائل (Optimistic Update): لتسريع استجابة الواجهة قبل وصول رد الخادم
        onMutate: async ({ date, status }) => {
            if (!teacherId) return;

            // استخراج رقم اليوم من التاريخ (مثال: من 2023-10-15 نستخرج 15)
            const day = parseInt(date.split('-')[2]);

            // أ) تحديث ذاكرة التخزين المؤقت (Cache) الخاصة بالمعلم الفردي
            await queryClient.cancelQueries({ queryKey: ['teacher-attendance', teacherId, monthKey] }); // إيقاف أي جلب جاري
            queryClient.setQueryData(['teacher-attendance', teacherId, monthKey], (old: any) => ({
                ...(old || {}),
                [day]: status // تحديث حالة اليوم المطلوب فقط
            }));

            // ب) تحديث ذاكرة التخزين المؤقت (Cache) الخاصة بخريطة جميع المعلمين
            await queryClient.cancelQueries({ queryKey: ['all-teachers-attendance', monthKey] }); // إيقاف أي جلب جاري
            queryClient.setQueryData(['all-teachers-attendance', monthKey], (old: any) => ({
                ...(old || {}),
                [teacherId]: {
                    ...(old?.[teacherId] || {}),
                    [day]: status // تحديث حالة اليوم لنفس المعلم داخل القائمة الشاملة
                }
            }));
        },

        // عند نجاح العملية بالكامل، نطلب من النظام إعادة جلب البيانات الحقيقية لضمان الدقة (Invalidation)
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-attendance', teacherId, monthKey] });
            queryClient.invalidateQueries({ queryKey: ['all-teachers-attendance', monthKey] });
        }
    });

    // إرجاع البيانات والدوال اللازمة لاستخدامها في واجهة المستخدم
    return {
        attendance: attendanceQuery.data || {}, // بيانات الحضور
        loading: attendanceQuery.isLoading, // حالة التحميل
        updateAttendance: updateAttendanceMutation.mutate, // دالة التحديث العادية
        updateAttendanceAsync: updateAttendanceMutation.mutateAsync, // دالة التحديث غير المتزامنة (ترجع Promise)
    };
};

// ============================================================================
// القسم الثالث: خطاف (Hook) جلب حضور جميع المعلمين (useAllTeachersAttendance)
// ============================================================================

// خطاف مخصص لجلب خريطة (Map) تحتوي على حضور جميع المعلمين لشهر معين (يُستخدم عادة في واجهة المشرف أو المدير)
export const useAllTeachersAttendance = (monthKey: string) => {
    return useQuery({
        queryKey: ['all-teachers-attendance', monthKey], // المفتاح الفريد للاستعلام
        queryFn: () => getAllTeachersAttendance(monthKey), // الدالة التي تجلب البيانات من الخدمة (Service)
    });
};