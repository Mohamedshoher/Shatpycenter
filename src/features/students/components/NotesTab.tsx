import { useState } from 'react';
import { FileText, Trash2, User, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn, getWhatsAppUrl } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';

export default function NotesTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { notes, addNote, deleteNote } = records;
    const [noteText, setNoteText] = useState('');

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
                                    <div className="text-[10px] text-gray-500 font-bold">
                                        <p>بواسطة: {note.createdBy}</p>
                                        <p>{note.date}</p>
                                    </div>
                                </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}