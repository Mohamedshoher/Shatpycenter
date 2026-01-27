export type UserRole = 'director' | 'supervisor' | 'teacher' | 'parent';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teacherId?: string; // ID of the teacher if role is 'teacher'
  teacherName?: string;
  photoURL?: string;
  createdAt: number;
  lastLogin?: number;
}

export interface Student {
  id: string;
  fullName: string;
  enrollmentDate: string; // ISO Date YYYY-MM-DD
  birthDate?: string; // ISO Date YYYY-MM-DD
  address: string;
  isOrphan?: boolean;
  parentPhone: string;
  studentPhone?: string;
  guardianName?: string;
  status: 'active' | 'archived' | 'suspended' | 'pending';
  isArchived?: boolean; // Helper prop
  groupId: string | null;
  monthlyAmount?: number;
  appointment?: string; // موعد الحضور المتفق عليه
  notes?: string;
  archivedDate?: string; // تاريخ الأرشفة ISO Date YYYY-MM-DD
}

export interface Teacher {
  id: string;
  fullName: string;
  phone: string;
  assignedGroups: string[]; // Group IDs
  status: 'active' | 'inactive';
  dailyReportSubmitted?: boolean;
  lastReportTimestamp?: number;
  role?: 'teacher' | 'supervisor';
  accountingType?: 'fixed' | 'partnership';
  salary?: number;
  partnershipPercentage?: number;
  password?: string;
  responsibleSections?: string[];
}

export interface Group {
  id: string;
  name: string;
  teacherId: string | null;
  teacher?: string; // اسم المعلم (محسوب من teacherId)
  schedule: string; // Free text or structured
  count?: number; // عدد الطلاب في المجموعة
  color?: string; // لون المجموعة للعرض
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'excused' | 'late';
  notes?: string;
  recordedBy: string; // User ID
}

export interface ExamResult {
  id: string;
  studentId: string;
  examTitle: string;
  date: string; // YYYY-MM-DD
  score: number;
  maxScore: number;
  notes?: string;
}

export interface QuranProgress {
  id: string;
  studentId: string;
  date: string;
  surah: string;
  ayahStart: number;
  ayahEnd: number;
  masteryLevel: 'excellent' | 'good' | 'average' | 'poor';
}

export interface FinancialTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'fees' | 'salary' | 'donation' | 'utilities' | 'other' | 'تحصيل من مدرس';
  date: string; // ISO Date YYYY-MM-DD
  timestamp: number;
  description: string;
  relatedUserId?: string; // Student or Teacher ID if applicable
  performedBy: string; // User ID (Admin/Supervisor)
}

export interface DailyReport {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  content: string;
  timestamp: number;
}
