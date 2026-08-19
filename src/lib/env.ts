function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}. Confira o .env.local`);
  return v;
}

export const env = {
  get supabaseUrl() { return required("SUPABASE_URL"); },
  get supabaseServiceKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get metaAppId() { return required("META_APP_ID"); },
  get metaAppSecret() { return required("META_APP_SECRET"); },
  get metaVerifyToken() { return required("META_VERIFY_TOKEN"); },
  get igAccessToken() { return required("IG_ACCESS_TOKEN"); },
  get igUserId() { return process.env.IG_USER_ID ?? ""; },
  get dashboardPassword() { return required("DASHBOARD_PASSWORD"); },
  get authSecret() { return required("AUTH_SECRET"); },
};

/** true se o mínimo pra rodar está configurado — usado pelo wizard de setup. */
export function configStatus() {
  return {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    token: Boolean(process.env.IG_ACCESS_TOKEN),
    verifyToken: Boolean(process.env.META_VERIFY_TOKEN),
    auth: Boolean(process.env.DASHBOARD_PASSWORD && process.env.AUTH_SECRET),
  };
}
