"use client";
import { motion } from 'framer-motion';
import { Archive, FileText, MessageCircle, Phone, Edit3 } from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/utils';

interface StudentReportCardProps {
    student: any;
    index: number;
    userRole?: string;
    onArchive: (id: string) => void;
    onOpenDetails: (student: any) => void;
    onEdit?: (student: any) => void;
}

export default function StudentReportCard({ student, index, userRole, onArchive, onOpenDetails, onEdit }: StudentReportCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] p-3.5 shadow-sm border border-gray-100 flex flex-col gap-1.5 relative group hover:shadow-md transition-all cursor-pointer"
            onClick={() => onOpenDetails(student)}
        >
            {/* الاسم والمجموعة */}
            <div className="flex items-center justify-between gap-3 px-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 shrink-0 font-black text-base">
                        {index + 1}
                    </div>
                    <h3 className="font-black text-gray-900 text-lg truncate leading-tight">{student.fullName}</h3>
                </div>
                <span className="text-[9px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 shrink-0">
                    {student.groupName}
                </span>
            </div>

            {/* أرقام الغياب والحضور */}
            <div className="flex flex-col gap-2 border-t border-gray-50 pt-3 px-0.5">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 bg-red-50/50 px-2 py-1 rounded-xl border border-red-100/30">
                            <span className="text-[9px] text-red-700 font-bold">إجمالي الأسبوع:</span>
                            <span className="text-red-600 font-black text-sm font-sans">{student.totalAbsences}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-50/50 px-2 py-1 rounded-xl border border-amber-100/30">
                            <span className="text-[9px] text-amber-800 font-bold">متصل:</span>
                            <span className="text-amber-700 font-black text-sm font-sans">{student.continuousAbsences}</span>
                        </div>
                    </div>

                    {/* أزرار التواصل */}
                    <div className="flex items-center gap-1">
                        {(userRole === 'director' || userRole === 'supervisor') && onEdit && (
                            <button onClick={(e) => { e.stopPropagation(); onEdit(student); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="تعديل بيانات الطالب">
                                <Edit3 size={14} />
                            </button>
                        )}
                        {userRole !== 'teacher' && (
                            <button onClick={(e) => { e.stopPropagation(); onArchive(student.id); }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl" title="أرشفة الطالب">
                                <Archive size={14} />
                            </button>
                        )}
                        <button onClick={(e) => {
                            e.stopPropagation();
                            const phone = student.parentPhone || student.studentPhone || '';
                            const password = phone.length >= 6 ? phone.slice(-6) : phone;
                            const message = `السلام عليكم ورحمة الله،
ولي أمر الطالب/ة: *${student.fullName}*

نود تنبيهكم لغياب الطالب المتكرر:
- إجمالي الغياب هذا الأسبوع: ${student.totalAbsences} يوم
- الغياب المتصل: ${student.continuousAbsences} يوم

نرجو متابعة تقرير الطالب ومستواه عبر بوابة ولي الأمر:
🔗 https://shatpycenter-um2b.vercel.app/attendance-report

(المستخدم: ${phone} / المرور: ${password})

إدارة مركز الشاطبي للقرآن وعلومه 🌷`;
                            window.open(getWhatsAppUrl(phone, message), '_blank');
                        }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl" title="تواصل واتساب">
                            <MessageCircle size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${student.parentPhone}`; }} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="اتصال">
                            <Phone size={14} />
                        </button>
                    </div>
                </div>

                {/* شريط نسب الحضور والغياب */}
                <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-gray-100 border border-gray-200">
                        <div style={{ width: `${student.presencePercentage}%` }} className="h-full bg-green-500 hover:bg-green-400 transition-all duration-500" title={`حضور: ${student.presencePercentage}%`} />
                        <div style={{ width: `${student.absencePercentage}%` }} className="h-full bg-red-500 hover:bg-red-400 transition-all duration-500" title={`غياب: ${student.absencePercentage}%`} />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black shrink-0 font-sans">
                        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100">ح: {student.presencePercentage}%</span>
                        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">غ: {student.absencePercentage}%</span>
                    </div>
                </div>
            </div>

            {/* الملحوظة الأخيرة */}
            <div className="bg-gray-50/60 rounded-xl p-2 border border-gray-100 text-right min-h-[38px] flex items-center relative">
                {student.lastNoteDate && <span className="absolute left-2 top-0.5 text-[7px] text-gray-300 font-bold">{student.lastNoteDate}</span>}
                <p className="text-[10px] font-bold text-gray-500 leading-tight line-clamp-1 pr-1">{student.lastNote}</p>
            </div>
        </motion.div>
    );
}