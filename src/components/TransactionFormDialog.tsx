import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { supabase } from '../lib/supabase';
import type { Account, Tag, Goal, Transaction } from '../types';

interface TransactionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    accounts: Account[];
    tags: Tag[];
    goals: Goal[];
    transaction?: Transaction | null;
    onSuccess: () => void;
    onDelete?: (transaction: Transaction) => void;
}

export const TransactionFormDialog: React.FC<TransactionFormDialogProps> = ({
    open,
    onOpenChange,
    userId,
    accounts,
    tags,
    goals,
    transaction,
    onSuccess,
    onDelete,
}) => {
    const [formData, setFormData] = useState({
        description: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        type: 'expense' as 'income' | 'expense',
        account_id: '',
        tag_id: '',
        goal_id: '',
        hide_from_reports: false,
        is_paid: false,
        recurrence_type: 'single' as 'single' | 'recurring' | 'installment',
        installment_total: '',
    });
    const [loading, setLoading] = useState(false);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleAmountChange = (rawValue: string) => {
        const digitsOnly = rawValue.replace(/\D/g, '');

        if (!digitsOnly) {
            setFormData((prev) => ({ ...prev, amount: '' }));
            return;
        }

        const numericValue = parseFloat(digitsOnly) / 100;
        const formatted = formatCurrency(numericValue);

        setFormData((prev) => ({ ...prev, amount: formatted }));
    };

    const parseAmountToNumber = (value: string) => {
        const normalized = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(normalized);
    };

    useEffect(() => {
        if (transaction) {
            setFormData({
                description: transaction.description,
                date: transaction.date,
                amount: formatCurrency(Math.abs(parseFloat(transaction.amount.toString()))),
                type: transaction.type,
                account_id: transaction.account_id,
                tag_id: transaction.type === 'income' ? '' : (transaction.tag_id || ''),
                goal_id: transaction.type === 'income' ? '' : (transaction.goal_id || ''),
                hide_from_reports: transaction.hide_from_reports,
                is_paid: transaction.is_paid ?? false,
                recurrence_type: transaction.recurrence_type,
                installment_total: transaction.installment_total?.toString() || '',
            });
        } else {
            // Reset form
            setFormData({
                description: '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                type: 'expense',
                account_id: accounts[0]?.id || '',
                tag_id: '',
                goal_id: '',
                hide_from_reports: false,
                is_paid: false,
                recurrence_type: 'single',
                installment_total: '',
            });
        }
    }, [transaction, accounts, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount || !formData.account_id) return;

        setLoading(true);

        try {
            const amount = parseAmountToNumber(formData.amount);

            if (Number.isNaN(amount)) {
                throw new Error('Valor inválido.');
            }

            const transactionData = {
                user_id: userId,
                description: formData.description,
                date: formData.date,
                amount: amount,
                type: formData.type,
                account_id: formData.account_id,
                tag_id: formData.tag_id || null,
                goal_id: formData.goal_id || null,
                hide_from_reports: formData.hide_from_reports,
                is_paid: formData.is_paid,
                recurrence_type: formData.recurrence_type,
                installment_total: formData.recurrence_type === 'installment'
                    ? parseInt(formData.installment_total)
                    : null,
                installment_current: formData.recurrence_type === 'installment' ? 1 : null,
            };

            if (transaction) {
                // Atualizar
                const { error } = await supabase
                    .from('transactions')
                    .update(transactionData)
                    .eq('id', transaction.id);

                if (error) throw error;
            } else {
                // Criar
                if (formData.recurrence_type === 'installment' && formData.installment_total) {
                    // Criar parcelas vinculadas a um mesmo ID (sem item oculto)
                    const installments = parseInt(formData.installment_total);
                    const installmentAmount = amount / installments;
                    const transactions = [];
                    const seriesId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                        ? crypto.randomUUID()
                        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

                    const originalDate = new Date(formData.date);
                    const originalDay = originalDate.getDate();

                    for (let i = 0; i < installments; i++) {
                        const installmentDate = new Date(formData.date);
                        installmentDate.setMonth(installmentDate.getMonth() + i);

                        const lastDayOfMonth = new Date(
                            installmentDate.getFullYear(),
                            installmentDate.getMonth() + 1,
                            0
                        ).getDate();

                        let targetDay = originalDay;
                        if (originalDay === 31 && lastDayOfMonth < 31) {
                            targetDay = Math.min(30, lastDayOfMonth);
                        } else if (originalDay === 29 && lastDayOfMonth < 29) {
                            targetDay = lastDayOfMonth;
                        } else if (originalDay > lastDayOfMonth) {
                            targetDay = lastDayOfMonth;
                        }

                        installmentDate.setDate(targetDay);

                        transactions.push({
                            ...transactionData,
                            id: i === 0 ? seriesId : undefined,
                            amount: installmentAmount,
                            date: installmentDate.toISOString().split('T')[0],
                            installment_current: i + 1,
                            parent_transaction_id: seriesId,
                            description: `${formData.description} (${i + 1}/${installments})`,
                        });
                    }

                    const { error } = await supabase.from('transactions').insert(transactions);
                    if (error) throw error;
                } else if (formData.recurrence_type === 'recurring') {
                    // Criar template e instâncias materializadas para 24 meses
                    const { data: template, error: templateError } = await supabase
                        .from('transactions')
                        .insert({
                            ...transactionData,
                            hide_from_reports: true,
                        })
                        .select('id, date')
                        .single();

                    if (templateError) throw templateError;

                    const baseDate = new Date(formData.date);
                    const baseDay = baseDate.getDate();
                    const instances = [];
                    for (let i = 0; i < 24; i++) {
                        const target = new Date(baseDate);
                        target.setMonth(target.getMonth() + i);
                        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
                        let targetDay = baseDay;
                        if (baseDay === 31 && lastDay < 31) targetDay = Math.min(30, lastDay);
                        else if (baseDay > lastDay) targetDay = lastDay;
                        target.setDate(targetDay);
                        instances.push({
                            ...transactionData,
                            parent_transaction_id: template.id,
                            hide_from_reports: false,
                            date: target.toISOString().split('T')[0],
                        });
                    }

                    if (instances.length > 0) {
                        const { error } = await supabase.from('transactions').insert(instances);
                        if (error) throw error;
                    }
                } else {
                    const { error } = await supabase.from('transactions').insert(transactionData);
                    if (error) throw error;
                }
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar transação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogClose onClick={() => onOpenChange(false)} />
                <DialogHeader>
                    <DialogTitle>
                        {transaction ? 'Editar Transação' : 'Nova Transação'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date">Data</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="amount">Valor (R$)</Label>
                            <Input
                                id="amount"
                                type="text"
                                inputMode="numeric"
                                value={formData.amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                placeholder="0,00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                            id="type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                        >
                            <option value="income">Receita</option>
                            <option value="expense">Despesa</option>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="account">Conta</Label>
                        <Select
                            id="account"
                            value={formData.account_id}
                            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione uma conta</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="tag">Tag (Categoria)</Label>
                        <Select
                            id="tag"
                            value={formData.tag_id}
                            onChange={(e) => setFormData({ ...formData, tag_id: e.target.value })}
                            disabled={formData.type === 'income'}
                        >
                            <option value="">Sem categoria</option>
                            {tags.map((tag) => (
                                <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="goal">Meta Financeira</Label>
                        <Select
                            id="goal"
                            value={formData.goal_id}
                            onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                            disabled={formData.type === 'income'}
                        >
                            <option value="">Sem meta</option>
                            {goals.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                    {goal.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="recurrence">Recorrência</Label>
                        <Select
                            id="recurrence"
                            value={formData.recurrence_type}
                            onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                        >
                            <option value="single">Única</option>
                            <option value="recurring">Recorrente</option>
                            <option value="installment">Parcelada</option>
                        </Select>
                    </div>

                    {formData.recurrence_type === 'installment' && (
                        <div className="space-y-1">
                            <Label htmlFor="installments">Número de Parcelas</Label>
                            <Input
                                id="installments"
                                type="number"
                                min="2"
                                value={formData.installment_total}
                                onChange={(e) => setFormData({ ...formData, installment_total: e.target.value })}
                                required
                            />
                            {formData.amount && formData.installment_total && (
                                <p className="text-xs text-muted-foreground">
                                    Ficará {formData.installment_total}x de{' '}
                                    {formatCurrency(
                                        parseFloat(formData.amount.replace(/\./g, '').replace(',', '.')) /
                                        Math.max(1, parseInt(formData.installment_total))
                                    )}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="hide"
                            checked={formData.hide_from_reports}
                            onChange={(e) => setFormData({ ...formData, hide_from_reports: e.target.checked })}
                            className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="hide" className="cursor-pointer">
                            Ocultar dos relatórios
                        </Label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="paid"
                            checked={formData.is_paid}
                            onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                            className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="paid" className="cursor-pointer">
                            Pago
                        </Label>
                    </div>

                    <div className="flex justify-end gap-2">
                        {transaction && onDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => onDelete(transaction)}
                            >
                                Excluir
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : transaction ? 'Atualizar' : 'Adicionar'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
