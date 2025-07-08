import { CompanyRecord, formatCurrency, supabase } from './supabase';

export interface SQLQueryResult {
  data: CompanyRecord[];
  error?: string;
  formattedResponse?: string;
}

// Safe SQL query execution with proper parsing
export async function executeSQLQuery(sqlQuery: string): Promise<SQLQueryResult> {
  try {
    // Clean and validate the SQL query
    const cleanQuery = sqlQuery.trim().replace(/;+$/, ''); // Remove trailing semicolons

    // Basic validation - ensure it's a SELECT query
    if (!cleanQuery.toLowerCase().startsWith('select')) {
      return {
        data: [],
        error: 'Only SELECT queries are allowed'
      };
    }

    const result = await executeDirectQuery(cleanQuery);
    return result;

  } catch (error) {
    console.error('SQL Query Error:', error);
    return {
      data: [],
      error: `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Execute query directly with Supabase
async function executeDirectQuery(sqlQuery: string): Promise<SQLQueryResult> {
  try {
    const lowerQuery = sqlQuery.toLowerCase();

    // Determine which fields to select based on the SQL query
    let selectFields = '*';

    // Parse SELECT clause to get specific fields
    const selectMatch = sqlQuery.match(/select\s+(.+?)\s+from/i);
    if (selectMatch) {
      const fieldsStr = selectMatch[1].trim();
      if (fieldsStr !== '*') {
        selectFields = fieldsStr;
      }
    }

    // Build the base query with selected fields
    let query = supabase.from('companies').select(selectFields);

    // Handle specific company queries
    if (lowerQuery.includes('where') && lowerQuery.includes('ilike')) {
      // Handle multiple companies with OR conditions
      if (lowerQuery.includes(' or ')) {
        const orMatches = sqlQuery.match(/name\s+ilike\s+['"']%?([^'"]+)%?['"']/gi);
        if (orMatches && orMatches.length > 1) {
          const companyNames = orMatches.map(match => {
            const nameMatch = match.match(/['"']%?([^'"]+)%?['"']/i);
            return nameMatch ? nameMatch[1] : '';
          }).filter(name => name);

          // Use Supabase 'in' filter for multiple companies
          if (companyNames.length > 0) {
            // For multiple companies, we'll use a more flexible approach
            // Build the query to match any of the company names
            const orConditions = companyNames.map(name => `name.ilike.%${name}%`).join(',');
            query = query.or(orConditions);
          }
        }
      } else {
        // Single company query
        const nameMatch = sqlQuery.match(/name\s+ilike\s+['"']%?([^'"]+)%?['"']/i);
        if (nameMatch) {
          query = query.ilike('name', `%${nameMatch[1]}%`);
        }
      }
    }

    // Handle ORDER BY
    if (lowerQuery.includes('order by')) {
      if (lowerQuery.includes('arr desc')) {
        query = query.order('arr', { ascending: false });
      } else if (lowerQuery.includes('arr')) {
        query = query.order('arr', { ascending: true });
      } else if (lowerQuery.includes('name')) {
        query = query.order('name', { ascending: true });
      }
    }

    // Handle LIMIT
    if (lowerQuery.includes('limit')) {
      const limitMatch = sqlQuery.match(/limit\s+(\d+)/i);
      if (limitMatch) {
        query = query.limit(parseInt(limitMatch[1]));
      }
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return {
        data: [],
        error: `Database error: ${error.message}`
      };
    }

    // Ensure data is properly typed as CompanyRecord[]
    const companyData: CompanyRecord[] = (data as unknown as CompanyRecord[]) || [];

    return {
      data: companyData,
      formattedResponse: formatQueryResults(companyData)
    };

  } catch (error) {
    console.error('Direct query error:', error);
    return {
      data: [],
      error: `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}



// Format query results for display
function formatQueryResults(data: CompanyRecord[]): string {
  if (!data || data.length === 0) {
    return 'No companies found matching your criteria.';
  }

  let response = `Found ${data.length} company${data.length > 1 ? 'ies' : ''}:\n\n`;

  data.forEach((company, index) => {
    response += `${index + 1}. **${company.name || 'Unknown Company'}**\n`;

    // Only show fields that exist in the data
    if (company.arr !== undefined && company.arr !== null) {
      response += `   • ARR: ${formatCurrency(company.arr, company.currency || 'USD')} ${company.currency || 'USD'} (Source: ${company.arr_source || 'N/A'})\n`;
    }
    if (company.revenue !== undefined && company.revenue !== null) {
      response += `   • Revenue: ${formatCurrency(company.revenue, company.currency || 'USD')} ${company.currency || 'USD'} (Source: ${company.revenue_source || 'N/A'})\n`;
    }
    if (company.cash_balance !== undefined && company.cash_balance !== null) {
      response += `   • Cash Balance: ${formatCurrency(company.cash_balance, company.currency || 'USD')} ${company.currency || 'USD'} (Source: ${company.cash_balance_source || 'N/A'})\n`;
    }
    if (company.valuation !== undefined && company.valuation !== null) {
      response += `   • Valuation: ${formatCurrency(company.valuation, company.currency || 'USD')} ${company.currency || 'USD'} (Source: ${company.valuation_source || 'N/A'})\n`;
    }
    if (company.employees !== undefined && company.employees !== null) {
      response += `   • Employees: ${company.employees.toLocaleString()} (Source: ${company.employees_source || 'N/A'})\n`;
    }
    if (company.founded_year !== undefined && company.founded_year !== null) {
      response += `   • Founded: ${company.founded_year} (Source: ${company.founded_year_source || 'N/A'})\n`;
    }
    if (company.vertical_group !== undefined && company.vertical_group !== null) {
      response += `   • Vertical: ${company.vertical_group} (Source: ${company.vertical_group_source || 'N/A'})\n`;
    }
    if (company.deal_lead !== undefined && company.deal_lead !== null) {
      response += `   • Deal Lead: ${company.deal_lead} (Source: ${company.deal_lead_source || 'N/A'})\n`;
    }
    if (company.status !== undefined && company.status !== null) {
      response += `   • Status: ${company.status} (Source: ${company.status_source || 'N/A'})\n`;
    }

    response += `\n`;
  });

  return response;
}
