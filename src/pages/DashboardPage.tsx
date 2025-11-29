import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TopBar } from '../components/TopBar';
import { SummaryCards } from '../components/SummaryCards';
import { FinancialHistoryChart } from '../components/FinancialHistoryChart';
import { ExpensesByTagChart } from '../components/ExpensesByTagChart';
import { GoalProgress } from '../components/GoalProgress';
import { RecentTransactions } from '../components/RecentTransactions';
import { GoalsConfigDialog } from '../components/GoalsConfigDialog';
import { useDashboardData } from '../hooks/useDashboardData';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const history = useHistory();
    const [showGoalsConfig, setShowGoalsConfig] = useState(false);

    // Mês atual por padrão
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

    const { loading, income, expenses, transactions, tags, goals, goalsConfig, historyData } = useDashboardData(
        selectedMonth,
        user?.id
    );

    // Preparar dados para gráfico de despesas por tag
    const expensesByTag = React.useMemo(() => {
        const tagMap = new Map<string, number>();

        transactions
            .filter((t) => t.type === 'expense' && t.tag_id)
            .forEach((t) => {
                const tag = tags.find((tag) => tag.id === t.tag_id);
                const tagName = tag?.name || 'Sem categoria';
                tagMap.set(tagName, (tagMap.get(tagName) || 0) + parseFloat(t.amount.toString()));
            });

        return Array.from(tagMap.entries()).map(([name, value]) => ({ name, value }));
    }, [transactions, tags]);

    // Preparar dados de metas
    const goalsProgress = React.useMemo(() => {
        return goals.map((goal) => {
            const config = goalsConfig.find((c) => c.goal_id === goal.id);
            const percentage = config?.percentage || 0;
            const total = (income * percentage) / 100;

            const spent = transactions
                .filter((t) => t.type === 'expense' && t.goal_id === goal.id)
                .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

            return {
                id: goal.id,
                name: goal.name,
                percentage,
                spent,
                total,
            };
        });
    }, [goals, goalsConfig, transactions, income]);

    // Transações recentes (últimas 5)
    const recentTransactions = React.useMemo(() => {
        return transactions.slice(0, 5).map((t) => {
            const goal = goals.find((g) => g.id === t.goal_id);
            return {
                id: t.id,
                description: t.description,
                amount: parseFloat(t.amount.toString()),
                type: t.type,
                goalName: goal?.name,
                date: t.date,
            };
        });
    }, [transactions, goals]);

    const handleAddTransaction = () => {
        history.push('/transactions');
    };

    if (loading) {
        return (
            <IonPage>
                <IonContent className="ion-padding">
                    <div className="flex h-screen items-center justify-center">
                        <p className="text-muted-foreground">Carregando...</p>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <TopBar
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onAddTransaction={handleAddTransaction}
            />
            <IonContent className="ion-padding">
                <div className="space-y-6 bg-background p-4">
                    {/* Cards de Resumo */}
                    <SummaryCards income={income} expenses={expenses} />

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FinancialHistoryChart data={historyData} />
                        <ExpensesByTagChart data={expensesByTag} />
                    </div>

                    {/* Metas e Transações */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <GoalProgress
                            goals={goalsProgress}
                            onConfigClick={() => setShowGoalsConfig(true)}
                        />
                        <RecentTransactions transactions={recentTransactions} />
                    </div>
                </div>
            </IonContent>

            {/* Diálogo de Configuração de Metas */}
            {user && (
                <GoalsConfigDialog
                    open={showGoalsConfig}
                    onOpenChange={setShowGoalsConfig}
                    userId={user.id}
                    goals={goals}
                    goalsConfig={goalsConfig}
                    onSuccess={() => {
                        // Recarregar dados após salvar
                        window.location.reload();
                    }}
                />
            )}
        </IonPage>
    );
};
