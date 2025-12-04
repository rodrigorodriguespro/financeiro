import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SummaryCards } from '../components/SummaryCards';
import { GoalProgress } from '../components/GoalProgress';
import { RecentTransactions } from '../components/RecentTransactions';
import { useDashboardData } from '../hooks/useDashboardData';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Moon, Sun, BarChart2, LogOut, Plus } from 'lucide-react';
import { useTotalsVisibility } from '../hooks/useTotalsVisibility';

export const HomePage: React.FC = () => {
    const { user } = useAuth();
    const history = useHistory();
    const { isDark, toggleTheme } = useTheme();
    const { showTotals, toggleVisibility } = useTotalsVisibility();

    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [selectedMonth] = React.useState(getCurrentMonth());

    const { loading, income, expenses, transactions, tags, goals, goalsConfig } = useDashboardData(
        selectedMonth,
        user?.id,
        0
    );

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
                            <h1 className="text-lg font-semibold">Home</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => history.push('/dashboards')}
                                aria-label="Dashboards"
                            >
                                <BarChart2 className="h-5 w-5" />
                            </Button>
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
                <div className="space-y-6 bg-background p-4">
                    <SummaryCards income={income} expenses={expenses} showTotals={showTotals} />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <GoalProgress
                            goals={goals.map((goal) => {
                                const config = goalsConfig.find((c) => c.goal_id === goal.id);
                                const percentage = config?.percentage || 0;
                                const total = (income * percentage) / 100;
                                const spent = transactions
                                    .filter((t) => t.type === 'expense' && t.goal_id === goal.id)
                                    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
                                const remaining = total - spent;
                                return { id: goal.id, name: goal.name, percentage, spent, total, remaining };
                            })}
                        />
                        <RecentTransactions transactions={recentTransactions} showTotals={showTotals} />
                    </div>
                    <div className="flex justify-center">
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => history.push('/login')}
                            className="text-xs"
                        >
                            <LogOut className="mr-1 h-4 w-4" /> Sair
                        </Button>
                    </div>
                </div>
                <Button
                    variant="default"
                    size="icon"
                    onClick={() => history.push('/transactions')}
                    className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                    aria-label="Ir para transações"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </IonContent>
        </IonPage>
    );
};
