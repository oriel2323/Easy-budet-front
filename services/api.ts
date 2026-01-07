import { 
  AuthResponse, 
  BusinessProfile, 
  Product, 
  FixedExpenseCategory, 
  FixedExpenseUpsert,
  PnLReport 
} from '../types';

// Hardcoded backend URL to prevent relative path issues
// Note: Ensure this URL is reachable and has no trailing slash here
const BACKEND_URL = "https://easybudgetbackend-production.up.railway.app";

// Helper for requests
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  
  // Debug log with timestamp to verify latest code is running
  console.log(`[API v2] ${new Date().toISOString()} - ${options?.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    // Try to parse JSON error, fallback to status text if it's HTML (like Vercel 404)
    let errorMessage = 'API Error';
    try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
    } catch (e) {
        // If response is not JSON (e.g., 404 HTML page), use status text
        errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
        console.error("Non-JSON Error Response:", e);
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const api = {
  auth: {
    // Added trailing slashes to paths which helps with some strict backend routers (FastAPI/Flask)
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