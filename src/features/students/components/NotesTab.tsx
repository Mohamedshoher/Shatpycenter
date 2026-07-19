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
export default function NotesTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { notes, addNote, deleteNote, replyNote } = records;
    const [noteText, setNoteText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const handleAdd = () => {
        if (!noteText) return alert('اكتب الملحوظة');
        addNote.mutate({
            content: noteText,
            type: 'positive',
            createdBy: user?.displayName || 'المدير',
            date: new Date().toLocaleDateString('ar-EG')
        });
        setNoteText('');
    };

    const handleSendReply = async (noteId: string) => {
        if (!replyText.trim()) return;
        replyNote.mutate({ id: noteId, reply: replyText.trim(), repliedBy: user?.displayName || 'المدير' });
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-3">
                <h4 className="font-bold text-sm text-gray-800">إضافة ملحوظة</h4>
                <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    className="w-full h-24 rounded-2xl p-4 text-sm bg-white text-gray-900 border-none shadow-inner"
                    placeholder="اكتب الملحوظة هنا..."
                />
                <Button onClick={handleAdd} className="w-full bg-blue-600">تسجيل الملحوظة</Button>
            </div>

            <div className="space-y-3">
                {notes.map((note: any) => (
                    <div key={note.id} className="p-4 rounded-2xl border bg-white border-gray-100 shadow-sm relative text-right">
                        <p className="text-sm font-bold text-gray-800 leading-relaxed mb-2 break-words">
                            {note.text || note.content}
                        </p>

                        {/* Reply display */}
                        {note.reply && (
                            <div className="bg-green-50/50 rounded-[16px] p-3 mb-3 mr-4 text-right border border-green-200/40">
                                <div className="flex items-center gap-2 mb-1">
                                    <Reply size={12} className="text-green-500" />
                                    <span className="text-[10px] font-black text-green-700">رد</span>
                                    {note.repliedBy && (
                                        <span className="text-[10px] text-gray-400 font-bold">- {note.repliedBy}</span>
                                    )}
                                </div>
                                <p className="text-xs font-bold text-gray-700 leading-relaxed">
                                    {note.reply}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const content = note.text || note.content;
                                        const text = `السلام عليكم ورحمة الله وبركاته\n\nنود إحاطتكم علماً بملحوظة بخصوص الطالب/ة *${student.fullName}*:\n\n"${content}"\n\nمع تحيات إدارة مركز الشاطبي 🌹`;
                                        window.open(getWhatsAppUrl(student.parentPhone || '', text), '_blank');
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="إرسال عبر واتساب"
                                >
                                    <MessageCircle size={16} />
                                </button>
                                {user?.role === 'director' && (
                                    <Trash2
                                        size={16}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer"
                                        onClick={() => deleteNote.mutate(note.id)}
                                    />
                                )}
                                <button
                                    onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                        replyingTo === note.id
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "text-gray-400 border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                    )}
                                >
                                    <Reply size={12} />
                                    {replyingTo === note.id ? 'إلغاء' : 'رد'}
                                </button>
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold">
                                <p>{note.date}</p>
                            </div>
                        </div>

                        {/* Reply input */}
                        {replyingTo === note.id && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="اكتب ردك..."
                                    className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 border-none outline-none focus:ring-2 focus:ring-blue-200"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendReply(note.id);
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleSendReply(note.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                                    title="إرسال الرد"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
