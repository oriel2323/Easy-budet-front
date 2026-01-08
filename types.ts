export interface User {
  id: number;
  email: string;
  full_name?: string;
}

export interface BusinessProfile {
  id?: number;
  user_id?: number;
  business_name: string;
  phone: string;
  address: string;
}

export interface Product {
  id?: number;
  user_id?: number;
  name: string;
  price: number;
  avg_monthly_qty: number;
  unit_cost: number;
}

export interface FixedExpenseCategory {
  category_id: number;
  code: string;
  label: string;
  group: 'cogs' | 'ga';
  sort_order: number;
  monthly_amount: number;
}

export interface FixedExpenseUpsert {
  amounts: Record<string, number>;
}

// Report Types
export interface TableRow {
  key: string;
  label: string;
  values: number[]; // Decimal in python, number in JS
}

export interface TableSection {
  title: string;
  rows: TableRow[];
  total_row?: TableRow | null;
}

export interface FullPnLTable {
  columns: string[];
  sections: TableSection[];
}

export interface YearlySummaryRow {
  key: string;
  label: string;
  value: number;
}

export interface PnLReport {
  columns: string[];
  table_full: FullPnLTable;
  table_yearly_summary: YearlySummaryRow[];
}

export interface AuthResponse {
  success: boolean;
  user_id?: number;
  message?: string;
}

// AI Types
export interface AIRecommendation {
  title: string;
  content: string;
}

export interface AIAnalysisResult {
  status: string;
  summary: string;
  recommendations: AIRecommendation[];
}

export interface AIResponseRaw {
  recommendations: string; // The raw JSON string returned from backend
}