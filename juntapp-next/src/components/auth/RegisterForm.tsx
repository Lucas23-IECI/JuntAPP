'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cleanRUT, formatRUT, validateRUT } from '@/lib/utils';
import { CHILE_REGIONS, getCommunes, isValidChileLocation } from '@/lib/chile-locations';

type Step = 'account' | 'junta';

export default function RegisterForm({ initialInviteCode = '' }: { initialInviteCode?: string }) {
  const [step, setStep] = useState<Step>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Account fields
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [rutValid, setRutValid] = useState<boolean | null>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Junta fields
  const [juntaAction, setJuntaAction] = useState<'create' | 'join'>('join');
  const [juntaName, setJuntaName] = useState('');
  const [juntaRegion, setJuntaRegion] = useState('');
  const [juntaComuna, setJuntaComuna] = useState('');
  const [inviteCode, setInviteCode] = useState(/^[A-Z0-9]{6}$/.test(initialInviteCode) ? initialInviteCode : '');

  function handleRutChange(value: string) {
    const clean = cleanRUT(value);
    const formatted = formatRUT(clean);
    setRut(formatted);

    if (clean.length >= 8) {
      setRutValid(validateRUT(clean));
    } else {
      setRutValid(null);
    }
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateRUT(rut)) {
      setError('Por favor, ingrese un RUT válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!/^(?:56)?9\d{8}$/.test(phone.replace(/\D/g, ''))) {
      setError('Ingresa un número de celular chileno válido, por ejemplo +56 9 1234 5678.');
      return;
    }
    setStep('junta');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (juntaAction === 'create' && !isValidChileLocation(juntaRegion, juntaComuna)) {
        throw new Error('Selecciona una región y comuna válidas.');
      }
      const validationResponse = await fetch('/api/registration/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          rut: cleanRUT(rut),
          juntaAction,
          inviteCode: juntaAction === 'join' ? inviteCode.toUpperCase().trim() : undefined,
        }),
      });
      const validation = await validationResponse.json();
      if (!validationResponse.ok) throw new Error(validation.error ?? 'No fue posible validar el registro.');
      const supabase = createClient();

      // Junta creation/joining is handled atomically by the database trigger.
      // Invite codes never need to be exposed through a public SELECT policy.
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            rut: cleanRUT(rut),
            address,
            phone,
            junta_action: juntaAction,
            invite_code: juntaAction === 'join' ? inviteCode.toUpperCase().trim() : undefined,
            junta_name: juntaAction === 'create' ? juntaName.trim() : undefined,
            junta_region: juntaAction === 'create' ? juntaRegion : undefined,
            junta_comuna: juntaAction === 'create' ? juntaComuna.trim() : undefined,
          },
        },
      });

      if (authError) throw authError;

      if (!data.session) {
        setSuccess(juntaAction === 'create'
          ? 'Cuenta creada. Confirma tu correo e inicia sesión para autorizar la suscripción mensual.'
          : 'Registro completado. Revisa tu correo para confirmar la cuenta antes de ingresar.');
        return;
      }

      if (juntaAction === 'create') {
        router.push('/registro/pago');
        router.refresh();
        return;
      }

      router.push('/inicio');
      router.refresh();
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Error en el registro.';
      const message = rawMessage.toLowerCase().includes('database error saving new user')
        ? 'No fue posible completar el registro. Revisa el código de invitación o los datos ingresados.'
        : rawMessage;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'account') {
    return (
      <form onSubmit={handleNextStep} className="auth-form active">
        <div className="form-group">
          <label htmlFor="reg-name" className="form-label">
            Nombre completo
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-input"
            placeholder="María José Ramírez"
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-rut" className="form-label">
            RUT
          </label>
          <div className="relative">
            <input
              id="reg-rut"
              type="text"
              value={rut}
              onChange={(e) => handleRutChange(e.target.value)}
              required
              className={`form-input ${rutValid === true ? 'input-valid' : rutValid === false ? 'input-invalid' : ''}`}
              placeholder="12.345.678-9"
            />
            {rutValid !== null && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${rutValid ? 'text-success' : 'text-accent'}`}>
                {rutValid ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-address" className="form-label">
            Dirección
          </label>
          <input
            id="reg-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="form-input"
            placeholder="Pasaje Los Aromos 345"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label">
              Teléfono
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
              autoComplete="tel"
              className="form-input"
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="tu@correo.cl"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-password" className="form-label">
            Contraseña
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="form-input"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {error && (
          <div className="auth-error-message">{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
        >
          Continuar →
        </button>
      </form>
    );
  }

  // Step 2: Junta selection
  if (success) {
    return (
      <div className="mt-6 rounded-2xl border border-success/20 bg-success-light p-5 text-center">
        <p className="text-sm font-medium text-success">{success}</p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form active">
      <div className="junta-action-tabs">
        <button
          type="button"
          onClick={() => setJuntaAction('join')}
          className={`auth-tab-btn ${juntaAction === 'join' ? 'active' : ''}`}
        >
          Unirme a una Junta
        </button>
        <button
          type="button"
          onClick={() => setJuntaAction('create')}
          className={`auth-tab-btn ${juntaAction === 'create' ? 'active' : ''}`}
        >
          Crear una Junta
        </button>
      </div>

      {juntaAction === 'join' ? (
        <div className="form-group">
          <label htmlFor="invite-code" className="form-label">
            Código de invitación
          </label>
          <input
            id="invite-code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            maxLength={6}
            className="form-input invite-code-input"
            placeholder="ABC123"
          />
          <p className="form-help">
            Solicita este código al dirigente de tu Junta de Vecinos.
          </p>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="junta-name" className="form-label">
              Nombre de la Junta
            </label>
            <input
              id="junta-name"
              type="text"
              value={juntaName}
              onChange={(e) => setJuntaName(e.target.value)}
              required
              className="form-input"
              placeholder="Junta de Vecinos Villa Los Jardines"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="junta-region" className="form-label">Región</label>
              <select id="junta-region" value={juntaRegion} onChange={(event) => { setJuntaRegion(event.target.value); setJuntaComuna(''); }} required className="form-input">
                <option value="">Selecciona una región</option>
                {CHILE_REGIONS.map((region) => <option value={region} key={region}>{region}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="junta-comuna" className="form-label">Comuna</label>
              <select id="junta-comuna" value={juntaComuna} onChange={(event) => setJuntaComuna(event.target.value)} required disabled={!juntaRegion} className="form-input">
                <option value="">Selecciona una comuna</option>
                {getCommunes(juntaRegion).map((comuna) => <option value={comuna} key={comuna}>{comuna}</option>)}
              </select>
            </div>
          </div>
          <div className="registration-price-preview"><span>Suscripción mensual (IVA incluido)</span><strong>$15.000 CLP / mes</strong><small>La renovación es automática y se autoriza de forma segura en Mercado Pago después de crear tu cuenta.</small></div>
          <p className="form-help">Quedarás registrado como Presidente. Después podrás incorporar al Secretario, Tesorero y demás dirigentes.</p>
        </>
      )}

      {error && (
        <div className="auth-error-message">{error}</div>
      )}

      <div className="auth-form-actions">
        <button
          type="button"
          onClick={() => { setStep('account'); setError(''); }}
          className="btn btn-ghost"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-grow"
        >
          {loading ? 'Registrando...' : juntaAction === 'create' ? 'Continuar a la suscripción mensual' : 'Unirme y Registrarme'}
        </button>
      </div>
    </form>
  );
}
