import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PnLReport, AIAnalysisResult } from '../types';
import { 
    Download, RefreshCw, Printer, ArrowRight, TrendingUp, 
    TrendingDown, Sparkles, BrainCircuit, Lightbulb, Bot, 
    FileSpreadsheet, Mail, Check, AlertCircle, Loader2
} from 'lucide-react';

interface ReportProps {
  userId: number;
  onBack: () => void;
}

export const ReportView: React.FC<ReportProps> = ({ userId, onBack }) => {
  const [report, setReport] = useState<PnLReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI State
  const [aiData, setAiData] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Email State
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchReport = async () => {
        try {
            const data = await api.reports.getPnL(userId);
            setReport(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchReport();
  }, [userId]);

  const fetchAIInsights = async () => {
      if (!userId) return;
      
      setAiLoading(true);
      setAiError(null);
      setAiData(null);

      try {
          const rawRes = await api.ai.getInsights(userId);
          
          // Cleanup logic: Gemini sometimes returns markdown code blocks ```json ... ```
          let cleanJson = rawRes.recommendations.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const parsedData: AIAnalysisResult = JSON.parse(cleanJson);
          setAiData(parsedData);
      } catch (err) {
          console.error("Failed to parse AI response:", err);
          setAiError("לא הצלחנו לייצר ניתוח כרגע. נסה שוב מאוחר יותר.");
      } finally {
          setAiLoading(false);
      }
  };

  const handleExportExcel = () => {
      if (!report) return;

      // 1. Build CSV Content
      let csvContent = "";
      
      // Header Row
      const headerRow = ["סעיף", ...report.columns];
      csvContent += headerRow.join(",") + "\n";

      // Sections
      report.table_full.sections.forEach(section => {
          // Section Title Row
          csvContent += `"${section.title}",,,,,,,,,,,,,\n`;
          
          // Data Rows
          section.rows.forEach(row => {
              const safeLabel = `"${row.label.replace(/"/g, '""')}"`;
              const values = row.values.join(",");
              csvContent += `${safeLabel},${values}\n`;
          });

          // Total Row
          if (section.total_row) {
             const safeLabel = `"${section.total_row.label.replace(/"/g, '""')}"`;
             const values = section.total_row.values.join(",");
             csvContent += `${safeLabel},${values}\n`;
          }
          csvContent += "\n"; // Empty line between sections
      });

      // Yearly Summary Section at bottom
      csvContent += '"סיכום שנתי",,,,,,,,,,,,,\n';
      report.table_yearly_summary.forEach(row => {
          const safeLabel = `"${row.label.replace(/"/g, '""')}"`;
          csvContent += `${safeLabel},${row.value}\n`;
      });

      // 2. Create Download Link with BOM for Hebrew support
      // \uFEFF is the BOM character that tells Excel the file is UTF-8
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "budget_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSendEmail = async () => {
      if (emailStatus === 'sending' || emailStatus === 'success') return;
      
      setEmailStatus('sending');
      try {
          await api.reports.sendToEmail(userId);
          setEmailStatus('success');
          // Reset status after 3 seconds
          setTimeout(() => setEmailStatus('idle'), 3000);
      } catch (err) {
          console.error(err);
          setEmailStatus('error');
          setTimeout(() => setEmailStatus('idle'), 3000);
      }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 mb-6"></div>
        <h2 className="text-xl font-bold text-gray-800">מעבד נתונים...</h2>
        <p className="text-gray-500 mt-2">ה-AI שלנו בונה את התחזית השנתית שלך</p>
    </div>
  );

  if (!report) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center p-8">
              <h2 className="text-xl font-bold text-red-600 mb-4">שגיאה בטעינת הדוח</h2>
              <button onClick={onBack} className="text-indigo-600 hover:underline">חזור למסך הקודם</button>
          </div>
      </div>
  );

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  const getKPIColor = (key: string, value: number) => {
      if (key.includes('profit') || key.includes('income')) return value >= 0 ? 'text-emerald-600' : 'text-red-600';
      if (key.includes('expense')) return 'text-rose-600';
      return 'text-gray-900';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
      {/* Navbar for Report */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-30 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
                <ArrowRight className="w-5 h-5" />
            </button>
            <div>
                <h1 className="font-bold text-lg">דוח רווח והפסד חזוי</h1>
                <p className="text-xs text-slate-400">תחזית שנתית 2024</p>
            </div>
        </div>
        
        {/* Actions Toolbar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
             {/* Excel Export */}
             <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white px-3 py-2 rounded-lg transition text-sm font-medium"
                title="ייצוא לאקסל"
            >
                <FileSpreadsheet className="w-4 h-4" /> 
                <span className="hidden sm:inline">אקסל</span>
            </button>

            {/* Email Send */}
            <button 
                onClick={handleSendEmail}
                disabled={emailStatus === 'sending' || emailStatus === 'success'}
                className={`flex items-center gap-2 border px-3 py-2 rounded-lg transition text-sm font-medium min-w-[100px] justify-center
                    ${emailStatus === 'success' 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : emailStatus === 'error'
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
            >
                {emailStatus === 'sending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : emailStatus === 'success' ? (
                    <>
                        <Check className="w-4 h-4" /> 
                        <span className="hidden sm:inline">נשלח!</span>
                    </>
                ) : emailStatus === 'error' ? (
                    <>
                        <AlertCircle className="w-4 h-4" /> 
                        <span className="hidden sm:inline">שגיאה</span>
                    </>
                ) : (
                    <>
                        <Mail className="w-4 h-4" /> 
                        <span className="hidden sm:inline">שלח במייל</span>
                    </>
                )}
            </button>

            {/* Print */}
            <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition text-sm"
                title="הדפסה"
            >
                <Printer className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 text-sm font-medium"
            >
                <RefreshCw className="w-4 h-4" /> 
                <span className="hidden sm:inline">עריכה</span>
            </button>
        </div>
      </div>

      <div className="max-w-[95%] mx-auto mt-8 space-y-8 print:max-w-full print:mt-0">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:hidden">
            {report.table_yearly_summary.map((row) => (
                <div key={row.key} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 h-8 leading-tight">{row.label}</p>
                    <div className="flex items-end justify-between">
                        <p className={`text-xl font-bold ${getKPIColor(row.key, row.value)}`}>
                            {formatMoney(row.value)}
                        </p>
                        {row.value !== 0 && (
                             row.value > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" /> : <TrendingDown className="w-4 h-4 text-rose-500 mb-1" />
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* AI Insights Section */}
        <div className="print:hidden">
            {!aiData && !aiLoading && (
                <div className="flex justify-center">
                    <button 
                        onClick={fetchAIInsights}
                        className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-0.5 overflow-hidden"
                    >
                         <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                        <Sparkles className="w-5 h-5" />
                        לחץ כאן לקבלת ניתוח AI חכם לתקציב שלך
                    </button>
                </div>
            )}

            {aiLoading && (
                <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-lg text-center max-w-3xl mx-auto">
                    <div className="inline-block p-4 rounded-full bg-indigo-50 mb-4 relative">
                        <BrainCircuit className="w-8 h-8 text-indigo-600 animate-pulse" />
                        <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-400 rounded-full animate-ping"></div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">ה-AI מנתח את המספרים שלך...</h3>
                    <p className="text-gray-500">זה עשוי לקחת מספר שניות, אנחנו מחפשים תובנות לחסכון וצמיחה.</p>
                </div>
            )}

            {aiData && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden animate-fadeIn max-w-5xl mx-auto ring-4 ring-indigo-50/50">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Bot className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">הניתוח החכם של Budget AI</h3>
                            <p className="text-indigo-100 mt-1 text-sm leading-relaxed max-w-2xl">
                                {aiData.summary}
                            </p>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-b from-white to-indigo-50/30">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            המלצות לביצוע
                        </h4>
                        <div className="grid md:grid-cols-3 gap-6">
                            {aiData.recommendations.map((rec, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <h5 className="font-bold text-gray-800 mb-2">{rec.title}</h5>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {rec.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {aiError && (
                <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center">
                    <p>{aiError}</p>
                    <button onClick={fetchAIInsights} className="text-sm font-bold underline mt-1 hover:text-red-800">נסה שוב</button>
                </div>
            )}
        </div>

        {/* Main Financial Table */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none">
            <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm text-right whitespace-nowrap border-collapse">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="p-4 border-b border-gray-200 sticky right-0 bg-slate-50 z-20 w-64 text-right shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] print:shadow-none font-bold">סעיף</th>
                            {report.columns.map((col, idx) => (
                                <th key={idx} className={`p-4 border-b border-gray-200 text-center min-w-[100px] ${col === 'שנתי' ? 'bg-indigo-50/50 text-indigo-900 font-bold border-r border-l border-indigo-100' : ''}`}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {report.table_full.sections.map((section, sIdx) => (
                            <React.Fragment key={sIdx}>
                                {/* Section Header */}
                                <tr className="bg-slate-100/50 print:bg-gray-100">
                                    <td className="p-3 py-4 font-black text-slate-800 sticky right-0 bg-slate-100/50 z-10 border-r-4 border-indigo-500 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]" colSpan={report.columns.length + 1}>
                                        {section.title}
                                    </td>
                                </tr>
                                
                                {/* Rows */}
                                {section.rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-3 pl-6 font-medium text-slate-600 sticky right-0 bg-white group-hover:bg-blue-50/30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] border-l border-gray-100">
                                            {row.label}
                                        </td>
                                        {row.values.map((val, vIdx) => {
                                            const isYearly = vIdx === 12;
                                            const isQuantity = section.title.includes('כמות');
                                            const isZero = val === 0;
                                            
                                            return (
                                                <td key={vIdx} className={`p-3 text-center border-l border-gray-50 tabular-nums ${isYearly ? 'bg-indigo-50/20 font-bold text-slate-900' : 'text-slate-500'}`}>
                                                    {isZero ? <span className="text-gray-200">-</span> : (isQuantity ? val.toLocaleString() : formatMoney(val))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                                {/* Section Total Row */}
                                {section.total_row && (
                                    <tr className="bg-indigo-50 font-bold text-indigo-900 border-t border-indigo-100">
                                        <td className="p-3 pr-4 sticky right-0 bg-indigo-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] border-l border-indigo-200">
                                            {section.total_row.label}
                                        </td>
                                        {section.total_row.values.map((val, vIdx) => (
                                            <td key={vIdx} className={`p-3 text-center border-l border-indigo-200 tabular-nums ${vIdx === 12 ? 'bg-indigo-100' : ''}`}>
                                                {section.title.includes('כמות') ? val.toLocaleString() : formatMoney(val)}
                                            </td>
                                        ))}
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};