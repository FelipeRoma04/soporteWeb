import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  CircleCheck,
  Layers3,
  Menu,
  MessageCircle,
  ShieldCheck,
  Ticket,
  UsersRound,
  X
} from 'lucide-react';
import BrandIdentity from '../components/BrandIdentity.jsx';
import './Landing.css';

const features = [
  {
    icon: Ticket,
    title: 'Registro de tickets',
    description: 'Describe un problema y conserva la información de la solicitud en un mismo lugar.',
    preview: 'ticket'
  },
  {
    icon: CircleCheck,
    title: 'Seguimiento y asignación',
    description: 'Consulta el estado y el historial. Cuando un agente inicia la atención, queda registrado como responsable.',
    preview: 'history'
  },
  {
    icon: Layers3,
    title: 'Clasificación y prioridades',
    description: 'Elige una categoría y una prioridad para que el caso tenga contexto desde su registro.',
    preview: 'classification'
  },
  {
    icon: BookOpen,
    title: 'Base de conocimiento',
    description: 'Consulta artículos y soluciones documentadas para problemas tecnológicos frecuentes.',
    preview: 'knowledge'
  },
  {
    icon: Bot,
    title: 'Asistente de IA',
    description: 'Recibe sugerencias de categoría y posibles soluciones para revisar y corregir antes de crear un ticket.',
    preview: 'assistant'
  },
  {
    icon: UsersRound,
    title: 'Gestión administrativa',
    description: 'Las opciones de administración permiten gestionar usuarios y categorías.',
    preview: 'admin'
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Consulta resúmenes y exporta información de tickets desde las herramientas disponibles.',
    preview: 'reports'
  }
];

const steps = [
  {
    number: '01',
    title: 'Registra el problema',
    description: 'Describe la dificultad tecnológica que necesitas reportar.'
  },
  {
    number: '02',
    title: 'Organiza la solicitud',
    description: 'Elige una categoría y una prioridad para facilitar su revisión.'
  },
  {
    number: '03',
    title: 'Revisa posibles soluciones',
    description: 'Consulta la base de conocimiento y, si corresponde, las sugerencias orientativas del asistente.'
  },
  {
    number: '04',
    title: 'Haz seguimiento',
    description: 'Consulta el estado y el historial de atención hasta que la solicitud se cierre.'
  }
];

const benefits = [
  'Menos información dispersa entre distintos canales.',
  'Mayor claridad sobre el estado de las solicitudes.',
  'Historial disponible para revisar cada atención.',
  'Reutilización de soluciones documentadas.',
  'Apoyo de IA a la clasificación, con revisión del personal de soporte.'
];

export default function Landing({ onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const landingRef = useRef(null);

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return undefined;

    const revealItems = root.querySelectorAll('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    root.classList.add('has-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function openSection(event, sectionId) {
    event.preventDefault();
    closeMenu();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    document.getElementById(sectionId)?.scrollIntoView({ behavior });
  }

  function openLogin() {
    closeMenu();
    onLogin();
  }

  function openRegister() {
    closeMenu();
    onRegister();
  }

  return (
    <main className="landing" ref={landingRef}>
      <header className="landing-header">
        <div className="landing-header-inner">
          <a className="landing-logo" href="#inicio" aria-label="SysPulse, ir al inicio" onClick={(event) => openSection(event, 'inicio')}>
            <BrandIdentity className="landing-brand" showTagline={false} />
          </a>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>

          <nav
            className={`landing-navigation${menuOpen ? ' is-open' : ''}`}
            id="landing-navigation"
            aria-label="Navegación de la página"
          >
            <a href="#inicio" onClick={(event) => openSection(event, 'inicio')}>Inicio</a>
            <a href="#funciones" onClick={(event) => openSection(event, 'funciones')}>Funciones</a>
            <a href="#como-funciona" onClick={(event) => openSection(event, 'como-funciona')}>Cómo funciona</a>
            <a href="#asistente" onClick={(event) => openSection(event, 'asistente')}>Asistente IA</a>
            <a href="#beneficios" onClick={(event) => openSection(event, 'beneficios')}>Beneficios</a>
            <div className="landing-nav-actions">
              <button className="landing-button landing-button-quiet" type="button" onClick={openLogin}>Iniciar sesión</button>
              <button className="landing-button landing-button-primary landing-button-small" type="button" onClick={openRegister}>Registrarse</button>
            </div>
          </nav>
        </div>
      </header>

      <section className="landing-hero" id="inicio" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow"><span className="landing-eyebrow-dot" />Soporte tecnológico en un solo lugar</span>
          <h1 id="landing-title">Cada solicitud, <span>bajo control</span></h1>
          <p className="landing-hero-description">
            Registra problemas, organiza su atención y consulta el avance de cada solicitud sin perder información por el camino.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-button landing-button-primary" type="button" onClick={openRegister}>
              Comenzar ahora <ArrowRight size={17} aria-hidden="true" />
            </button>
            <a className="landing-button landing-button-outline" href="#funciones" onClick={(event) => openSection(event, 'funciones')}>
              Explorar SysPulse <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <ul className="landing-highlights" aria-label="Alcance de SysPulse">
            <li><Check size={15} aria-hidden="true" />Prototipo universitario</li>
            <li><Check size={15} aria-hidden="true" />Asistencia con supervisión</li>
          </ul>
        </div>

        <div className="landing-hero-art" aria-label="Representación ilustrativa de un ticket de SysPulse">
          <div className="landing-art-orbit landing-art-orbit-one" />
          <div className="landing-art-orbit landing-art-orbit-two" />
          <div className="landing-product-window">
            <div className="landing-product-sidebar" aria-hidden="true">
              <span className="landing-product-mark"><ActivityIcon /></span>
              <i className="is-selected" /><i /><i /><i />
              <span className="landing-product-avatar">SP</span>
            </div>
            <div className="landing-product-main">
              <div className="landing-product-topline">
                <span>SYSPULSE <b>/</b> SOLICITUDES</span>
                <span className="landing-product-status"><i /> En seguimiento</span>
              </div>
              <div className="landing-product-heading">
                <div><small>TICKET DE EJEMPLO</small><h2>Sin conexión a la red</h2></div>
                <span className="landing-product-date">Estado actual</span>
              </div>
              <div className="landing-product-metrics">
                <div><span>Categoría</span><strong>Redes</strong><i><Layers3 size={15} /></i></div>
                <div><span>Prioridad</span><strong>Media</strong><i><CircleCheck size={15} /></i></div>
                <div><span>Historial</span><strong>Disponible</strong><i><MessageCircle size={15} /></i></div>
              </div>
              <div className="landing-product-lower">
                <div className="landing-product-board">
                  <div className="landing-board-heading"><strong>Atención del ticket</strong><span>HISTORIAL</span></div>
                  <div className="landing-board-row"><span className="landing-board-icon"><Ticket size={14} /></span><span>Solicitud registrada</span><i className="landing-state-open">Creado</i></div>
                  <div className="landing-board-row"><span className="landing-board-icon"><Layers3 size={14} /></span><span>Categoría y prioridad revisadas</span><i className="landing-state-progress">Revisión</i></div>
                </div>
                <div className="landing-product-assistant">
                  <span><Bot size={16} aria-hidden="true" /> ASISTENTE IA</span>
                  <strong>Sugerencias orientativas</strong>
                  <p>Consulta artículos relacionados y revisa las recomendaciones con el personal de soporte.</p>
                  <i aria-hidden="true"><ArrowRight size={14} /></i>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-floating-card landing-floating-status"><span className="landing-floating-icon"><CircleCheck size={15} aria-hidden="true" /></span><span><small>ESTADO DE SOLICITUD</small><strong>En progreso</strong></span></div>
          <div className="landing-floating-card landing-floating-category"><span className="landing-floating-icon"><Layers3 size={15} aria-hidden="true" /></span><span><small>CLASIFICACIÓN</small><strong>Redes · Media</strong></span></div>
          <span className="landing-art-caption"><ShieldCheck size={15} aria-hidden="true" />Ejemplo ilustrativo · datos ficticios</span>
        </div>
      </section>

      <section className="landing-section landing-features" id="funciones" aria-labelledby="features-title">
        <div className="landing-section-heading" data-reveal>
          <span className="landing-eyebrow">FUNCIONES DISPONIBLES EN EL PROTOTIPO</span>
          <h2 id="features-title">¿Qué puedes hacer con SysPulse?</h2>
          <p>Un espacio común para registrar solicitudes, organizar su atención y consultar la información relacionada con cada problema.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, description, preview }, index) => (
            <article className={`landing-feature-card landing-feature-card-${preview}`} data-reveal key={title} style={{ '--reveal-order': index }}>
              <span className="landing-feature-icon"><Icon size={21} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <FeaturePreview type={preview} />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow" id="como-funciona" aria-labelledby="workflow-title">
        <div className="landing-section landing-workflow-inner">
          <div className="landing-section-heading landing-workflow-heading" data-reveal>
            <span className="landing-eyebrow">UN FLUJO DE ATENCIÓN CLARO</span>
            <h2 id="workflow-title">Cómo funciona</h2>
            <p>Un flujo directo para registrar solicitudes y darles seguimiento.</p>
          </div>
          <ol className="landing-steps" data-reveal>
            {steps.map((step) => (
              <li className="landing-step" data-reveal key={step.number} style={{ '--reveal-order': Number(step.number) - 1 }}>
                <span className="landing-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-assistant-section" id="asistente" aria-labelledby="assistant-title">
        <div className="landing-assistant-layout">
          <div className="landing-assistant-copy" data-reveal>
            <span className="landing-eyebrow">APOYO PARA ORIENTAR LA ATENCIÓN</span>
            <h2 id="assistant-title">Una descripción puede abrir nuevas pistas</h2>
            <p>El asistente relaciona lo que describes con categorías y artículos de conocimiento. Sus respuestas son orientativas: el personal de soporte debe revisarlas y decidir cómo continuar.</p>
            <div className="landing-assistant-note"><ShieldCheck size={17} aria-hidden="true" /><span>La sugerencia no sustituye la revisión del equipo de soporte.</span></div>
          </div>
          <div className="landing-assistant-demo" data-reveal>
            <div className="landing-demo-topline"><span><Bot size={16} aria-hidden="true" /> Asistente SysPulse</span><span className="landing-demo-label">EJEMPLO FICTICIO</span></div>
            <div className="landing-demo-question"><small>DESCRIPCIÓN DEL PROBLEMA</small><p>“No puedo conectarme a la red Wi-Fi”.</p></div>
            <div className="landing-demo-connector" aria-hidden="true"><i /><i /><i /></div>
            <div className="landing-demo-results">
              <div><span className="landing-demo-icon"><Layers3 size={16} aria-hidden="true" /></span><small>CATEGORÍA SUGERIDA</small><strong>Redes</strong></div>
              <div><span className="landing-demo-icon"><BookOpen size={16} aria-hidden="true" /></span><small>POSIBLE ORIENTACIÓN</small><strong>Revisar artículos de conexión Wi-Fi</strong></div>
            </div>
            <p className="landing-demo-disclaimer">Sugerencia orientativa · revisar antes de aplicarla</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-benefits" id="beneficios" aria-labelledby="benefits-title">
        <div className="landing-benefits-copy" data-reveal>
          <span className="landing-eyebrow">ATENCIÓN CON CONTEXTO</span>
          <h2 id="benefits-title">¿Por qué centralizar el soporte?</h2>
          <p>Cuando las solicitudes llegan por distintos medios, puede ser difícil mantener su información y seguimiento. SysPulse propone reunir esos datos en un espacio común para consultar la atención de cada caso y reutilizar soluciones documentadas.</p>
          <ul>
            {benefits.map((benefit) => <li key={benefit}><span><Check size={14} aria-hidden="true" /></span>{benefit}</li>)}
          </ul>
        </div>
        <div className="landing-organized-visual" data-reveal>
          <div className="landing-scattered-panel">
            <span className="landing-visual-kicker">ANTES</span>
            <h3>Información en distintos canales</h3>
            <div className="landing-scattered-items">
              <span><MessageCircle size={15} aria-hidden="true" /> Mensajes</span>
              <span><BookOpen size={15} aria-hidden="true" /> Correos</span>
              <span><UsersRound size={15} aria-hidden="true" /> Conversaciones</span>
            </div>
          </div>
          <div className="landing-organized-connector" aria-hidden="true"><ArrowRight size={18} /></div>
          <div className="landing-ticket-summary">
            <div className="landing-ticket-summary-top"><span><Ticket size={16} aria-hidden="true" /> SOLICITUD</span><i>En progreso</i></div>
            <h3>Conexión de red</h3>
            <div className="landing-ticket-summary-row"><span>Categoría</span><strong>Redes</strong></div>
            <div className="landing-ticket-summary-row"><span>Responsable</span><strong>Equipo de soporte</strong></div>
            <div className="landing-ticket-history"><span className="landing-history-dot" /><span>Historial de atención disponible</span></div>
          </div>
        </div>
      </section>

      <section className="landing-cta-wrap" id="acceso" aria-labelledby="cta-title">
        <div className="landing-cta">
          <div className="landing-cta-decoration" aria-hidden="true"><ActivityIcon /></div>
          <span className="landing-eyebrow">PROTOTIPO EXPERIMENTAL UNIVERSITARIO</span>
          <h2 id="cta-title">El soporte empieza por tener todo en orden</h2>
          <p>Consulta tus solicitudes, revisa su avance y encuentra la información que necesitas desde SysPulse.</p>
          <div className="landing-cta-actions">
            <button className="landing-button landing-button-light" type="button" onClick={openLogin}>Iniciar sesión <ArrowRight size={16} aria-hidden="true" /></button>
            <button className="landing-button landing-button-cta-quiet" type="button" onClick={openRegister}>Registrarse</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <BrandIdentity className="landing-brand" showTagline={false} />
            <p>Desarrollo de un sistema web inteligente para registrar, clasificar y realizar seguimiento de solicitudes de soporte tecnológico.</p>
          </div>
          <nav className="landing-footer-nav" aria-label="Navegación del pie de página">
            <a href="#inicio" onClick={(event) => openSection(event, 'inicio')}>Inicio</a>
            <a href="#funciones" onClick={(event) => openSection(event, 'funciones')}>Funciones</a>
            <a href="#como-funciona" onClick={(event) => openSection(event, 'como-funciona')}>Cómo funciona</a>
            <a href="#asistente" onClick={(event) => openSection(event, 'asistente')}>Asistente IA</a>
            <a href="#beneficios" onClick={(event) => openSection(event, 'beneficios')}>Beneficios</a>
          </nav>
          <div className="landing-footer-access">
            <button type="button" onClick={openLogin}>Iniciar sesión</button>
            <button type="button" onClick={openRegister}>Registrarse</button>
          </div>
        </div>
        <div className="landing-footer-bottom"><span>© {new Date().getFullYear()} SysPulse</span><span>Prototipo experimental · contexto universitario</span></div>
      </footer>
    </main>
  );
}

function ActivityIcon() {
  return <span className="landing-activity-icon" aria-hidden="true"><i /><i /><i /></span>;
}

function FeaturePreview({ type }) {
  if (type === 'ticket') {
    return <div className="landing-feature-preview"><span><Ticket size={13} aria-hidden="true" /> Solicitud registrada</span><i>Abierto</i></div>;
  }
  if (type === 'history') {
    return <div className="landing-feature-preview landing-history-preview"><span /><span /><span /><small>Estado · responsable · historial</small></div>;
  }
  if (type === 'classification') {
    return <div className="landing-feature-preview landing-chip-preview"><i>Redes</i><i>Prioridad media</i><i>Responsable</i></div>;
  }
  if (type === 'knowledge') {
    return <div className="landing-feature-preview landing-knowledge-preview"><BookOpen size={14} aria-hidden="true" /><span>Guía de conexión a Wi-Fi</span><ArrowRight size={13} aria-hidden="true" /></div>;
  }
  if (type === 'assistant') {
    return <div className="landing-feature-preview landing-ai-preview"><Bot size={14} aria-hidden="true" /><span>Categoría sugerida: Redes</span><i>Revisar</i></div>;
  }
  if (type === 'admin') {
    return <div className="landing-feature-preview landing-admin-preview"><span><UsersRound size={13} aria-hidden="true" /> Usuarios</span><span><Layers3 size={13} aria-hidden="true" /> Categorías</span></div>;
  }
  return <div className="landing-feature-preview landing-report-preview"><BarChart3 size={15} aria-hidden="true" /><span>Resumen de tickets</span><i><ArrowRight size={13} aria-hidden="true" /></i></div>;
}
