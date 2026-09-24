import { useState } from 'react';
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import User from 'lucide-react/dist/esm/icons/user'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import Reply from 'lucide-react/dist/esm/icons/reply'
import Send from 'lucide-react/dist/esm/icons/send';
import { Button } from '../../../components/ui/button';
import { cn, getWhatsAppUrl } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import { AZHAR_CURRICULUM, getStudentAzhariInfo } from '../constants/azharCurriculum';

export default function NotesTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { notes, addNote, deleteNote, replyNote } = records;
    const [noteText, setNoteText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const azhariInfo = getStudentAzhariInfo(student || {});
    const azharCurriculum = azhariInfo.isAzhari 
        ? (AZHAR_CURRICULUM.find(c => c.grade === azhariInfo.azhariGrade) || AZHAR_CURRICULUM[0])
        : null;

    const handleAdd = () => {
        if (!noteText.trim()) return alert('اكتب الملحوظة');
        addNote.mutate({
            content: noteText.trim(),
            type: 'positive',
            createdBy: user?.displayName || (user?.role === 'director' ? 'المدير العام' : 'المعلم'),
            date: new Date().toLocaleDateString('ar-EG')
        });
        setNoteText('');
    };

    const handleSendReply = async (noteId: string) => {
        if (!replyText.trim()) return;
        replyNote.mutate({
            id: noteId,
            reply: replyText.trim(),
            repliedBy: user?.displayName || (user?.role === 'director' ? 'المدير العام' : 'المشرف')
        });
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <div className="space-y-4">
            {/* نموذج إضافة ملحوظة جديدة */}
            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span>إضافة ملحوظة جديدة</span>
                    </h4>
                    {user?.displayName && (
                        <span className="text-[11px] font-bold text-gray-400 bg-white px-2.5 py-0.5 rounded-lg border border-gray-100">
                            تسجيل باسم: {user.displayName}
                        </span>
                    )}
                </div>
                <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    className="w-full h-24 rounded-2xl p-4 text-sm bg-white text-gray-900 border border-gray-200/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                    placeholder="اكتب الملحوظة هنا بخصوص الطالب..."
                />
                <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-2.5 shadow-md shadow-blue-500/10 cursor-pointer">
                    تسجيل الملحوظة
                </Button>
            </div>

            {/* ملحوظة ثابتة لمقرر الأزهر الشريف (غير قابلة للحذف) */}
            {azhariInfo.isAzhari && azharCurriculum && (
                <div className="bg-gradient-to-br from-red-50 via-amber-50/40 to-white p-5 rounded-[24px] border-2 border-red-200 shadow-md text-right space-y-3 relative overflow-hidden">
                    {/* ترويسة الملحوظة المثبتة */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-red-200/60">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-xl text-xs font-black shadow-xs">
                                <span>🕌 مقرر الأزهر الشريف</span>
                            </span>
                            <span className="text-xs font-black text-red-900 bg-red-100/80 border border-red-200 px-2.5 py-0.5 rounded-lg">
                                الصف: {azharCurriculum.grade} ({azharCurriculum.stage})
                            </span>
                        </div>
                        <span className="text-[11px] text-red-600 font-bold bg-white border border-red-200 px-2 py-0.5 rounded-full shadow-2xs">
                            📌 ملحوظة مثبتة (غير قابلة للحذف)
                        </span>
                    </div>

                    {/* تفاصيل المنهج */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="bg-white/95 p-3 rounded-xl border border-red-100 shadow-2xs space-y-1">
                            <span className="text-[11px] font-black text-red-800 flex items-center gap-1">
                                <span>📖</span> الفصل الدراسي الأول:
                            </span>
                            <p className="text-xs font-bold text-gray-800">{azharCurriculum.term1}</p>
                        </div>
                        <div className="bg-white/95 p-3 rounded-xl border border-amber-100 shadow-2xs space-y-1">
                            <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                                <span>📖</span> الفصل الدراسي الثاني:
                            </span>
                            <p className="text-xs font-bold text-gray-800">{azharCurriculum.term2}</p>
                        </div>
                        <div className="bg-white/95 p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                            <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                                <span>🎯</span> المقرر الإجمالي:
                            </span>
                            <p className="text-xs font-black text-emerald-700">{azharCurriculum.juz}</p>
                        </div>
                    </div>

                    {/* زر إرسال المقرر عبر واتساب */}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-[10px] text-gray-500 font-bold">
                            يتم تحديث هذا المقرر تلقائياً عند تغيير الصف الدراسي للطالب.
                        </span>
                        <button
                            onClick={() => {
                                const text = `السلام عليكم ورحمة الله وبركاته 🌸\n\nنحيطكم علماً بمقرر القرآن الكريم لطلاب الأزهر الشريف للطالب/ة: *${student.fullName}* (${azharCurriculum.grade}):\n\n📖 *الفصل الدراسي الأول:* ${azharCurriculum.term1}\n📖 *الفصل الدراسي الثاني:* ${azharCurriculum.term2}\n🎯 *المقرر:* ${azharCurriculum.juz}\n\nمع تحيات مركز الشاطبي 🌹`;
                                window.open(getWhatsAppUrl(student.parentPhone || '', text), '_blank');
                            }}
                            className="h-8 px-3 flex items-center gap-1.5 text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition-colors text-xs font-bold border border-green-200 cursor-pointer shadow-2xs"
                            title="إرسال المقرر عبر واتساب لولي الأمر"
                        >
                            <MessageCircle size={15} />
                            <span>إرسال المقرر لواتساب ولي الأمر</span>
                        </button>
                    </div>
                </div>
            )}

            {/* قائمة الملحوظات المسجلة */}
            <div className="space-y-3">
                {notes && notes.length > 0 ? (
                    notes.map((note: any) => (
                        <div key={note.id} className="p-4 md:p-5 rounded-2xl border bg-white border-gray-100 shadow-sm relative text-right space-y-3 hover:border-blue-100 transition-all">
                            {/* ترويسة الملحوظة: اسم الكاتب والتاريخ */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-xl text-xs font-black border border-blue-100/70">
                                        <User size={13} className="text-blue-600 shrink-0" />
                                        <span>كاتب الملحوظة: {note.createdBy || 'المدير'}</span>
                                    </div>
                                </div>
                                <span className="text-[11px] text-gray-400 font-bold">
                                    {note.date}
                                </span>
                            </div>

                            {/* نص الملحوظة */}
                            <p className="text-sm font-bold text-gray-800 leading-relaxed break-words pr-1">
                                {note.text || note.content}
                            </p>

                            {/* قسم الرد إذا وُجد */}
                            {note.reply && (
                                <div className="bg-emerald-50/60 rounded-2xl p-3.5 mr-2 text-right border border-emerald-200/50">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Reply size={13} className="text-emerald-600" />
                                        <span className="text-[11px] font-black text-emerald-800">رد الإدارة / المشرف</span>
                                        {note.repliedBy && (
                                            <span className="text-[11px] text-emerald-600/90 font-bold bg-white/70 px-2 py-0.5 rounded-md border border-emerald-100">
                                                {note.repliedBy}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 leading-relaxed pr-1">
                                        {note.reply}
                                    </p>
                                </div>
                            )}

                            {/* شريط الإجراءات السفلي */}
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const content = note.text || note.content;
                                            const text = `السلام عليكم ورحمة الله وبركاته\n\nنود إحاطتكم علماً بملحوظة بخصوص الطالب/ة *${student.fullName}*:\n\n"${content}"\n\nمع تحيات إدارة مركز الشاطبي 🌹`;
                                            window.open(getWhatsAppUrl(student.parentPhone || '', text), '_blank');
                                        }}
                                        className="h-8 px-2.5 flex items-center gap-1.5 text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-xs font-bold border border-green-100 cursor-pointer"
                                        title="إرسال عبر واتساب لولي الأمر"
                                    >
                                        <MessageCircle size={15} />
                                        <span>واتساب</span>
                                    </button>

                                    {user?.role === 'director' && (
                                        <button
                                            onClick={() => {
                                                if (confirm('هل أنت متأكد من حذف هذه الملحوظة؟')) {
                                                    deleteNote.mutate(note.id);
                                                }
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                            title="حذف الملحوظة"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                                        className={cn(
                                            "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                            replyingTo === note.id
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                        )}
                                    >
                                        <Reply size={13} />
                                        <span>{replyingTo === note.id ? 'إلغاء' : 'رد'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* حقل إدخال الرد عند النقر على زر الرد */}
                            {replyingTo === note.id && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 animate-in fade-in duration-150">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="اكتب ردك هنا..."
                                        className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-gray-800 border border-gray-200 outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSendReply(note.id);
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSendReply(note.id)}
                                        className="h-9 px-4 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                                        title="إرسال الرد"
                                    >
                                        <Send size={14} />
                                        <span>إرسال</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    !azhariInfo.isAzhari && (
                        <div className="py-8 text-center space-y-2 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                            <FileText size={28} className="text-gray-300 mx-auto" />
                            <p className="text-gray-400 text-xs font-bold">لا توجد ملحوظات مسجلة لهذا الطالب</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
