import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExpensesByTagChartProps {
    data: Array<{
        name: string;
        value: number;
    }>;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export const ExpensesByTagChart: React.FC<ExpensesByTagChartProps> = ({ data }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) =>
                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                            }
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
