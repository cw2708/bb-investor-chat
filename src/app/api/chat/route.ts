import { executeSQLQuery } from '@/lib/sql-handler';
import { CompanyRecord } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to parse ChatGPT response for SQL requests
function parseSQLRequest(response: string): { hasSQL: boolean; sqlQuery?: string; cleanResponse: string } {
  const sqlRegex = /\[SQL_QUERY\]([\s\S]*?)\[\/SQL_QUERY\]/;
  const match = response.match(sqlRegex);

  if (!match) {
    return { hasSQL: false, cleanResponse: response };
  }

  const sqlQuery = match[1].trim();
  const cleanResponse = response.replace(sqlRegex, '').trim();

  return {
    hasSQL: true,
    sqlQuery: sqlQuery,
    cleanResponse: cleanResponse
  };
}

// Function to parse chart requests
function parseChartRequest(response: string, queryData?: CompanyRecord[]): { hasChart: boolean; chartData?: unknown; cleanResponse: string } {
  const chartRegex = /\[CHART_REQUEST\]([\s\S]*?)\[\/CHART_REQUEST\]/;
  const match = response.match(chartRegex);

  if (!match) {
    return { hasChart: false, cleanResponse: response };
  }

  const chartBlock = match[1];
  const cleanResponse = response.replace(chartRegex, '').trim();

  // Parse chart parameters
  const typeMatch = chartBlock.match(/type:\s*([^\n]+)/);
  const companiesMatch = chartBlock.match(/companies:\s*([^\n]+)/);
  const metricsMatch = chartBlock.match(/metrics:\s*([^\n]+)/);
  const titleMatch = chartBlock.match(/title:\s*([^\n]+)/);

  if (!typeMatch || !companiesMatch || !metricsMatch || !queryData) {
    return { hasChart: false, cleanResponse: response };
  }

  const chartType = typeMatch[1].trim().toLowerCase() as 'bar' | 'line' | 'pie';
  const companies = companiesMatch[1].split(',').map(c => c.trim());
  const metrics = metricsMatch[1].split(',').map(m => m.trim());
  const title = titleMatch ? titleMatch[1].trim() : `${metrics.join(' & ')} Comparison`;

  // Filter companies based on request
  const filteredCompanies = queryData.filter(company =>
    companies.some(requestedCompany =>
      company.name.toLowerCase().includes(requestedCompany.toLowerCase()) ||
      requestedCompany.toLowerCase().includes(company.name.toLowerCase())
    )
  );

  if (filteredCompanies.length === 0) {
    return { hasChart: false, cleanResponse: response };
  }

  // Process metrics
  const processedMetrics = metrics.map(metric => {
    const normalizedMetric = metric.toLowerCase();

    if (normalizedMetric.includes('arr')) {
      return {
        name: 'ARR',
        data: filteredCompanies.map(company => company.arr),
        currency: 'mixed'
      };
    }
    if (normalizedMetric.includes('revenue')) {
      return {
        name: 'Revenue',
        data: filteredCompanies.map(company => company.revenue),
        currency: 'mixed'
      };
    }
    if (normalizedMetric.includes('cash')) {
      return {
        name: 'Cash Balance',
        data: filteredCompanies.map(company => company.cash_balance),
        currency: 'mixed'
      };
    }
    if (normalizedMetric.includes('valuation')) {
      return {
        name: 'Valuation',
        data: filteredCompanies.map(company => company.valuation),
        currency: 'mixed'
      };
    }
    if (normalizedMetric.includes('employees')) {
      return {
        name: 'Employees',
        data: filteredCompanies.map(company => company.employees)
      };
    }

    return null;
  }).filter(Boolean);

  if (processedMetrics.length === 0) {
    return { hasChart: false, cleanResponse: response };
  }

  const chartData = {
    companies: filteredCompanies.map(company => company.name),
    metrics: processedMetrics,
    chartType: chartType
  };

  return {
    hasChart: true,
    chartData: {
      chartData,
      chartTitle: title,
      chartType: chartType
    },
    cleanResponse
  };
}

const SYSTEM_PROMPT = `You are an AI assistant specialized in providing company metrics and data to investors.

You have access to a PostgreSQL database with a 'companies' table that contains the following structure:

TABLE: companies
- id (UUID): Primary key
- name (VARCHAR): Company name
- arr (BIGINT): Annual Recurring Revenue (in actual dollars, not cents)
- revenue (BIGINT): Revenue (in actual dollars, not cents)
- cash_balance (BIGINT): Cash balance (in actual dollars, not cents)
- valuation (BIGINT): Valuation (in actual dollars, not cents)
- employees (INTEGER): Number of full-time employees
- founded_year (INTEGER): Year the company was founded
- status (VARCHAR): Company status (e.g., "Active")
- vertical_group (VARCHAR): Industry vertical (e.g., "Enterprise", "AI/ML", "Healthcare")
- deal_lead (VARCHAR): Deal lead name
- currency (VARCHAR): Currency code (USD, AUD, etc.)
- arr_source (VARCHAR): Data source for ARR
- revenue_source (VARCHAR): Data source for revenue
- cash_balance_source (VARCHAR): Data source for cash balance
- valuation_source (VARCHAR): Data source for valuation
- employees_source (VARCHAR): Data source for employees
- founded_year_source (VARCHAR): Data source for founded year
- status_source (VARCHAR): Data source for status
- vertical_group_source (VARCHAR): Data source for vertical group
- deal_lead_source (VARCHAR): Data source for deal lead
- created_at (TIMESTAMP): Record creation time
- updated_at (TIMESTAMP): Record last update time

CRITICAL INSTRUCTIONS:
- For ANY question about company data, you MUST generate a SQL query
- Never say "I'll fetch" or "Just a moment" - always generate the SQL query immediately
- The SQL query will be executed automatically and you'll get the results
- Do NOT provide conversational responses like "I'll get that for you" - just generate the SQL
- Generate TARGETED queries: if they ask for ARR, only select ARR fields; if they ask for employees, only select employee fields
- Always include the company name, the requested field(s), currency (for financial data), and the relevant data source field(s)
- For COMPARISON queries: use OR conditions to get multiple companies (e.g., WHERE name ILIKE '%TechFlow%' OR name ILIKE '%Nexus%')
- For CHART requests: include both SQL query AND chart request blocks
- Recognize chart keywords: "chart", "pie chart", "bar chart", "line chart", "compare", "comparison", "visualize"

RESPONSE FORMAT:
For any company data question, immediately generate a SQL query using this EXACT format:

[SQL_QUERY]
SELECT * FROM companies WHERE name ILIKE '%CompanyName%';
[/SQL_QUERY]

EXAMPLE CONVERSATIONS:

User: "What is TechFlow Solutions' ARR?"
Your Response:
[SQL_QUERY]
SELECT name, arr, currency, arr_source FROM companies WHERE name ILIKE '%TechFlow%';
[/SQL_QUERY]

User: "How many employees does InnovateAI have?"
Your Response:
[SQL_QUERY]
SELECT name, employees, employees_source FROM companies WHERE name ILIKE '%InnovateAI%';
[/SQL_QUERY]

User: "What is GreenTech's valuation?"
Your Response:
[SQL_QUERY]
SELECT name, valuation, currency, valuation_source FROM companies WHERE name ILIKE '%GreenTech%';
[/SQL_QUERY]

User: "Show me all companies"
Your Response:
[SQL_QUERY]
SELECT * FROM companies ORDER BY arr DESC;
[/SQL_QUERY]

User: "Compare ARR of all companies"
Your Response:
[SQL_QUERY]
SELECT name, arr, currency, arr_source FROM companies ORDER BY arr DESC;
[/SQL_QUERY]

User: "Please compare the arr of techflow solutions and nexus health in pie chart"
Your Response:
[SQL_QUERY]
SELECT name, arr, currency, arr_source FROM companies WHERE name ILIKE '%TechFlow%' OR name ILIKE '%Nexus%';
[/SQL_QUERY]

[CHART_REQUEST]
type: pie
companies: TechFlow Solutions,Nexus Health
metrics: ARR
title: ARR Comparison - TechFlow Solutions vs Nexus Health
[/CHART_REQUEST]

User: "Show me a bar chart comparing valuation of all companies"
Your Response:
[SQL_QUERY]
SELECT name, valuation, currency, valuation_source FROM companies ORDER BY valuation DESC;
[/SQL_QUERY]

[CHART_REQUEST]
type: bar
companies: TechFlow Solutions,InnovateAI,DataCore Systems,GreenTech Innovations,Nexus Health
metrics: Valuation
title: Company Valuations Comparison
[/CHART_REQUEST]

IMPORTANT GUIDELINES:
- Always include the currency (USD/AUD) when mentioning financial figures
- Always include the data source for each piece of information you provide
- All monetary values are stored as full dollar amounts (not cents)
- Format monetary values clearly (e.g., "$180.0M USD" or "$1.2B USD")
- Use proper formatting for currency (e.g., $1.2B USD, $175M USD)
- Always include data sources in your responses

SQL QUERY GUIDELINES:
- Only use SELECT statements
- Use proper PostgreSQL syntax
- Use ILIKE for case-insensitive name matching
- Available companies can be found with: SELECT name FROM companies;

Common SQL patterns:
- Get specific company: SELECT * FROM companies WHERE name ILIKE '%TechFlow%';
- Compare ARR: SELECT name, arr, currency FROM companies ORDER BY arr DESC;
- Get by vertical: SELECT * FROM companies WHERE vertical_group = 'Enterprise';
- Get all companies: SELECT * FROM companies ORDER BY name;

For chart generation, when appropriate, include a [CHART_REQUEST] block:
[CHART_REQUEST]
type: bar|line|pie
companies: Company1,Company2,Company3
metrics: ARR,Revenue,Cash Balance,Valuation,Employees
title: Chart Title
[/CHART_REQUEST]

WORKFLOW:
1. User asks about company data
2. You immediately generate SQL query (no conversational responses)
3. System executes SQL and returns formatted results
4. Include chart request if visualization would be helpful

Remember: ALWAYS generate SQL queries for data requests - never say you'll fetch data without providing the query.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, messages } = body;

    if (!message && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'Message or messages array is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({
        message: "OpenAI API key not configured. Please add your OPENAI_API_KEY to the .env.local file.",
        timestamp: new Date().toISOString(),
        type: 'text'
      });
    }

    try {
      // Prepare messages for OpenAI
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT }
      ];

      if (messages && messages.length > 0) {
        messages.forEach((msg: { role: string; content: string }) => {
          if (msg.role && msg.content) {
            openaiMessages.push({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content
            });
          }
        });
      } else {
        openaiMessages.push({ role: 'user', content: message });
      }

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: openaiMessages,
        max_tokens: 1000,
        temperature: 0.1,
      });

      let response = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
      let queryData: CompanyRecord[] = [];

      // Check if response contains SQL queries
      const sqlResult = parseSQLRequest(response);

      if (sqlResult.hasSQL && sqlResult.sqlQuery) {
        try {
          const queryResult = await executeSQLQuery(sqlResult.sqlQuery);

          if (queryResult.error) {
            response = sqlResult.cleanResponse + `\n\n⚠️ *Database Error: ${queryResult.error}*`;
          } else {
            queryData = queryResult.data;

        // Send the data back to ChatGPT to generate a natural response
            if (queryData.length > 0) {
              const currentMessage = message || messages[messages.length - 1]?.content || '';

        // Check if user requested a chart
              const isChartRequest = currentMessage.toLowerCase().includes('chart') ||
                                   currentMessage.toLowerCase().includes('compare') ||
                                   currentMessage.toLowerCase().includes('comparison') ||
                                   currentMessage.toLowerCase().includes('visualize');

              const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: `You are an AI assistant specialized in providing company metrics and data to investors.

                IMPORTANT GUIDELINES:
                - Always include the currency (USD/AUD) when mentioning financial figures
                - Always include the data source for each piece of information you provide
                - Format monetary values clearly (e.g., "$180.0M USD" or "$1.2B USD")
                - Be conversational and natural in your responses
                - Answer the specific question asked, don't provide unnecessary information
                - Keep responses concise and focused on what was asked` },
                ...openaiMessages,
                { role: 'assistant', content: response },
                { role: 'user', content: `Based on this database query result, please provide a natural, conversational answer to the original question. Here's the data retrieved:

${JSON.stringify(queryData, null, 2)}

Please answer the original question naturally and concisely, including the currency and data source for any financial figures mentioned.` }
              ];

              const followUpCompletion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: followUpMessages,
                max_tokens: 300,
                temperature: 0.1,
              });

              response = followUpCompletion.choices[0]?.message?.content || queryResult.formattedResponse || sqlResult.cleanResponse;

          // If user requested a chart and we have multiple companies, add chart request
              if (isChartRequest && queryData.length > 1) {
                const chartType = currentMessage.toLowerCase().includes('pie') ? 'pie' : 'bar';
                const metric = currentMessage.toLowerCase().includes('arr') ? 'ARR' :
                              currentMessage.toLowerCase().includes('valuation') ? 'Valuation' :
                              currentMessage.toLowerCase().includes('revenue') ? 'Revenue' :
                              currentMessage.toLowerCase().includes('employees') ? 'Employees' : 'ARR';

                response += `\n\n[CHART_REQUEST]
type: ${chartType}
companies: ${queryData.map(c => c.name).join(',')}
metrics: ${metric}
title: ${metric} Comparison - ${queryData.map(c => c.name).join(' vs ')}
[/CHART_REQUEST]`;
              }
            } else {
              response = "I couldn't find any companies matching your criteria.";
            }
          }
        } catch (error) {
          console.error('SQL Execution Error:', error);
          response = sqlResult.cleanResponse + '\n\n⚠️ *Error executing database query*';
        }
      }

      // Check for chart requests
      const chartResult = parseChartRequest(response, queryData);

      if (chartResult.hasChart) {
        const chartData = chartResult.chartData as unknown as { chartData: unknown; chartTitle: string; chartType: string };
        return NextResponse.json({
          message: chartResult.cleanResponse + "\n\n📊 *See the visual comparison below*",
          timestamp: new Date().toISOString(),
          type: 'chart',
          chartData: chartData?.chartData,
          chartTitle: chartData?.chartTitle,
          chartType: chartData?.chartType
        });
      }

      return NextResponse.json({
        message: response,
        timestamp: new Date().toISOString(),
        type: 'text'
      });

        } catch (openaiError: unknown) {
      console.error('OpenAI API error:', openaiError);

      if ((openaiError as unknown as { status: number }).status === 401) {
        return NextResponse.json({
          message: 'Invalid OpenAI API key. Please check your configuration.',
          timestamp: new Date().toISOString(),
          type: 'text'
        });
      }

      return NextResponse.json({
        message: 'ChatGPT temporarily unavailable. Please try again later.',
        timestamp: new Date().toISOString(),
        type: 'text'
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
