import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">JA</span>
              </div>
              <span className="text-lg font-bold">JuntAPP</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Plataforma digital para la gestión transparente de Juntas de Vecinos en Chile.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Plataforma</h4>
            <ul className="space-y-2">
              <li><Link href="/caracteristicas" className="text-gray-300 hover:text-white text-sm transition-colors no-underline">Características</Link></li>
              <li><Link href="/pricing" className="text-gray-300 hover:text-white text-sm transition-colors no-underline">Planes y Precios</Link></li>
              <li><Link href="/faq" className="text-gray-300 hover:text-white text-sm transition-colors no-underline">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-300 text-sm">Ley N°19.418</span></li>
              <li><span className="text-gray-300 text-sm">Protección de Datos</span></li>
              <li><Link href="/contacto" className="text-gray-300 hover:text-white text-sm transition-colors no-underline">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Contacto</h4>
            <ul className="space-y-2">
              <li className="text-gray-300 text-sm">contacto@juntapp.cl</li>
              <li className="text-gray-300 text-sm">Valparaíso, Chile</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} JuntAPP SpA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
