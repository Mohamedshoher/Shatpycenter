// types.ts - ملف تعريف الأنواع لضمان ربط الملفات ببعضها
import { Student } from '@/types';
import { useStudentRecords } from './useStudentRecords';

export interface StudentDetailModalProps {
    student: Student | null;
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
    currentAttendance?: 'present' | 'absent' | null;
    onEdit?: (student: Student) => void;
}

// هذا النوع يجمع كل السجلات التي تعود من هوك useStudentRecords
export type StudentRecordsHook = ReturnType<typeof useStudentRecords>;