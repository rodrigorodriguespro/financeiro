import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RecentTransactionsProps {
    transactions: Array<{
        id: string;
        description: string;
        amount: number;
        type: 'income' | 'expense';
        goalName?: string;
        date: string;
    }>;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(Math.abs(value));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                    ) : (
                        transactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`rounded-full p-2 ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                                            }`}
                                    >
                                        {transaction.type === 'income' ? (
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{transaction.description}</p>
                                        {transaction.goalName && (
                                            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                                {transaction.goalName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                        }`}
                                >
                                    {transaction.type === 'expense' && '-'}
                                    {formatCurrency(transaction.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
