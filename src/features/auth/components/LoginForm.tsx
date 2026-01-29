"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Building2, UserCircle, Users, GraduationCap, Phone, Lock, Briefcase, UserCheck } from 'lucide-react';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type MainTab = 'admin' | 'parent';
type RoleTab = 'director' | 'supervisor' | 'teacher';

export default function LoginForm() {
    const { login, loading, error } = useLogin();
    const { data: teachers } = useTeachers();

    const [mainTab, setMainTab] = useState<MainTab>('admin');
    const [roleTab, setRoleTab] = useState<RoleTab>('director');
    const [password, setPassword] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [phone, setPhone] = useState('');

    // Load saved credentials for all roles
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

    // تصفية وترتيب المعلمين أبجدياً
    const activeTeachers = useMemo(() => {
        return (teachers || [])
            .filter(t => t.status === 'active')
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }, [teachers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let loginIdentifier: string = roleTab;

        // Save preferences and credentials
        localStorage.setItem('shatibi_last_main_tab', mainTab);
        localStorage.setItem('shatibi_last_pass', password);

        if (mainTab === 'parent') {
            loginIdentifier = `parent-${phone}`;
            localStorage.setItem('shatibi_parent_phone', phone);
        } else {
            localStorage.setItem('shatibi_last_role_tab', roleTab);
            if (roleTab === 'teacher') {
                if (!selectedTeacherId) return;
                loginIdentifier = `teacher-${selectedTeacherId}`;
                localStorage.setItem('shatibi_last_teacher_id', selectedTeacherId);
            }
        }

        await login(loginIdentifier, password);
    };

    return (
        <div className="w-full max-w-[450px] flex flex-col items-center">
            {/* Logo Section */}
            <div className="text-center mb-10">
                <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">مركز الشاطبي</h1>
                <p className="text-blue-200/60 text-lg">نظام الإدارة التعليمية المتكامل</p>
            </div>

            {/* Main Login Card */}
            <div className="w-full bg-[#f8f9fa] rounded-[40px] p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10">

                {/* Top Toggle Tabs (الإدارة / ولي الأمر) */}
                <div className="flex bg-[#ecedef] p-1.5 rounded-[20px] mb-8">
                    <button
                        onClick={() => setMainTab('admin')}
                        className={cn(
                            "flex-1 py-3 rounded-[18px] text-lg font-bold transition-all duration-300",
                            mainTab === 'admin' ? "bg-[#3366ff] text-white shadow-lg" : "text-[#7b809a]"
                        )}
                    >
                        الإدارة
                    </button>
                    <button
                        onClick={() => setMainTab('parent')}
                        className={cn(
                            "flex-1 py-3 rounded-[18px] text-lg font-bold transition-all duration-300",
                            mainTab === 'parent' ? "bg-[#3366ff] text-white shadow-lg" : "text-[#7b809a]"
                        )}
                    >
                        ولي الأمر
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {mainTab === 'admin' ? (
                        <motion.div
                            key="admin-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Role Sub-Tabs */}
                            <div className="flex bg-[#f1f3f5] p-1 rounded-2xl justify-between shadow-inner">
                                {[
                                    { id: 'director', label: 'المدير' },
                                    { id: 'supervisor', label: 'المشرف' },
                                    { id: 'teacher', label: 'المدرس' }
                                ].map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setRoleTab(role.id as RoleTab)}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-sm font-black transition-all",
                                            roleTab === role.id
                                                ? "bg-white text-blue-600 shadow-sm scale-105"
                                                : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        {role.label}
                                    </button>
                                ))}
                            </div>

                            {/* Role Content */}
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                                    roleTab === 'director' ? "bg-blue-50 text-blue-600" :
                                        roleTab === 'supervisor' ? "bg-purple-50 text-purple-600" :
                                            "bg-teal-50 text-teal-600"
                                )}>
                                    {roleTab === 'director' ? <Briefcase size={32} /> :
                                        roleTab === 'supervisor' ? <UserCheck size={32} /> :
                                            <GraduationCap size={32} />}
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-[#344767]">دخول {roleTab === 'director' ? 'الإدارة' : roleTab === 'supervisor' ? 'المشرفين' : 'المدرسين'}</h2>
                                    <p className="text-[#7b809a] text-sm mt-1">
                                        {roleTab === 'director' ? 'وصول كامل لجميع البيانات والصلاحيات' :
                                            roleTab === 'supervisor' ? 'متابعة سير العمل والمعلمين' :
                                                'المتابعة العلمية للطلاب والمجموعات'}
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {roleTab === 'teacher' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#344767] pr-2">اسم المدرس</label>
                                        <div className="relative">
                                            <select
                                                value={selectedTeacherId}
                                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                                className="w-full h-14 pr-12 pl-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none font-bold text-gray-700"
                                                required
                                            >
                                                <option value="">-- اختر اسم المدرس --</option>
                                                {activeTeachers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.fullName}</option>
                                                ))}
                                            </select>
                                            <UserCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#344767] pr-2">كلمة المرور</label>
                                    <div className="relative">
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className={cn(
                                                "h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-2xl tracking-[0.2em] focus:ring-2 transition-all font-sans pr-12",
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
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center border border-red-100 font-bold"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className={cn(
                                        "w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all active:scale-[0.98]",
                                        roleTab === 'director' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" :
                                            roleTab === 'supervisor' ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" :
                                                "bg-teal-500 hover:bg-teal-600 shadow-teal-100"
                                    )}
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    ) : (
                                        `دخول كـ${roleTab === 'director' ? 'مدير' : roleTab === 'supervisor' ? 'مشرف' : 'مدرس'}`
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="parent-content"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            {/* Icon & Title */}
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <Users size={32} />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-[#344767]">دخول ولي الأمر</h2>
                                    <p className="text-[#7b809a] text-sm mt-1">متابعة الأبناء والتواصل مع المركز</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#344767] pr-2">رقم الهاتف</label>
                                    <div className="relative">
                                        <Input
                                            type="tel"
                                            placeholder="رقم الهاتف بدون 02"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                            className="h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-xl tracking-[0.1em] focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans pr-12"
                                            dir="ltr"
                                        />
                                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#344767] pr-2">كلمة المرور (6 أرقام)</label>
                                    <div className="relative">
                                        <Input
                                            type="password"
                                            placeholder="••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            maxLength={6}
                                            className="h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-center text-2xl tracking-[0.4em] focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans pr-12"
                                            dir="ltr"
                                        />
                                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'دخول كولي أمر'}
                                </Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Text */}
            <p className="mt-8 text-blue-200/40 text-sm text-center">
                © 2026 مركز الشاطبي للإدارة والتدريب. جميع الحقوق محفوظة.
            </p>
        </div>
    );
}
