import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tag } from '../types';

interface ManageTagsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    tags: Tag[];
    onTagsChange: () => void;
}

export const ManageTagsDialog: React.FC<ManageTagsDialogProps> = ({
    open,
    onOpenChange,
    userId,
    tags,
    onTagsChange,
}) => {
    const [newTagName, setNewTagName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!newTagName.trim()) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('tags')
                .insert({ user_id: userId, name: newTagName.trim() });

            if (error) throw error;

            setNewTagName('');
            onTagsChange();
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('tags')
                .update({ name: editingName.trim() })
                .eq('id', id);

            if (error) throw error;

            setEditingId(null);
            setEditingName('');
            onTagsChange();
        } catch (error) {
            console.error('Erro ao atualizar tag:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tag?')) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('tags').delete().eq('id', id);

            if (error) throw error;

            onTagsChange();
        } catch (error) {
            console.error('Erro ao excluir tag:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogClose onClick={() => onOpenChange(false)} />
                <DialogHeader>
                    <DialogTitle>Gerenciar Tags</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Adicionar nova tag */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nome da tag"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button onClick={handleAdd} disabled={loading} size="icon">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Lista de tags */}
                    <div className="space-y-2">
                        {tags.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada</p>
                        ) : (
                            tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="flex items-center justify-between rounded-md border border-border p-3"
                                >
                                    {editingId === tag.id ? (
                                        <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                                            className="mr-2"
                                        />
                                    ) : (
                                        <span className="text-sm">{tag.name}</span>
                                    )}

                                    <div className="flex gap-2">
                                        {editingId === tag.id ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleUpdate(tag.id)}
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
                                                        setEditingId(tag.id);
                                                        setEditingName(tag.name);
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(tag.id)}
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
