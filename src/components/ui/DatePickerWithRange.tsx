import * as React from "react"
// Componente de seleção de intervalo de datas
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { useLocation } from "react-router-dom"
import { useIonViewWillLeave } from "@ionic/react"

import { cn } from "../../lib/utils"
import { Button } from "./Button"
import { Calendar } from "./Calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./Popover"

interface DatePickerWithRangeProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const location = useLocation();
    const [hasStartedRange, setHasStartedRange] = React.useState(false);

    useIonViewWillLeave(() => setIsOpen(false));

    React.useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    React.useEffect(() => {
        if (!isOpen) setHasStartedRange(false);
    }, [isOpen]);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                    {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                                </>
                            ) : (
                                format(date.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                        ) : (
                            <span>Selecione um período</span>
                        )}
                    </Button>
                </PopoverTrigger>
                {isOpen && (
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={(newDate: DateRange | undefined) => {
                                setDate(newDate);

                                if (newDate?.from && (!newDate?.to || newDate.from.getTime() === newDate.to.getTime())) {
                                    setHasStartedRange(true);
                                    return;
                                }

                                if (newDate?.from && newDate?.to && hasStartedRange) {
                                    setIsOpen(false);
                                    setHasStartedRange(false);
                                }
                            }}
                            numberOfMonths={2}
                            locale={ptBR}
                        />
                    </PopoverContent>
                )}
            </Popover>
        </div>
    )
}
