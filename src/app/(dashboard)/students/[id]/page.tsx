"use client";

import { use } from 'react';
import StudentDetailsView from '@/features/students/components/StudentDetailsView';

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <StudentDetailsView studentId={id} />;
}
