import { 
  AuthResponse, 
  BusinessProfile, 
  Product, 
  FixedExpenseCategory, 
  FixedExpenseUpsert,
  PnLReport 
} from '../types';

const API_BASE = "https://easybudgetbackend-production.up.railway.app";

// Helper for requests
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API Error');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) => 
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    register: (email: string, password: string, full_name?: string) => 
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name })
      }),
  },
  businessProfile: {
    get: (userId: number) => request<BusinessProfile>(`/business-profiles/${userId}`),
    upsert: (userId: number, data: BusinessProfile) => 
      request<BusinessProfile>(`/business-profiles/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  },
  products: {
    list: (userId: number) => request<Product[]>(`/products/${userId}`),
    create: (userId: number, data: Product) => 
      request<Product>(`/products/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    delete: (userId: number, productId: number) => 
      request<{success: boolean}>(`/products/${userId}/${productId}`, {
        method: 'DELETE'
      }),
  },
  fixedExpenses: {
    list: (userId: number) => request<FixedExpenseCategory[]>(`/fixed-expenses/${userId}`),
    update: (userId: number, data: FixedExpenseUpsert) => 
      request<FixedExpenseCategory[]>(`/fixed-expenses/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
  },
  reports: {
    getPnL: (userId: number) => request<PnLReport>(`/reports/pnl/${userId}`),
  }
};