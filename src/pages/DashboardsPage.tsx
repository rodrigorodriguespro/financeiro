import React, { useMemo, useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { FinancialHistoryChart } from '../components/FinancialHistoryChart';
import { ExpensesByTagChart } from '../components/ExpensesByTagChart';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTotalsVisibility } from '../hooks/useTotalsVisibility';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

export const DashboardsPage: React.FC = () => {
    const { user } = useAuth();
    const history = useHistory();
    const { isDark, toggleTheme } = useTheme();
    const { showTotals, toggleVisibility } = useTotalsVisibility();
    const [tab, setTab] = useState<'geral' | 'metas' | 'compromissos'>('geral');

    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [selectedMonth] = useState(getCurrentMonth());

    const { loading, income, expenses, transactions, tags, goals, goalsConfig, historyData } = useDashboardData(
        selectedMonth,
        user?.id,
        0
    );

    const monthsList = useMemo(() => {
        const arr: string[] = [];
        const d = new Date();
        d.setDate(1);
        for (let i = 11; i >= 0; i--) {
            const clone = new Date(d.getFullYear(), d.getMonth() - i, 1);
            const key = `${clone.getFullYear()}-${String(clone.getMonth() + 1).padStart(2, '0')}`;
            arr.push(key);
        }
        return arr;
    }, []);

    const expensesByTag = useMemo(() => {
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

    const heatmapData = useMemo(() => {
        const today = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 364);
        const map = new Map<string, number>();
        transactions
            .filter((t) => t.type === 'expense')
            .forEach((t) => {
                map.set(t.date, (map.get(t.date) || 0) + 1);
            });

        const weeks: { date: string; count: number }[][] = [[]];
        let cursor = new Date(start);
        while (cursor <= today) {
            const key = cursor.toISOString().split('T')[0];
            const currentWeek = weeks[weeks.length - 1];
            if (currentWeek.length === 7) {
                weeks.push([]);
            }
            weeks[weeks.length - 1].push({ date: key, count: map.get(key) || 0 });
            cursor.setDate(cursor.getDate() + 1);
        }
        const maxCount = weeks.flat().reduce((m, d) => Math.max(m, d.count), 1) || 1;
        return { weeks, maxCount };
    }, [transactions]);

    const annualPaidIncome = useMemo(() => {
        const map = new Map<string, number>();
        monthsList.forEach((m) => map.set(m, 0));
        transactions
            .filter((t) => t.type === 'income' && t.is_paid)
            .forEach((t) => {
                const key = t.date.substring(0, 7);
                if (map.has(key)) {
                    map.set(key, (map.get(key) || 0) + parseFloat(t.amount.toString()));
                }
            });
        return monthsList.map((m) => ({ month: m, value: map.get(m) || 0 }));
    }, [transactions, monthsList]);

    const goalsSeries = useMemo(() => {
        return goals.map((goal) => {
            const config = goalsConfig.find((c) => c.goal_id === goal.id);
            const percentage = config?.percentage || 0;
            const monthlyLimit = (income * percentage) / 100;
            const map = new Map<string, { spent: number }>();
            monthsList.forEach((m) => map.set(m, { spent: 0 }));
            transactions
                .filter((t) => t.type === 'expense' && t.goal_id === goal.id)
                .forEach((t) => {
                    const key = t.date.substring(0, 7);
                    if (map.has(key)) {
                        const current = map.get(key)!;
                        current.spent += parseFloat(t.amount.toString());
                        map.set(key, current);
                    }
                });
            const data = monthsList.map((m) => ({
                month: m,
                spent: map.get(m)?.spent || 0,
                limit: monthlyLimit,
            }));
            return { id: goal.id, name: goal.name, data };
        });
    }, [goals, goalsConfig, transactions, income, monthsList]);

    const commitmentsData = useMemo(() => {
        const recurring = new Map<string, number>();
        const installments = new Map<string, number>();
        monthsList.forEach((m) => {
            recurring.set(m, 0);
            installments.set(m, 0);
        });
        transactions.forEach((t) => {
            const key = t.date.substring(0, 7);
            if (!monthsList.includes(key)) return;
            if (t.recurrence_type === 'recurring') {
                recurring.set(key, (recurring.get(key) || 0) + parseFloat(t.amount.toString()));
            } else if (t.installment_total && t.installment_total > 1) {
                installments.set(key, (installments.get(key) || 0) + parseFloat(t.amount.toString()));
            }
        });
        return monthsList.map((m) => ({
            month: m,
            recurring: recurring.get(m) || 0,
            installments: installments.get(m) || 0,
        }));
    }, [transactions, monthsList]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
                            <Button variant="outline" size="sm" onClick={() => history.push('/home')}>
                                Voltar
                            </Button>
                            <h1 className="text-lg font-semibold">Dashboards</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
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
                <div className="space-y-4 bg-background p-4">
                    <div className="flex gap-2">
                        <Button variant={tab === 'geral' ? 'default' : 'outline'} size="sm" onClick={() => setTab('geral')}>
                            Geral
                        </Button>
                        <Button variant={tab === 'metas' ? 'default' : 'outline'} size="sm" onClick={() => setTab('metas')}>
                            Metas
                        </Button>
                        <Button variant={tab === 'compromissos' ? 'default' : 'outline'} size="sm" onClick={() => setTab('compromissos')}>
                            Compromissos
                        </Button>
                    </div>

                    {tab === 'geral' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FinancialHistoryChart data={historyData} />
                                <ExpensesByTagChart data={expensesByTag} />
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Receitas pagas - último ano</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={annualPaidIncome}>
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                            <Bar dataKey="value" fill="#22c55e" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {tab === 'metas' && (
                        <div className="space-y-4">
                            {goalsSeries.map((goal) => (
                                <Card key={goal.id}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{goal.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <BarChart data={goal.data}>
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                                <Bar dataKey="spent" fill="#f97316" />
                                                <Line dataKey="limit" stroke="#2563eb" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {tab === 'compromissos' && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Recorrentes - último ano</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <LineChart data={commitmentsData}>
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                            <Line dataKey="recurring" stroke="#2563eb" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Parceladas - último ano</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <LineChart data={commitmentsData}>
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                            <Line dataKey="installments" stroke="#f97316" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    )}
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
