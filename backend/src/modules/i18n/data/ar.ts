export const ar = {
  common: {
    ok: 'حسناً',
    created: 'تم الإنشاء بنجاح',
    updated: 'تم التحديث بنجاح',
    deleted: 'تم الحذف بنجاح',
    unauthorized: 'غير مصرح',
    forbidden: 'محظور',
    notFound: 'المورد غير موجود',
    validationError: 'خطأ في التحقق',
    internalError: 'خطأ داخلي في الخادم',
  },
  auth: {
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    registerSuccess: 'تم التسجيل بنجاح',
    invalidCredentials: 'بيانات الاعتماد غير صالحة',
    mfaRequired: 'المصادقة متعددة العوامل مطلوبة',
  },
  payments: {
    initiated: 'تم بدء الدفع',
    completed: 'اكتمل الدفع',
    failed: 'فشل الدفع',
  },
  security: {
    suspiciousActivity: 'تم اكتشاف نشاط مشبوه',
    accountLocked: 'تم قفل الحساب مؤقتاً بسبب محاولات فاشلة',
  },
  notifications: {
    emailTitle: 'إشعار',
    viewDetails: 'عرض التفاصيل',
  },
} as const;
