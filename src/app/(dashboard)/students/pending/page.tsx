"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent, deleteStudent } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { UserCheck, UserX, Edit2, Trash2, Users, Calendar, Phone, MapPin, CreditCard, MessageSquare, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Student, Group } from '@/types';

export default function PendingStudentsPage() {
    const queryClient = useQueryClient();
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<Student | null>(null);

    const { data: allStudents = [], isLoading } = useQuery({
        queryKey: ['students'],
        queryFn: getStudents
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    const pendingStudents = allStudents.filter(s => s.status === 'pending');

    const approveMutation = useMutation({
        mutationFn: (studentId: string) => updateStudent(studentId, { status: 'active' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            alert('✅ تم قبول الطالب بنجاح');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (data: { id: string; reason: string }) =>
            updateStudent(data.id, { notes: `رفض - السبب: ${data.reason}`, status: 'archived' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowRejectModal(null);
            setRejectReason('');
            alert('❌ تم رفض الطالب وأرشفته');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: Partial<Student> }) =>
            updateStudent(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setEditingStudent(null);
            alert('✅ تم تحديث بيانات الطالب');
        }
    });

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
    };

    const handleApprove = (studentId: string) => {
        if (confirm('هل أنت متأكد من قبول هذا الطالب؟')) {
            approveMutation.mutate(studentId);
        }
    };

    const handleReject = (student: Student) => {
        setShowRejectModal(student);
    };

    const confirmReject = () => {
        if (showRejectModal && rejectReason.trim()) {
            rejectMutation.mutate({ id: showRejectModal.id, reason: rejectReason });
        } else {
            alert('يرجى إدخال سبب الرفض');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-blue-600 text-xl">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24" dir="rtl">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <Users size={28} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-gray-900">الطلاب المنتظرون</h1>
                        <p className="text-sm text-gray-500 font-bold mt-1">
                            {pendingStudents.length} طالب في انتظار الموافقة
                        </p>
                    </div>
                </div>
            </div>

            {/* Pending Students List */}
            {pendingStudents.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <UserCheck size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-bold text-lg">لا يوجد طلاب في انتظار الموافقة</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingStudents.map((student) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 hover:shadow-xl transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-black text-lg">
                                        {student.fullName[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">{student.fullName}</h3>
                                        <span className="inline-block mt-1 px-3 py-1 text-xs font-bold bg-amber-100 text-amber-600 rounded-full">
                                            معلق
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(student)}
                                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleApprove(student.id)}
                                        className="w-10 h-10 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                                    >
                                        <UserCheck size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleReject(student)}
                                        className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                                    >
                                        <UserX size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone size={16} className="text-blue-500" />
                                    <span className="font-bold">ولي الأمر:</span>
                                    <span className="font-sans">{student.parentPhone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin size={16} className="text-green-500" />
                                    <span className="font-bold">العنوان:</span>
                                    <span>{student.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <CreditCard size={16} className="text-purple-500" />
                                    <span className="font-bold">الرسوم الشهرية:</span>
                                    <span className="font-sans">{student.monthlyAmount} ج.م</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar size={16} className="text-orange-500" />
                                    <span className="font-bold">تاريخ الالتحاق:</span>
                                    <span>{student.enrollmentDate}</span>
                                </div>
                                {student.appointment && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <BookOpen size={16} className="text-indigo-500" />
                                        <span className="font-bold">الموعد:</span>
                                        <span>{student.appointment}</span>
                                    </div>
                                )}
                                {student.notes && (
                                    <div className="flex items-start gap-2 text-gray-600 md:col-span-2">
                                        <MessageSquare size={16} className="text-gray-400 mt-0.5" />
                                        <span className="font-bold">ملاحظات:</span>
                                        <span className="flex-1">{student.notes}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingStudent(null)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-black text-gray-900 mb-6">تعديل بيانات الطالب</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={editingStudent.fullName}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم ولي الأمر</label>
                                <input
                                    type="text"
                                    value={editingStudent.parentPhone}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">العنوان</label>
                                <input
                                    type="text"
                                    value={editingStudent.address}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الرسوم الشهرية</label>
                                <input
                                    type="number"
                                    value={editingStudent.monthlyAmount || 0}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, monthlyAmount: Number(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المجموعة</label>
                                <select
                                    value={editingStudent.groupId || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                >
                                    <option value="">بدون مجموعة</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الموعد</label>
                                <input
                                    type="text"
                                    value={editingStudent.appointment || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, appointment: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                    placeholder="مثل: السبت والأربعاء 5 مساء"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                                <textarea
                                    value={editingStudent.notes || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => updateMutation.mutate({ id: editingStudent.id, updates: editingStudent })}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                حفظ التعديلات
                            </button>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-black text-red-600 mb-4">رفض الطالب</h2>
                        <p className="text-gray-600 mb-4">
                            هل أنت متأكد من رفض طلب <span className="font-bold">{showRejectModal.fullName}</span>؟
                        </p>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">سبب الرفض</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 outline-none"
                                rows={3}
                                placeholder="يرجى توضيح سبب الرفض..."
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={confirmReject}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                تأكيد الرفض
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
