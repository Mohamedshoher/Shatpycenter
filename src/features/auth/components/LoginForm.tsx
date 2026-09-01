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
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
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
    const [showPassword, setShowPassword] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        const savedMainTab = localStorage.getItem('shatibi_last_main_tab') as MainTab | null;
        const savedRoleTab = localStorage.getItem('shatibi_last_role_tab') as any;
        const savedTeacherId = localStorage.getItem('shatibi_last_teacher_id');
        const savedPhone = localStorage.getItem('shatibi_parent_phone');
        const savedPass = localStorage.getItem('shatibi_last_pass');

        if (savedMainTab) setMainTab(savedMainTab);
        if (savedRoleTab) {
            setRoleTab(savedRoleTab === 'schedule_secretary' ? 'supervisor' : savedRoleTab);
        }
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
                const selectedStaff = teachers?.find(t => t.id === selectedTeacherId);
                const prefix = (selectedStaff as any)?.role === 'schedule_secretary' ? 'secretary' : roleTab;
                loginIdentifier = `${prefix}-${selectedTeacherId}`;
                localStorage.setItem('shatibi_last_teacher_id', selectedTeacherId);
            }
        }

        await login(loginIdentifier, password);
    };

    // نصوص وألوان الأدوار الحالية
    const getRoleTheme = () => {
        if (mainTab === 'parent') {
            return {
                accentColor: 'indigo',
                bgGradient: 'from-indigo-600 to-blue-600',
                buttonBg: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700',
                shadowColor: 'shadow-indigo-500/25',
                ringColor: 'focus:ring-indigo-500/30 focus:border-indigo-400',
            };
        }
        if (roleTab === 'director') {
            return {
                accentColor: 'blue',
                bgGradient: 'from-blue-600 to-cyan-600',
                buttonBg: 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:to-cyan-700',
                shadowColor: 'shadow-blue-500/25',
                ringColor: 'focus:ring-blue-500/30 focus:border-blue-400',
            };
        }
        if (roleTab === 'supervisor') {
            return {
                accentColor: 'purple',
                bgGradient: 'from-purple-600 to-indigo-600',
                buttonBg: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:to-indigo-700',
                shadowColor: 'shadow-purple-500/25',
                ringColor: 'focus:ring-purple-500/30 focus:border-purple-400',
            };
        }
        return {
            accentColor: 'teal',
            bgGradient: 'from-teal-600 to-emerald-600',
            buttonBg: 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-700 hover:to-emerald-700',
            shadowColor: 'shadow-teal-500/25',
            ringColor: 'focus:ring-teal-500/30 focus:border-teal-400',
        };
    };

    const theme = getRoleTheme();

    return (
        <div className="w-full max-w-[460px] flex flex-col items-center">
            {/* الشعار والعنوان العلوي */}
            <div className="text-center mb-6 sm:mb-8 space-y-3">
                <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl mb-1 ring-1 ring-white/20 group hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-teal-400 flex items-center justify-center shadow-inner text-white">
                        <BookOpen size={24} className="stroke-[2.2px]" />
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 tracking-tight leading-tight">
                        مركز الشاطبي
                    </h1>
                    <p className="text-blue-200/70 text-xs sm:text-sm font-bold mt-1">
                        للقرآن الكريم وعلومه
                    </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-blue-200/80 backdrop-blur-md">
                    <ShieldCheck size={13} className="text-teal-400" />
                    <span>بوابة تسجيل الدخول الموحدة</span>
                </div>
            </div>

            {/* بطاقة تسجيل الدخول الزجاجية الفاخرة */}
            <div className="w-full bg-white/[0.97] backdrop-blur-2xl rounded-[36px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/80 relative overflow-hidden transition-all duration-300">
                
                {/* 1. التبديل الرئيسي (ولي الأمر vs الكادر التعليمي) */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* زر ولي الأمر */}
                    <button
                        type="button"
                        onClick={() => setMainTab('parent')}
                        className={cn(
                            "relative flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-300 text-center border cursor-pointer active:scale-95",
                            mainTab === 'parent'
                                ? "bg-gradient-to-b from-indigo-500/10 to-blue-500/15 border-indigo-500/40 text-indigo-900 shadow-md shadow-indigo-100/80"
                                : "bg-gray-50/70 hover:bg-gray-100/70 border-gray-100 text-gray-500"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                            mainTab === 'parent'
                                ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                                : "bg-white text-gray-400 border border-gray-100"
                        )}>
                            <Users size={22} className="stroke-[2.2px]" />
                        </div>
                        <div>
                            <span className={cn("block text-xs sm:text-sm font-black", mainTab === 'parent' ? "text-indigo-900" : "text-gray-700")}>
                                ولي الأمر
                            </span>
                            <span className="block text-[10px] text-gray-400 font-bold mt-0.5">
                                متابعة الأبناء
                            </span>
                        </div>
                        {mainTab === 'parent' && (
                            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                    </button>

                    {/* زر الكادر التعليمي */}
                    <button
                        type="button"
                        onClick={() => setMainTab('teacher')}
                        className={cn(
                            "relative flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-300 text-center border cursor-pointer active:scale-95",
                            mainTab === 'teacher'
                                ? "bg-gradient-to-b from-teal-500/10 to-emerald-500/15 border-teal-500/40 text-teal-900 shadow-md shadow-teal-100/80"
                                : "bg-gray-50/70 hover:bg-gray-100/70 border-gray-100 text-gray-500"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                            mainTab === 'teacher'
                                ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30 scale-105"
                                : "bg-white text-gray-400 border border-gray-100"
                        )}>
                            <GraduationCap size={22} className="stroke-[2.2px]" />
                        </div>
                        <div>
                            <span className={cn("block text-xs sm:text-sm font-black", mainTab === 'teacher' ? "text-teal-900" : "text-gray-700")}>
                                الكادر التعليمي
                            </span>
                            <span className="block text-[10px] text-gray-400 font-bold mt-0.5">
                                المدرسون والإدارة
                            </span>
                        </div>
                        {mainTab === 'teacher' && (
                            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        )}
                    </button>
                </div>

                {/* 2. شريط اختيار أدوار الكادر التعليمي (3 خيارات متناسقة) */}
                {mainTab === 'teacher' && (
                    <div className="mb-6 p-1.5 bg-gray-100/90 rounded-2xl flex items-center gap-1 shadow-inner border border-gray-200/50">
                        {[
                            { id: 'director' as RoleTab, label: 'مدير', icon: Briefcase, color: 'text-blue-700' },
                            { id: 'supervisor' as RoleTab, label: 'مشرف / سكرتارية', icon: UserCheck, color: 'text-purple-700' },
                            { id: 'teacher' as RoleTab, label: 'مدرس', icon: GraduationCap, color: 'text-teal-700' },
                        ].map((role) => {
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
                                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer",
                                        isActive
                                            ? `bg-white ${role.color} shadow-md scale-[1.02] border border-gray-100`
                                            : "text-gray-500 hover:text-gray-800 hover:bg-white/40"
                                    )}
                                >
                                    <Icon size={14} className="stroke-[2.5px]" />
                                    <span>{role.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 3. ترويسة النموذج التفاعلية */}
                <div className="flex items-center gap-3.5 mb-6 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md transition-all",
                        mainTab === 'parent' ? "bg-indigo-600" :
                        roleTab === 'director' ? "bg-blue-600" :
                        roleTab === 'supervisor' ? "bg-purple-600" : "bg-teal-600"
                    )}>
                        {mainTab === 'parent' ? <Users size={20} /> :
                         roleTab === 'director' ? <Briefcase size={20} /> :
                         roleTab === 'supervisor' ? <UserCheck size={20} /> : <GraduationCap size={20} />}
                    </div>
                    <div className="text-right">
                        <h3 className="font-black text-sm text-gray-900">
                            {mainTab === 'parent' ? 'دخول ولي الأمر' :
                             roleTab === 'director' ? 'دخول المدير العام' :
                             roleTab === 'supervisor' ? 'دخول المشرفين والسكرتارية' : 'دخول المعلم'}
                        </h3>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                            {mainTab === 'parent' ? 'متابعة سجلات الحضور والاختبارات والمصروفات' :
                             roleTab === 'director' ? 'وصول كامل لجميع الإحصائيات والصلاحيات' :
                             roleTab === 'supervisor' ? 'متابعة سير الحلقات وضبط المواعيد' :
                             'متابعة الحضور وتسميع الطلاب والملاحظات'}
                        </p>
                    </div>
                </div>

                {/* 4. الحقول ونموذج تسجيل الدخول */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* حقل اسم الموظف/المعلم */}
                    {mainTab === 'teacher' && (roleTab === 'teacher' || roleTab === 'supervisor') && (
                        <div className="space-y-1.5 text-right">
                            <label className="text-xs font-black text-gray-700 pr-1">
                                {roleTab === 'teacher' ? 'اختر اسم المعلم:' : 'اختر الاسم (مشرف / سكرتارية):'}
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="w-full h-12 pr-11 pl-10 rounded-2xl bg-gray-50/80 border border-gray-200 text-gray-800 font-black text-xs md:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">-- اضغط للاختيار من القائمة --</option>
                                    {roleTab === 'supervisor' ? (
                                        teachers?.filter(t => t.status === 'active' && ((t as any).role === 'supervisor' || (t as any).role === 'schedule_secretary'))
                                            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.fullName} ({(t as any).role === 'schedule_secretary' ? 'سكرتارية' : 'مشرف'})
                                                </option>
                                            ))
                                    ) : (
                                        teachers?.filter(t => t.status === 'active' && ((t as any).role === 'teacher' || !(t as any).role))
                                            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.fullName}</option>
                                            ))
                                    )}
                                </select>
                                <UserCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    )}

                    {/* حقل رقم هاتف ولي الأمر */}
                    {mainTab === 'parent' && (
                        <div className="space-y-1.5 text-right">
                            <label className="text-xs font-black text-gray-700 pr-1">رقم الهاتف المسجل:</label>
                            <div className="relative">
                                <Input
                                    type="tel"
                                    placeholder="أدخل رقم الهاتف (بدون 02)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    className="h-12 pr-11 pl-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-gray-800 text-center text-sm md:text-base font-black tracking-wider focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    dir="ltr"
                                />
                                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={19} />
                            </div>
                        </div>
                    )}

                    {/* حقل كلمة المرور */}
                    <div className="space-y-1.5 text-right">
                        <label className="text-xs font-black text-gray-700 pr-1">كلمة المرور:</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                inputMode="numeric"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 pr-11 pl-11 rounded-2xl bg-gray-50/80 border border-gray-200 text-gray-800 text-center text-lg md:text-xl font-black tracking-[0.25em] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                                dir="ltr"
                            />
                            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={19} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                title={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* تنبيه الخطأ عند الفشل */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-2xl text-center border border-red-200 font-bold flex items-center justify-center gap-2 animate-in fade-in duration-200">
                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* زر تسجيل الدخول الرئيسي */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full h-12 md:h-13 rounded-2xl text-sm md:text-base font-black text-white shadow-xl transition-all active:scale-[0.98] cursor-pointer mt-2",
                            theme.buttonBg,
                            theme.shadowColor
                        )}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري التحقق والدخول...</span>
                            </span>
                        ) : (
                            <span>
                                {mainTab === 'parent' ? 'دخول كـولي أمر' :
                                 roleTab === 'director' ? 'دخول كـمدير عام' :
                                 roleTab === 'supervisor' ? 'دخول كـمشرف / سكرتارية' : 'دخول كـمعلم'}
                            </span>
                        )}
                    </Button>
                </form>
            </div>

            {/* الفوتر وسنة الحقوق */}
            <div className="mt-6 text-center space-y-1">
                <p className="text-blue-200/50 text-[11px] font-bold">
                    منصة الشاطبي الرقمية لإدارة الحلقات القرآنية
                </p>
                <p className="text-white/30 text-[10px] font-mono">
                    © 2026 جميع الحقوق محفوظة
                </p>
            </div>
        </div>
    );
}
