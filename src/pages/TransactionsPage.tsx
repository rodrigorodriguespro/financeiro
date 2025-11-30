import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonContent } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Transaction, Account, Tag, Goal } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { TransactionFormDialog } from '../components/TransactionFormDialog';
import { ManageAccountsDialog } from '../components/ManageAccountsDialog';
import { ManageTagsDialog } from '../components/ManageTagsDialog';
import { Edit2, Trash2, Filter, X, Settings } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';
import { type DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Checkbox } from '../components/ui/Checkbox';

export const TransactionsPage: React.FC = () => {
    const { user } = useAuth();
    const history = useHistory();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados dos diálogos
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showManageAccounts, setShowManageAccounts] = useState(false);
    const [showManageTags, setShowManageTags] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Estados dos filtros
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const [filters, setFilters] = useState({
        tagId: '',
        accountId: '',
        goalId: '',
        description: '',
        paidStatus: 'all' as 'all' | 'paid' | 'unpaid',
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (user && dateRange?.from && dateRange?.to) {
            fetchData();
        }
    }, [user, dateRange, filters]);

    const fetchData = async () => {
        if (!user || !dateRange?.from || !dateRange?.to) return;
        setLoading(true);

        try {
            // Buscar contas
            const { data: accountsData } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id);
            setAccounts(accountsData || []);

            // Buscar tags
            const { data: tagsData } = await supabase
                .from('tags')
                .select('*')
                .eq('user_id', user.id);
            setTags(tagsData || []);

            // Buscar metas
            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .order('display_order');
            setGoals(goalsData || []);

            // Definir intervalo de datas
            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');

            // Buscar transações normais (não recorrentes) e parcelas
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .neq('recurrence_type', 'recurring') // Excluir templates recorrentes
                .is('parent_transaction_id', null)
                .order('date', { ascending: false });

            if (filters.tagId) query = query.eq('tag_id', filters.tagId);
            if (filters.accountId) query = query.eq('account_id', filters.accountId);
            if (filters.goalId) query = query.eq('goal_id', filters.goalId);
            if (filters.description) query = query.ilike('description', `%${filters.description}%`);
            if (filters.paidStatus === 'paid') query = query.eq('is_paid', true);
            if (filters.paidStatus === 'unpaid') query = query.eq('is_paid', false);

            const { data: transactionsData, error: transactionsError } = await query;
            if (transactionsError) throw transactionsError;

            // Buscar instâncias recorrentes materializadas
            let recurringInstancesQuery = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .not('parent_transaction_id', 'is', null);

            if (filters.tagId) recurringInstancesQuery = recurringInstancesQuery.eq('tag_id', filters.tagId);
            if (filters.accountId) recurringInstancesQuery = recurringInstancesQuery.eq('account_id', filters.accountId);
            if (filters.goalId) recurringInstancesQuery = recurringInstancesQuery.eq('goal_id', filters.goalId);
            if (filters.description) recurringInstancesQuery = recurringInstancesQuery.ilike('description', `%${filters.description}%`);
            if (filters.paidStatus === 'paid') recurringInstancesQuery = recurringInstancesQuery.eq('is_paid', true);
            if (filters.paidStatus === 'unpaid') recurringInstancesQuery = recurringInstancesQuery.eq('is_paid', false);

            const { data: recurringInstancesData, error: recurringInstancesError } = await recurringInstancesQuery;
            if (recurringInstancesError) throw recurringInstancesError;

            // Combinar e ordenar
            const allTransactions = [...(transactionsData || []), ...(recurringInstancesData || [])]
                .map((t) => ({ ...t, is_paid: t.is_paid ?? false }))
                .sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

            setTransactions(allTransactions);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (transaction: Transaction) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        const isRecurringInstance = Boolean(transaction.parent_transaction_id);

        if (isRecurringInstance) {
            const choice = window.prompt(
                'Excluir recorrente:\n1 - Apenas esta ocorrência\n2 - Toda a série (anteriores e futuras)\n3 - Esta e as futuras',
                '1'
            );

            const parentId = transaction.parent_transaction_id!;

            if (choice === '1') {
                await supabase.from('transactions').delete().eq('id', transaction.id);
            } else if (choice === '2') {
                await supabase.from('transactions').delete().or(`id.eq.${parentId},parent_transaction_id.eq.${parentId}`);
            } else if (choice === '3') {
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('parent_transaction_id', parentId)
                    .gte('date', transaction.date);
            } else {
                return;
            }
            fetchData();
            return;
        }

        // Transação normal ou template
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            alert('Erro ao excluir transação');
        }
    };

    const clearFilters = () => {
        setFilters({
            tagId: '',
            accountId: '',
            goalId: '',
            description: '',
            paidStatus: 'all',
        });
        setDateRange({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (date: string) => {
        // Ajuste para exibir a data corretamente sem conversão de fuso horário indesejada
        const [year, month, day] = date.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('pt-BR');
    };

    // ...

    const handleTogglePaid = async (transaction: Transaction) => {
        const nextStatus = !transaction.is_paid;
        const isRecurringInstance = Boolean(transaction.parent_transaction_id);

        try {
            if (isRecurringInstance) {
                await supabase
                    .from('transactions')
                    .update({ is_paid: nextStatus })
                    .eq('id', transaction.id);
            } else {
                await supabase
                    .from('transactions')
                    .update({ is_paid: nextStatus })
                    .eq('id', transaction.id);
            }

            setTransactions((prev) =>
                prev.map((t) =>
                    t.id === transaction.id ? { ...t, is_paid: nextStatus } : t
                )
            );
        } catch (error) {
            console.error('Erro ao marcar como pago:', error);
            alert('Não foi possível atualizar o status de pagamento.');
        }
    };

    const totals = transactions.reduce(
        (acc, t) => {
            const amount = Math.abs(parseFloat(t.amount.toString()));
            if (t.type === 'expense') {
                acc.expenses += amount;
                if (t.is_paid) acc.paidExpenses += amount;
            } else {
                acc.income += amount;
                if (t.is_paid) acc.paidIncome += amount;
            }
            if (t.is_paid) acc.paid += amount;
            else acc.unpaid += amount;
            return acc;
        },
        { expenses: 0, income: 0, paid: 0, unpaid: 0, paidIncome: 0, paidExpenses: 0 }
    );

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="!bg-card !text-card-foreground border-b border-border">
                    <div className="flex items-center justify-between px-4 py-2">
                        <h1 className="text-xl font-bold">Transações</h1>
                        <Button variant="outline" size="sm" onClick={() => history.push('/dashboard')}>
                            Voltar
                        </Button>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding !bg-background">
                <div className="space-y-4 bg-background p-4 rounded-xl border border-border shadow-sm">
                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setShowTransactionForm(true)}>
                            Nova Transação
                        </Button>
                        <Button variant="outline" onClick={() => setShowManageAccounts(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Contas
                        </Button>
                        <Button variant="outline" onClick={() => setShowManageTags(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Tags
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
                        </Button>
                    </div>

                    {/* Filtros */}
                    {showFilters && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Filtros</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <div className="col-span-1 md:col-span-2">
                                        <Label>Período</Label>
                                        <DatePickerWithRange
                                            date={dateRange}
                                            setDate={setDateRange}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label>Descrição</Label>
                                        <Input
                                            placeholder="Buscar..."
                                            value={filters.description}
                                            onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Conta</Label>
                                        <Select
                                            value={filters.accountId}
                                            onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                                        >
                                            <option value="">Todas</option>
                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Tag</Label>
                                        <Select
                                            value={filters.tagId}
                                            onChange={(e) => setFilters({ ...filters, tagId: e.target.value })}
                                        >
                                            <option value="">Todas</option>
                                            {tags.map((tag) => (
                                                <option key={tag.id} value={tag.id}>
                                                    {tag.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Meta</Label>
                                        <Select
                                            value={filters.goalId}
                                            onChange={(e) => setFilters({ ...filters, goalId: e.target.value })}
                                        >
                                            <option value="">Todas</option>
                                            {goals.map((goal) => (
                                                <option key={goal.id} value={goal.id}>
                                                    {goal.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Status de pagamento</Label>
                                        <Select
                                            value={filters.paidStatus}
                                            onChange={(e) => setFilters({ ...filters, paidStatus: e.target.value as any })}
                                        >
                                            <option value="all">Todos</option>
                                            <option value="paid">Pago</option>
                                            <option value="unpaid">Não pago</option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button variant="outline" size="sm" onClick={clearFilters}>
                                        <X className="mr-2 h-4 w-4" />
                                        Limpar Filtros
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabela de transações */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Totais</CardTitle>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-lg border border-border bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Despesas</p>
                                    <p className="text-lg font-semibold text-red-600">
                                        {formatCurrency(totals.expenses)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Receitas</p>
                                    <p className="text-lg font-semibold text-green-600">
                                        {formatCurrency(totals.income)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Recebidas: {formatCurrency(totals.paidIncome)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Pagos</p>
                                    <p className="text-lg font-semibold text-blue-600">
                                        {formatCurrency(totals.paid)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Não pagos</p>
                                    <p className="text-lg font-semibold text-orange-600">
                                        {formatCurrency(totals.unpaid)}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-6 text-center text-muted-foreground">Carregando...</div>
                            ) : transactions.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground">
                                    Nenhuma transação encontrada
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="border-b border-border bg-muted/50">
                                            <tr>
                                                <th className="p-3 text-left text-sm font-medium">Data</th>
                                                <th className="p-3 text-left text-sm font-medium">Descrição</th>
                                                <th className="p-3 text-left text-sm font-medium">Conta</th>
                                                <th className="p-3 text-left text-sm font-medium">Tag</th>
                                                <th className="p-3 text-left text-sm font-medium">Meta</th>
                                                <th className="p-3 text-center text-sm font-medium">Pago</th>
                                                <th className="p-3 text-right text-sm font-medium">Valor</th>
                                                <th className="p-3 text-center text-sm font-medium">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction) => {
                                                const account = accounts.find((a) => a.id === transaction.account_id);
                                                const tag = tags.find((t) => t.id === transaction.tag_id);
                                                const goal = goals.find((g) => g.id === transaction.goal_id);
                                                const isExpense = transaction.type === 'expense';
                                                const isVirtual = transaction.id.includes('_');

                                                return (
                                                    <tr
                                                        key={transaction.id}
                                                        className="border-b border-border last:border-0 hover:bg-muted/50"
                                                    >
                                                        <td className="p-3 text-sm">{formatDate(transaction.date)}</td>
                                                        <td className="p-3 text-sm">
                                                            {transaction.description}
                                                            {transaction.hide_from_reports && (
                                                                <span className="ml-2 text-xs text-muted-foreground">(Oculto)</span>
                                                            )}
                                                            {isVirtual && (
                                                                <span className="ml-2 text-xs text-blue-500">(Recorrente)</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-sm">{account?.name || '-'}</td>
                                                        <td className="p-3 text-sm">{tag?.name || '-'}</td>
                                                        <td className="p-3 text-sm">{goal?.name || '-'}</td>
                                                        <td className="p-3 text-center">
                                                            <Checkbox
                                                                checked={transaction.is_paid}
                                                                onChange={() => handleTogglePaid(transaction)}
                                                                aria-label="Marcar como pago"
                                                            />
                                                        </td>
                                                        <td
                                                            className={`p-3 text-right text-sm font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'
                                                                }`}
                                                        >
                                                            {isExpense && '-'}
                                                            {formatCurrency(parseFloat(transaction.amount.toString()))}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex justify-center gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        const baseId = transaction.original_id || transaction.id.split('_')[0] || transaction.id;
                                                                        setEditingTransaction({ ...transaction, id: baseId });
                                                                        setShowTransactionForm(true);
                                                                    }}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleDelete(transaction)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </IonContent>

            {/* Diálogos */}
            {user && (
                <>
                    <TransactionFormDialog
                        open={showTransactionForm}
                        onOpenChange={(open) => {
                            setShowTransactionForm(open);
                            if (!open) setEditingTransaction(null);
                        }}
                        userId={user.id}
                        accounts={accounts}
                        tags={tags}
                        goals={goals}
                        transaction={editingTransaction}
                        onSuccess={fetchData}
                    />

                    <ManageAccountsDialog
                        open={showManageAccounts}
                        onOpenChange={setShowManageAccounts}
                        userId={user.id}
                        accounts={accounts}
                        onAccountsChange={fetchData}
                    />

                    <ManageTagsDialog
                        open={showManageTags}
                        onOpenChange={setShowManageTags}
                        userId={user.id}
                        tags={tags}
                        onTagsChange={fetchData}
                    />
                </>
            )}
        </IonPage>
    );
};
