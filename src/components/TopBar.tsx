import React from 'react';
import { Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';

interface TopBarProps {
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    onAddTransaction: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    selectedMonth,
    onMonthChange,
    onAddTransaction,
}) => {
    const { isDark, toggleTheme } = useTheme();
    const [isCustomDate, setIsCustomDate] = React.useState(false);

    // Gerar lista de meses (6 anteriores + atual + 6 posteriores)
    const months = React.useMemo(() => {
        const result = [];
        const now = new Date();

        // Começar 6 meses atrás
        for (let i = -6; i <= 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            // Capitalizar primeira letra
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

            result.push({ value, label: formattedLabel });
        }
        return result;
    }, []);

    // Verificar se o mês selecionado está na lista padrão
    const isSelectedInList = months.some(m => m.value === selectedMonth);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'custom') {
            setIsCustomDate(true);
            // Não muda o mês ainda, espera o usuário selecionar no input
        } else {
            setIsCustomDate(false);
            onMonthChange(value);
        }
    };

    return (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md transition-all">
            <div className="flex items-center gap-4">
                {isCustomDate ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => onMonthChange(e.target.value)}
                            className="rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCustomDate(false)}
                            className="text-xs"
                        >
                            Voltar
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <select
                            value={isSelectedInList ? selectedMonth : 'custom'}
                            onChange={handleSelectChange}
                            className="appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                            <option disabled>──────────</option>
                            <option value="custom">Outro período...</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="default"
                    size="icon"
                    onClick={onAddTransaction}
                    className="rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full hover:bg-secondary"
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>
        </div>
    );
};
