"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CreditCard, BookOpen, FileText, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useStudents } from '../hooks/useStudents';
import { useStudentRecords } from '../hooks/useStudentRecords';
import { StudentDetailModalProps } from '../hooks/types';

// استيراد المكونات الفرعية التي قمنا بفصلها
import ModalHeader from './ModalHeader';
import AttendanceTab from './AttendanceTab';
import ScheduleTab from './ScheduleTab';
import FeesTab from './FeesTab';
import ExamsTab from './ExamsTab';
import NotesTab from './NotesTab';
import { useGroups } from '@/features/groups/hooks/useGroups';
import dynamic from 'next/dynamic';

const IqraCoursesTab = dynamic(() => import('../../iqra/components/IqraCoursesTab'), { ssr: false });
const IqraFollowupsTab = dynamic(() => import('../../iqra/components/IqraFollowupsTab'), { ssr: false });

export default function StudentDetailModal({ 
    student: initialStudent, 
    isOpen, 
    onClose, 
    initialTab = 'attendance', 
    onEdit,
    currentAttendance 
}: StudentDetailModalProps) {
    // تحديد التبويب النشط (الافتراضي هو الحضور)
    const [activeTab, setActiveTab] = useState(initialTab);

    // جلب المجموعات للتحقق من نوع المجموعة
    const { data: groups } = useGroups();
    
    // جلب بيانات الطلاب وتحديد الطالب الحالي لضمان تحديث البيانات فورياً
    const { data: students } = useStudents();
    const student = students?.find((s: any) => s.id === initialStudent?.id) || initialStudent;

    const studentGroup = groups?.find((g: any) => g.id === student?.groupId);
    const isIqraStudent = studentGroup?.name?.includes('إقراء') || studentGroup?.name?.includes('اقراء');

    // تحديث التبويب النشط إذا كان طالباً في الإقراء
    useEffect(() => {
        if (isIqraStudent && activeTab === 'attendance' && initialTab === 'attendance') {
            setActiveTab('iqra_logs');
        }
    }, [isIqraStudent]);

    // استدعاء الهوك الخاص بسجلات الطالب (حضور، مصروفات، اختبارات، ملحوظات)
    const studentRecords = useStudentRecords(student?.id || '');
    


    // تحديث التبويب النشط عند فتح المودال
    useEffect(() => {
        if (isOpen && initialTab) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    // دعم زر الرجوع في الهاتف لإغلاق المودال
    useEffect(() => {
        if (!isOpen) return;

        window.history.pushState({ studentModalOpen: true }, '');
        const handlePopState = () => onClose();
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!student || !isOpen) return null;



    // تعريف التبويبات (الأزرار العلوية)
    const tabs = isIqraStudent ? [
        { id: 'iqra_logs', label: 'سجل المتابعات', icon: Clock },
        { id: 'iqra_courses', label: 'سجل الدورات', icon: BookOpen },
        { id: 'attendance', label: 'سجل الحضور', icon: Calendar },
        { id: 'schedule', label: 'مواعيد الحضور', icon: Clock },
        { id: 'notes', label: 'سجل الملحوظات', icon: FileText },
    ] : [
        { id: 'attendance', label: 'سجل الحضور', icon: Calendar },
        { id: 'schedule', label: 'مواعيد الحضور', icon: Clock },
        { id: 'fees', label: 'سجل المصروفات', icon: CreditCard },
        { id: 'exams', label: 'سجل الاختبارات', icon: BookOpen },
        { id: 'notes', label: 'سجل الملحوظات', icon: FileText },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200]">
                {/* الخلفية المظلمة */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

                {/* جسم المودال الرئيسي */}
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] h-[99vh] max-h-[980px] min-h-[500px] bg-white rounded-[40px] shadow-2xl z-[201] overflow-hidden flex flex-col">

                    {/* 1. رأس المودال (الاسم وأزرار التحكم) */}
                    <ModalHeader student={student} onClose={onClose} onEdit={onEdit} />

                    {/* 2. شريط التنقل بين التبويبات */}
                    <div className="flex border-b border-gray-50 px-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn("flex-1 flex flex-col items-center gap-1 py-4 text-[10px] font-bold transition-all relative",
                                        isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600")}>
                                    <Icon size={20} className={cn("mb-1", isActive && "stroke-[2.5px]")} />
                                    <span className="hidden md:inline">{tab.label}</span>
                                    {isActive && <motion.div layoutId="modalTab" className="absolute bottom-0 left-2 right-2 h-1 bg-blue-600 rounded-t-full" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* 3. محتوى التبويبات (يتم استدعاء المكون بناءً على التبويب النشط) */}
                    <div className="flex-1 overflow-y-auto p-5 md:p-6 text-right">
                        {activeTab === 'attendance' && <AttendanceTab student={student} records={studentRecords} isIqraStudent={isIqraStudent} />}
                        {activeTab === 'schedule' && <ScheduleTab student={student} />}
                        {activeTab === 'fees' && <FeesTab student={student} records={studentRecords} />}
                        {activeTab === 'exams' && !isIqraStudent && <ExamsTab student={student} records={studentRecords} />}
                        {activeTab === 'notes' && <NotesTab student={student} records={studentRecords} />}
                        {activeTab === 'iqra_courses' && <IqraCoursesTab student={student} />}
                        {activeTab === 'iqra_logs' && <IqraFollowupsTab student={student} />}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}