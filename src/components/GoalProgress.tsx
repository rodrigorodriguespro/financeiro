import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Settings } from 'lucide-react';

interface GoalProgressProps {
    goals: Array<{
        id: string;
        name: string;
        percentage: number;
        spent: number;
        total: number;
        remaining: number;
    }>;
    onConfigClick?: () => void;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ goals, onConfigClick }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Metas Financeiras</CardTitle>
                    {onConfigClick && (
                        <Button variant="ghost" size="icon" onClick={onConfigClick}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {goals.map((goal) => {
                        const progress = goal.total > 0 ? (goal.spent / goal.total) * 100 : 0;
                        const isOverBudget = progress > 100;
                        const remainingLabel = goal.remaining >= 0
                            ? `Falta ${formatCurrency(goal.remaining)}`
                            : `- ${formatCurrency(Math.abs(goal.remaining))}`;

                        return (
                            <div key={goal.id} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{goal.name}</span>
                                    <span className={isOverBudget ? 'text-red-600' : 'text-muted-foreground'}>
                                        {progress.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className={`h-full transition-all ${isOverBudget ? 'bg-red-600' : 'bg-primary'
                                            }`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{formatCurrency(goal.spent)}</span>
                                    <span className={goal.remaining < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                        {remainingLabel}
                                    </span>
                                    <span>de {formatCurrency(goal.total)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
