import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { SelectorFecha, SelectorFechaHora } from '@/componentes/ui/SelectoresFecha';
import { desdeTexto, semanasDelMes, sumarMeses } from '@/lib/fechas';

beforeAll(() => {
    // Radix Popover mide el disparador con ResizeObserver, que jsdom no trae.
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('utilidades de calendario', () => {
    it('la grilla empieza el lunes y completa semanas enteras', () => {
        const semanas = semanasDelMes(2026, 8); // septiembre 2026: el 1 es martes
        expect(semanas[0]![0]).toEqual({ anio: 2026, mes: 7, dia: 31 });
        expect(semanas[0]![1]).toEqual({ anio: 2026, mes: 8, dia: 1 });
        expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    });

    it('al sumar un mes se ajusta el día si el mes es más corto', () => {
        expect(sumarMeses({ anio: 2026, mes: 0, dia: 31 }, 1)).toEqual({ anio: 2026, mes: 1, dia: 28 });
    });

    it('rechaza fechas inexistentes', () => {
        expect(desdeTexto('2026-02-30')).toBeNull();
        expect(desdeTexto('texto')).toBeNull();
    });
});

const ConEstado = ({ inicial, ...resto }: { inicial: string; min?: string; opcional?: boolean }) => {
    const [valor, setValor] = useState(inicial);
    return <><SelectorFecha valor={valor} alCambiar={setValor} {...resto} /><output>{valor || 'vacío'}</output></>;
};

describe('selector de fecha', () => {
    it('muestra la fecha en español y permite elegir otro día con el mouse', async () => {
        const usuario = userEvent.setup();
        render(<ConEstado inicial="2026-09-25" />);

        await usuario.click(screen.getByRole('button', { name: /25 sept/i }));
        const grilla = await screen.findByRole('grid', { name: 'Septiembre de 2026' });
        await usuario.click(within(grilla).getByRole('button', { name: /lunes, 28 de septiembre/ }));

        expect(screen.getByText('2026-09-28')).toBeInTheDocument();
    });

    it('se maneja con el teclado y respeta la fecha mínima', async () => {
        const usuario = userEvent.setup();
        render(<ConEstado inicial="2026-09-25" min="2026-09-24" />);

        await usuario.click(screen.getByRole('button', { name: /25 sept/i }));
        const grilla = await screen.findByRole('grid');
        expect(within(grilla).getByRole('button', { name: /23 de septiembre/ })).toBeDisabled();

        await usuario.keyboard('{ArrowRight}{ArrowDown}{Enter}'); // 25 → 26 → 3 de octubre
        expect(screen.getByText('2026-10-03')).toBeInTheDocument();
    });

    it('un filtro opcional se puede vaciar', async () => {
        const usuario = userEvent.setup();
        render(<ConEstado inicial="2026-09-25" opcional />);

        await usuario.click(screen.getByRole('button', { name: 'Quitar la fecha' }));

        expect(screen.getByText('vacío')).toBeInTheDocument();
    });
});

describe('selector de fecha y hora', () => {
    it('no deja elegir una hora posterior al máximo en el día límite', async () => {
        const usuario = userEvent.setup();
        const Prueba = () => {
            const [valor, setValor] = useState('2026-09-25T10:30');
            return <><SelectorFechaHora valor={valor} alCambiar={setValor} max="2026-09-25T11:15" /><output>{valor}</output></>;
        };
        render(<Prueba />);

        await usuario.click(screen.getByRole('button', { name: 'Hora' }));
        const horas = await screen.findByRole('listbox', { name: 'Hora' });
        expect(within(horas).getByRole('option', { name: '12' })).toHaveAttribute('aria-disabled', 'true');

        await usuario.click(within(horas).getByRole('option', { name: '11' }));
        // 11:30 superaría el máximo (11:15): se ajusta.
        expect(screen.getByText('2026-09-25T11:15')).toBeInTheDocument();
    });
});
