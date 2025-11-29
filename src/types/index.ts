export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Account {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface Transaction {
    id: string;
    user_id: string;
    description: string;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    account_id: string;
    tag_id?: string;
    goal_id?: string;
    hide_from_reports: boolean;
    recurrence_type: 'single' | 'recurring' | 'installment';
    installment_total?: number;
    installment_current?: number;
    parent_transaction_id?: string;
    created_at: string;
}

export interface Goal {
    id: string;
    name: string;
    percentage: number;
}

export interface GoalConfig {
    id: string;
    user_id: string;
    goal_id: string;
    percentage: number;
    updated_at: string;
}

export const DEFAULT_GOALS: Goal[] = [
    { id: '1', name: 'Liberdade Financeira', percentage: 0 },
    { id: '2', name: 'Custos Fixos', percentage: 0 },
    { id: '3', name: 'Conforto', percentage: 0 },
    { id: '4', name: 'Metas', percentage: 0 },
    { id: '5', name: 'Prazeres', percentage: 0 },
    { id: '6', name: 'Conhecimento', percentage: 0 },
];
