"use client";

import { useState, useEffect } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Users from 'lucide-react/dist/esm/icons/users'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap'
import Phone from 'lucide-react/dist/esm/icons/phone'
import Lock from 'lucide-react/dist/esm/icons/lock'
import Briefcase from 'lucide-react/dist/esm/icons/briefcase'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import UserCircle from 'lucide-react/dist/esm/icons/user-circle';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { useTeacherDirectory } from '@/features/teachers/hooks/useTeacherDirectory';
import { cn } from '@/lib/utils';

type MainTab = 'parent' | 'teacher';
type RoleTab = 'director' | 'supervisor' | 'teacher';

const ROLE_OPTIONS: { id: RoleTab; label: string; icon: typeof Briefcase }[] = [
    { id: 'director', label: 'مدير', icon: Briefcase },
    { id: 'supervisor', label: 'مشرف', icon: UserCheck },
    { id: 'teacher', label: 'مدرس', icon: GraduationCap },
];

export default function LoginForm() {
    const { login, loading, error } = useLogin();
    const { data: teachers } = useTeacherDirectory();

    const [mainTab, setMainTab] = useState<MainTab>('parent');
    const [roleTab, setRoleTab] = useState<RoleTab>('director');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        const savedMainTab = localStorage.getItem('shatibi_last_main_tab') as MainTab | null;
        const savedRoleTab = localStorage.getItem('shatibi_last_role_tab') as RoleTab | 'schedule_secretary' | null;
        const savedTeacherId = localStorage.getItem('shatibi_last_teacher_id');
        const savedPhone = localStorage.getItem('shatibi_parent_phone');

        if (savedMainTab) setMainTab(savedMainTab);
        if (savedRoleTab) {
            setRoleTab(savedRoleTab === 'schedule_secretary' ? 'supervisor' : savedRoleTab);
        }
        if (savedTeacherId) setSelectedTeacherId(savedTeacherId);
        if (savedPhone) setPhone(savedPhone);
        // ملاحظة أمنية: لم نعد نحفظ كلمة المرور في localStorage إطلاقاً.
        // ننظّف أي قيمة قديمة تركها إصدار سابق من التطبيق.
        try { localStorage.removeItem('shatibi_last_pass'); } catch { /* لا شيء */ }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let loginIdentifier: string = roleTab;

        localStorage.setItem('shatibi_last_main_tab', mainTab);

        if (mainTab === 'parent') {
            loginIdentifier = `parent-${phone}`;
            localStorage.setItem('shatibi_parent_phone', phone);
        } else {
            localStorage.setItem('shatibi_last_role_tab', roleTab);
            if (roleTab === 'teacher' || roleTab === 'supervisor') {
                if (!selectedTeacherId) return;
                const selectedStaff = teachers?.find(t => t.id === selectedTeacherId);
                const prefix = selectedStaff?.role === 'schedule_secretary' ? 'secretary' : roleTab;
                loginIdentifier = `${prefix}-${selectedTeacherId}`;
                localStorage.setItem('shatibi_last_teacher_id', selectedTeacherId);
            }
        }

        await login(loginIdentifier, password);
    };

    // لون التمييز حسب الدور الحالي (لمسة لون واحدة فقط، بدون تدرجات متعددة)
    const accent = mainTab === 'parent'
        ? { solid: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-500/30 focus:border-indigo-400', text: 'text-indigo-600' }
        : roleTab === 'director'
            ? { solid: 'bg-blue-600 hover:bg-blue-700', ring: 'focus:ring-blue-500/30 focus:border-blue-400', text: 'text-blue-600' }
            : roleTab === 'supervisor'
                ? { solid: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-500/30 focus:border-purple-400', text: 'text-purple-600' }
                : { solid: 'bg-teal-600 hover:bg-teal-700', ring: 'focus:ring-teal-500/30 focus:border-teal-400', text: 'text-teal-600' };

    return (
        <div className="w-full max-w-sm flex flex-col items-center">
            {/* الشعار والعنوان */}
            <div className="text-center mb-6 space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/15 text-white mb-1">
                    <BookOpen size={26} className="stroke-[2px]" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                    مركز الشاطبي
                </h1>
                <p className="text-blue-200/70 text-xs font-bold">
                    بوابة تسجيل الدخول
                </p>
            </div>

            {/* بطاقة تسجيل الدخول */}
            <div className="w-full bg-white rounded-3xl p-5 sm:p-6 shadow-xl">

                {/* 1. التبديل الرئيسي: ولي الأمر / الكادر التعليمي */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-gray-100 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setMainTab('parent')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-black transition-all",
                            mainTab === 'parent' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
                        )}
                    >
                        <Users size={16} />
                        ولي الأمر
                    </button>
                    <button
                        type="button"
                        onClick={() => setMainTab('teacher')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-black transition-all",
                            mainTab === 'teacher' ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"
                        )}
                    >
                        <GraduationCap size={16} />
                        الكادر التعليمي
                    </button>
                </div>

                {/* 2. اختيار دور الكادر التعليمي */}
                {mainTab === 'teacher' && (
                    <div className="mb-4 grid grid-cols-3 gap-1.5">
                        {ROLE_OPTIONS.map((role) => {
                            const Icon = role.icon;
                            const isActive = roleTab === role.id;
                            return (
                                <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => {
                                        setRoleTab(role.id);
                                        setSelectedTeacherId('');
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-black border transition-all",
                                        isActive
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : "bg-white text-gray-500 border-gray-200"
                                    )}
                                >
                                    <Icon size={16} />
                                    {role.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 3. الحقول ونموذج تسجيل الدخول */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* حقل اسم الموظف/المعلم */}
                    {mainTab === 'teacher' && (roleTab === 'teacher' || roleTab === 'supervisor') && (
                        <div className="space-y-1.5 text-right">
                            <label className="text-xs font-black text-gray-700">
                                {roleTab === 'teacher' ? 'اسم المعلم' : 'الاسم (مشرف / سكرتارية)'}
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="w-full h-12 pr-10 pl-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                    required
                                >
                                    <option value="">-- اختر من القائمة --</option>
                                    {roleTab === 'supervisor' ? (
                                        teachers?.filter(t => t.status === 'active' && (t.role === 'supervisor' || t.role === 'schedule_secretary'))
                                            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.fullName} ({t.role === 'schedule_secretary' ? 'سكرتارية' : 'مشرف'})
                                                </option>
                                            ))
                                    ) : (
                                        teachers?.filter(t => t.status === 'active' && (t.role === 'teacher' || !t.role))
                                            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.fullName}</option>
                                            ))
                                    )}
                                </select>
                                <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    )}

                    {/* حقل رقم هاتف ولي الأمر */}
                    {mainTab === 'parent' && (
                        <div className="space-y-1.5 text-right">
                            <label className="text-xs font-black text-gray-700">رقم الهاتف المسجل</label>
                            <div className="relative">
                                <Input
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="أدخل رقم الهاتف"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    className="h-12 pr-10 pl-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-center text-sm font-black tracking-wide focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    dir="ltr"
                                />
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={17} />
                            </div>
                        </div>
                    )}

                    {/* حقل كلمة المرور */}
                    <div className="space-y-1.5 text-right">
                        <label className="text-xs font-black text-gray-700">كلمة المرور</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                inputMode="numeric"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 pr-10 pl-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-center text-lg font-black tracking-[0.2em] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                                dir="ltr"
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={17} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                title={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    {/* تنبيه الخطأ عند الفشل */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl text-center border border-red-100 font-bold flex items-center justify-center gap-2">
                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* زر تسجيل الدخول */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full h-12 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98] mt-1",
                            accent.solid
                        )}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                جاري الدخول...
                            </span>
                        ) : (
                            <span>تسجيل الدخول</span>
                        )}
                    </Button>
                </form>
            </div>

            {/* الفوتر */}
            <p className="mt-6 text-white/40 text-[11px] font-bold text-center">
                © 2026 مركز الشاطبي — جميع الحقوق محفوظة
            </p>
        </div>
    );
}
