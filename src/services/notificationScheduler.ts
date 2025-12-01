import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';

const DAILY_REMINDER_ID = 1001;
const BANK_SUGGESTION_ID_BASE = 2000;

const getPlatform = () => Capacitor.getPlatform();

export async function ensureNotificationPermissions() {
    if (getPlatform() !== 'android') return;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
        await LocalNotifications.requestPermissions();
    }
}

export async function scheduleDailyReminder(hour = 7, minute = 0) {
    if (getPlatform() !== 'android') return;
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
    await LocalNotifications.schedule({
        notifications: [
            {
                id: DAILY_REMINDER_ID,
                title: 'Checando lembretes',
                body: 'Verificando despesas/receitas do dia e metas.',
                schedule: { repeats: true, every: 'day', at: new Date(new Date().setHours(hour, minute, 0, 0)) },
                smallIcon: 'ic_launcher',
                sound: 'default',
            },
        ],
    });
}

export async function notifyDueTransactions(userId: string) {
    if (getPlatform() !== 'android') return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, type, account_id, date')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('hide_from_reports', false);

    if (error || !data || data.length === 0) return;

    const notifications = data.slice(0, 20).map((t, idx) => ({
        id: 3000 + idx,
        title: t.type === 'expense' ? 'Despesa de hoje' : 'Receita de hoje',
        body: `${t.description} • ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            Number(t.amount),
        )}`,
        schedule: { at: new Date(new Date().getTime() + 1000 * (idx + 1)) },
        smallIcon: 'ic_launcher',
        sound: 'default',
    }));

    await LocalNotifications.schedule({ notifications });
}

export async function notifyGoalStatus(userId: string) {
    if (getPlatform() !== 'android') return;
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, is_paid, date')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end)
        .eq('hide_from_reports', false);

    if (error || !data) return;

    const totals = data.reduce(
        (acc, t) => {
            const amt = Number(t.amount);
            if (t.type === 'expense') acc.expenses += amt;
            else acc.income += amt;
            return acc;
        },
        { income: 0, expenses: 0 },
    );

    const target = totals.income * 0.9; // heurística: 90% da receita
    const monthKey = format(now, 'yyyy-MM');
    const almostKey = `goal_${monthKey}_almost`;
    const hitKey = `goal_${monthKey}_hit`;

    const hasAlmost = localStorage.getItem(almostKey) === '1';
    const hasHit = localStorage.getItem(hitKey) === '1';

    const notifications: any[] = [];

    if (totals.expenses >= target && !hasAlmost) {
        notifications.push({
            id: 4001,
            title: 'Meta mensal quase batida',
            body: 'Suas despesas estão perto do limite para este mês.',
            schedule: { at: new Date(new Date().getTime() + 1500) },
            smallIcon: 'ic_launcher',
            sound: 'default',
        });
        localStorage.setItem(almostKey, '1');
    }

    if (totals.expenses >= totals.income && !hasHit) {
        notifications.push({
            id: 4002,
            title: 'Meta mensal ultrapassada',
            body: 'As despesas já ultrapassaram as receitas do mês.',
            schedule: { at: new Date(new Date().getTime() + 2500) },
            smallIcon: 'ic_launcher',
            sound: 'default',
        });
        localStorage.setItem(hitKey, '1');
    }

    if (notifications.length) {
        await LocalNotifications.schedule({ notifications });
    }
}

export async function handleBankNotificationSuggestion(payload: {
    package: string;
    title: string;
    text: string;
    amount?: number;
    merchant?: string;
}) {
    if (getPlatform() !== 'android') return;
    const messageParts = [payload.title, payload.text].filter(Boolean).join(' • ');
    await LocalNotifications.schedule({
        notifications: [
            {
                id: BANK_SUGGESTION_ID_BASE + Math.floor(Math.random() * 1000),
                title: 'Sugestão de lançamento',
                body: `${messageParts}${payload.amount ? ` • ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.amount)}` : ''
                    }`,
                smallIcon: 'ic_launcher',
                sound: 'default',
            },
        ],
    });
}
