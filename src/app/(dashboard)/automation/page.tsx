'use client';

import { useEffect, useState } from 'react';
import { useAutomation } from '@/features/automation/hooks/useAutomation';
import { AddAutomationModal } from '@/features/automation/components/AddAutomationModal';
import { EditAutomationModal } from '@/features/automation/components/EditAutomationModal';
import { RulesList } from '@/features/automation/components/RulesList';
import { LogsList } from '@/features/automation/components/LogsList';
import { Plus, Settings, History } from 'lucide-react';
import type { AutomationRule } from '@/features/automation/services/automationService';

export default function AutomationPage() {
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const {
    rules,
    logs,
    loading,
    loadRules,
    loadLogs,
    createRule,
    toggleRule,
    deleteRule,
    updateRule,
  } = useAutomation();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    loadRules();
    loadLogs();
  }, [isClient, loadRules, loadLogs]);

  if (!isClient) return null;

  return (
    <div className="space-y-6 pb-10 p-4 md:p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-right">
          نظام الأتمتة
        </h1>
        <p className="text-gray-600 text-right">
          إنشاء قواعس تلقائية لإرسال الرسائل والتنبيهات
        </p>
      </div>

      {/* Tabs and Action Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          قاعدة جديدة
        </button>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium ${activeTab === 'rules'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Settings className="w-4 h-4" />
            القواعس
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium ${activeTab === 'logs'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <History className="w-4 h-4" />
            السجلات
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        {activeTab === 'rules' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
              قواعس الأتمتة ({rules.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : (
              <RulesList
                rules={rules}
                onToggle={toggleRule}
                onDelete={deleteRule}
                onEdit={(rule) => {
                  setSelectedRule(rule);
                  setIsEditModalOpen(true);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
              سجل الأتمتة ({logs.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : (
              <LogsList logs={logs} />
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AddAutomationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={createRule}
      />

      {/* Edit Modal */}
      <EditAutomationModal
        isOpen={isEditModalOpen}
        rule={selectedRule}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRule(null);
        }}
        onSave={(updatedData) => {
          if (selectedRule) {
            updateRule(selectedRule.id, updatedData);
            setIsEditModalOpen(false);
            setSelectedRule(null);
          }
        }}
      />
    </div>
  );
}
