import SchedulesDashboard from '@/features/schedules/components/SchedulesDashboard';

export const metadata = {
    title: 'تحليل المواعيد - مركز الشاطبي',
    description: 'تحليل وضبط المواعيد الساعات لمختلف المجموعات',
};

export default function SchedulesPage() {
    return (
        <div className="w-full">
            <SchedulesDashboard />
        </div>
    );
}
