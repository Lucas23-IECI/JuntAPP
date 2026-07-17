'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRUT, validateRUT } from '@/lib/utils';
import { BOARD_POSITIONS, boardPositionLabel } from '@/lib/board';
import type { BoardPosition, Junta, Profile, UserRole } from '@/lib/types';

export default function SociosClient({ socios, currentProfile, junta }: { socios: Profile[]; currentProfile: Profile; junta: Junta }) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [contactSaved, setContactSaved] = useState('');
  const [positionMessage, setPositionMessage] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('vecino');
  const [invitePosition, setInvitePosition] = useState<BoardPosition>('dirigente');
  const router = useRouter();
  const isDirigente = currentProfile.role === 'dirigente';
  const isOwner = junta.owner_id === currentProfile.id;
  const filtered = socios.filter((s) => [s.name, s.rut, s.address].some((value) => value.toLowerCase().includes(search.toLowerCase())));

  async function handleAddSocio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const rut = String(form.get('rut'));
    if (!validateRUT(rut)) { setFormError('Ingresa un RUT válido.'); setLoading(false); return; }
    const response = await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), rut, address: form.get('address'), phone: form.get('phone'), email: form.get('email'), role: inviteRole, boardPosition: inviteRole === 'dirigente' ? invitePosition : undefined }) });
    const result = await response.json();
    if (response.ok) { setShowModal(false); router.refresh(); } else setFormError(result.error ?? 'No fue posible enviar la invitación.');
    setLoading(false);
  }

  async function updateContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().from('profiles').update({ phone: form.get('phone'), email: form.get('email') }).eq('id', currentProfile.id);
    setContactSaved(error ? error.message : 'Datos guardados correctamente.');
    if (!error) router.refresh();
  }

  async function updateBoardPosition(position: BoardPosition) {
    setPositionMessage('');
    const { error } = await createClient().from('profiles').update({ board_position: position }).eq('id', currentProfile.id);
    setPositionMessage(error?.code === '23505' ? 'Ese cargo ya está ocupado en tu junta.' : error ? error.message : 'Cargo actualizado correctamente.');
    if (!error) router.refresh();
  }

  async function toggleCuotaStatus(socio: Profile) {
    await createClient().from('profiles').update({ cuota_status: socio.cuota_status === 'al_dia' ? 'pendiente' : 'al_dia' }).eq('id', socio.id);
    router.refresh();
  }

  async function deleteSocio(id: string) {
    if (!confirm('¿Está seguro de eliminar este socio del padrón?')) return;
    await createClient().from('profiles').delete().eq('id', id);
    router.refresh();
  }

  async function cancelSubscription() {
    if (!confirm('¿Cancelar la suscripción mensual? La junta perderá acceso al dashboard y no se realizarán nuevas renovaciones.')) return;
    setSubscriptionMessage('');
    setCancellingSubscription(true);
    const response = await fetch('/api/mercadopago/subscriptions/cancel', { method: 'POST' });
    const result = await response.json();
    setCancellingSubscription(false);
    if (!response.ok) { setSubscriptionMessage(result.error ?? 'No fue posible cancelar la suscripción.'); return; }
    router.replace('/registro/pago');
    router.refresh();
  }

  return (
    <section className="app-view active" id="view-socios">
      <header className="view-header"><div><span className="view-subtitle">Organización y Padrón Vecinal</span><h2 className="view-title">Registro de Socios</h2></div><div className="view-actions"><button className="tour-help-btn"><span>?</span><span>Guía</span></button>{isDirigente && <button className="btn btn-primary" onClick={() => setShowModal(true)}><span aria-hidden="true">＋</span> Inscribir Nuevo Socio</button>}</div></header>

      {isDirigente ? <>
        <div className="board-position-panel shadow-box"><div><span className="view-subtitle">Tu función en la directiva</span><h3 className="card-title">Cargo: {boardPositionLabel(currentProfile.board_position)}</h3><p>Presidente, Secretario y Tesorero son cargos únicos. Los suplentes se registran como Dirigente.</p></div><div className="board-position-control"><label className="form-label" htmlFor="my-board-position">Seleccionar mi cargo</label><select id="my-board-position" className="form-input" value={currentProfile.board_position ?? 'dirigente'} onChange={(event) => void updateBoardPosition(event.target.value as BoardPosition)}>{BOARD_POSITIONS.map((position) => <option value={position.value} key={position.value}>{position.label}</option>)}</select>{positionMessage && <span className="form-help">{positionMessage}</span>}</div></div>
        {isOwner && <div className="board-position-panel shadow-box"><div><span className="view-subtitle">Plan de la junta</span><h3 className="card-title">Suscripción mensual activa</h3><p>$15.000 CLP al mes, IVA incluido. Mercado Pago gestiona la renovación automática.</p></div><div className="board-position-control"><button type="button" className="btn btn-secondary danger-action" disabled={cancellingSubscription} onClick={() => void cancelSubscription()}>{cancellingSubscription ? 'Cancelando…' : 'Cancelar suscripción'}</button>{subscriptionMessage && <span className="form-help">{subscriptionMessage}</span>}</div></div>}
        <div className="filters-card"><div className="search-input-wrapper"><span className="search-icon" aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="form-input search-input" placeholder="Buscar socio por nombre, dirección o RUT…" /></div><div className="roster-meta"><span className="meta-label">Total en Padrón:</span><strong className="meta-value">{filtered.length} {filtered.length === 1 ? 'vecino' : 'vecinos'}</strong></div></div>
        <div className="roster-grid">
          {filtered.map((socio) => <article className="socio-card" key={socio.id}><div className="socio-header"><div className="socio-info"><h4 className="socio-name"><strong>{socio.name}</strong></h4>{socio.role === 'dirigente' && <span className="board-role-badge">{boardPositionLabel(socio.board_position)}</span>}<span className="socio-rut">RUT: {formatRUT(socio.rut)}</span></div><span className={`status-badge ${socio.cuota_status === 'al_dia' ? 'al-dia' : 'pendiente'}`}>{socio.cuota_status === 'al_dia' ? 'Al Día' : 'Pendiente'}</span></div><div className="socio-details"><div className="socio-detail-item"><span aria-hidden="true">⌂</span><span>{socio.address}</span></div>{socio.phone && <div className="socio-detail-item"><span aria-hidden="true">☎</span><span>{socio.phone}</span></div>}{socio.email && <div className="socio-detail-item"><span aria-hidden="true">✉</span><span>{socio.email}</span></div>}</div><div className="socio-actions"><button className="btn btn-xs btn-ghost" onClick={() => toggleCuotaStatus(socio)}>Cambiar Pago</button><button className="btn btn-xs btn-secondary danger-action" onClick={() => deleteSocio(socio.id)}>Eliminar</button></div></article>)}
          {!filtered.length && <div className="split-card full-width"><p>No se encontraron socios con el criterio ingresado.</p></div>}
        </div>
      </> : <div className="roster-grid vecino-profile-grid">
        <article className="card shadow-box vecino-profile-card"><div className="profile-card-heading"><div><span className="view-subtitle">Tu Ficha Vecinal</span><h3 className="card-title">Mis Datos de Socio</h3></div><span className={`status-badge ${currentProfile.cuota_status === 'al_dia' ? 'al-dia' : 'pendiente'}`}>{currentProfile.cuota_status === 'al_dia' ? 'Al Día' : 'Pendiente'}</span></div><dl className="profile-detail-list"><div><dt>Nombre:</dt><dd>{currentProfile.name}</dd></div><div><dt>RUT:</dt><dd>{formatRUT(currentProfile.rut)}</dd></div><div><dt>Dirección:</dt><dd>{currentProfile.address}</dd></div></dl><form className="contact-update-form" onSubmit={updateContact}><h4>Actualizar Datos de Contacto</h4><div className="form-group"><label className="form-label" htmlFor="myPhone">Teléfono de Contacto</label><input id="myPhone" name="phone" className="form-input" defaultValue={currentProfile.phone ?? ''} /></div><div className="form-group"><label className="form-label" htmlFor="myEmail">Correo Electrónico</label><input id="myEmail" name="email" type="email" className="form-input" defaultValue={currentProfile.email} required /></div>{contactSaved && <p className="form-message">{contactSaved}</p>}<button className="btn btn-primary btn-sm btn-block">Guardar Cambios de Contacto</button></form></article>
        <article className="card shadow-box vecino-profile-card"><span className="view-subtitle">Directiva de tu Junta</span><h3 className="card-title">Contacto de Directiva</h3><p className="card-subtitle">Comunícate con la directiva para certificados, beneficios o consultas de la comunidad.</p><div className="board-contact-list">{socios.filter((s) => s.role === 'dirigente').map((member) => <div className="board-contact" key={member.id}><div className="board-avatar">{member.name.charAt(0)}</div><div><strong>{member.name}</strong><span>{boardPositionLabel(member.board_position)}</span></div>{member.phone ? <a className="btn btn-secondary btn-sm" href={`tel:${member.phone}`}>Llamar</a> : <a className="btn btn-secondary btn-sm" href={`mailto:${member.email}`}>Email</a>}</div>)}</div></article>
      </div>}

      {showModal && <div className="modal active" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setShowModal(false)}><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h3 className="modal-title">Inscribir integrante</h3><button className="modal-close" onClick={() => setShowModal(false)} aria-label="Cerrar">×</button></div><div className="modal-body"><p className="card-subtitle">La persona recibirá un correo para activar su acceso.</p><form onSubmit={handleAddSocio}><div className="form-group"><label className="form-label">Nombre completo</label><input name="name" className="form-input" required /></div><div className="form-group"><label className="form-label">RUT</label><input name="rut" className="form-input" placeholder="12.345.678-9" required /></div><div className="form-group"><label className="form-label">Dirección</label><input name="address" className="form-input" required /></div><div className="form-row"><div className="form-group"><label className="form-label">Celular</label><input name="phone" type="tel" className="form-input" placeholder="+56 9 1234 5678" required /></div><div className="form-group"><label className="form-label">Correo electrónico</label><input name="email" type="email" className="form-input" required /></div></div><div className="form-row"><div className="form-group"><label className="form-label">Tipo de integrante</label><select className="form-input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as UserRole)}><option value="vecino">Vecino</option><option value="dirigente">Dirigente</option></select></div>{inviteRole === 'dirigente' && <div className="form-group"><label className="form-label">Cargo</label><select className="form-input" value={invitePosition} onChange={(event) => setInvitePosition(event.target.value as BoardPosition)}>{BOARD_POSITIONS.map((position) => <option value={position.value} key={position.value}>{position.label}</option>)}</select></div>}</div>{formError && <p className="form-error">{formError}</p>}<div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" disabled={loading}>{loading ? 'Enviando…' : 'Enviar Invitación'}</button></div></form></div></div></div></div>}
    </section>
  );
}
