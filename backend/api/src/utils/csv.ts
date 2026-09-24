// Escapa un valor para CSV (RFC 4180) y neutraliza la inyección de fórmulas en planillas
// de cálculo: un texto que empieza con = + - @ o tabulación se prefija con un apóstrofo.
export const escaparCsv = (valor: unknown): string => {
    if (valor === null || valor === undefined) return '';

    let texto = valor instanceof Date ? valor.toISOString() : String(valor);

    if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) {
        texto = `'${texto}`;
    }

    if (/[",\r\n]/.test(texto)) {
        texto = `"${texto.replace(/"/g, '""')}"`;
    }

    return texto;
};

export const filaCsv = (valores: unknown[]): string => `${valores.map(escaparCsv).join(',')}\r\n`;
