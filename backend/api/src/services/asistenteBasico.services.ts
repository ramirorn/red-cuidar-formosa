import type { NivelTriaje } from '@prisma/client';

// Asistente básico de IA Mosquito: responde sin modelo de lenguaje cuando el flujo de n8n no está
// configurado o no contesta. Reconoce síntomas (triaje) y preguntas frecuentes sobre dengue y criaderos.
// También se usa como red de seguridad: si detecta un signo de alarma, la respuesta siempre es URGENTE.

// Minúsculas y sin tildes: "Vómitos" y "vomitos" se buscan igual.
export const normalizar = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ¿La coincidencia está negada? ("no tengo fiebre", "sin sangrado")
const negada = (texto: string, indice: number) => /\b(no|sin|nunca|ni)\b[^.,;!?]{0,18}$/.test(texto.slice(Math.max(0, indice - 25), indice));

const aparece = (texto: string, patron: RegExp) => {
    for (const coincidencia of texto.matchAll(new RegExp(patron.source, 'g'))) {
        if (!negada(texto, coincidencia.index)) return true;
    }
    return false;
};

// Signos de alarma del dengue (Ministerio de Salud de la Nación): ante cualquiera, guardia o 107.
const ALARMA = [
    /dolor (muy )?(fuerte |intenso )?(de |en la |en el )?(panza|abdom\w*|estomago|barriga)/,
    /(panza|abdomen|estomago|barriga) (me )?duele (mucho|fuerte)/,
    /vomit\w* (mucho|seguido|todo|sin parar|a cada rato|varias veces)|no (para|paro|deja|dejo) de vomitar|vomit\w* (y |que )?no para/,
    /sangr\w*|hemorragia|encias|moretones/,
    /desmay\w*|perdi\w* el conocimiento|convuls\w*/,
    /(cuesta|dificultad para|falta el|falta de|no (puedo|puede) ) ?(respirar|aire)|ahog\w*/,
    /somnolien\w*|muy dormid\w*|no (se )?(despierta|reacciona)|muy irritable|confundid\w*/,
    /(manos|pies|piel) (frias|helad\w*)|labios morados/,
];
const SINTOMAS = [
    /fiebre|temperatura|calentura|3[89](,|\.)?\d? ?(grados)?/,
    /dolor de cabeza|me duele la cabeza|cefalea/,
    /detras de los ojos|dolor (de|en los) ojos|me duelen los ojos/,
    /dolor (muscular|de huesos|articular|de cuerpo|en el cuerpo|en las articulaciones)|me duele (todo )?el cuerpo|me duelen los huesos/,
    /sarpullido|manchas (rojas|en la piel)|erupcion|brote/,
    /nauseas|vomit\w*|diarrea/,
];
const LEVES = [/picad\w*|me pica|ronchas?|cansad\w*|malestar|me siento mal|decaid\w*/];

export const detectarTriaje = (mensaje: string): NivelTriaje => {
    const texto = normalizar(mensaje);
    if (ALARMA.some((patron) => aparece(texto, patron))) return 'URGENTE';
    if (SINTOMAS.some((patron) => aparece(texto, patron))) return 'MODERADO';
    if (LEVES.some((patron) => aparece(texto, patron))) return 'LEVE';
    return 'SIN_RIESGO';
};

const RESPUESTAS_TRIAJE: Record<Exclude<NivelTriaje, 'SIN_RIESGO'>, string> = {
    URGENTE:
        'Lo que contás puede ser un signo de alarma. Andá ya a la guardia más cercana o llamá al 107.\n\n' +
        'Mientras tanto, tomá líquido de a sorbos y no tomes aspirina ni ibuprofeno.',
    MODERADO:
        'Fiebre con dolor de cabeza, detrás de los ojos, en músculos o articulaciones, o con manchas en la piel puede ser dengue. ' +
        'Consultá hoy en tu centro de salud.\n\n' +
        '• Tomá mucho líquido y hacé reposo.\n' +
        '• No te automediques: nada de aspirina ni ibuprofeno. El paracetamol es lo habitual, pero lo indica un profesional.\n' +
        '• Usá repelente, así ningún mosquito lo transmite a tu familia.\n\n' +
        'Si aparece dolor fuerte de panza, vómitos que no paran, sangrado o mucho sueño, andá ya a la guardia o llamá al 107.',
    LEVE:
        'Las picaduras solas no son dengue. Lavá la zona con agua y jabón y no te rasques.\n\n' +
        'Si en los próximos días tenés fiebre, dolor de cabeza o detrás de los ojos, consultá en tu centro de salud. ' +
        'Y revisá tu patio: si te pican mucho, hay criaderos cerca.',
};

interface TemaFrecuente { claves: RegExp[]; respuesta: string }

// Preguntas frecuentes. Gana el tema con más coincidencias.
const TEMAS: TemaFrecuente[] = [
    {
        claves: [/tanque/, /cisterna/, /aljibe/],
        respuesta:
            'Para limpiar el tanque de agua:\n' +
            '1. Vacialo y cepillá bien las paredes: los huevos del mosquito quedan pegados y aguantan meses secos.\n' +
            '2. Enjuagá y volvé a llenarlo.\n' +
            '3. Dejalo siempre bien tapado, sin rendijas.\n\n' +
            'Si tiene agua que no podés vaciar, pedí en tu centro de salud que evalúen aplicar BTI.',
    },
    {
        claves: [/\bbti\b/, /larvicida/, /bacillus/],
        respuesta:
            'El BTI es un larvicida biológico: una bacteria que mata a las larvas del mosquito y no daña a personas, mascotas ni plantas en las dosis indicadas. ' +
            'Se usa en agua que no se puede vaciar (tanques, aljibes, piletas en desuso). Lo aplican los equipos de salud: consultá en tu municipio.',
    },
    {
        claves: [/huevo/, /larva/, /donde (se )?(pone|cria|reproduce)/, /criadero/, /agua (estancada|quieta)/],
        respuesta:
            'El mosquito del dengue (Aedes aegypti) pone los huevos en las paredes de recipientes con agua limpia y quieta, justo arriba del nivel del agua. ' +
            'Los huevos resisten meses secos y nacen cuando vuelve el agua.\n\n' +
            'Por eso: tirá lo que no uses, dá vuelta baldes y botellas, tapá tanques, cambiá el agua de bebederos y floreros cada día y cepillá sus paredes.',
    },
    {
        claves: [/patio/, /limpi\w*/, /elimin\w*/, /prevenir|prevencion|evitar/, /descacharr\w*/, /balde|botella|cubierta|neumatico|maceta|florero|bebedero|canaleta|pileta/],
        respuesta:
            'Para que no haya criaderos en tu casa:\n' +
            '• Tirá latas, botellas y todo lo que junte agua y no uses.\n' +
            '• Dá vuelta baldes, palanganas y tachos.\n' +
            '• Cambiá el agua de bebederos y floreros todos los días y cepillá las paredes (o poné arena húmeda en los floreros).\n' +
            '• Guardá las cubiertas bajo techo o perforalas.\n' +
            '• Limpiá canaletas y desagües.\n\n' +
            'Podés escanear tu patio con la app: la IA te marca los recipientes de riesgo.',
    },
    {
        claves: [/sintoma/, /como (se )?(si|saber)|me doy cuenta/, /que (se siente|produce)/],
        respuesta:
            'Los síntomas más comunes del dengue son fiebre alta con dolor de cabeza, dolor detrás de los ojos, dolor muscular o de articulaciones, cansancio, náuseas y a veces manchas en la piel.\n\n' +
            'Si los tenés, consultá en tu centro de salud y no te automediques. ' +
            'Signos de alarma (guardia o 107 ya): dolor fuerte de panza, vómitos que no paran, sangrado, mucho sueño o dificultad para respirar.',
    },
    {
        claves: [/contagi\w*|transmit\w*|se pega|persona a persona/],
        respuesta:
            'El dengue no se contagia de persona a persona. Lo transmite el mosquito Aedes aegypti cuando pica a alguien con dengue y después a otra persona.\n\n' +
            'Si alguien de tu casa tiene dengue, que use repelente y mosquitero para que ningún mosquito lo lleve a otros.',
    },
    {
        claves: [/repelente/, /espiral/, /mosquitero/, /tela metalica/, /pica(n)? de dia|a que hora/],
        respuesta:
            'El mosquito del dengue pica sobre todo de día, a la mañana temprano y al atardecer.\n\n' +
            '• Usá repelente en la piel descubierta y renovalo como indica el envase.\n' +
            '• Ropa clara de manga larga, mosquiteros y telas en puertas y ventanas.\n' +
            '• En bebés y chicos, consultá qué repelente usar.',
    },
    {
        claves: [/vacuna/, /vacunar/],
        respuesta:
            'En Argentina hay una vacuna contra el dengue aprobada. Si te corresponde depende de tu edad, de si ya tuviste dengue y de tu zona: consultá en tu centro de salud.\n\n' +
            'La vacuna no reemplaza eliminar los criaderos.',
    },
    {
        claves: [/paracetamol/, /ibuprofeno/, /aspirina/, /remedio|medicamento|pastilla|tomar algo/],
        respuesta:
            'Ante sospecha de dengue no tomes aspirina ni ibuprofeno: pueden aumentar el riesgo de sangrado. ' +
            'El paracetamol es lo habitual para la fiebre, pero la dosis la indica un profesional. Consultá en tu centro de salud.',
    },
    {
        claves: [/que es (el )?dengue/, /dengue/, /aedes|mosquito/],
        respuesta:
            'El dengue es una enfermedad que transmite el mosquito Aedes aegypti. Se cría en recipientes con agua dentro y cerca de las casas, ' +
            'así que la mejor prevención es eliminar criaderos: tirar, dar vuelta, tapar y cepillar.\n\n' +
            'Si tenés fiebre con dolor de cabeza o del cuerpo, consultá en tu centro de salud.',
    },
    {
        claves: [/reportar|reporte|denunci\w*|escane\w*|foto|camara/, /como (uso|funciona) (la )?app/, /\bapp\b/],
        respuesta:
            'Con la app podés:\n' +
            '• Escanear tu patio: la IA marca en rojo los recipientes que juntan agua.\n' +
            '• Reportar un criadero: solo se envía tu manzana, nunca tu ubicación exacta.\n' +
            '• Mandar la foto de cómo quedó después de limpiar.\n' +
            '• Ver el estado de tu manzana en el mapa.',
    },
    {
        claves: [/copa|ranking|premio|puntos/],
        respuesta:
            'En la Copa Red-Cuidar compiten las zonas de tu localidad cada mes. Suman las limpiezas validadas, las semanas con la manzana en verde y los criaderos encontrados. ' +
            'Las zonas del podio tienen premio. Mirá cómo va la tuya en la sección Copa.',
    },
];

const SALUDO = /^(hola|buen(as|os) (dias|tardes|noches)|buenas|que tal|hey)\b/;
const GRACIAS = /\b(gracias|genial|perfecto|dale|joya)\b/;

const MENU =
    'Soy el asistente básico de IA Mosquito. Puedo ayudarte con:\n' +
    '• Síntomas del dengue y cuándo consultar.\n' +
    '• Cómo limpiar el patio, el tanque o los floreros.\n' +
    '• Qué es el BTI, repelentes y vacuna.\n' +
    '• Cómo usar la app.\n\n' +
    'Contame con tus palabras qué necesitás.';

const AVISO = '\n\nEsta orientación no reemplaza la consulta médica.';

export const responderBasico = (mensaje: string): { respuesta: string; nivelTriaje: NivelTriaje } => {
    const nivelTriaje = detectarTriaje(mensaje);
    if (nivelTriaje !== 'SIN_RIESGO') return { respuesta: RESPUESTAS_TRIAJE[nivelTriaje] + AVISO, nivelTriaje };

    const texto = normalizar(mensaje).trim();
    const puntajes = TEMAS.map((tema) => tema.claves.filter((clave) => clave.test(texto)).length);
    const mejor = Math.max(...puntajes);
    if (mejor > 0) return { respuesta: TEMAS[puntajes.indexOf(mejor)]!.respuesta, nivelTriaje };

    if (SALUDO.test(texto)) return { respuesta: `¡Hola! ${MENU}`, nivelTriaje };
    if (GRACIAS.test(texto)) return { respuesta: '¡De nada! Si necesitás algo más, escribime. Y acordate: 10 minutos por semana revisando el patio alcanzan.', nivelTriaje };
    return { respuesta: MENU, nivelTriaje };
};
