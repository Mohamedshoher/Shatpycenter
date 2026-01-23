'use client';

import { useState } from 'react';
import StudentDetailModal from './StudentDetailModal';

interface StudentDetailsViewProps {
  studentId: string;
}

export default function StudentDetailsView({ studentId }: StudentDetailsViewProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <StudentDetailModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      student={null}
    />
  );
}
