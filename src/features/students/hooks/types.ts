// types.ts - ملف تعريف الأنواع لضمان ربط الملفات ببعضها
import { Student } from '@/types';

export interface StudentDetailModalProps {
    student: Student | null;
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
    currentAttendance?: 'present' | 'absent' | null;
    onEdit?: (student: Student) => void;
}

// هذا النوع يجمع كل السجلات التي تعود من هوك useStudentRecords
export interface StudentRecordsHook {
    attendance: any[];
    exams: any[];
    fees: any[];
    exemptions: any[];
    notes: any[];
    addAttendance: any;
    addExam: any;
    addFee: any;
    addNote: any;
    deleteExam: any;
    deleteFee: any;
    deleteExemption: any;
    deleteNote: any;
}