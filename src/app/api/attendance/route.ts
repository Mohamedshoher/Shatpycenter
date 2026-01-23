import { NextRequest, NextResponse } from 'next/server';
import { addAttendanceRecord } from '@/features/students/services/recordsService';

export async function POST(request: NextRequest) {
    try {
        const { studentId, status, day, month } = await request.json();

        // Validate input
        if (!studentId || !status || !day || !month) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!['present', 'absent'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Record attendance
        const record = await addAttendanceRecord({
            studentId,
            status,
            day,
            month
        });

        return NextResponse.json(
            { success: true, record },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in attendance API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
