import { validarLocalidadConsulta, validarRangoFechas } from './comun.validators.js';

export const validarConsultaAgregada = [...validarRangoFechas, validarLocalidadConsulta];
