import LoginForm from '@/features/auth/components/LoginForm';

export const metadata = {
    title: 'تسجيل الدخول - مركز الشاطبي',
    description: 'بوابة تسجيل الدخول لمنظومة مركز الشاطبي للقرآن وعلومه',
};

export default function LoginPage() {
    return (
        <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-x-hidden overflow-y-auto bg-[#070e1c] py-8 sm:py-12 px-4 selection:bg-blue-500/30 selection:text-white">
            {/* خلفية بتدرج لوني عميق فاخر */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#132342] via-[#081122] to-[#040812] pointer-events-none" />
            
            {/* هالات ضوئية ناعمة */}
            <div className="fixed -top-20 -left-20 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none animate-pulse duration-1000" />
            <div className="fixed top-1/2 -right-20 w-96 h-96 bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />
            <div className="fixed -bottom-20 left-1/4 w-80 h-80 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* شبكة هندسية خافتة وحديثة */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 w-full flex justify-center my-auto">
                <LoginForm />
            </div>
        </div>
    );
}
