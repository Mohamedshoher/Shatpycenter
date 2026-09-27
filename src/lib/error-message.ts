/**
 * يستخرج رسالة نصية آمنة من أي قيمة خطأ ملتقطة في catch (يفترض النوع
 * unknown دائماً)، بدل الاعتماد على catch (error: any) الذي يخفي أخطاء
 * TypeScript المحتملة.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'حدث خطأ غير متوقع';
}
