import dynamic from 'next/dynamic';

const ArchiveList = dynamic(() => import('@/features/students/components/ArchiveList'));

export default function StudentArchivePage() {
    return (
        <div className="space-y-6">
            <ArchiveList />
        </div>
    );
}
