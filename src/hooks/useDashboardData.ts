import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction, Account, Tag, Goal, GoalConfig } from '../types';

export const useDashboardData = (selectedMonth: string, userId: string | undefined, refreshTrigger = 0) => {
    const [loading, setLoading] = useState(true);
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [goalsConfig, setGoalsConfig] = useState<GoalConfig[]>([]);
    const [historyData, setHistoryData] = useState<{ month: string; income: number; expenses: number }[]>([]);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);

            try {
                // Parse do mês selecionado
                const [year, month] = selectedMonth.split('-');
                const startDate = `${year}-${month}-01`;
                const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

                // Buscar transações do mês atual (únicas e parcelas)
                const { data: transactionsData, error: transactionsError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .eq('hide_from_reports', false)
                    .neq('recurrence_type', 'recurring') // Excluir recorrentes originais, vamos tratar separadamente
                    .order('date', { ascending: false });

                if (transactionsError) throw transactionsError;

                const normalizedTransactions = (transactionsData || []).map((t) => ({
                    ...t,
                    is_paid: t.is_paid ?? false,
                }));

                // Instâncias materializadas de recorrentes
                const { data: recurringInstances, error: recurringInstancesError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', userId)
                    .not('parent_transaction_id', 'is', null)
                    .gte('date', startDate)
                    .lte('date', endDate);

                if (recurringInstancesError) throw recurringInstancesError;

                // Buscar transações recorrentes ativas criadas antes ou durante o mês selecionado
                const { data: recurringData, error: recurringError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('recurrence_type', 'recurring')
                    .lte('date', endDate) // Criadas antes do fim do mês
                    .eq('hide_from_reports', false);

                if (recurringError) throw recurringError;

                // Processar recorrentes: gerar instância para o mês selecionado
                const recurringInstancesGenerated = (recurringData || []).map(t => {
                    // Parse manual da data para evitar problemas de timezone
                    const [_, __, day] = t.date.split('-').map(Number);

                    // Criar data no mês selecionado
                    const targetDate = new Date(parseInt(year), parseInt(month) - 1, day);

                    // Se o dia original não existe no mês selecionado (ex: 31 em Fev), usar o último dia
                    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
                    if (day > lastDayOfMonth) {
                        targetDate.setDate(lastDayOfMonth);
                    }

                    return {
                        ...t,
                        is_paid: t.is_paid ?? false,
                        id: `${t.id}_${selectedMonth}`, // ID virtual único
                        date: targetDate.toISOString().split('T')[0],
                        original_id: t.id
                    };
                });

                // Combinar transações normais com instâncias recorrentes
                const allTransactions = [...normalizedTransactions, ...(recurringInstances || []), ...recurringInstancesGenerated.filter(Boolean)].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setTransactions(allTransactions);

                // Calcular receitas e despesas do mês usando todas as transações
                const totalIncome = allTransactions
                    .filter((t) => t.type === 'income' && t.is_paid)
                    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

                const totalExpenses = allTransactions
                    .filter((t) => t.type === 'expense')
                    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

                setIncome(totalIncome);
                setExpenses(totalExpenses);

                // Buscar histórico dos últimos 12 meses
                const historyEndDate = new Date();
                const historyStartDate = new Date();
                historyStartDate.setMonth(historyStartDate.getMonth() - 11);
                historyStartDate.setDate(1);

                // Buscar transações normais (não recorrentes) no período
                const { data: historyTransactions, error: historyError } = await supabase
                    .from('transactions')
                    .select('date, amount, type, recurrence_type, is_paid')
                    .eq('user_id', userId)
                    .gte('date', historyStartDate.toISOString().split('T')[0])
                    .lte('date', historyEndDate.toISOString().split('T')[0])
                    .eq('hide_from_reports', false)
                    .neq('recurrence_type', 'recurring');

                if (historyError) throw historyError;

                // Buscar TODAS as transações recorrentes ativas
                const { data: historyRecurring, error: historyRecurringError } = await supabase
                    .from('transactions')
                    .select('date, amount, type, recurrence_type, is_paid')
                    .eq('user_id', userId)
                    .eq('recurrence_type', 'recurring')
                    .lte('date', historyEndDate.toISOString().split('T')[0])
                    .eq('hide_from_reports', false);

                if (historyRecurringError) throw historyRecurringError;

                // Agregar dados por mês
                const historyMap = new Map<string, { income: number; expenses: number }>();
                const monthsList: string[] = [];

                // Inicializar últimos 12 meses com 0
                for (let i = 0; i < 12; i++) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    historyMap.set(key, { income: 0, expenses: 0 });
                    monthsList.push(key);
                }

                // Processar transações normais
                historyTransactions?.forEach((t) => {
                    const key = t.date.substring(0, 7); // YYYY-MM
                    if (historyMap.has(key)) {
                        const current = historyMap.get(key)!;
                        const amount = parseFloat(t.amount.toString());
                        if (t.type === 'income' && t.is_paid) {
                            current.income += amount;
                        } else {
                            current.expenses += amount;
                        }
                    }
                });

                // Processar transações recorrentes para CADA mês do histórico
                historyRecurring?.forEach((t) => {
                    const amount = parseFloat(t.amount.toString());
                    const creationKey = t.date.substring(0, 7);

                    monthsList.forEach(monthKey => {
                        // Se o mês do histórico for posterior ou igual à criação da recorrente
                        if (monthKey >= creationKey) {
                            if (historyMap.has(monthKey)) {
                                const current = historyMap.get(monthKey)!;
                                if (t.type === 'income' && (t.is_paid ?? false)) {
                                    current.income += amount;
                                } else {
                                    current.expenses += amount;
                                }
                            }
                        }
                    });
                });

                // Converter para array e ordenar
                const historyArray = Array.from(historyMap.entries())
                    .map(([key, value]) => {
                        const [y, m] = key.split('-');
                        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
                        return {
                            month: monthLabel,
                            fullDate: key, // para ordenação
                            income: value.income,
                            expenses: value.expenses,
                        };
                    })
                    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

                setHistoryData(historyArray);

                // Buscar contas
                const { data: accountsData } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('user_id', userId);

                setAccounts(accountsData || []);

                // Buscar tags
                const { data: tagsData } = await supabase
                    .from('tags')
                    .select('*')
                    .eq('user_id', userId);

                setTags(tagsData || []);

                // Buscar metas
                const { data: goalsData } = await supabase.from('goals').select('*').order('display_order');

                setGoals(goalsData || []);

                // Buscar configuração de metas
                const { data: goalsConfigData } = await supabase
                    .from('goals_config')
                    .select('*')
                    .eq('user_id', userId);

                setGoalsConfig(goalsConfigData || []);
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedMonth, userId, refreshTrigger]);

    return {
        loading,
        income,
        expenses,
        transactions,
        accounts,
        tags,
        goals,
        goalsConfig,
        historyData,
    };
};
