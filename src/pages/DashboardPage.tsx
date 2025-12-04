import React, { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SummaryCards } from '../components/SummaryCards';
import { FinancialHistoryChart } from '../components/FinancialHistoryChart';
import { ExpensesByTagChart } from '../components/ExpensesByTagChart';
import { GoalProgress } from '../components/GoalProgress';
import { RecentTransactions } from '../components/RecentTransactions';
import { GoalsConfigDialog } from '../components/GoalsConfigDialog';
import { useDashboardData } from '../hooks/useDashboardData';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useTotalsVisibility } from '../hooks/useTotalsVisibility';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const history = useHistory();
    const [showGoalsConfig, setShowGoalsConfig] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { showTotals, toggleVisibility } = useTotalsVisibility();
    const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

    // Mês atual por padrão
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

    const [refreshTick, setRefreshTick] = useState(0);

    const { loading, income, expenses, transactions, tags, goals, goalsConfig, historyData } = useDashboardData(
        selectedMonth,
        user?.id,
        refreshTick
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
            const total = (income * percentage) / 100; // income já considera apenas receitas pagas

            const spent = transactions
                .filter((t) => t.type === 'expense' && t.goal_id === goal.id)
                .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

            const remaining = total - spent;

            return {
                id: goal.id,
                name: goal.name,
                percentage,
                spent,
                total,
                remaining,
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

    React.useEffect(() => {
        const now = new Date();
        const list: { value: string; label: string }[] = [];
        for (let i = -6; i <= 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            list.push({ value, label: formattedLabel });
        }
        setMonths(list);
    }, []);

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
            <IonHeader>
                <IonToolbar className="!bg-card !text-card-foreground border-b border-border">
                    <div className="flex items-center justify-between px-4 py-2 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {months.map((month) => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                aria-label="Alternar tema"
                            >
                                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleVisibility}
                                aria-label={showTotals ? 'Ocultar totais' : 'Mostrar totais'}
                            >
                                {showTotals ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonRefresher slot="fixed" onIonRefresh={(event) => { setRefreshTick((prev) => prev + 1); event.detail.complete(); }}>
                    <IonRefresherContent />
                </IonRefresher>
                <div className="space-y-6 bg-background p-4">
                    {/* Cards de Resumo */}
                    <SummaryCards income={income} expenses={expenses} showTotals={showTotals} />

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
                        <RecentTransactions transactions={recentTransactions} showTotals={showTotals} />
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

            <Button
                variant="default"
                size="icon"
                onClick={handleAddTransaction}
                className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                aria-label="Adicionar transação"
            >
                <Plus className="h-6 w-6" />
            </Button>
        </IonPage>
    );
};
