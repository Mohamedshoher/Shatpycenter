import { User, UserRole } from "@/types";
import { supabase } from "@/lib/supabase";

// Mock delay to simulate network
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const loginWithRole = async (identifier: string, password: string): Promise<User> => {
    await delay(800);

    let role: UserRole = 'teacher';
    let teacherId: string | undefined;
    let phone: string | undefined;

    if (identifier === 'director') role = 'director';
    else if (identifier === 'supervisor') role = 'supervisor';
    else if (identifier.startsWith('teacher-')) {
        role = 'teacher';
        teacherId = identifier.replace('teacher-', '');
    } else if (identifier.startsWith('parent-')) {
        role = 'parent';
        phone = identifier.replace('parent-', '');
    } else if (/^\d{10,14}$/.test(identifier)) {
        // إذا كان المدخل رقماً، نعتبره ولي أمر
        role = 'parent';
        phone = identifier;
    }

    // التحقق من كلمة مرور المدير الخاصة
    if (role === 'director' && password !== '446699') {
        throw new Error("كلمة مرور المدير غير صحيحة");
    }

    // للمدرسين نقبل 123456 أو أي كلمة تنتهي بـ 123
    if (role === 'teacher') {
        if (!password.endsWith('123') && password !== '123456') {
            throw new Error("كلمة المرور غير صحيحة (استخدم 123456 للتجربة)");
        }
    }

    // لأولياء الأمور: التأكد من وجود الرقم وكلمة المرور هي آخر 6 أرقام
    if (role === 'parent' && phone) {
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('parent_phone', phone)
            .limit(1);

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("حدث خطأ أثناء الاتصال بقاعدة البيانات");
        }

        if (!students || students.length === 0) {
            throw new Error("عذراً، هذا الرقم غير مسجل كولي أمر");
        }

        const last6Digits = phone.slice(-6);
        if (password !== last6Digits && password !== '123456') {
            throw new Error(`كلمة المرور لولي الأمر هي آخر 6 أرقام من هاتفه (${last6Digits})`);
        }
    }

    let displayName = role === 'director' ? 'المدير العام' : role === 'supervisor' ? 'المشرف التربوي' : role === 'parent' ? (phone || 'ولي أمر') : 'معلم المجموعة';

    if (role === 'teacher' && teacherId) {
        // Try fetching teacher from Supabase
        const { data: teacher } = await supabase
            .from('teachers')
            .select('full_name') // Using snake_case column name
            .eq('id', teacherId) // Assuming teacherId is UUID
            .single();

        if (teacher) {
            displayName = teacher.full_name;
        }
    }

    return {
        uid: `mock-${identifier}`,
        email: `${identifier}@shatibi.center`,
        displayName,
        role,
        teacherId,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
};

export const logout = async () => {
    await delay(300);
    // Supabase signout if we were using real auth
    // await supabase.auth.signOut();
};

export const registerRoleAccount = async (role: string, password: string, displayName: string): Promise<User> => {
    await delay(500);
    return {
        uid: `mock-${role}`,
        email: `${role}@shatibi.center`,
        displayName,
        role: role as UserRole,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const role = uid.replace('mock-', '');
    return {
        uid: uid,
        email: `${role}@shatibi.center`,
        displayName: role === 'director' ? 'المدير العام' : 'مستخدم وهمي',
        role: role as UserRole,
        createdAt: Date.now(),
        lastLogin: Date.now()
    };
};

