"use client";

import { useAuthStore } from '@/store/useAuthStore';
import StudentNotesPage from '@/features/students/components/StudentNotesPage';

export default function NotesPage() {
    const { user } = useAuthStore();
    if (!user) return null;
    return <StudentNotesPage />;
}