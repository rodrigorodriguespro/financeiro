import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import type { Goal, GoalConfig } from '../types';

interface GoalsConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    goals: Goal[];
    goalsConfig: GoalConfig[];
    onSuccess: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export const GoalsConfigDialog: React.FC<GoalsConfigDialogProps> = ({
    open,
    onOpenChange,
    userId,
    goals,
    goalsConfig,
    onSuccess,
}) => {
    const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Inicializar percentagens com valores existentes ou 0
        const initial: { [key: string]: number } = {};
        goals.forEach((goal) => {
            const config = goalsConfig.find((c) => c.goal_id === goal.id);
            initial[goal.id] = config?.percentage || 0;
        });
        setPercentages(initial);
    }, [goals, goalsConfig, open]);

    const handlePercentageChange = (goalId: string, value: number) => {
        setPercentages((prev) => ({
            ...prev,
            [goalId]: Math.max(0, Math.min(100, Math.round(value))),
        }));
    };

    const totalPercentage = Math.round(Object.values(percentages).reduce((sum, val) => sum + val, 0));
    const isValid = totalPercentage === 100;

    const handleSave = async () => {
        if (!isValid) {
            alert('A soma das porcentagens deve ser exatamente 100%');
            return;
        }

        setLoading(true);

        try {
            // Usar upsert para inserir ou atualizar configurações
            const configs = Object.entries(percentages).map(([goalId, percentage]) => ({
                user_id: userId,
                goal_id: goalId,
                percentage: percentage,
            }));

            const { error } = await supabase
                .from('goals_config')
                .upsert(configs, { onConflict: 'user_id,goal_id' });

            if (error) throw error;

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar configuração de metas:', error);
            alert('Erro ao salvar configuração');
        } finally {
            setLoading(false);
        }
    };

    // Dados para o gráfico de pizza
    const chartData = goals.map((goal, index) => ({
        name: goal.name,
        value: percentages[goal.id] || 0,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogClose onClick={() => onOpenChange(false)} />
                <DialogHeader>
                    <DialogTitle>Configurar Metas Financeiras</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="rounded-md border border-border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">
                            Defina a porcentagem da sua renda que deseja destinar a cada meta. O total deve somar
                            exatamente 100%.
                        </p>
                        <div className="mt-2">
                            <span className={`text-lg font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                Total: {totalPercentage}%
                            </span>
                            {!isValid && (
                                <span className="ml-2 text-sm text-red-600">
                                    (Faltam {100 - totalPercentage}%)
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Sliders */}
                        <div className="space-y-4">
                            {goals.map((goal) => (
                                <div key={goal.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>{goal.name}</Label>
                                        <span className="text-sm font-semibold">
                                            {Math.round(percentages[goal.id] || 0)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={percentages[goal.id] || 0}
                                        onChange={(e) => handlePercentageChange(goal.id, parseFloat(e.target.value))}
                                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary"
                                        style={{
                                            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentages[goal.id] || 0
                                                }%, hsl(var(--secondary)) ${percentages[goal.id] || 0}%, hsl(var(--secondary)) 100%)`,
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handlePercentageChange(goal.id, (percentages[goal.id] || 0) - 1)
                                            }
                                        >
                                            -1%
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handlePercentageChange(goal.id, (percentages[goal.id] || 0) + 1)
                                            }
                                        >
                                            +1%
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Gráfico de Pizza */}
                        <div className="flex flex-col items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={chartData.filter((d) => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${Math.round(value)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 text-center">
                                <div className={`text-3xl font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                    {totalPercentage}%
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {isValid ? 'Configuração válida!' : 'Ajuste para 100%'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!isValid || loading}>
                            {loading ? 'Salvando...' : 'Salvar Configuração'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
