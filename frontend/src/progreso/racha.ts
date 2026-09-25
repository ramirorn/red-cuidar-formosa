import { semanaAnterior, semanaDe } from './semanas';

export interface Racha {
    // Semanas seguidas en las que el vecino revisó el patio (incluida esta, si ya la hizo).
    semanas: number;
    estaSemanaHecha: boolean;
    // Semanas salteadas que no cortaron la racha (una por mes, nunca dos seguidas).
    comodinesUsados: string[];
    // Si esta semana se saltea, ¿el comodín la salva? (hay comodín libre en el mes y la anterior no se salteó).
    comodinDisponible: boolean;
}

// La semana en curso nunca corta la racha: todavía hay tiempo. Hacia atrás, cada semana sin actividad
// usa el comodín de su mes (el mes de su lunes); si ya se usó o la semana anterior también se salteó, se corta.
export const calcularRacha = (activas: Set<string>, ahora = new Date()): Racha => {
    const actual = semanaDe(ahora);
    const estaSemanaHecha = activas.has(actual);
    let semana = estaSemanaHecha ? actual : semanaAnterior(actual);
    let semanas = 0;
    const mesesConComodin = new Set<string>();
    const confirmados: string[] = [];
    let pendiente: string | null = null;

    for (let vuelta = 0; vuelta < 520; vuelta++) {
        if (activas.has(semana)) {
            semanas++;
            if (pendiente) confirmados.push(pendiente);
            pendiente = null;
        } else {
            const mes = semana.slice(0, 7);
            if (pendiente || mesesConComodin.has(mes)) break;
            mesesConComodin.add(mes);
            pendiente = semana;
        }
        semana = semanaAnterior(semana);
    }

    // Si esta semana todavía no se hizo: ¿el comodín la cubriría?
    const anteriorSalteada = !estaSemanaHecha && confirmados.includes(semanaAnterior(actual));
    const comodinDisponible = !estaSemanaHecha && semanas > 0 && !anteriorSalteada
        && !confirmados.some((usada) => usada.slice(0, 7) === actual.slice(0, 7));

    return { semanas, estaSemanaHecha, comodinesUsados: confirmados, comodinDisponible };
};
