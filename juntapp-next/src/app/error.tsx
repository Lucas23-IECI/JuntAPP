'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-4xl" aria-hidden="true">⚠️</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">No pudimos cargar esta sección</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Puede ser un problema temporal de conexión. Intenta nuevamente.</p>
        <button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-light">
          Reintentar
        </button>
      </div>
    </main>
  );
}
