import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import BankNotificationListener from '../plugins/BankNotificationListener';
import {
    ensureNotificationPermissions,
    scheduleDailyReminder,
    notifyDueTransactions,
    notifyGoalStatus,
    handleBankNotificationSuggestion,
} from '../services/notificationScheduler';

export const useNotifications = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user || Capacitor.getPlatform() !== 'android') return;

        ensureNotificationPermissions().then(() => {
            scheduleDailyReminder();
            notifyDueTransactions(user.id);
            notifyGoalStatus(user.id);
        });

        const listener = BankNotificationListener.addListener('bankNotification', (payload) => {
            handleBankNotificationSuggestion(payload);
        });

        return () => {
            listener.then((sub) => sub.remove());
        };
    }, [user]);
};
