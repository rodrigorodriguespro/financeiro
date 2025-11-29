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
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

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

            // Buscar transações normais (não recorrentes)
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .neq('recurrence_type', 'recurring') // Excluir recorrentes originais
                .order('date', { ascending: false });

            if (filters.tagId) query = query.eq('tag_id', filters.tagId);
            if (filters.accountId) query = query.eq('account_id', filters.accountId);
            if (filters.goalId) query = query.eq('goal_id', filters.goalId);
            if (filters.description) query = query.ilike('description', `%${filters.description}%`);

            const { data: transactionsData, error: transactionsError } = await query;
            if (transactionsError) throw transactionsError;

            // Buscar transações recorrentes ativas criadas antes ou durante o período
            let recurringQuery = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('recurrence_type', 'recurring')
                .lte('date', endDate); // Criadas antes do fim do período

            if (filters.tagId) recurringQuery = recurringQuery.eq('tag_id', filters.tagId);
            if (filters.accountId) recurringQuery = recurringQuery.eq('account_id', filters.accountId);
            if (filters.goalId) recurringQuery = recurringQuery.eq('goal_id', filters.goalId);
            if (filters.description) recurringQuery = recurringQuery.ilike('description', `%${filters.description}%`);

            const { data: recurringData, error: recurringError } = await recurringQuery;
            if (recurringError) throw recurringError;

            // Gerar instâncias virtuais de recorrentes
            const recurringInstances: Transaction[] = [];
            const start = new Date(startDate);
            const end = new Date(endDate);

            recurringData?.forEach((t) => {
                const [tYear, tMonth, tDay] = t.date.split('-').map(Number);

                // Iterar por cada mês dentro do intervalo selecionado
                let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

                while (currentMonth <= endMonth) {
                    // Calcular a data alvo para este mês
                    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), tDay);

                    // Ajustar se o dia não existe no mês (ex: 31 em Fev)
                    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                    if (tDay > lastDayOfMonth) {
                        targetDate.setDate(lastDayOfMonth);
                    }

                    // Verificar se a data calculada está dentro do intervalo selecionado E é posterior à criação
                    const creationDate = new Date(tYear, tMonth - 1, tDay);

                    // Ajuste de fuso horário para comparação segura
                    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

                    if (targetDateStr >= startDate && targetDateStr <= endDate && targetDate >= creationDate) {
                        recurringInstances.push({
                            ...t,
                            id: `${t.id}_${format(targetDate, 'yyyy-MM')}`, // ID virtual único
                            date: targetDateStr,
                            original_id: t.id
                        });
                    }

                    // Avançar para o próximo mês
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }
            });

            // Combinar e ordenar
            const allTransactions = [...(transactionsData || []), ...recurringInstances].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setTransactions(allTransactions);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        // Se for uma instância virtual, avisar que não pode deletar diretamente (ou implementar lógica para deletar a original)
        if (id.includes('_')) {
            alert('Esta é uma transação recorrente virtual. Para excluí-la, edite a transação original.');
            return;
        }

        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
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

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <div className="flex items-center justify-between px-4 py-2">
                        <h1 className="text-xl font-bold">Transações</h1>
                        <Button variant="outline" size="sm" onClick={() => history.push('/dashboard')}>
                            Voltar
                        </Button>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <div className="space-y-4 bg-background p-4">
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
                                                                        if (isVirtual) {
                                                                            alert('Edite a transação original para alterar recorrências.');
                                                                        } else {
                                                                            setEditingTransaction(transaction);
                                                                            setShowTransactionForm(true);
                                                                        }
                                                                    }}
                                                                    disabled={isVirtual}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleDelete(transaction.id)}
                                                                    disabled={isVirtual}
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
