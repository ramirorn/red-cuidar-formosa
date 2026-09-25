import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Une clases de Tailwind resolviendo conflictos (la última gana).
export const cn = (...clases: ClassValue[]) => twMerge(clsx(clases));
