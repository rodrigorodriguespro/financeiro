import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ className, children, ...props }) => {
    return (
        <select
            className={cn(
                'flex h-10 w-full rounded-md border border-input bg-white text-slate-900 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2f2f32] dark:bg-[#121214] dark:text-slate-100 dark:placeholder:text-slate-500',
                className
            )}
            {...props}
        >
            {children}
        </select>
    );
};
