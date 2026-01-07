import { 
  AuthResponse, 
  BusinessProfile, 
  Product, 
  FixedExpenseCategory, 
  FixedExpenseUpsert,
  PnLReport 
} from '../types';

// Explicitly define the backend URL
const API_BASE_URL = "https://easybudgetbackend-production.up.railway.app";

// Helper for requests
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Defensive coding: Ensure we never make a relative request
  let url = `${API_BASE_URL}${path}`;
  if (!url.startsWith('http')) {
      console.error('CRITICAL: API URL is relative, forcing absolute URL.');
      url = `https://easybudgetbackend-production.up.railway.app${path}`;
  }
  
  // Debug log to verify v3 is running
  console.log(`[API v3 DEBUG] ${options?.method || 'GET'} ${url}`);

  try {
      const res = await fetch(url, {
        ...options,
        mode: 'cors', // Explicitly request CORS
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!res.ok) {
        let errorMessage = 'API Error';
        try {
            const errorData = await res.json();
            errorMessage = errorData.detail || errorMessage;
        } catch (e) {
            // If we get here, it means the server returned a non-JSON error (like a raw 404 or 500 html page)
            errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
            console.error("Non-JSON Error Response body:", await res.text().catch(() => 'Could not read text'));
        }
        throw new Error(errorMessage);
      }
      return res.json();
  } catch (err) {
      // Network errors (like CORS failure or DNS issues) land here
      console.error(`[API Connection Failed]`, err);
      throw err;
  }
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