import LoginForm from '@/features/auth/components/LoginForm';

export const metadata = {
    title: 'تسجيل الدخول - مركز الشاطبي',
    description: 'بوابة تسجيل الدخول لمنظومة مركز الشاطبي للقرآن وعلومه',
};

export default function LoginPage() {
    return (
        <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#132342] to-[#070e1c] py-8 px-4 selection:bg-blue-500/30 selection:text-white">
            <div className="relative z-10 w-full flex justify-center my-auto">
                <LoginForm />
            </div>
        </div>
    );
}
