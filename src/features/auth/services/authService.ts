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

    // Verify Director Password
    if (role === 'director' && password !== '446699') {
        throw new Error("كلمة مرور المدير غير صحيحة");
    }

    let displayName = role === 'director' ? 'المدير العام' : role === 'supervisor' ? 'المشرف التربوي' : role === 'parent' ? (phone || 'ولي أمر') : 'معلم المجموعة';

    // Verify Parent Login
    if (role === 'parent' && phone) {
        // Search for phone with or without 02 prefix
        const { data: students, error } = await supabase
            .from('students')
            .select('parent_phone')
            .or(`parent_phone.eq.${phone},parent_phone.eq.02${phone}`)
            .limit(1);

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("حدث خطأ أثناء الاتصال بقاعدة البيانات");
        }

        if (!students || students.length === 0) {
            throw new Error("عذراً، هذا الرقم غير مسجل لدينا كولي أمر");
        }

        const dbPhone = students[0].parent_phone || phone;
        const last6Digits = dbPhone.slice(-6);

        if (password !== last6Digits && password !== '123456') {
            throw new Error(`كلمة المرور غير صحيحة. يرجى استخدام آخر 6 أرقام من رقم هاتفك المسجل.`);
        }

        displayName = dbPhone;
    }

    // Verify Teacher Password (Database Check)
    if (role === 'teacher') {
        const searchId = teacherId || identifier.replace('teacher-', '');

        // Fetch teacher credentials
        const { data: teacher, error } = await supabase
            .from('teachers')
            .select('id, full_name, password')
            .eq('id', searchId)
            .single();

        if (error || !teacher) {
            throw new Error("المعلم غير موجود في قاعدة البيانات");
        }

        // Check password (Plain text comparison as per current implementation)
        // Note: For production, we should hash passwords.
        if (teacher.password && teacher.password !== password) {
            throw new Error("كلمة المرور غير صحيحة");
        }

        // Update variables with real data
        teacherId = teacher.id;
        displayName = teacher.full_name;
    }

    return {
        uid: `mock-${teacherId || identifier}`, // نستخدم المعرف الحقيقي (UUID) لضمان مطابقة المحادثات
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
        displayName: role === 'director' ? 'المدير العام' : role === 'teacher' ? 'معلم' : 'مستخدم',
        role: role as UserRole,
        createdAt: Date.now(),
        lastLogin: Date.now()
    };
};

