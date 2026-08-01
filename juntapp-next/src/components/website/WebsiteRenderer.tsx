import type { WebsiteContent, WebsiteTemplate, WebsiteTheme } from '@/lib/website';
import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa6';
import GalleryCarousel from './GalleryCarousel';

/* User-managed images come from a dynamic public media library. */
/* eslint-disable @next/next/no-img-element */

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const international = digits.startsWith('56') ? digits : digits.length === 9 ? `56${digits}` : digits;
  return `https://wa.me/${international}`;
}

function socialLink(value: string, network: 'facebook' | 'instagram') {
  const clean = value.trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^(?:www\.)?(?:facebook|instagram)\.com\//i.test(clean)) return `https://${clean}`;
  return `https://www.${network}.com/${clean.replace(/^@/, '').replace(/^\/+|\/+$/g, '')}`;
}

function newsDate(value: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-CL').format(date);
}

const navigation = [
  ['#nosotros', 'Nosotros'], ['#servicios', 'Comunidad'], ['#galeria', 'Galería'],
  ['#noticias', 'Noticias'], ['#contacto', 'Contacto'],
] as const;

export default function WebsiteRenderer({ name, template, content, theme, logo, hero, gallery = [] }: {
  name: string;
  template: WebsiteTemplate;
  content: WebsiteContent;
  theme: WebsiteTheme;
  logo?: string | null;
  hero?: string | null;
  gallery?: string[];
}) {
  const style = {
    '--site-primary': theme.primary,
    '--site-accent': theme.accent,
    '--site-bg': theme.background,
    '--site-text': theme.text,
  } as React.CSSProperties;
  const overlay = template === 'fotografica'
    ? 'linear-gradient(180deg,rgba(3,12,22,.12),rgba(3,12,22,.88))'
    : template === 'editorial'
      ? 'linear-gradient(90deg,rgba(5,20,35,.94) 0 46%,rgba(5,20,35,.22) 72%)'
      : 'linear-gradient(90deg,rgba(5,20,35,.84),rgba(5,20,35,.20))';
  const heroStyle = hero ? { backgroundImage: `${overlay},url(${hero})` } : undefined;
  const visibleNavigation = navigation.filter(([href]) => href !== '#galeria' || gallery.length > 0);
  const monogram = name.slice(0, 2).toUpperCase();

  return <div className={`community-site template-${template} ${hero ? 'has-hero-image' : 'no-hero-image'}`} data-template={template} style={style}>
    <header className="site-header" id="inicio">
      <a className="site-brand" href="#inicio" aria-label={`Inicio de ${name}`}>
        {logo ? <img src={logo} alt={`Logo de ${name}`} /> : <span className="site-monogram">{monogram}</span>}
        <strong>{name}</strong>
      </a>
      <nav className="site-desktop-nav" aria-label="Navegación principal">
        {visibleNavigation.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <details className="site-mobile-menu">
        <summary><span aria-hidden="true">☰</span> Menú</summary>
        <nav aria-label="Navegación móvil">{visibleNavigation.map(([href, label]) => <a href={href} key={href}>{label}</a>)}</nav>
      </details>
    </header>

    <section className="site-hero" style={heroStyle}>
      <div className="site-hero-copy">
        <span className="site-kicker">JUNTA DE VECINOS</span>
        <h1>{content.title}</h1>
        <p>{content.subtitle}</p>
        <a className="site-primary-action" href="#contacto">Participa con nosotros</a>
      </div>
    </section>

    <aside className="site-quick-strip" aria-label="Accesos destacados">
      <a href="#noticias"><b>01</b><span><strong>Actualidad local</strong><small>Avisos y noticias del barrio</small></span></a>
      <a href="#servicios"><b>02</b><span><strong>Trabajo comunitario</strong><small>Iniciativas abiertas a vecinos</small></span></a>
      <a href="#contacto"><b>03</b><span><strong>Participación</strong><small>Conversemos y construyamos juntos</small></span></a>
    </aside>

    <main className="site-main">
      <section id="nosotros" className="site-about">
        <div className="site-section-copy"><span className="site-kicker">NUESTRA COMUNIDAD</span><h2>{content.aboutTitle}</h2><p>{content.about}</p></div>
        {gallery[0]
          ? <img className="site-about-visual" src={gallery[0]} alt="Actividad de la comunidad" />
          : <div className="site-about-visual site-about-placeholder" aria-hidden="true"><b>{monogram}</b><span>Un barrio que avanza unido</span></div>}
      </section>

      <section id="servicios" className="site-services">
        <header className="site-section-heading"><span className="site-kicker">TRABAJO VECINAL</span><h2>{content.servicesTitle}</h2></header>
        <div className="site-service-grid">{content.services.map((service, index) => <article key={`${service}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><h3>{service}</h3><p>Una iniciativa abierta para mejorar la vida de quienes forman parte de nuestro barrio.</p></article>)}</div>
      </section>

      <GalleryCarousel images={gallery} name={name} />

      <section className="site-news" id="noticias">
        <div className="site-news-heading"><span className="site-kicker">ACTUALIDAD VECINAL</span><h2>{content.newsTitle}</h2><p>{content.news}</p></div>
        {content.newsItems?.length
          ? <div className="site-news-grid">{content.newsItems.map((item) => <article key={item.id}>
              {item.image ? <img src={item.image} alt={item.title} /> : <div className="news-image-placeholder" aria-hidden="true">J</div>}
              <div><span className="site-news-meta">{item.category || 'Comunidad'} · {newsDate(item.date)}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
            </article>)}</div>
          : <div className="site-news-empty"><b>Próximamente</b><p>Aquí publicaremos los próximos avisos y actividades de la comunidad.</p></div>}
      </section>

      <section id="contacto" className="site-contact">
        <div><span className="site-kicker">CONTACTO</span><h2>{content.contactTitle}</h2><p>{content.contact}</p>
          <div className="site-social-links">
            {whatsappLink(content.whatsapp ?? '') && <a className="social-whatsapp" href={whatsappLink(content.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${name}`}><FaWhatsapp aria-hidden="true" /><span>WhatsApp</span></a>}
            {socialLink(content.facebook ?? '', 'facebook') && <a className="social-facebook" href={socialLink(content.facebook, 'facebook')} target="_blank" rel="noopener noreferrer" aria-label={`Facebook de ${name}`}><FaFacebookF aria-hidden="true" /><span>Facebook</span></a>}
            {socialLink(content.instagram ?? '', 'instagram') && <a className="social-instagram" href={socialLink(content.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${name}`}><FaInstagram aria-hidden="true" /><span>Instagram</span></a>}
          </div>
        </div>
        {content.address && <address><small>SEDE VECINAL</small>{content.address}</address>}
      </section>
    </main>

    <footer className="site-footer"><strong>{name}</strong><span><Link href="/">Creado con JuntAPP</Link><i> · </i><a href="https://www.purocode.com/" target="_blank" rel="noopener noreferrer">by PuroCode</a></span></footer>
  </div>;
}
