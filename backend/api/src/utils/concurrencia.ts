// Procesa una lista con un máximo de tareas simultáneas: evita abrir cientos de conexiones a la vez.
export const procesarConLimite = async <T>(elementos: T[], limite: number, tarea: (elemento: T) => Promise<void>): Promise<void> => {
    let siguiente = 0;

    const trabajador = async () => {
        while (siguiente < elementos.length) {
            const elemento = elementos[siguiente++] as T;
            await tarea(elemento);
        }
    };

    await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));
};
