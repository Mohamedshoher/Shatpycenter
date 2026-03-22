//  تفاصيل عجز المجموعة
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    realDeficit: number;
    unpaidStudents: any[];
    deficitTab: 'unpaid' | 'exempted';
    setDeficitTab: (tab: 'unpaid' | 'exempted') => void;
    isDirector: boolean;
    handleExemptStudent: (id: string, name: string, amount: number) => void;
    handleRemoveExemption: (id: string, name: string) => void;
}

export const TeacherDeficitModal = ({
    isOpen, onClose, realDeficit, unpaidStudents, 
    deficitTab, setDeficitTab, isDirector, 
    handleExemptStudent, handleRemoveExemption 
}: Props) => {
    const displayedStudents = unpaidStudents
        .filter(s => deficitTab === 'unpaid' ? !s.isExempted : s.isExempted)
        .sort((a, b) => a.remaining - b.remaining);

    return (
        <AnimatePresence>
            {isOpen && (
                <div key="deficit-modal-container">
                    <motion.div
                        key="deficit-backdrop"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        key="deficit-content"
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[600px] h-[80vh] bg-white rounded-[40px] shadow-2xl border border-amber-100 z-[301] flex flex-col overflow-hidden"
                    >
                        {/* رأس النافذة */}
                        <div className="px-4 py-4 border-b border-amber-50 bg-gradient-to-br from-amber-50 to-white flex flex-row-reverse items-center justify-between shrink-0">
                            <h3 className="text-lg font-black text-amber-800">تفاصيل عجز المجموعة</h3>
                            <button onClick={onClose} className="w-10 h-10 bg-amber-100/50 rounded-2xl flex items-center justify-center"><X size={18} /></button>
                        </div>

                        {/* تبويبات العجز */}
                        <div className="px-6 py-4 bg-amber-50/30 border-b border-amber-100/50 shrink-0">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-3xl p-3 text-center border border-amber-100/50 shadow-sm">
                                    <p className="text-[9px] font-bold text-amber-500">إجمالي العجز</p>
                                    <p className="text-lg font-black text-amber-700">{realDeficit.toLocaleString()}</p>
                                </div>
                                <button onClick={() => setDeficitTab('unpaid')} className={cn("rounded-3xl p-3 border transition-all", deficitTab === 'unpaid' ? "bg-red-50 border-red-200 shadow-sm" : "bg-white border-slate-100")}>
                                    <p className="text-[9px] font-bold text-red-500">لم يدفعوا</p>
                                    <p className="text-lg font-black text-red-600">{unpaidStudents.filter(s => !s.isExempted).length}</p>
                                </button>
                                <button onClick={() => setDeficitTab('exempted')} className={cn("rounded-3xl p-3 border transition-all", deficitTab === 'exempted' ? "bg-green-50 border-green-200 shadow-sm" : "bg-white border-slate-100")}>
                                    <p className="text-[9px] font-bold text-green-500">معفيين</p>
                                    <p className="text-lg font-black text-green-600">{unpaidStudents.filter(s => s.isExempted).length}</p>
                                </button>
                            </div>
                        </div>

                        {/* القائمة */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {displayedStudents.length === 0 ? (
                                <p className="text-center py-10 text-gray-400">لا يوجد طلاب في هذه القائمة</p>
                            ) : (
                                displayedStudents.map((student) => (
                                    <div key={student.id} className="bg-white rounded-3xl p-5 border border-slate-100 mb-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-row-reverse items-start justify-between">
                                            <div className="text-right">
                                                <h4 className="font-bold">{student.name}</h4>
                                                <p className="text-[10px] text-gray-400">{student.groupName}</p>
                                            </div>
                                            <p className={cn("text-lg font-black", student.isExempted ? "text-green-600 line-through" : "text-red-600")}>
                                                {student.remaining} ج.م
                                            </p>
                                        </div>
                                        {isDirector && (
                                            <div className="mt-3 flex justify-start">
                                                {student.isExempted ? (
                                                    <button onClick={() => handleRemoveExemption(student.id, student.name)} className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1"><UserX size={12}/> إلغاء العفو</button>
                                                ) : (
                                                    <button onClick={() => handleExemptStudent(student.id, student.name, student.remaining)} className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-lg flex items-center gap-1"><Gift size={12}/> العفو عن المبلغ</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};