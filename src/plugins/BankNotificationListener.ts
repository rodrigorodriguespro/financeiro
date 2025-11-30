import { registerPlugin } from '@capacitor/core';

export interface BankNotificationPayload {
    package: string;
    title: string;
    text: string;
    amount?: number;
    merchant?: string;
}

export interface BankNotificationListenerPlugin {
    addListener(
        eventName: 'bankNotification',
        listenerFunc: (data: BankNotificationPayload) => void,
    ): Promise<{ remove: () => void }>;
}

const BankNotificationListener = registerPlugin<BankNotificationListenerPlugin>('BankNotificationListener', {
    web: () => ({
        addListener: async (_eventName: 'bankNotification', _listener: (data: BankNotificationPayload) => void) => ({
            remove: () => { /* noop on web */ },
        }),
    }),
});

export default BankNotificationListener;
