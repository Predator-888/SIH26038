import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Send, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Activity,
  Eye,
  History
} from 'lucide-react';
import { api } from '../api/client';
import { PatientReminderItem, SMSLogItem } from '../types/api';

interface PatientSMSReminderCardProps {
  caseId: string;
  patientRef?: string;
  grade?: number;
  gradeLabel?: string;
}

export const PatientSMSReminderCard: React.FC<PatientSMSReminderCardProps> = ({
  caseId,
  patientRef,
  grade = 0,
  gradeLabel = 'No DR'
}) => {
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [reminders, setReminders] = useState<PatientReminderItem[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [showCustomBox, setShowCustomBox] = useState(false);

  // Load existing reminders & logs
  const loadRemindersAndLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getCaseReminders(caseId);
      setReminders(data.reminders || []);
      setSmsLogs(data.sms_logs || []);
      if (data.reminders && data.reminders.length > 0 && data.reminders[0].patient_phone) {
        setPhoneNumber(data.reminders[0].patient_phone);
      }
    } catch (err) {
      console.warn('Could not load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemindersAndLogs();
  }, [caseId]);

  // Handle auto-scheduling reminders
  const handleSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit phone number with country code (+91).' });
      return;
    }
    try {
      setLoading(true);
      setFeedback(null);
      await api.scheduleCaseReminders(caseId, phoneNumber, language);
      setFeedback({ type: 'success', message: 'Reminders scheduled based on clinical screening grade!' });
      await loadRemindersAndLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.detail?.message || 'Failed to schedule reminders.' });
    } finally {
      setLoading(false);
    }
  };

  // Dispatch specific reminder SMS
  const handleSendReminder = async (reminderId: number) => {
    try {
      setDispatchingId(reminderId);
      setFeedback(null);
      const res = await api.sendReminderSMS(reminderId);
      setFeedback({ 
        type: 'success', 
        message: `SMS dispatched successfully via ${res.provider.toUpperCase()} gateway to ${res.recipient_phone}!` 
      });
      await loadRemindersAndLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.detail?.message || 'Failed to dispatch SMS.' });
    } finally {
      setDispatchingId(null);
    }
  };

  // Dispatch custom SMS
  const handleSendCustomSMS = async () => {
    if (!phoneNumber || !customMsg.trim()) return;
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.sendCustomSMS({
        caseId,
        phoneNumber,
        reminderType: 'custom',
        language,
        customText: customMsg.trim()
      });
      setFeedback({ type: 'success', message: `Custom alert delivered to ${res.recipient_phone}!` });
      setCustomMsg('');
      setShowCustomBox(false);
      await loadRemindersAndLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.detail?.message || 'Failed sending SMS.' });
    } finally {
      setLoading(false);
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'blood_sugar':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'hba1c':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'specialist_referral':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Eye className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-teal-50 border border-teal-200/60 rounded-xl text-teal-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              Patient SMS Follow-up Engine
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-teal-100 text-teal-700 rounded-full">
                Active
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Automated mobile reminders for Blood Glucose & Retinal Rescreening
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              language === 'en' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('hi')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              language === 'hi' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Patient Phone Input Form */}
      <form onSubmit={handleSchedule} className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Patient Mobile Contact</span>
          <span className="text-[10px] text-teal-600 font-medium lowercase">
            auto-schedules based on Grade {grade} ({gradeLabel})
          </span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            <span>{reminders.length > 0 ? 'Update Schedule' : 'Schedule Reminders'}</span>
          </button>
        </div>
      </form>

      {/* Scheduled Reminders List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Clinical Reminders ({reminders.length})
          </span>
          <button
            type="button"
            onClick={() => setShowCustomBox(!showCustomBox)}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showCustomBox ? 'Hide Custom SMS' : '+ Quick Custom SMS'}</span>
          </button>
        </div>

        {/* Custom SMS Drawer */}
        {showCustomBox && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'मरीज के लिए त्वरित स्वास्थ्य सलाह या संदेश लिखें...'
                  : 'Type custom health note or clinic appointment instructions...'
              }
              rows={2}
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomBox(false)}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendCustomSMS}
                disabled={loading || !customMsg.trim()}
                className="px-3.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>Send Custom SMS</span>
              </button>
            </div>
          </div>
        )}

        {reminders.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              No follow-up reminders scheduled yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter patient phone above to compute clinical follow-up intervals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {reminders.map((rem) => {
              const dueDate = new Date(rem.due_date);
              const isSent = rem.status === 'sent';
              const isDispatching = dispatchingId === rem.id;

              return (
                <div
                  key={rem.id}
                  className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                      {getReminderIcon(rem.reminder_type)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{rem.title}</span>
                        {isSent ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                            Sent
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-md">
                            Scheduled
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Interval: Every {rem.interval_days} days</span>
                        <span>•</span>
                        <span>Due: {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendReminder(rem.id)}
                    disabled={isDispatching}
                    className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 hover:border-teal-300 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDispatching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSent ? 'Resend' : 'Send SMS'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SMS Dispatch History */}
      {smsLogs.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            Recent Dispatch Logs ({smsLogs.length})
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {smsLogs.map((log) => {
              const sentDate = new Date(log.sent_at);
              return (
                <div
                  key={log.id}
                  className="text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="font-mono text-[10px] text-teal-700">{log.recipient_phone}</span>
                      <span>•</span>
                      <span className="text-[10px] text-slate-400">
                        {sentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 truncate text-[10.5px]">
                      {log.message_text}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-md shrink-0 uppercase">
                    {log.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
