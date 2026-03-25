export const es = {
  common: {
    ok: 'OK',
    created: 'Creado correctamente',
    updated: 'Actualizado correctamente',
    deleted: 'Eliminado correctamente',
    unauthorized: 'No autorizado',
    forbidden: 'Prohibido',
    notFound: 'Recurso no encontrado',
    validationError: 'Error de validacion',
    internalError: 'Error interno del servidor',
  },
  auth: {
    loginSuccess: 'Inicio de sesion exitoso',
    registerSuccess: 'Registro exitoso',
    invalidCredentials: 'Credenciales invalidas',
    mfaRequired: 'Se requiere autenticacion multifactor',
  },
  payments: {
    initiated: 'Pago iniciado',
    completed: 'Pago completado',
    failed: 'Pago fallido',
  },
  security: {
    suspiciousActivity: 'Actividad sospechosa detectada',
    accountLocked: 'Cuenta bloqueada temporalmente por intentos fallidos',
  },
} as const;
