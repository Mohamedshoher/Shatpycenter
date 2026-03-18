// مجموعات  المدرس
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Layers } from 'lucide-react';

interface Props {
    teacher: any;
    groups: any[];
    students: any[];
    teachers: any[];
    isDirector: boolean;
    onAssignGroup: (groupId: string) => void;
    onRemoveGroup: (groupId: string) => void;
}

export const TeacherGroupsTab = ({ teacher, groups, students, teachers, isDirector, onAssignGroup, onRemoveGroup }: Props) => {
    const [showAssignModal, setShowAssignModal] = useState(false);

    const teacherGroups = groups?.filter(g => g.teacherId === teacher?.id) || [];
    const availableGroups = groups?.filter(g => g.teacherId !== teacher?.id) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-row-reverse items-center justify-between">
                {isDirector && (
                    <button onClick={() => setShowAssignModal(true)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all">
                        <Plus size={16} /> إسناد مجموعة
                    </button>
                )}
            </div>

            {teacherGroups.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                    لا توجد مجموعات مسندة لهذا المعلم حالياً.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherGroups.map(group => (
                        <div key={group.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm group hover:border-blue-200 transition-all flex flex-row-reverse items-center justify-between">
                            <div className="text-right">
                                <h4 className="font-bold text-gray-800">{group.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold mt-1">
                                    عدد الطلاب: {students?.filter(s => s.groupId === group.id && s.status === 'active').length || 0} طالباً
                                </p>
                            </div>
                            {isDirector && (
                                <button onClick={() => onRemoveGroup(group.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAssignModal && (
                    <>
                        <div className="fixed inset-0 z-[150] bg-black/10 backdrop-blur-[2px]" onClick={() => setShowAssignModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-[40px] shadow-2xl border border-gray-100 p-6 z-[151] flex flex-col max-h-[60vh]"
                        >
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                <h3 className="font-bold text-gray-900">اختر مجموعة لإسنادها</h3>
                                <button onClick={() => setShowAssignModal(false)} className="text-gray-400"><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                                {availableGroups.length === 0 ? (
                                    <p className="text-center py-10 text-xs text-gray-400">لا توجد مجموعات متاحة</p>
                                ) : (
                                    availableGroups.map(g => (
                                        <button key={g.id} onClick={() => { onAssignGroup(g.id); setShowAssignModal(false); }} className="w-full text-right p-4 rounded-2xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 group">
                                            <div className="flex flex-row-reverse items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800">{g.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-1">المعلم الحالي: {teachers?.find(t => t.id === g.teacherId)?.fullName || 'لا يوجد'}</p>
                                                </div>
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Plus size={16} /></div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};