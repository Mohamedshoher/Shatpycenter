import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon' | string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
                    size === 'default' && "px-4 py-2",
                    size === 'sm' && "h-8 px-3 text-xs",
                    size === 'lg' && "h-10 px-8",
                    size === 'icon' && "h-9 w-9",
                    variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
                    variant === 'secondary' && "bg-gray-100 text-gray-900 hover:bg-gray-200",
                    variant === 'outline' && "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900",
                    variant === 'ghost' && "hover:bg-gray-100 hover:text-gray-900",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
