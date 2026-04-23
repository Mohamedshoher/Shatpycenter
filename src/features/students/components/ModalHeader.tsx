import { X, Archive, RotateCcw, Edit3, MessageCircle, Phone } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useStudents } from '../hooks/useStudents';
import { useGroups } from '../../../features/groups/hooks/useGroups';
import { cn, getWhatsAppUrl } from '../../../lib/utils';

export default function ModalHeader({ student, onClose, onEdit }: any) {
    const { user } = useAuthStore();
    const { data: groups = [] } = useGroups();
    const { archiveStudent, restoreStudent } = useStudents();
    
    const isArchived = student?.status === 'archived';
    const canManage = user?.role !== 'teacher'; // المعلم لا يملك صلاحية الأرشفة أو التعديل

    // وظيفة التواصل عبر واتساب
    const handleWhatsApp = () => {
        if (student?.parentPhone) {
            window.open(getWhatsAppUrl(student.parentPhone), '_blank');
        }
    };

    // وظيفة الاتصال الهاتفي
    const handleCall = () => {
        if (student?.parentPhone) window.location.href = `tel:${student.parentPhone}`;
    };

    // وظيفة تبديل حالة الأرشفة
    const handleArchiveToggle = () => {
        if (isArchived) {
            if (confirm(`استعادة ${student.fullName}؟`)) restoreStudent(student.id, student.groupId || null);
        } else {
            if (confirm(`أرشفة ${student.fullName}؟`)) archiveStudent(student.id);
        }
        onClose(); // إغلاق المودال بعد الأرشفة
    };

    return (
        <div className="p-5 relative border-b border-gray-50">
            {/* زر الإغلاق */}
            <button onClick={onClose} className="absolute left-5 top-5 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={20} />
            </button>

            <div className="text-right mt-2 md:mt-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{student.fullName}</h2>

                <div className="flex items-center justify-end gap-3 flex-wrap">
                    {/* اسم المجموعة */}
                    <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        {groups.find((g: any) => g.id === student.groupId)?.name || 'بدون مجموعة'}
                    </span>

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <>
                                {/* أزرار التحكم (أرشفة، تعديل، واتساب، اتصال) */}
                                <button onClick={handleCall} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Phone size={16} /></button>
                                <button onClick={handleWhatsApp} className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center"><MessageCircle size={16} /></button>
                                <button onClick={() => onEdit?.(student)} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Edit3 size={16} /></button>
                                <button onClick={handleArchiveToggle} className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", isArchived ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-500")}>
                                    {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
