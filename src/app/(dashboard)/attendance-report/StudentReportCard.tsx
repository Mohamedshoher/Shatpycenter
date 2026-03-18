"use client";
import { motion } from 'framer-motion';
import { Archive, FileText, MessageCircle, Phone } from 'lucide-react';

interface StudentReportCardProps {
    student: any;
    index: number;
    userRole?: string;
    onArchive: (id: string) => void;
    onOpenDetails: (student: any) => void;
}

export default function StudentReportCard({ student, index, userRole, onArchive, onOpenDetails }: StudentReportCardProps) {
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

            {/* أرقام الغياب */}
            <div className="flex items-center justify-between border-t border-gray-50 pt-2 px-0.5">
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 bg-red-50/50 px-2.5 py-1.5 rounded-xl border border-red-100/30">
                        <span className="text-[10px] text-red-700 font-bold">إجمالي:</span>
                        <span className="text-red-600 font-black text-base font-sans">{student.totalAbsences}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1.5 rounded-xl border border-amber-100/30">
                        <span className="text-[10px] text-amber-800 font-bold">متصل:</span>
                        <span className="text-amber-700 font-black text-base font-sans">{student.continuousAbsences}</span>
                    </div>
                </div>

                {/* أزرار التواصل */}
                <div className="flex items-center gap-1">
                    {userRole !== 'teacher' && (
                        <button onClick={(e) => { e.stopPropagation(); onArchive(student.id); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl">
                            <Archive size={16} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${student.parentPhone}`, '_blank'); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl">
                        <MessageCircle size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${student.parentPhone}`; }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                        <Phone size={16} />
                    </button>
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