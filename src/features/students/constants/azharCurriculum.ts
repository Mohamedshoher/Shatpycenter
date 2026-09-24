export interface AzharGradeCurriculum {
    stage: 'الابتدائية' | 'الإعدادية' | 'الثانوية';
    grade: string;
    term1: string;
    term2: string;
    juz: string;
}

export const AZHAR_CURRICULUM: AzharGradeCurriculum[] = [
    // المرحلة الابتدائية
    { stage: 'الابتدائية', grade: 'الأول الابتدائي', term1: 'من الناس إلى الأعلى', term2: 'من الطارق إلى النبأ', juz: 'جزء 30' },
    { stage: 'الابتدائية', grade: 'الثاني الابتدائي', term1: 'من المرسلات إلى الملك', term2: 'من التحريم إلى المجادلة', juz: 'جزئين (28، 29)' },
    { stage: 'الابتدائية', grade: 'الثالث الابتدائي', term1: 'من الحديد إلى محمد', term2: 'من الأحقاف إلى الشورى', juz: '3 أجزاء (25، 26، 27)' },
    { stage: 'الابتدائية', grade: 'الرابع الابتدائي', term1: 'من فصلت إلى فاطر', term2: 'من سبأ إلى العنكبوت', juz: '4 أجزاء (21، 22، 23، 24)' },
    { stage: 'الابتدائية', grade: 'الخامس الابتدائي', term1: 'من القصص إلى الفرقان', term2: 'من النور إلى الأنبياء', juz: '4 أجزاء (17، 18، 19، 20)' },
    { stage: 'الابتدائية', grade: 'السادس الابتدائي', term1: 'من طه إلى الإسراء', term2: 'من النحل إلى يوسف', juz: '4 أجزاء (13، 14، 15، 16)' },

    // المرحلة الإعدادية
    { stage: 'الإعدادية', grade: 'الأول الإعدادي', term1: 'من هود إلى يونس', term2: 'من التوبة إلى الأنفال', juz: '3 أجزاء (10، 11، 12)' },
    { stage: 'الإعدادية', grade: 'الثاني الإعدادي', term1: 'الأعراف', term2: 'الأنعام', juz: '3 أجزاء (7، 8، 9)' },
    { stage: 'الإعدادية', grade: 'الثالث الإعدادي', term1: 'من أول المائدة إلى الآية 66', term2: 'من المائدة 67 إلى النساء 23', juz: 'جزئين (6، 7)' },

    // المرحلة الثانوية
    { stage: 'الثانوية', grade: 'الأول الثانوي', term1: 'من النساء 24 إلى النساء 147', term2: 'من النساء 148 إلى آل عمران 92', juz: 'جزئين (4، 5)' },
    { stage: 'الثانوية', grade: 'الثاني الثانوي', term1: 'من آل عمران 93 إلى آخر السورة', term2: 'من أول البقرة إلى الآية 105', juz: 'جزئين (2، 3)' },
    { stage: 'الثانوية', grade: 'الثالث الثانوي', term1: 'من سورة البقرة آية 106 إلى آخر السورة', term2: 'من سورة البقرة آية 106 إلى آخر السورة', juz: 'جزء 1' },
];

export const parseAzhariFromNotes = (notes?: string | null): { isAzhari: boolean; azhariGrade: string } => {
    if (!notes) return { isAzhari: false, azhariGrade: '' };
    const match = notes.match(/\[أزهري:\s*([^\]]+)\]/);
    if (match) {
        return { isAzhari: true, azhariGrade: match[1].trim() };
    }
    if (notes.includes('[أزهري]')) {
        return { isAzhari: true, azhariGrade: '' };
    }
    return { isAzhari: false, azhariGrade: '' };
};

export const formatNotesWithAzhari = (existingNotes: string | undefined | null, isAzhari: boolean, azhariGrade?: string): string => {
    let cleanNotes = (existingNotes || '').replace(/\[أزهري(?::\s*[^\]]+)?\]\s*/g, '').trim();
    if (isAzhari) {
        const azhariTag = azhariGrade ? `[أزهري: ${azhariGrade}]` : `[أزهري]`;
        return cleanNotes ? `${azhariTag} ${cleanNotes}` : azhariTag;
    }
    return cleanNotes;
};

export const getStudentAzhariInfo = (student: { isAzhari?: boolean; azhariGrade?: string; notes?: string }) => {
    if (student.isAzhari) {
        return { isAzhari: true, azhariGrade: student.azhariGrade || '' };
    }
    return parseAzhariFromNotes(student.notes);
};
