'use client'; // توجيه لاستخدام المكون في جانب العميل (Client-side)

// ==========================================
// 1. الاستيرادات الأساسية (الأنواع، الأيقونات، وأدوات التاريخ)
// ==========================================
import { TeacherDeduction } from '@/features/teachers/services/deductionService'; // استيراد نوع بيانات الخصم
import { Trash2, AlertCircle, Calendar } from 'lucide-react'; // أيقونات واجهة المستخدم
import { format } from 'date-fns'; // أداة لتنسيق وعرض التواريخ
import { ar } from 'date-fns/locale'; // دعم اللغة العربية لتنسيق التاريخ

// ==========================================
// 2. تعريف خصائص المكون (Props)
// ==========================================
interface DeductionsListProps {
  deductions: TeacherDeduction[]; // مصفوفة تحتوي على بيانات الخصومات
  onRemove?: (id: string) => void; // دالة اختيارية لحذف خصم معين (تمرر من المكون الأب)
  showTeacherName?: boolean; // خيار لإظهار أو إخفاء اسم المعلم (مفيد إذا عُرضت القائمة لعدة معلمين)
}

// ==========================================
// 3. المكون الرئيسي: قائمة عرض الخصومات
// ==========================================
export const DeductionsList: React.FC<DeductionsListProps> = ({
  deductions,
  onRemove,
  showTeacherName = false, // القيمة الافتراضية هي إخفاء اسم المعلم
}) => {
  
  // ==========================================
  // العمليات الحسابية والمنطق
  // ==========================================
  
  // حساب إجمالي عدد أيام/مبالغ الخصومات من خلال جمع قيم (amount) لكل عنصر في المصفوفة
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  // إذا لم تكن هناك أي خصومات، يتم عرض رسالة بديلة (Empty State)
  if (deductions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>لا توجد خصومات</p>
      </div>
    );
  }

  // ==========================================
  // واجهة المستخدم (Render)
  // ==========================================
  return (
    <div className="space-y-3">
        
      {/* 1. بطاقة الملخص: تعرض إجمالي الخصومات (Summary Card) */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-200">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-sm text-red-600 font-medium">إجمالي الخصومات</p>
            <p className="text-2xl font-bold text-red-700">
              {totalDeductions.toFixed(2)} يوم
            </p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
      </div>

      {/* 2. قائمة الخصومات التفصيلية (Deductions List) */}
      <div className="space-y-2">
        {deductions.map((deduction) => (
          <div
            key={deduction.id}
            // تغيير لون حافة وخلفية البطاقة بناءً على حالة الخصم (مطبق: أحمر، غير ذلك: أصفر)
            className={`p-4 rounded-lg border-l-4 ${
              deduction.status === 'applied'
                ? 'border-l-red-500 bg-red-50'
                : 'border-l-yellow-500 bg-yellow-50'
            }`}
          >
            <div className="flex items-start justify-between">
                
              {/* الجانب الأيمن: تفاصيل الخصم (الاسم، السبب، التاريخ) */}
              <div className="flex-1 text-right">
                {/* عرض اسم المعلم فقط إذا كانت الخاصية showTeacherName مفعلة */}
                {showTeacherName && (
                  <p className="font-semibold text-gray-900 mb-1">
                    {deduction.teacherName}
                  </p>
                )}
                <p className="text-sm text-gray-700 font-medium mb-2">
                  {deduction.reason}
                </p>
                
                {/* عرض تاريخ ووقت تطبيق الخصم باللغة العربية */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(deduction.appliedDate), 'dd MMMM yyyy HH:mm', {
                      locale: ar, // استخدام الإعدادات المحلية العربية
                    })}
                  </span>
                </div>
              </div>

              {/* الجانب الأيسر: قيمة الخصم وزر الحذف */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xl font-bold text-red-600">
                  -{deduction.amount}
                </span>
                
                {/* إظهار زر الحذف فقط إذا توفرت دالة onRemove وكان الخصم "مطبقاً" بالفعل */}
                {onRemove && deduction.status === 'applied' && (
                  <button
                    onClick={() => onRemove(deduction.id)}
                    className="p-1 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                    title="حذف الخصم"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};