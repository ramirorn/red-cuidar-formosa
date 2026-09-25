import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Tarjeta = ({ className, ...resto }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('rounded-tarjeta border border-gris-borde bg-white shadow-suave', className)} {...resto} />
);
