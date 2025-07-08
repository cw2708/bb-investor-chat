'use client';

import { ChartData } from '@/lib/supabase';
import ReactECharts from 'echarts-for-react';

interface ComparisonChartProps {
  data: ChartData;
  title: string;
  chartType?: 'bar' | 'line' | 'pie';
}

export function ComparisonChart({ data, title, chartType = 'bar' }: ComparisonChartProps) {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
  ];

  const formatValue = (value: number, currency?: string): string => {
    if (currency) {
      if (value >= 1000000000) {
        return `${currency === 'USD' ? '$' : currency === 'AUD' ? 'A$' : ''}${(value / 1000000000).toFixed(1)}B ${currency}`;
      } else if (value >= 1000000) {
        return `${currency === 'USD' ? '$' : currency === 'AUD' ? 'A$' : ''}${(value / 1000000).toFixed(1)}M ${currency}`;
      } else if (value >= 1000) {
        return `${currency === 'USD' ? '$' : currency === 'AUD' ? 'A$' : ''}${(value / 1000).toFixed(1)}K ${currency}`;
      } else {
        return `${currency === 'USD' ? '$' : currency === 'AUD' ? 'A$' : ''}${value.toLocaleString()} ${currency}`;
      }
    } else {
      return value.toLocaleString();
    }
  };

  // Create base option structure that works for all chart types
  const baseOption = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    backgroundColor: 'transparent',
    legend: {
      data: data.metrics.map(metric => metric.name),
      textStyle: {
        color: '#ffffff'
      },
      top: '8%'
    }
  };

  // Configure based on chart type
  if (chartType === 'pie') {
    // For pie charts, we'll use the first metric only (since pie charts show one dataset)
    const firstMetric = data.metrics[0];
    return (
      <div className="w-1/2 bg-gray-800 rounded-lg p-3 mb-4">
        <ReactECharts
          option={{
            ...baseOption,
            tooltip: {
              trigger: 'item',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderColor: '#374151',
              textStyle: {
                color: '#ffffff'
              },
              formatter: function (params: any) {
                const currency = firstMetric?.currency || '';
                const value = params.value;
                const formattedValue = formatValue(value, currency);
                return `${params.name}<br/>${params.marker}${params.seriesName}: ${formattedValue} (${params.percent}%)`;
              }
            },
            series: [{
              name: firstMetric?.name || 'Value',
              type: 'pie',
              radius: '70%',
              data: data.companies.map((company, index) => ({
                name: company,
                value: firstMetric?.data[index] || 0
              })),
              itemStyle: {
                borderRadius: 10,
                borderColor: '#374151',
                borderWidth: 2
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowOffsetY: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                show: true,
                position: 'outside',
                formatter: '{b}: {d}%',
                color: '#ffffff'
              }
            }]
          }}
          style={{ height: '300px', width: '100%' }}
          theme="dark"
        />
      </div>
    );
  } else {
    // For bar and line charts
    const option = {
      ...baseOption,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: chartType === 'line' ? 'cross' : 'shadow'
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#374151',
        textStyle: {
          color: '#ffffff'
        },
        formatter: function (params: any) {
          let result = params[0].name + '<br/>';
          params.forEach((param: any) => {
            const currency = data.metrics[param.seriesIndex]?.currency || '';
            const value = param.value;
            const formattedValue = formatValue(value, currency);
            result += `<span style="color:${param.color}">${param.marker}</span>${param.seriesName}: ${formattedValue}<br/>`;
          });
          return result;
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '8%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.companies,
        axisLabel: {
          color: '#ffffff',
          rotate: 45,
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#ffffff',
          fontSize: 10,
          formatter: function (value: number) {
            if (value >= 1000000000) {
              return `${(value / 1000000000).toFixed(1)}B`;
            } else if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            } else {
              return value.toString();
            }
          }
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      series: data.metrics.map((metric, index) => ({
        name: metric.name,
        type: chartType,
        data: metric.data,
        itemStyle: {
          color: colors[index % colors.length]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        ...(chartType === 'line' && {
          smooth: true,
          lineStyle: {
            width: 3
          }
        })
      }))
    };

    return (
      <div className="w-1/2 bg-gray-800 rounded-lg p-3 mb-4">
        <ReactECharts
          option={option}
          style={{ height: '300px', width: '100%' }}
          theme="dark"
        />
             </div>
     );
   }
}
