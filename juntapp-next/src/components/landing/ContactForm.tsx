'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl">✅</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          ¡Mensaje enviado!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Nos pondremos en contacto contigo a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-lighter focus:border-transparent transition-all"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-lighter focus:border-transparent transition-all"
            placeholder="tu@correo.cl"
          />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
          Asunto
        </label>
        <input
          id="subject"
          type="text"
          required
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-lighter focus:border-transparent transition-all"
          placeholder="¿En qué podemos ayudarte?"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
          Mensaje
        </label>
        <textarea
          id="message"
          required
          rows={5}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-lighter focus:border-transparent transition-all resize-none"
          placeholder="Escribe tu mensaje aquí..."
        />
      </div>
      <button
        type="submit"
        className="w-full py-3.5 bg-orange text-white font-semibold rounded-xl hover:bg-orange-light transition-all shadow-sm"
      >
        Enviar Mensaje
      </button>
    </form>
  );
}