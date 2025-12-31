import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PnLReport } from '../types';
import { Download, RefreshCw, Printer, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReportProps {
  userId: number;
  onBack: () => void;
}

export const ReportView: React.FC<ReportProps> = ({ userId, onBack }) => {
  const [report, setReport] = useState<PnLReport | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-30 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
                <ArrowRight className="w-5 h-5" />
            </button>
            <div>
                <h1 className="font-bold text-lg">דוח רווח והפסד חזוי</h1>
                <p className="text-xs text-slate-400">תחזית שנתית 2024</p>
            </div>
        </div>
        <div className="flex gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition text-sm">
                <Printer className="w-4 h-4" /> הדפס
            </button>
            <button onClick={onBack} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 text-sm font-medium">
                <RefreshCw className="w-4 h-4" /> עריכת נתונים
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