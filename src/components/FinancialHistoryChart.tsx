import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialHistoryChartProps {
    data: Array<{
        month: string;
        income: number;
        expenses: number;
    }>;
}

export const FinancialHistoryChart: React.FC<FinancialHistoryChartProps> = ({ data }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Histórico Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                            formatter={(value: number) =>
                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                            }
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#16a34a" name="Receitas" />
                        <Bar dataKey="expenses" fill="#dc2626" name="Despesas" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
