import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { BusinessProfile, Product, FixedExpenseCategory } from '../types';
import {
    ArrowRight, ArrowLeft, Plus, Trash2, Save, Store, Package,
    Building2, Landmark, Check, Calculator, PieChart, Wallet
} from 'lucide-react';

interface WizardProps {
    userId: number;
    onComplete: () => void;
}
// tttt
const STEPS = [
    { id: 1, title: 'פרופיל עסק', subtitle: 'פרטים כלליים', icon: Store },
    { id: 2, title: 'הכנסות', subtitle: 'מוצרים ושירותים', icon: Package },
    { id: 3, title: 'עלויות מכר', subtitle: 'הוצאות ישירות', icon: Building2 },
    { id: 4, title: 'הוצאות קבועות', subtitle: 'הנהלה וכלליות', icon: Landmark },
];

export const BudgetWizard: React.FC<WizardProps> = ({ userId, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [profile, setProfile] = useState<BusinessProfile>({ business_name: '', phone: '', address: '' });
    const [products, setProducts] = useState<Product[]>([]);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, avg_monthly_qty: 0, unit_cost: 0 });
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseCategory[]>([]);

    // Statistics for headers
    const totalRevenue = useMemo(() => products.reduce((sum, p) => sum + (p.price * p.avg_monthly_qty), 0), [products]);
    const totalCOGS = useMemo(() => fixedExpenses.filter(e => e.group === 'cogs').reduce((sum, e) => sum + (e.monthly_amount || 0), 0), [fixedExpenses]);
    const totalGA = useMemo(() => fixedExpenses.filter(e => e.group === 'ga').reduce((sum, e) => sum + (e.monthly_amount || 0), 0), [fixedExpenses]);
    // 
    useEffect(() => {
        loadStepData();
    }, [currentStep, userId]);

    const loadStepData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (currentStep === 1) {
                try {
                    const data = await api.businessProfile.get(userId);
                    if (data) setProfile(data);
                } catch { /* ignore 404 */ }
            } else if (currentStep === 2) {
                const data = await api.products.list(userId);
                setProducts(data);
            } else if (currentStep === 3 || currentStep === 4) {
                const data = await api.fixedExpenses.list(userId);
                setFixedExpenses(data);
            }
        } catch (err) {
            console.error(err);
            setError("שגיאה בטעינת נתונים");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        setSaving(true);
        setError(null);
        try {
            if (currentStep === 1) {
                if (!profile.business_name) throw new Error("חובה להזין שם עסק");
                await api.businessProfile.upsert(userId, profile);
            } else if (currentStep === 2) {
                if (products.length === 0 && !confirm("לא הזנת מוצרים. האם להמשיך?")) {
                    setSaving(false);
                    return;
                }
            } else if (currentStep === 3 || currentStep === 4) {
                const currentGroup = currentStep === 3 ? 'cogs' : 'ga';
                const amounts: Record<string, number> = {};
                fixedExpenses
                    .filter(e => e.group === currentGroup)
                    .forEach(e => { amounts[e.code] = Number(e.monthly_amount); });

                await api.fixedExpenses.update(userId, { amounts });
            }

            if (currentStep < 4) {
                setCurrentStep(prev => prev + 1);
            } else {
                onComplete();
            }
        } catch (err: any) {
            setError(err.message || "שגיאה בשמירה");
        } finally {
            setSaving(false);
        }
    };

    const addProduct = async () => {
        if (!newProduct.name || (newProduct.price || 0) <= 0) return;
        try {
            const added = await api.products.create(userId, newProduct as Product);
            setProducts([...products, added]);
            setNewProduct({ name: '', price: 0, avg_monthly_qty: 0, unit_cost: 0 });
        } catch (err) {
            alert("שגיאה בהוספת מוצר");
        }
    };

    const deleteProduct = async (pid: number) => {
        if (!confirm("למחוק מוצר זה?")) return;
        try {
            await api.products.delete(userId, pid);
            setProducts(products.filter(p => p.id !== pid));
        } catch (err) {
            alert("שגיאה במחיקה");
        }
    };

    // ---- Render Functions ----

    const renderProgress = () => (
        <div className="w-full bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center relative">
                    {/* Background Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 rounded-full"></div>
                    {/* Active Line */}
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -z-10 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                    ></div>

                    {STEPS.map((step) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 cursor-default bg-white px-2">
                                <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                                ${isActive ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' :
                                        isCompleted ? 'border-indigo-600 bg-white text-indigo-600' : 'border-gray-200 bg-white text-gray-300'}
                            `}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <div className="hidden md:block text-center">
                                    <p className={`text-xs font-bold ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>{step.title}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8 flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-indigo-900">בוא נתחיל מהבסיס</h3>
                    <p className="text-indigo-700/80 text-sm mt-1">
                        פרטים אלו יופיעו בראש הדוחות שלך ויעזרו לנו להתאים את המערכת לצרכים שלך.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">שם העסק</label>
                    <input
                        type="text"
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                        value={profile.business_name}
                        onChange={e => setProfile({ ...profile, business_name: e.target.value })}
                        placeholder="לדוגמה: קפה בוקר טוב"
                        autoFocus
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">טלפון</label>
                        <input
                            type="tel"
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="050-0000000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">כתובת</label>
                        <input
                            type="text"
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
                            value={profile.address}
                            onChange={e => setProfile({ ...profile, address: e.target.value })}
                            placeholder="עיר, רחוב"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-8 animate-fadeIn">
            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Wallet className="w-5 h-5" />
                        <span className="text-sm font-medium">צפי הכנסות חודשי</span>
                    </div>
                    <div className="text-3xl font-black tracking-tight">
                        ₪{totalRevenue.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-gray-500 text-sm font-medium">מספר מוצרים</span>
                    <span className="text-2xl font-bold text-gray-800">{products.length}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-gray-500 text-sm font-medium">רווח גולמי ממוצע</span>
                    <span className="text-2xl font-bold text-green-600">
                        {products.length > 0 ?
                            Math.round(((totalRevenue - products.reduce((sum, p) => sum + (p.unit_cost * p.avg_monthly_qty), 0)) / totalRevenue) * 100) + '%'
                            : '0%'}
                    </span>
                </div>
            </div>

            {/* Add Product Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                    </div>
                    הוספת מוצר / שירות
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">שם המוצר</label>
                        <input
                            type="text"
                            placeholder="לדוגמה: ייעוץ שעתי"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={newProduct.name}
                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">מחיר מכירה</label>
                        <input
                            type="number"
                            placeholder="₪0"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={newProduct.price || ''}
                            onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">כמות בחודש</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={newProduct.avg_monthly_qty || ''}
                            onChange={e => setNewProduct({ ...newProduct, avg_monthly_qty: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">עלות ישירה</label>
                        <input
                            type="number"
                            placeholder="₪0"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={newProduct.unit_cost || ''}
                            onChange={e => setNewProduct({ ...newProduct, unit_cost: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <button
                            onClick={addProduct}
                            disabled={!newProduct.name || !newProduct.price}
                            className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200"
                        >
                            הוסף
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-right w-1/3">מוצר / שירות</th>
                                <th className="p-4 text-left">מחיר מכירה</th>
                                <th className="p-4 text-left">כמות חודשית</th>
                                <th className="p-4 text-left">עלות ישירה</th>
                                <th className="p-4 text-left">סה"כ הכנסה</th>
                                <th className="p-4 text-center w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Package className="w-12 h-12 opacity-20" />
                                            <p>עדיין לא הוספת מוצרים. מלא את הטופס למעלה כדי להתחיל.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {products.map(p => (
                                <tr key={p.id} className="group hover:bg-indigo-50/30 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                    <td className="p-4 text-left font-mono">₪{p.price.toLocaleString()}</td>
                                    <td className="p-4 text-left font-mono">{p.avg_monthly_qty.toLocaleString()}</td>
                                    <td className="p-4 text-left font-mono text-gray-500">₪{p.unit_cost.toLocaleString()}</td>
                                    <td className="p-4 text-left font-mono font-bold text-indigo-600">₪{(p.price * p.avg_monthly_qty).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => deleteProduct(p.id!)}
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderFixedExpenses = (group: 'cogs' | 'ga') => {
        const items = fixedExpenses.filter(e => e.group === group);
        const total = group === 'cogs' ? totalCOGS : totalGA;

        return (
            <div className="space-y-6 animate-fadeIn">
                {/* Context Header */}
                <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                            {group === 'cogs' ? <PieChart className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900">
                                {group === 'cogs' ? 'עלויות מכר (הוצאות משתנות)' : 'הוצאות קבועות והנהלה'}
                            </h3>
                            <p className="text-sm text-indigo-700/70">
                                {group === 'cogs'
                                    ? 'הוצאות הקשורות ישירות לייצור אך אינן פר מוצר (כמו חומרי עזר, אריזה כללית)'
                                    : 'הוצאות שוטפות של העסק שאינן תלויות ישירות במכירות (שכירות, ארנונה, שיווק)'}
                            </p>
                        </div>
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">סה"כ חודשי</p>
                        <p className="text-2xl font-black text-indigo-900">₪{total.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map(item => (
                        <div key={item.code} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group focus-within:ring-2 ring-indigo-500/20">
                            <label className="block text-sm font-bold text-gray-700 mb-3 min-h-[20px]">
                                {item.label}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-0 outline-none transition font-mono text-lg"
                                    value={item.monthly_amount || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setFixedExpenses(prev => prev.map(i => i.code === item.code ? { ...i, monthly_amount: val } : i));
                                    }}
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₪</span>
                            </div>
                        </div>
                    ))}
                </div>

                {items.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        לא נמצאו סעיפי הוצאה בקטגוריה זו.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {renderProgress()}

            <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 mb-20">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900">{STEPS[currentStep - 1].title}</h1>
                    <p className="text-slate-500 text-lg">{STEPS[currentStep - 1].subtitle}</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-gray-500 animate-pulse">טוען נתונים...</p>
                    </div>
                ) : (
                    <>
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderFixedExpenses('cogs')}
                        {currentStep === 4 && renderFixedExpenses('ga')}
                    </>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {error}
                    </div>
                )}
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        disabled={currentStep === 1 || loading || saving}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 px-6 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition font-medium"
                    >
                        <ArrowRight className="w-5 h-5" /> חזור
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={loading || saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl shadow-lg shadow-indigo-200 transition transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none font-bold text-lg"
                    >
                        {saving ? 'שומר...' : (currentStep === 4 ? 'סיום והצגת דוח' : 'המשך לשלב הבא')}
                        {!saving && (currentStep === 4 ? <Save className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />)}
                    </button>
                </div>
            </div>
        </div>
    );
};