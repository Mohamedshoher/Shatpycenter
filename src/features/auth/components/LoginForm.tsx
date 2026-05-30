"use client";

import { useState, useEffect } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, GraduationCap, Phone, Lock, Briefcase, UserCheck, UserCircle } from 'lucide-react';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { cn } from '@/lib/utils';

type MainTab = 'parent' | 'teacher';
type RoleTab = 'director' | 'supervisor' | 'teacher';

export default function LoginForm() {
    const { login, loading, error } = useLogin();
    const { data: teachers } = useTeachers();

    const [mainTab, setMainTab] = useState<MainTab>('parent');
    const [roleTab, setRoleTab] = useState<RoleTab>('director');
    const [password, setPassword] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        const savedMainTab = localStorage.getItem('shatibi_last_main_tab') as MainTab | null;
        const savedRoleTab = localStorage.getItem('shatibi_last_role_tab') as RoleTab | null;
        const savedTeacherId = localStorage.getItem('shatibi_last_teacher_id');
        const savedPhone = localStorage.getItem('shatibi_parent_phone');
        const savedPass = localStorage.getItem('shatibi_last_pass');

        if (savedMainTab) setMainTab(savedMainTab);
        if (savedRoleTab) setRoleTab(savedRoleTab);
        if (savedTeacherId) setSelectedTeacherId(savedTeacherId);
        if (savedPhone) setPhone(savedPhone);
        if (savedPass) setPassword(savedPass);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let loginIdentifier: string = roleTab;

        localStorage.setItem('shatibi_last_main_tab', mainTab);
        localStorage.setItem('shatibi_last_pass', password);

        if (mainTab === 'parent') {
            loginIdentifier = `parent-${phone}`;
            localStorage.setItem('shatibi_parent_phone', phone);
        } else {
            localStorage.setItem('shatibi_last_role_tab', roleTab);
            if (roleTab === 'teacher' || roleTab === 'supervisor') {
                if (!selectedTeacherId) return;
                loginIdentifier = `${roleTab}-${selectedTeacherId}`;
                localStorage.setItem('shatibi_last_teacher_id', selectedTeacherId);
            }
        }

        await login(loginIdentifier, password);
    };

    const renderHeader = () => (
        <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">مركز الشاطبي</h1>
            <p className="text-blue-200/60 text-base md:text-lg">للقرآن وعلومه</p>
        </div>
    );

    const renderIconCards = () => (
        <div className="grid grid-cols-2 gap-4 mb-6 md:mb-8">
            <button
                type="button"
                onClick={() => setMainTab('parent')}
                className={cn(
                    "flex flex-col items-center gap-3 py-6 md:py-8 px-4 rounded-2xl transition-all duration-300",
                    mainTab === 'parent'
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.03] ring-2 ring-indigo-400/50"
                        : "bg-white/90 text-gray-500 hover:bg-white hover:shadow-lg backdrop-blur-sm"
                )}
            >
                <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all",
                    mainTab === 'parent' ? "bg-white/20" : "bg-indigo-50"
                )}>
                    <Users size={36} className="md:w-10 md:h-10" strokeWidth={1.5} />
                </div>
                <span className={cn(
                    "font-bold text-sm md:text-base",
                    mainTab === 'parent' ? "text-white" : "text-[#344767]"
                )}>
                    ولي الأمر
                </span>
            </button>
            <button
                type="button"
                onClick={() => setMainTab('teacher')}
                className={cn(
                    "flex flex-col items-center gap-3 py-6 md:py-8 px-4 rounded-2xl transition-all duration-300",
                    mainTab === 'teacher'
                        ? "bg-teal-600 text-white shadow-xl shadow-teal-500/20 scale-[1.03] ring-2 ring-teal-400/50"
                        : "bg-white/90 text-gray-500 hover:bg-white hover:shadow-lg backdrop-blur-sm"
                )}
            >
                <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all",
                    mainTab === 'teacher' ? "bg-white/20" : "bg-teal-50"
                )}>
                    <GraduationCap size={36} className="md:w-10 md:h-10" strokeWidth={1.5} />
                </div>
                <span className={cn(
                    "font-bold text-sm md:text-base",
                    mainTab === 'teacher' ? "text-white" : "text-[#344767]"
                )}>
                    المدرس
                </span>
            </button>
        </div>
    );

    const renderRoleSelector = () => (
        <div className="flex bg-[#f1f3f5] p-1 rounded-2xl justify-between shadow-inner">
            {[
                { id: 'director' as RoleTab, label: 'مدير', icon: Briefcase },
                { id: 'supervisor' as RoleTab, label: 'مشرف', icon: UserCheck },
                { id: 'teacher' as RoleTab, label: 'مدرس', icon: GraduationCap },
            ].map((role) => {
                const Icon = role.icon;
                return (
                    <button
                        key={role.id}
                        type="button"
                        onClick={() => setRoleTab(role.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all",
                            roleTab === role.id
                                ? "bg-white text-teal-600 shadow-sm scale-105"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Icon size={16} />
                        {role.label}
                    </button>
                );
            })}
        </div>
    );

    const renderTeacherForm = () => (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col items-center gap-4 py-2">
                <div className={cn(
                    "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-colors",
                    roleTab === 'director' ? "bg-blue-50 text-blue-600" :
                        roleTab === 'supervisor' ? "bg-purple-50 text-purple-600" :
                            "bg-teal-50 text-teal-600"
                )}>
                    {roleTab === 'director' ? <Briefcase size={28} className="md:w-8 md:h-8" /> :
                        roleTab === 'supervisor' ? <UserCheck size={28} className="md:w-8 md:h-8" /> :
                            <GraduationCap size={28} className="md:w-8 md:h-8" />}
                </div>
                <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-[#344767]">
                        دخول {roleTab === 'director' ? 'المدير' : roleTab === 'supervisor' ? 'المشرف' : 'المدرس'}
                    </h2>
                    <p className="text-[#7b809a] text-xs md:text-sm mt-1">
                        {roleTab === 'director' ? 'وصول كامل لجميع البيانات والصلاحيات' :
                            roleTab === 'supervisor' ? 'متابعة سير العمل والمعلمين' :
                                'المتابعة العلمية للطلاب والمجموعات'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {(roleTab === 'teacher' || roleTab === 'supervisor') && (
                    <div className="space-y-2">
                        <label className="text-xs md:text-sm font-bold text-[#344767] pr-2">
                            {roleTab === 'teacher' ? 'اسم المدرس' : 'اسم المشرف'}
                        </label>
                        <div className="relative">
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="w-full h-12 md:h-14 pr-12 pl-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none font-bold text-gray-700 text-sm md:text-base"
                                required
                            >
                                <option value="">-- اختر الاسم من القائمة --</option>
                                {teachers?.filter(t => t.status === 'active' && t.role === roleTab).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar')).map(t => (
                                    <option key={t.id} value={t.id}>{t.fullName}</option>
                                ))}
                            </select>
                            <UserCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs md:text-sm font-bold text-[#344767] pr-2">كلمة المرور</label>
                    <div className="relative">
                        <Input
                            type="password"
                            inputMode="numeric"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={cn(
                                "h-12 md:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-xl md:text-2xl tracking-[0.2em] focus:ring-2 transition-all font-sans pr-12",
                                roleTab === 'director' ? "focus:ring-blue-500/20" :
                                    roleTab === 'supervisor' ? "focus:ring-purple-500/20" :
                                        "focus:ring-teal-500/20"
                            )}
                            dir="ltr"
                        />
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center border border-red-100 font-bold animate-[fadeIn_0.3s_ease-out]">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                        "w-full h-12 md:h-14 rounded-2xl text-base md:text-lg font-bold shadow-xl transition-all active:scale-[0.98]",
                        roleTab === 'director' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" :
                            roleTab === 'supervisor' ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" :
                                "bg-teal-500 hover:bg-teal-600 shadow-teal-100"
                    )}
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mx-auto" />
                    ) : (
                        `دخول كـ${roleTab === 'director' ? 'مدير' : roleTab === 'supervisor' ? 'مشرف' : 'مدرس'}`
                    )}
                </Button>
            </form>
        </div>
    );

    const renderParentForm = () => (
        <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col items-center gap-4 py-2">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Users size={28} className="md:w-8 md:h-8" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-[#344767]">دخول ولي الأمر</h2>
                    <p className="text-[#7b809a] text-xs md:text-sm mt-1">متابعة الأبناء والتواصل مع المركز</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                    <label className="text-xs md:text-sm font-bold text-[#344767] pr-2">رقم الهاتف</label>
                    <div className="relative">
                        <Input
                            type="tel"
                            placeholder="رقم الهاتف بدون 02"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="h-12 md:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-lg md:text-xl tracking-[0.1em] focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans pr-12"
                            dir="ltr"
                        />
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs md:text-sm font-bold text-[#344767] pr-2">كلمة المرور (6 أرقام)</label>
                    <div className="relative">
                        <Input
                            type="password"
                            inputMode="numeric"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            maxLength={6}
                            className="h-12 md:h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-xl md:text-2xl tracking-[0.4em] focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans pr-12"
                            dir="ltr"
                        />
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center border border-red-100 font-bold animate-[fadeIn_0.3s_ease-out]">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full h-12 md:h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base md:text-lg font-bold shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mx-auto" /> : 'دخول كولي أمر'}
                </Button>
            </form>
        </div>
    );

    return (
        <div className="w-full max-w-[450px] flex flex-col items-center scale-100 origin-center transition-transform duration-300">
            {renderHeader()}

            <div className="w-full bg-[#f8f9fa] rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                {renderIconCards()}

                {mainTab === 'teacher' && renderRoleSelector()}

                <div className="mt-6">
                    {mainTab === 'teacher' ? renderTeacherForm() : renderParentForm()}
                </div>
            </div>

            <p className="mt-4 md:mt-8 text-blue-200/40 text-xs md:text-sm text-center">
                © 2026 . جميع الحقوق محفوظة.
            </p>
        </div>
    );
}
