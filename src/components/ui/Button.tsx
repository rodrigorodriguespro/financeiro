import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:translate-y-[1px]',
    {
        variants: {
            variant: {
                default: 'border-slate-200 bg-white text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.8),0_1.5px_3px_rgba(0,0,0,0.12)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.14)] active:bg-[#f2f2f4] dark:border-[#2c2c2e] dark:bg-[#1c1c1f] dark:text-slate-50 dark:shadow-[0_1px_0_rgba(255,255,255,0.05),0_1.5px_3px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_3px_10px_rgba(0,0,0,0.65)]',
                destructive: 'border-[#d43f3f] bg-gradient-to-b from-[#ff8b8b] to-[#e85656] text-white shadow-[0_1px_0_rgba(255,255,255,0.6),0_1.5px_3px_rgba(232,86,86,0.35)] hover:shadow-[0_4px_12px_rgba(232,86,86,0.4)] dark:border-[#7a1f1f] dark:bg-gradient-to-b dark:from-[#9b2323] dark:to-[#6a1717] dark:text-white dark:shadow-[0_1px_0_rgba(255,255,255,0.06),0_1.5px_4px_rgba(0,0,0,0.65)]',
                outline: 'border-slate-200 bg-white text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#f5f5f8] dark:border-[#2c2c2e] dark:bg-[#1a1a1d] dark:text-slate-50 dark:shadow-[0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.55)] dark:hover:bg-[#202025]',
                ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-[#1c1c20]',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 min-w-[96px] px-5 py-2 text-sm',
                sm: 'h-8 min-w-[80px] px-4 text-xs',
                lg: 'h-12 min-w-[112px] px-6 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button: React.FC<ButtonProps> = ({
    className,
    variant,
    size,
    children,
    ...props
}) => {
    return (
        <button
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        >
            {children}
        </button>
    );
};

export { Button, buttonVariants };
