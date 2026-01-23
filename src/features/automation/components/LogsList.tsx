'use client';

import type { AutomationLog } from '@/features/automation/services/automationService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface LogsListProps {
  logs: AutomationLog[];
}

export const LogsList: React.FC<LogsListProps> = ({ logs }) => {
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className={`p-4 rounded-xl border-l-4 ${
            log.status === 'success'
              ? 'border-l-green-500 bg-green-50'
              : 'border-l-red-500 bg-red-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {log.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="font-semibold text-gray-900">{log.ruleName}</h3>
              </div>

              <p className="text-sm text-gray-600 mb-2 text-right">
                <strong>المستقبل:</strong> {log.recipientName}
              </p>
              <p className="text-sm text-gray-700 mb-2 text-right bg-white p-2 rounded border border-gray-200">
                {log.messageSent}
              </p>

              <p className="text-xs text-gray-500 text-right">
                {format(new Date(log.timestamp), 'dd MMMM yyyy HH:mm', {
                  locale: ar,
                })}
              </p>
            </div>
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>لا توجد سجلات أتمتة حتى الآن</p>
        </div>
      )}
    </div>
  );
};
