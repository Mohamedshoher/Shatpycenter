"use client";

import FileText from 'lucide-react/dist/esm/icons/file-text'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

interface Props {
    teacher: any;
}

export const TeacherAgreementTab = ({ teacher }: Props) => {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8 rounded-[32px] border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <FileText size={24} />
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-black text-emerald-900">بنود اتفاق العمل</h3>
                        <p className="text-sm font-bold text-emerald-600">مركز الشاطبي للقرآن الكريم وعلومه</p>
                    </div>
                </div>

                <p className="text-sm text-gray-600 text-right mb-8 leading-relaxed">
                    حرصًا على جودة العمل، وانتظام سير الدراسة، وتحقيق أفضل خدمة لطلاب المركز وأولياء الأمور،
                    فقد تم الاتفاق على البنود الآتية، ويُعد الالتزام بها جزءًا أساسيًا من نظام العمل بالمركز.
                </p>

                <div className="space-y-6">
                    {/* البند الأول: الراتب */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>💰</span> أولًا: الراتب
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            يتم احتساب الراتب وفق النسبة المتفق عليها، كما تظهر في تبويب التحصيل داخل نظام المركز،
                            ويُعد ما يظهر بالنظام هو المرجع في احتساب المستحقات.
                        </p>
                    </div>

                    {/* البند الثاني: ساعات العمل */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>⏰</span> ثانيًا: ساعات العمل
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            ساعات العمل هي 4 ساعات يوميًا، لمدة 5 أيام في الأسبوع،
                            وذلك وفق الجدول الزمني المعتمد من إدارة المركز.
                        </p>
                    </div>

                    {/* البند الثالث: الغياب والإجازات */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>📌</span> ثالثًا: الغياب والإجازات
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            يلتزم المعلم بإبلاغ إدارة المركز قبل الغياب بوقتٍ كافٍ، ويفضل أن يكون قبلها بيوم كامل
                            أو في مدة تسمح للإدارة بتوفير بديل.
                        </p>
                        <p className="text-sm font-bold text-gray-700 mb-2">وفي حالة الغياب:</p>
                        <ul className="space-y-2 pr-4">
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>❌</span>
                                <span><span className="font-bold">الغياب بدون عذر:</span> يتم الخصم بقيمة يومي عمل عن كل يوم غياب.</span>
                            </li>
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>🤒</span>
                                <span><span className="font-bold">الغياب بعذر مرضي موثق:</span> يتم الخصم بقيمة يوم عمل واحد.</span>
                            </li>
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>⚫</span>
                                <span><span className="font-bold">في حالة الوفاة (لأحد الأقارب):</span> يتم الخصم بقيمة يوم عمل واحد.</span>
                            </li>
                        </ul>
                        <p className="text-sm text-gray-500 mt-3 pr-4 border-r-2 border-amber-200 pr-3">
                            أي غياب دون إخطار مسبق يُعد مخالفة للنظام، إلا في الحالات الطارئة الخارجة عن الإرادة.
                        </p>
                    </div>

                    {/* البند الثالث: التقرير اليومي */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>📝</span> رابعًا: التقرير اليومي (الحضور والغياب)
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            يلتزم كل معلم بإرسال التقرير اليومي عبر النظام، ويشمل:
                        </p>
                        <ul className="space-y-1 pr-4 mb-3">
                            <li className="text-sm text-gray-700">✅ تسجيل حضور الطلاب.</li>
                            <li className="text-sm text-gray-700">✅ تسجيل غياب الطلاب.</li>
                        </ul>
                        <p className="text-sm text-gray-700 mb-1">وفي حالة عدم إرسال التقرير اليومي:</p>
                        <p className="text-sm font-bold text-red-600">❌ يتم خصم ربع يوم عمل تلقائيًا.</p>
                        <p className="text-sm text-gray-500 mt-1">ويُطبق هذا الخصم مباشرة ولا رجعة فيه.</p>
                    </div>

                    {/* البند الرابع: تسجيل الاختبارات */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>📚</span> خامسًا: تسجيل الاختبارات
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            يلتزم كل معلم بتسجيل جميع الاختبارات الخاصة بطلابه على النظام.
                        </p>
                        <ul className="space-y-2 pr-4">
                            <li className="text-sm text-gray-700">✅ يسمح بالتسجيل خلال مدة أقصاها أسبوع واحد.</li>
                            <li className="text-sm text-gray-700">✅ تتم مراجعة التسجيل كل يوم أربعاء.</li>
                        </ul>
                        <p className="text-sm text-gray-700 mt-3 mb-1">في حالة عدم تسجيل اختبارات الأسبوع بالكامل حتى موعد المراجعة:</p>
                        <p className="text-sm font-bold text-red-600">❌ يتم خصم نصف يوم عمل.</p>
                    </div>

                    {/* البند الخامس: متابعة أولياء الأمور */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>📞</span> سادسًا: متابعة أولياء الأمور
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            يلتزم كل معلم بمتابعة أولياء أمور الطلاب التابعين له بصورة مستمرة.
                        </p>
                        <p className="text-sm text-gray-700 mb-1">ويجب أن تكون المتابعة:</p>
                        <ul className="space-y-1 pr-4">
                            <li className="text-sm text-gray-700">✅ باسم مركز الشاطبي للقرآن الكريم وعلومه.</li>
                            <li className="text-sm text-gray-700">✅ باعتبار المعلم ممثلًا للمركز.</li>
                            <li className="text-sm text-gray-700">❌ وليس باعتباره عملًا شخصيًا أو باسم المعلم وحده.</li>
                        </ul>
                    </div>

                    {/* البند السادس: الالتزام بالعمل */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                        <h4 className="font-black text-emerald-800 text-base mb-3 flex items-center gap-2">
                            <span>🤝</span> سابعًا: الالتزام بالعمل
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            يلتزم جميع المعلمين بما سبق من بنود، ويُعد العمل داخل المركز قائمًا على الانضباط،
                            والأمانة، وحسن التعامل، والحرص على مصلحة الطلاب، والمحافظة على سمعة مركز الشاطبي.
                        </p>
                    </div>

                    {/* البند السابع: المسؤولية المالية والتصفية */}
                    <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                        <h4 className="font-black text-amber-800 text-base mb-3 flex items-center gap-2">
                            <span>⚖️</span> ثامنًا: المسؤولية المالية والتصفية
                        </h4>
                        <ul className="space-y-2 pr-4">
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>📌</span>
                                <span>المدرس مسؤول عن تحصيل مصروفات الطلاب التابعين له.</span>
                            </li>
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>📌</span>
                                <span>لا بد من إخبار المدير قبل إنهاء العقد بمدة شهر كامل على الأقل.</span>
                            </li>
                            <li className="text-sm font-bold text-red-600 flex items-start gap-2">
                                <span>❌</span>
                                <span>في حالة عدم الإخطار قبل شهر: لا يستحق أي مستحقات مالية.</span>
                            </li>
                            <li className="text-sm text-gray-700 flex items-start gap-2">
                                <span>📌</span>
                                <span>يتم تصفية الحساب بناءً على ما تم جمعه من قبل المدرس فعليًا.</span>
                            </li>
                        </ul>
                        <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-xs font-bold">
                            <AlertCircle size={14} />
                            <span>هذا البند ملزم للطرفين ويُعد جزءًا أساسيًا من عقد العمل.</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-emerald-800">
                        نسأل الله التوفيق والسداد للجميع، وأن يجعل هذا العمل خالصًا لوجهه الكريم.
                    </p>
                </div>
            </div>
        </div>
    );
};
