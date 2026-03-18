"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart2, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Button } from '@/components/ui/button';

interface AttendanceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    title: string;
    type: 'present' | 'absent';
}

export default function AttendanceChartModal({ isOpen, onClose, data, title, type }: AttendanceChartModalProps) {
    const isAbsent = type === 'absent';
    const mainColor = isAbsent ? '#ef4444' : '#22c55e';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white">
                        <div className={isAbsent ? "bg-red-500 p-6 flex items-center justify-between text-white" : "bg-green-500 p-6 flex items-center justify-between text-white"}>
                            <div className="flex items-center gap-3">
                                {isAbsent ? <BarChart2 /> : <CheckCircle2 />}
                                <h3 className="font-black text-xl">{title}</h3>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20"><X size={18} /></button>
                        </div>
                        <div className="p-6 h-[50vh]" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={25}>
                                        {data.map((_, i) => <Cell key={i} fill={i === 0 ? mainColor : mainColor + '80'} />)}
                                        <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: '900', fill: mainColor }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-center"><Button onClick={onClose} className="bg-gray-900 text-white rounded-2xl w-full">إغلاق</Button></div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}