import React from 'react';
import { Book, Calendar, CheckCircle2, DollarSign } from 'lucide-react';
import { IqraProgress } from '../services/iqraService';

interface IqraBookSectionProps {
    data: Partial<IqraProgress>;
    onUpdate: (data: Partial<IqraProgress>) => void;
    isUpdating: boolean;
}

export default function IqraBookSection({ data, onUpdate, isUpdating }: IqraBookSectionProps) {
    return (
        <div className="bg-blue-50/50 rounded-3xl p-5 md:p-6 border border-blue-100/50 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Book size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900">بيانات الكتاب والدورة</h3>
                    <p className="text-xs text-gray-500 font-bold">إدارة معلومات المادة العلمية الحالية</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* اسم الكتاب */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 pr-1">اسم الكتاب / المادة</label>
                    <input
                        type="text"
                        value={data.book_name || ''}
                        onChange={(e) => onUpdate({ book_name: e.target.value })}
                        placeholder="مثل: متن الجزرية"
                        className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    />
                </div>

                {/* تاريخ البدء */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 pr-1">تاريخ البدء</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={data.start_date || ''}
                            onChange={(e) => onUpdate({ start_date: e.target.value })}
                            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                </div>

                {/* عدد المحاضرات */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 pr-1">إجمالي المحاضرات</label>
                    <input
                        type="number"
                        value={data.total_lectures || 0}
                        onChange={(e) => onUpdate({ total_lectures: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    />
                </div>

                {/* استلام الكتاب */}
                <div className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className={data.received_from_sheikh ? 'text-green-500' : 'text-gray-300'} />
                        <span className="text-sm font-black text-gray-700">تم استلام الكتاب</span>
                    </div>
                    <button
                        onClick={() => onUpdate({ received_from_sheikh: !data.received_from_sheikh })}
                        className={`w-12 h-6 rounded-full transition-all relative ${data.received_from_sheikh ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.received_from_sheikh ? 'right-7' : 'right-1'}`} />
                    </button>
                </div>

                {/* مجاني أو مدفوع */}
                {data.received_from_sheikh && (
                    <div className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2">
                            <DollarSign size={18} className={!data.is_free ? 'text-amber-500' : 'text-green-500'} />
                            <span className="text-sm font-black text-gray-700">{data.is_free ? 'مجاني' : 'بثمنه'}</span>
                        </div>
                        <button
                            onClick={() => onUpdate({ is_free: !data.is_free })}
                            className={`w-12 h-6 rounded-full transition-all relative ${!data.is_free ? 'bg-amber-500' : 'bg-green-500'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${!data.is_free ? 'right-1' : 'right-7'}`} />
                        </button>
                    </div>
                )}

                {/* موعد الاختبار الشامل */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-amber-600 pr-1">موعد الاختبار الشامل</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={data.full_exam_date || ''}
                            onChange={(e) => onUpdate({ full_exam_date: e.target.value })}
                            className="w-full bg-amber-50/50 border border-amber-100 rounded-2xl px-4 py-3 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                        />
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end pt-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-white font-black text-xs shadow-md shadow-blue-100">
                    <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center">
                        {data.completed_courses || 0}
                    </div>
                    <span>دورات منجزة</span>
                </div>
            </div>
        </div>
    );
}
