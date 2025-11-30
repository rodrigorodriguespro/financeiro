import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Account } from '../types';

interface ManageAccountsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    accounts: Account[];
    onAccountsChange: () => void;
}

export const ManageAccountsDialog: React.FC<ManageAccountsDialogProps> = ({
    open,
    onOpenChange,
    userId,
    accounts,
    onAccountsChange,
}) => {
    const [newAccountName, setNewAccountName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!newAccountName.trim()) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('accounts')
                .insert({ user_id: userId, name: newAccountName.trim() });

            if (error) throw error;

            setNewAccountName('');
            onAccountsChange();
        } catch (error) {
            console.error('Erro ao adicionar conta:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('accounts')
                .update({ name: editingName.trim() })
                .eq('id', id);

            if (error) throw error;

            setEditingId(null);
            setEditingName('');
            onAccountsChange();
        } catch (error) {
            console.error('Erro ao atualizar conta:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);

            if (error) throw error;

            onAccountsChange();
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogClose onClick={() => onOpenChange(false)} />
                <DialogHeader>
                    <DialogTitle>Gerenciar Contas</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Adicionar nova conta */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nome da conta"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button onClick={handleAdd} disabled={loading} size="icon">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Lista de contas */}
                    <div className="space-y-2">
                        {accounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                        ) : (
                            accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="flex items-center justify-between rounded-md border border-border p-3"
                                >
                                    {editingId === account.id ? (
                                        <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleUpdate(account.id)}
                                            className="mr-2"
                                        />
                                    ) : (
                                        <span className="text-sm">{account.name}</span>
                                    )}

                                    <div className="flex gap-2">
                                        {editingId === account.id ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleUpdate(account.id)}
                                                    disabled={loading}
                                                >
                                                    Salvar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditingName('');
                                                    }}
                                                >
                                                    Cancelar
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingId(account.id);
                                                        setEditingName(account.name);
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(account.id)}
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
