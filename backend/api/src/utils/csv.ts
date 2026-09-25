// Escapa un valor para CSV (RFC 4180) y neutraliza la inyección de fórmulas en planillas de cálculo.
// - Un texto que, sin espacios iniciales, empieza con = + - @ tabulación o retorno se prefija con un apóstrofo.
// - Se entrecomilla todo texto con coma, punto y coma (separador de Excel en español), comillas o saltos:
//   así un ";" dentro de un campo no puede abrir una celda nueva que empiece con una fórmula.
export const escaparCsv = (valor: unknown): string => {
    if (valor === null || valor === undefined) return '';

    let texto = valor instanceof Date ? valor.toISOString() : String(valor);

    if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto.trimStart())) {
        texto = `'${texto}`;
    }

    if (/[",;\r\n]/.test(texto)) {
        texto = `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
};

export const filaCsv = (valores: unknown[]): string => `${valores.map(escaparCsv).join(',')}\r\n`;
