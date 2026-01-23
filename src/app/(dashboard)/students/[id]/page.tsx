import StudentDetailsView from '@/features/students/components/StudentDetailsView';

export default function StudentDetailsPage({ params }: { params: { id: string } }) {
    return <StudentDetailsView studentId={params.id} />;
}
