export const fr = {
  common: {
    ok: "D'accord",
    created: 'Creation reussie',
    updated: 'Mise a jour reussie',
    deleted: 'Suppression reussie',
    unauthorized: 'Non autorise',
    forbidden: 'Interdit',
    notFound: 'Ressource introuvable',
    validationError: 'Erreur de validation',
    internalError: 'Erreur interne du serveur',
  },
  auth: {
    loginSuccess: 'Connexion reussie',
    registerSuccess: 'Inscription reussie',
    invalidCredentials: 'Identifiants invalides',
    mfaRequired: "L'authentification multifacteur est requise",
  },
  payments: {
    initiated: 'Paiement initie',
    completed: 'Paiement termine',
    failed: 'Echec du paiement',
  },
  security: {
    suspiciousActivity: 'Activite suspecte detectee',
    accountLocked:
      'Compte temporairement verrouille apres des tentatives echouees',
  },
} as const;
