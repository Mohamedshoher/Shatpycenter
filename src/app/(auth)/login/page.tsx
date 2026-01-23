import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginPage() {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a192f]">
            {/* Dark Gradient Overlay - Matches the image style */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2c4e] via-[#0a192f] to-[#040c18] z-0" />

            {/* Subtle glow effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

            <div className="relative z-10 w-full px-4 flex justify-center">
                <LoginForm />
            </div>
        </div>
    );
}
