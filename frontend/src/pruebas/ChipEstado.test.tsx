import { render, screen } from '@testing-library/react';
import { ChipEstado } from '@/componentes/ui/ChipEstado';

describe('ChipEstado', () => {
    it('muestra siempre el estado en texto, no solo con color', () => {
        render(<ChipEstado estado="ROJO" />);
        expect(screen.getByText('Criadero activo')).toBeInTheDocument();
    });

    it('usa etiquetas distintas para cada estado', () => {
        const { rerender } = render(<ChipEstado estado="VERDE" />);
        expect(screen.getByText('Limpia')).toBeInTheDocument();
        rerender(<ChipEstado estado="AMARILLO" />);
        expect(screen.getByText('Revisar')).toBeInTheDocument();
    });
});
