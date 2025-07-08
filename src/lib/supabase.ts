import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Chart data interface for visualization
export interface ChartData {
  companies: string[];
  metrics: {
    name: string;
    data: number[];
    currency?: string;
  }[];
  chartType?: 'bar' | 'line' | 'pie';
}

// Database types based on our schema
export interface CompanyRecord {
  id: string;
  name: string;
  arr: number;
  revenue: number;
  cash_balance: number;
  valuation: number;
  employees: number;
  founded_year: number;
  status: string;
  vertical_group: string;
  deal_lead: string;
  currency: string;
  arr_source: string;
  revenue_source: string;
  cash_balance_source: string;
  valuation_source: string;
  employees_source: string;
  founded_year_source: string;
  status_source: string;
  vertical_group_source: string;
  deal_lead_source: string;
  created_at: string;
  updated_at: string;
}

// Helper function to format currency values
export function formatCurrency(amount: number | null | undefined, currency: string): string {
  // Handle null/undefined values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const prefix = currency === 'USD' ? '$' : currency === 'AUD' ? 'A$' : `${currency} `;

  if (amount >= 1000000000) {
    return `${prefix}${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${prefix}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${prefix}${(amount / 1000).toFixed(1)}K`;
  } else {
    return `${prefix}${amount.toLocaleString()}`;
  }
}

// Helper function to execute SQL queries safely
export async function executeSQLQuery(query: string): Promise<CompanyRecord[]> {
  try {
    // Basic validation - ensure it's a SELECT query
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Execute the query using Supabase
    const { data, error } = await supabase
      .from('companies')
      .select('*');

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data as CompanyRecord[];
  } catch (error) {
    console.error('SQL Query Error:', error);
    throw error;
  }
}
