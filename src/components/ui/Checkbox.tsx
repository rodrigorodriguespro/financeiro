import React from 'react';
import { cn } from '../../lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, indeterminate, ...props }, ref) => {
        const internalRef = React.useRef<HTMLInputElement>(null);
        React.useEffect(() => {
            if (internalRef.current) {
                internalRef.current.indeterminate = Boolean(indeterminate);
            }
        }, [indeterminate]);

        return (
            <input
                type="checkbox"
                ref={(node) => {
                    if (node) {
                        node.indeterminate = Boolean(indeterminate);
                        (ref as React.RefCallback<HTMLInputElement> | null)?.(node);
                    }
                    internalRef.current = node;
                }}
                className={cn(
                    'h-4 w-4 cursor-pointer rounded border border-input accent-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                {...props}
            />
        );
    }
);

Checkbox.displayName = 'Checkbox';
