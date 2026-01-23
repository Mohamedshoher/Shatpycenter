import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors",
                    variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
                    variant === 'secondary' && "bg-gray-100 text-gray-900 hover:bg-gray-200",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
