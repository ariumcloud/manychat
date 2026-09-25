import { SignupForm } from "./SignupForm";

export const metadata = { title: "Criar conta — Fluxo" };

export default function CadastroPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 8%, rgba(124,92,255,0.16), transparent 70%)," +
            "radial-gradient(38% 38% at 82% 88%, rgba(249,87,142,0.1), transparent 70%)," +
            "radial-gradient(38% 38% at 14% 82%, rgba(91,107,255,0.1), transparent 70%)",
        }}
      />
      <div className="relative">
        {/* Lido no servidor: o campo do código só aparece se ele for exigido. */}
        <SignupForm needsCode={Boolean(process.env.SIGNUP_CODE?.trim())} />
        <p className="mt-6 text-center text-xs text-[var(--fg-dim)]">Fluxo · Instagram no automático</p>
      </div>
    </main>
  );
}
