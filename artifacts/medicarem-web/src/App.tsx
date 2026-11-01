import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, HeartHandshake, History,
  LogOut, Menu, Plus, RefreshCw, Settings2, ShieldCheck, Stethoscope, UserRound,
  UsersRound, X,
} from 'lucide-react';
import {
  EventRecordInputStatus, InvitationStatus, UserRole,
  getGetDashboardQueryKey, getGetProfileQueryKey, getListCaregiverInvitationsQueryKey,
  getListEventsQueryKey, getListMedicationsQueryKey, useCreateCaregiverInvitation,
  useCreateMedication, useDeactivateMedication, useGetDashboard, useGetProfile,
  useListCaregiverInvitations, useListEvents, useListMedications,
  useRecordEvent, useRedeemCaregiverInvitation, useSaveProfile, useSyncEvents,
  useUpdateCaregiverInvitation, useUpdateMedication,
} from '@workspace/api-client-react';
import type { Medication, MedicationEvent, Profile, ScheduleInput } from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import '@/index.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#326d64', colorForeground: '#213d39', colorMutedForeground: '#62736f',
    colorDanger: '#a8443e', colorBackground: '#fffdf8', colorInput: '#fffdf8',
    colorInputForeground: '#213d39', colorNeutral: '#ddd8cd', fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#213d39] font-bold',
    headerSubtitle: 'text-[#62736f]',
    socialButtonsBlockButtonText: 'text-[#213d39] font-semibold',
    formFieldLabel: 'text-[#314c47] font-semibold',
    footerActionLink: 'text-[#326d64] font-bold',
    footerActionText: 'text-[#62736f]',
    dividerText: 'text-[#62736f]',
    identityPreviewEditButton: 'text-[#326d64]',
    formFieldSuccessText: 'text-[#326d64]',
    alertText: 'text-[#8a3934]',
    logoBox: 'mb-4',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#ddd8cd] rounded-xl',
    formButtonPrimary: 'bg-[#326d64] hover:bg-[#28584f] rounded-xl',
    formFieldInput: 'bg-[#fffdf8] border-[#d8d2c6] rounded-xl',
    footerAction: 'text-[#62736f]',
    dividerLine: 'bg-[#e6e0d5]',
    alert: 'rounded-xl',
    otpCodeFieldInput: 'rounded-xl',
    formFieldRow: 'mb-4',
    main: 'text-[#213d39]',
  },
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand ${inverse ? 'brand-inverse' : ''}`} aria-label="MEDICAREM, inicio" data-testid="link-brand">
    <span className="brand-mark"><HeartHandshake size={23} strokeWidth={2.3} /></span>
    <span>medicarem<span className="brand-period">.</span></span>
  </Link>;
}

function Home() {
  return <div className="landing">
    <header className="landing-header"><Brand /><div className="landing-links">
      <a href="#como-funciona">Cómo funciona</a><a href="#acompanamiento">Acompañamiento</a>
      <Link href="/sign-in" className="button button-quiet" data-testid="link-sign-in">Ingresar</Link>
      <Link href="/sign-up" className="button button-primary" data-testid="link-sign-up">Crear cuenta <ArrowRight size={16} /></Link>
    </div></header>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" />Una rutina más clara, cada día</span>
          <h1>Tu cuidado,<br /><em>a tu manera.</em></h1>
          <p>Organiza tus horarios de medicamentos y comparte el seguimiento con alguien de confianza. Sin complicaciones, desde donde estés.</p>
          <div className="hero-actions"><Link href="/sign-up" className="button button-primary button-large" data-testid="link-start">Empezar ahora <ArrowRight size={18} /></Link><span>Gratis y fácil de usar</span></div>
          <div className="trust-line"><ShieldCheck size={18} /><span>Tus datos, siempre privados y bajo tu control.</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustración abstracta de una rutina organizada">
          <div className="sun-disc" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="art-leaf leaf-a" /><div className="art-leaf leaf-b" /><div className="art-stem" />
          <div className="schedule-note"><span className="note-kicker">TU ESPACIO PERSONAL</span><strong>Tu rutina, en orden</strong><div className="note-row"><span className="note-time">01</span><span className="note-pill">Horarios organizados</span><i><Check size={15} /></i></div><div className="note-row"><span className="note-time">02</span><span className="note-pill">Información a la mano</span><i><Check size={15} /></i></div><div className="note-row"><span className="note-time">03</span><span className="note-pill">Accesos bajo tu control</span><i><Check size={15} /></i></div></div>
          <span className="art-caption">Una rutina sencilla<br />da más tranquilidad.</span>
        </div>
      </section>
      <section className="landing-ribbon"><span>CLARIDAD PARA TI</span><span>TRANQUILIDAD PARA QUIEN TE ACOMPAÑA</span><span>EN TU PROPIO RITMO</span></section>
      <section id="como-funciona" className="landing-section intro-section"><div><span className="eyebrow">Hecho para la vida real</span><h2>Menos vueltas.<br /><em>Más claridad.</em></h2></div><div className="intro-copy"><p>MEDICAREM te ayuda a tener a la mano tus horarios, presentaciones y dosis prescritas. Tú decides qué registrar y con quién compartirlo.</p><p>Un registro es solo una constancia de lo reportado; no confirma por sí mismo que un medicamento se haya tomado.</p></div></section>
      <section className="feature-grid">
        <article className="feature feature-large"><span className="feature-number">01 / TU RUTINA</span><CalendarDays size={25} /><h3>Todo lo importante,<br />en un mismo lugar.</h3><p>Organiza cada medicamento con sus horarios y consulta tu día de un vistazo.</p><span className="feature-decoration">Horarios · Presentación · Dosis prescrita</span></article>
        <article className="feature feature-soft"><span className="feature-number">02 / TU DECISIÓN</span><ShieldCheck size={25} /><h3>Compartir es<br />una elección.</h3><p>Invita a alguien de confianza con un código. Tú apruebas y puedes retirar el acceso.</p><span className="feature-decoration"><UsersRound size={17} /> Solo con tu autorización</span></article>
        <article className="feature feature-paper"><span className="feature-number">03 / TU HISTORIAL</span><History size={25} /><h3>Un registro claro,<br />sin juicios.</h3><p>Consulta lo confirmado, lo pendiente y las omisiones declaradas, con fecha y hora.</p><span className="feature-decoration"><CheckCircle2 size={17} /> Información, no recomendaciones</span></article>
      </section>
      <section id="acompanamiento" className="care-section"><div className="care-symbol"><HeartHandshake size={36} /></div><div><span className="eyebrow">Acompañamiento, no vigilancia</span><h2>Estar cerca también<br /><em>es respetar.</em></h2><p>La persona cuidadora puede ver los registros que le han autorizado. La persona paciente conserva el control de su información y de sus permisos.</p><Link href="/sign-up" className="text-link" data-testid="link-caregiver">Conoce MEDICAREM <ArrowRight size={17} /></Link></div><div className="care-aside"><span>UN ACUERDO ENTRE PERSONAS</span><p>“Acompañar no es decidir por alguien. Es estar disponible cuando lo necesita.”</p><i>MEDICAREM</i></div></section>
      <section className="closing"><span className="eyebrow">Empieza con calma</span><h2>Tu rutina merece<br />un lugar claro.</h2><Link href="/sign-up" className="button button-cream button-large" data-testid="link-create-account">Crear mi cuenta <ArrowRight size={18} /></Link></section>
    </main>
    <footer className="landing-footer"><Brand /><span>Una herramienta de organización y registro. No reemplaza la orientación de profesionales de salud.</span><small>© MEDICAREM</small></footer>
  </div>;
}

function SignInPage() {
  return <div className="auth-page"><Brand /><div className="auth-context"><span className="eyebrow">Tu rutina, a la mano</span><p>Ingresa para consultar<br />tu organización diaria.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}
function SignUpPage() {
  return <div className="auth-page"><Brand /><div className="auth-context"><span className="eyebrow">Comienza por aquí</span><p>Una forma más clara<br />de organizar tu rutina.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/medicamentos" /></Show><Show when="signed-out"><Home /></Show></>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <PageLoading />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  useEffect(() => {
    let previous: string | null | undefined;
    return addListener(({ user }) => {
      const current = user?.id ?? null;
      if (previous !== undefined && previous !== current) client.clear();
      previous = current;
    });
  }, [addListener, client]);
  return null;
}

function PageLoading() {
  return <div className="loading-screen" aria-label="Cargando"><span className="loading-logo"><HeartHandshake size={24} /></span><div className="skeleton-line" /><div className="skeleton-card" /><div className="skeleton-card short" /></div>;
}
function ErrorMessage({ onRetry }: { onRetry: () => void }) {
  return <div className="state-panel"><div className="state-icon"><CircleHelp size={24} /></div><h2>No pudimos cargar esta información</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><button className="button button-primary" onClick={onRetry} data-testid="button-retry">Intentar de nuevo <RefreshCw size={16} /></button></div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-mark"><HeartHandshake size={24} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

const navItems = [
  { href: '/medicamentos', label: 'Medicamentos', icon: Stethoscope },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/cuidadores', label: 'Cuidadores', icon: UsersRound },
  { href: '/perfil', label: 'Mi perfil', icon: UserRound },
];

function ProtectedApp() {
  const profileQuery = useGetProfile();
  const profile = profileQuery.data;
  const err = profileQuery.error as { status?: number; response?: { status?: number } } | null;
  const profile404 = err?.status === 404 || err?.response?.status === 404;
  if (profileQuery.isLoading) return <PageLoading />;
  if (profileQuery.isError && profile404) return <Onboarding />;
  if (profileQuery.isError || !profile) return <ErrorMessage onRetry={() => void profileQuery.refetch()} />;
  return <AppShell profile={profile} />;
}

function Onboarding() {
  const saveProfile = useSaveProfile();
  const client = useQueryClient();
  const { user } = useUser();
  const [name, setName] = useState(user?.fullName ?? '');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    saveProfile.mutate({ data: { displayName: name.trim(), role, timezone: 'America/Bogota', largeText: false, notificationsEnabled: false } }, {
      onSuccess: () => { setMessage('Tu perfil quedó listo.'); void client.invalidateQueries({ queryKey: getGetProfileQueryKey() }); },
      onError: () => setMessage('No pudimos guardar tus datos. Inténtalo de nuevo.'),
    });
  };
  return <div className="onboarding"><header><Brand /><span className="eyebrow">Bienvenido a MEDICAREM</span></header><section className="onboarding-card"><div className="onboarding-icon"><HeartHandshake size={27} /></div><span className="eyebrow">Tu espacio personal</span><h1>Empecemos por<br /><em>conocerte.</em></h1><p>Cuéntanos cómo quieres usar MEDICAREM. Puedes cambiar estas preferencias después.</p><form onSubmit={submit} className="form-stack">
    <label>¿Cómo te llamas?<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} data-testid="input-display-name" placeholder="Tu nombre" /></label>
    <fieldset className="role-choices"><legend>¿Cómo usarás MEDICAREM?</legend><label className={role === UserRole.PATIENT ? 'role-choice selected' : 'role-choice'}><input type="radio" checked={role === UserRole.PATIENT} onChange={() => setRole(UserRole.PATIENT)} /><span><strong>Organizar mi rutina</strong><small>Quiero registrar mis medicamentos</small></span></label><label className={role === UserRole.CAREGIVER ? 'role-choice selected' : 'role-choice'}><input type="radio" checked={role === UserRole.CAREGIVER} onChange={() => setRole(UserRole.CAREGIVER)} /><span><strong>Acompañar a alguien</strong><small>Me invitaron con un código</small></span></label></fieldset>
    {message && <p className="form-message" role="status">{message}</p>}<button className="button button-primary button-full" disabled={saveProfile.isPending} data-testid="button-save-onboarding">{saveProfile.isPending ? 'Guardando…' : 'Continuar'} <ArrowRight size={17} /></button>
  </form></section><p className="onboarding-foot"><ShieldCheck size={16} /> Tu información se comparte solo con tu autorización.</p></div>;
}

function AppShell({ profile }: { profile: Profile }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  return <div className={profile.largeText ? 'app-frame large-text' : 'app-frame'}>
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" data-testid="button-close-menu"><X size={21} /></button></div>
      <div className="sidebar-profile"><span className="profile-avatar">{initials(profile.displayName)}</span><span><strong>{profile.displayName}</strong><small>{profile.role === UserRole.PATIENT ? 'Mi espacio' : 'Persona cuidadora'}</small></span><ChevronDown size={16} /></div>
      <span className="nav-caption">TU ESPACIO</span><nav className="side-nav" aria-label="Navegación principal">{navItems.map(item => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link ${location === item.href ? 'active' : ''}`} data-testid={`link-nav-${item.href.slice(1)}`}><Icon size={19} strokeWidth={1.8} /><span>{item.label}</span>{location === item.href && <i />}</Link>;
      })}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={17} /><p>Tu información está protegida y solo se comparte con autorización.</p></div><button className="nav-link signout-link" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><LogOut size={18} /><span>Cerrar sesión</span></button></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}
    <main className="workspace"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" data-testid="button-open-menu"><Menu size={22} /></button><div className="breadcrumb"><span>MEDICAREM</span><span>/</span><strong>{navItems.find(item => item.href === location)?.label ?? 'Mi espacio'}</strong></div><div className="topbar-right"><span className="connection-pill"><span /> Conectado</span><Link href="/perfil" className="top-avatar" aria-label="Abrir perfil" data-testid="link-profile-avatar">{initials(profile.displayName)}</Link></div></header>
      <div className="workspace-content page-enter"><Switch>
        <Route path="/medicamentos"><MedicationPage profile={profile} /></Route>
        <Route path="/historial"><HistoryPage profile={profile} /></Route>
        <Route path="/cuidadores"><CaregiverPage profile={profile} /></Route>
        <Route path="/perfil"><ProfilePage profile={profile} /></Route>
        <Route><Redirect to="/medicamentos" /></Route>
      </Switch></div>
    </main>
  </div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'M';
}
function usePatientContext(profile: Profile) {
  const invitations = useListCaregiverInvitations({ query: { enabled: profile.role === UserRole.CAREGIVER, queryKey: getListCaregiverInvitationsQueryKey() } });
  const patientLinks = (invitations.data ?? []).filter(item => item.status === InvitationStatus.ACTIVE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    if (profile.role === UserRole.PATIENT) setSelectedId(profile.id);
    else if (!patientLinks.some(item => item.patientId === selectedId)) setSelectedId(patientLinks[0]?.patientId ?? null);
  }, [profile.id, profile.role, patientLinks.map(item => item.patientId).join(',')]);
  const selectedPatient = patientLinks.find(item => item.patientId === selectedId);
  return {
    patientId: profile.role === UserRole.PATIENT ? profile.id : selectedPatient?.patientId ?? null,
    patientName: profile.role === UserRole.PATIENT ? profile.displayName : selectedPatient?.patientName ?? '',
    patientLinks, invitations,
    selector: profile.role === UserRole.CAREGIVER && patientLinks.length > 1 ? <label className="patient-select-label">Viendo a<select value={selectedId ?? ''} onChange={event => setSelectedId(Number(event.target.value))} data-testid="select-patient">{patientLinks.map(item => <option key={item.patientId} value={item.patientId}>{item.patientName}</option>)}</select></label> : null,
  };
}

function DashboardHeader({ profile, title, subtitle, children }: { profile: Profile; title: string; subtitle: string; children?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{profile.role === UserRole.PATIENT ? 'TU ORGANIZACIÓN' : 'SEGUIMIENTO COMPARTIDO'}</span><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>;
}

function MedicationPage({ profile }: { profile: Profile }) {
  const context = usePatientContext(profile);
  const patientId = context.patientId ?? undefined;
  const medsQuery = useListMedications({ patientId, includeInactive: true }, { query: { enabled: !!context.patientId, queryKey: getListMedicationsQueryKey({ patientId, includeInactive: true }) } });
  const dashQuery = useGetDashboard({ patientId }, { query: { enabled: !!context.patientId, queryKey: getGetDashboardQueryKey({ patientId }) } });
  const eventsQuery = useListEvents({ patientId }, { query: { enabled: !!context.patientId, queryKey: getListEventsQueryKey({ patientId }) } });
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Medication | null | false>(false);
  const isPatient = profile.role === UserRole.PATIENT;
  useDeactivateHandler(patientId);
  const medList = medsQuery.data ?? [];
  const activeMeds = medList.filter(m => m.active);
  const todayEvents = (eventsQuery.data ?? []).filter(event => new Date(event.scheduledAt).toDateString() === new Date().toDateString());
  const dayLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  if (context.invitations.isLoading && !isPatient) return <PageLoading />;
  return <div>
    <DashboardHeader profile={profile} title={isPatient ? `Hola, ${profile.displayName.split(' ')[0]}` : `El espacio de ${context.patientName || 'tu familiar'}`} subtitle={isPatient ? `Este es tu día · ${capitalize(dayLabel)}` : 'Aquí puedes consultar la información que te han compartido.'}>
      {context.selector}{isPatient && <button className="button button-primary" onClick={() => setEditing(null)} data-testid="button-add-medication"><Plus size={18} /> Agregar medicamento</button>}
    </DashboardHeader>
    {!context.patientId ? <EmptyState title="Aún no hay un espacio compartido" text={context.invitations.isError ? 'No pudimos consultar tus invitaciones.' : 'Cuando alguien apruebe tu solicitud, podrás ver aquí la información compartida.'} action={<Link href="/cuidadores" className="button button-secondary" data-testid="link-invitation-page">Ir a cuidadores <ArrowRight size={16} /></Link>} /> :
      <>{dashQuery.isError || medsQuery.isError || eventsQuery.isError ? <ErrorMessage onRetry={() => { void dashQuery.refetch(); void medsQuery.refetch(); void eventsQuery.refetch(); }} /> : null}
        {(dashQuery.isLoading || medsQuery.isLoading) ? <div className="loading-grid"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div> : <>
          <section className="today-banner"><div className="today-symbol"><CalendarDays size={22} /></div><div><span className="banner-kicker">RESUMEN DE HOY</span><strong>{dashQuery.data?.todayScheduled ?? 0} horarios programados</strong><small>{dashQuery.data?.activeMedications ?? activeMeds.length} medicamentos activos</small></div><div className="today-metrics"><span><b>{dashQuery.data?.confirmed ?? 0}</b> confirmados</span><span><b>{dashQuery.data?.pending ?? 0}</b> pendientes</span></div></section>
          {dashQuery.data?.lastSyncedAt && <p className="sync-stamp"><RefreshCw size={14} /> Última actualización: {formatDateTime(dashQuery.data.lastSyncedAt)}</p>}
          <section className="section-block"><div className="section-heading"><div><span className="eyebrow">TU LISTA</span><h2>Medicamentos</h2></div>{!isPatient && <span className="read-only"><ShieldCheck size={15} /> Solo lectura</span>}</div>
            {medsQuery.isLoading ? <div className="skeleton-card" /> : !activeMeds.length ? <EmptyState title="Tu lista empieza aquí" text={isPatient ? 'Agrega los medicamentos de tu fórmula con sus horarios.' : 'Todavía no hay medicamentos compartidos en este espacio.'} action={isPatient ? <button className="button button-secondary" onClick={() => setEditing(null)} data-testid="button-empty-add-medication"><Plus size={17} /> Agregar medicamento</button> : undefined} /> :
              <div className="medication-list">{activeMeds.map(med => <MedicationCard key={med.id} medication={med} canEdit={isPatient} onEdit={() => setEditing(med)} onDeactivate={() => {
                if (window.confirm(`¿Deseas dejar de mostrar ${med.name} como medicamento activo? Su historial se conserva.`)) {
                  // Deactivation mutation is declared below in the mutation component.
                  document.dispatchEvent(new CustomEvent('medicarem-deactivate', { detail: med.id }));
                }
              }} />)}</div>}
            {medList.some(m => !m.active) && <button className="subtle-toggle" onClick={() => setShowInactive(v => !v)} data-testid="button-toggle-inactive">{showInactive ? 'Ocultar' : 'Ver'} medicamentos inactivos <ChevronDown size={16} /></button>}
            {showInactive && <div className="medication-list inactive-list">{medList.filter(m => !m.active).map(med => <MedicationCard key={med.id} medication={med} canEdit={false} onEdit={() => undefined} onDeactivate={() => undefined} />)}</div>}
          </section>
          <section className="section-block"><div className="section-heading"><div><span className="eyebrow">REGISTRO DEL DÍA</span><h2>Horarios de hoy</h2></div><Link className="text-link small-copy" href="/historial" data-testid="link-see-history">Ver historial <ArrowRight size={16} /></Link></div>
            {!todayEvents.length ? <div className="quiet-note"><Clock3 size={18} /><span>No hay registros de horarios para hoy.</span></div> : <div className="event-list">{todayEvents.map(event => <EventRow key={event.id} event={event} canRecord={isPatient} onRecord={(status) => {
              const clientEventId = crypto.randomUUID();
              recordDirectEvent(event, status, clientEventId, () => {
                void eventsQuery.refetch(); void dashQuery.refetch();
              }, queue => localStorage.setItem('medicarem-pending-events', JSON.stringify([...getOfflineQueue(), queue])));
            }} />)}</div>}
            <p className="disclaimer"><ShieldCheck size={15} /> Registrar una confirmación u omisión no verifica la toma ni sustituye una indicación profesional.</p>
          </section>
        </>}
        {editing !== false && <MedicationDialog medication={editing} onClose={() => setEditing(false)} patientId={patientId} />}
      </>}
  </div>;
}

function MedicationCard({ medication, canEdit, onEdit, onDeactivate }: { medication: Medication; canEdit: boolean; onEdit: () => void; onDeactivate: () => void }) {
  return <article className="med-card" data-testid={`card-medication-${medication.id}`}><div className="med-icon"><Stethoscope size={20} /></div><div className="med-main"><div className="med-titleline"><h3>{medication.name}</h3>{!medication.active && <StatusBadge status="INACTIVE" />}</div><p>{medication.presentation || 'Presentación no especificada'} <span>·</span> {medication.prescribedDose}</p>{medication.notes && <small>{medication.notes}</small>}<div className="med-times">{medication.schedules.map(schedule => <span key={schedule.id}><Clock3 size={14} />{schedule.time} <small>{weekdayLabel(schedule.weekdays)}</small></span>)}</div></div>
    {canEdit && medication.active && <div className="med-actions"><button className="icon-button" onClick={onEdit} aria-label={`Editar ${medication.name}`} data-testid={`button-edit-medication-${medication.id}`}><Settings2 size={18} /></button><button className="icon-button danger-icon" onClick={onDeactivate} aria-label={`Desactivar ${medication.name}`} data-testid={`button-deactivate-medication-${medication.id}`}><X size={18} /></button></div>}
  </article>;
}

function MedicationDialog({ medication, onClose, patientId }: { medication: Medication | null; onClose: () => void; patientId?: number }) {
  const client = useQueryClient();
  const create = useCreateMedication();
  const update = useUpdateMedication();
  const [name, setName] = useState(medication?.name ?? '');
  const [presentation, setPresentation] = useState(medication?.presentation ?? '');
  const [dose, setDose] = useState(medication?.prescribedDose ?? '');
  const [notes, setNotes] = useState(medication?.notes ?? '');
  const schedule = medication?.schedules[0];
  const [time, setTime] = useState(schedule?.time ?? '08:00');
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(medication?.startDate?.slice(0, 10) ?? schedule?.startDate?.slice(0, 10) ?? localISODate());
  const [endDate, setEndDate] = useState(medication?.endDate?.slice(0, 10) ?? '');
  const [error, setError] = useState('');
  const pending = create.isPending || update.isPending;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!weekdays.length) { setError('Selecciona al menos un día.'); return; }
    const schedules: ScheduleInput[] = medication
      ? medication.schedules.map((item, index) => ({
          time: index === 0 ? time : item.time,
          weekdays: index === 0 ? weekdays : item.weekdays,
          startDate: index === 0 ? startDate : item.startDate.slice(0, 10),
          ...(item.endDate ? { endDate: item.endDate.slice(0, 10) } : {}),
        }))
      : [{ time, weekdays, startDate }];
    if (endDate && endDate < startDate) { setError('La fecha final debe ser igual o posterior a la fecha inicial.'); return; }
    const payload = { name: name.trim(), presentation: presentation.trim(), prescribedDose: dose.trim(), notes: notes.trim() || null, startDate, endDate: endDate || null, schedules };
    const success = () => { void client.invalidateQueries({ queryKey: getListMedicationsQueryKey({ patientId, includeInactive: true }) }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey({ patientId }) }); onClose(); };
    if (medication) update.mutate({ id: medication.id, data: payload }, { onSuccess: success, onError: () => setError('No pudimos guardar los cambios. Inténtalo de nuevo.') });
    else create.mutate({ data: payload }, { onSuccess: success, onError: () => setError('No pudimos agregar el medicamento. Revisa los datos e inténtalo de nuevo.') });
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="med-dialog-title"><header className="dialog-header"><div><span className="eyebrow">{medication ? 'ACTUALIZA TU LISTA' : 'NUEVO EN TU LISTA'}</span><h2 id="med-dialog-title">{medication ? 'Editar medicamento' : 'Agregar medicamento'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar" data-testid="button-close-medication-dialog"><X size={20} /></button></header>
    <form onSubmit={submit} className="form-stack"><label>Nombre del medicamento<input value={name} onChange={e => setName(e.target.value)} required maxLength={120} data-testid="input-medication-name" placeholder="Como aparece en la fórmula" /></label><div className="form-row"><label>Presentación<input value={presentation} onChange={e => setPresentation(e.target.value)} maxLength={120} data-testid="input-medication-presentation" placeholder="Tableta, cápsula…" /></label><label>Dosis prescrita<input value={dose} onChange={e => setDose(e.target.value)} required maxLength={120} data-testid="input-medication-dose" placeholder="Según tu fórmula" /></label></div>
      <fieldset className="day-picker"><legend>Días de la semana</legend><div>{['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => <button type="button" className={weekdays.includes(index) ? 'day-chip selected' : 'day-chip'} onClick={() => setWeekdays(list => list.includes(index) ? list.filter(d => d !== index) : [...list, index].sort())} aria-pressed={weekdays.includes(index)} key={`${day}-${index}`} data-testid={`button-weekday-${index}`}>{day}</button>)}</div></fieldset>
       <div className="form-row"><label>Hora<input type="time" value={time} onChange={e => setTime(e.target.value)} required data-testid="input-medication-time" /></label><label>Desde<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required data-testid="input-medication-start-date" /></label></div><label>Hasta (opcional)<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} data-testid="input-medication-end-date" /></label><label>Nota opcional<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={2} data-testid="input-medication-notes" placeholder="Información de tu fórmula" /></label>
      {error && <p className="form-message error-message" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} data-testid="button-cancel-medication">Cancelar</button><button type="submit" className="button button-primary" disabled={pending} data-testid="button-submit-medication">{pending ? 'Guardando…' : medication ? 'Guardar cambios' : 'Agregar a mi lista'}</button></div>
    </form></section></div>;
}

function useDeactivateHandler(patientId?: number) {
  const client = useQueryClient();
  const deactivate = useDeactivateMedication();
  useEffect(() => {
    const listener = (event: Event) => {
      const id = (event as CustomEvent<number>).detail;
      deactivate.mutate({ id }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getListMedicationsQueryKey({ patientId, includeInactive: true }) }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey({ patientId }) }); }, onError: () => window.alert('No pudimos actualizar el medicamento. Inténtalo de nuevo.') });
    };
    document.addEventListener('medicarem-deactivate', listener);
    return () => document.removeEventListener('medicarem-deactivate', listener);
  }, [client, deactivate.mutate, patientId]);
}
function HistoryPage({ profile }: { profile: Profile }) {
  const context = usePatientContext(profile);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const patientId = context.patientId ?? undefined;
  const params = useMemo(() => ({ patientId, from: from || undefined, to: to || undefined, status: (status || undefined) as MedicationEvent['status'] | undefined }), [patientId, from, to, status]);
  const events = useListEvents(params, { query: { enabled: !!context.patientId, queryKey: getListEventsQueryKey(params) } });
  const filtered = events.data ?? [];
  return <div><DashboardHeader profile={profile} title="Historial" subtitle="Consulta los registros por fecha y estado.">{context.selector}</DashboardHeader>
    {!context.patientId ? <EmptyState title="Sin información compartida" text="Cuando tengas acceso autorizado a un espacio, su historial aparecerá aquí." /> :
      <section className="history-panel"><div className="filter-bar"><label>Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-filter-from" /></label><label>Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-filter-to" /></label><label>Estado<select value={status} onChange={e => setStatus(e.target.value)} data-testid="select-event-status"><option value="">Todos los estados</option><option value="PENDING">Pendiente</option><option value="CONFIRMED">Confirmado</option><option value="DECLARED_OMISSION">Omisión declarada</option><option value="UNCONFIRMED">Sin confirmar</option></select></label><button className="button button-secondary filter-reset" onClick={() => { setFrom(''); setTo(''); setStatus(''); }} data-testid="button-clear-filters">Limpiar</button></div>
        <div className="history-head"><span>REGISTRO</span><span>ESTADO</span></div>
        {events.isLoading ? <div className="skeleton-card" /> : events.isError ? <ErrorMessage onRetry={() => void events.refetch()} /> : !filtered.length ? <EmptyState title="No hay registros con estos filtros" text="Prueba con otras fechas o selecciona todos los estados." /> : <div className="event-list">{filtered.map(event => <EventRow key={event.id} event={event} canRecord={profile.role === UserRole.PATIENT} onRecord={async eventStatus => {
          const id = crypto.randomUUID();
          await recordDirectEvent(event, eventStatus, id, () => void events.refetch(), queue => localStorage.setItem('medicarem-pending-events', JSON.stringify([...getOfflineQueue(), queue])));
        }} />)}</div>}
      </section>}
  </div>;
}

function EventRow({ event, canRecord, onRecord }: { event: MedicationEvent; canRecord: boolean; onRecord: (status: EventRecordInputStatus) => void }) {
  const canSet = canRecord && (event.status === 'PENDING' || event.status === 'UNCONFIRMED');
  return <article className="event-row" data-testid={`row-event-${event.id}`}><div className="event-date"><strong>{formatTime(event.scheduledAt)}</strong><span>{formatDate(event.scheduledAt)}</span></div><div className="event-detail"><strong>{event.medicationName}</strong><span>{event.prescribedDose}{event.patientName ? ` · ${event.patientName}` : ''}</span></div><div className="event-state"><StatusBadge status={event.status} />{canSet && <div className="event-actions"><button className="button button-confirm" onClick={() => onRecord(EventRecordInputStatus.CONFIRMED)} data-testid={`button-confirm-event-${event.id}`}><Check size={15} /> Confirmar</button><button className="button button-omit" onClick={() => onRecord(EventRecordInputStatus.DECLARED_OMISSION)} data-testid={`button-omit-event-${event.id}`}>Declarar omisión</button></div>}</div></article>;
}
function StatusBadge({ status }: { status: string }) {
  const details: Record<string, { label: string; symbol: string; kind: string }> = {
    PENDING: { label: 'Pendiente', symbol: '•', kind: 'pending' },
    UNCONFIRMED: { label: 'Sin confirmar', symbol: '○', kind: 'unconfirmed' },
    CONFIRMED: { label: 'Confirmado', symbol: '✓', kind: 'confirmed' },
    DECLARED_OMISSION: { label: 'Omisión declarada', symbol: '—', kind: 'omission' },
    INACTIVE: { label: 'Inactivo', symbol: '·', kind: 'unconfirmed' },
    ACTIVE: { label: 'Activo', symbol: '✓', kind: 'confirmed' },
    REVOKED: { label: 'Revocado', symbol: '—', kind: 'omission' },
  };
  const item = details[status] ?? { label: status, symbol: '·', kind: 'unconfirmed' };
  return <span className={`status-badge status-${item.kind}`}><b aria-hidden="true">{item.symbol}</b>{item.label}</span>;
}

type OfflineItem = { eventId: number; status: EventRecordInputStatus; clientEventId: string };
function getOfflineQueue(): OfflineItem[] {
  try { return JSON.parse(localStorage.getItem('medicarem-pending-events') || '[]') as OfflineItem[]; } catch { return []; }
}
async function recordDirectEvent(event: MedicationEvent, status: EventRecordInputStatus, clientEventId: string, success: () => void, failed: (item: OfflineItem) => void) {
  // This is an intentional direct browser API action through the generated hook in EventRecorder below.
  document.dispatchEvent(new CustomEvent('medicarem-record-event', { detail: { eventId: event.id, status, clientEventId, success, failed } }));
}
function EventRecorder() {
  const client = useQueryClient();
  const record = useRecordEvent();
  const sync = useSyncEvents();
  const [message, setMessage] = useState('');
  const [queued, setQueued] = useState(() => getOfflineQueue().length);
  useEffect(() => {
    const recordListener = (event: Event) => {
      const item = (event as CustomEvent<{ eventId: number; status: EventRecordInputStatus; clientEventId: string; success: () => void; failed: (item: OfflineItem) => void }>).detail;
      record.mutate({ data: { eventId: item.eventId, status: item.status, clientEventId: item.clientEventId } }, {
        onSuccess: () => { item.success(); void client.invalidateQueries({ queryKey: getListEventsQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); },
        onError: () => { const queuedItem = { eventId: item.eventId, status: item.status, clientEventId: item.clientEventId }; item.failed(queuedItem); setQueued(getOfflineQueue().length); setMessage('Sin conexión. Guardamos el registro en este dispositivo para sincronizarlo después.'); },
      });
    };
    document.addEventListener('medicarem-record-event', recordListener);
    return () => document.removeEventListener('medicarem-record-event', recordListener);
  }, [client, record.mutate]);
  useEffect(() => {
    const syncListener = () => {
      const queue = getOfflineQueue();
      if (!queue.length) { setMessage('No hay registros pendientes de sincronización.'); return; }
      sync.mutate({ data: { events: queue } }, { onSuccess: () => { localStorage.removeItem('medicarem-pending-events'); setQueued(0); setMessage('Registros sincronizados.'); void client.invalidateQueries({ queryKey: getListEventsQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => setMessage('No fue posible sincronizar. Conservamos tus registros en este dispositivo.') });
    };
    document.addEventListener('medicarem-sync-events', syncListener);
    return () => document.removeEventListener('medicarem-sync-events', syncListener);
  }, [client, sync.mutate]);
  return <div className="sync-widget">{queued > 0 && <button className="button button-secondary" onClick={() => document.dispatchEvent(new Event('medicarem-sync-events'))} disabled={sync.isPending} data-testid="button-sync-events"><RefreshCw size={16} /> {sync.isPending ? 'Sincronizando…' : `Sincronizar ${queued} ${queued === 1 ? 'registro' : 'registros'}`}</button>}{message && <span role="status">{message}</span>}</div>;
}

function CaregiverPage({ profile }: { profile: Profile }) {
  const client = useQueryClient();
  const invitations = useListCaregiverInvitations();
  const create = useCreateCaregiverInvitation();
  const redeem = useRedeemCaregiverInvitation();
  const update = useUpdateCaregiverInvitation();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const patient = profile.role === UserRole.PATIENT;
  const onCreate = () => create.mutate(undefined, { onSuccess: () => { setMessage('Código creado. Compártelo solo con la persona que elegiste.'); void client.invalidateQueries({ queryKey: getListCaregiverInvitationsQueryKey() }); }, onError: () => setMessage('No pudimos crear el código. Inténtalo de nuevo.') });
  const onRedeem = (event: FormEvent) => { event.preventDefault(); redeem.mutate({ data: { code: code.trim().toUpperCase() } }, { onSuccess: () => { setCode(''); setMessage('Solicitud enviada. La persona paciente debe aprobar el acceso.'); void client.invalidateQueries({ queryKey: getListCaregiverInvitationsQueryKey() }); }, onError: () => setMessage('No encontramos ese código o ya no está disponible.') }); };
  const actOn = (id: number, status: 'ACTIVE' | 'REVOKED') => update.mutate({ id, data: { status } }, { onSuccess: () => void client.invalidateQueries({ queryKey: getListCaregiverInvitationsQueryKey() }), onError: () => setMessage('No pudimos actualizar el acceso. Inténtalo de nuevo.') });
  return <div><DashboardHeader profile={profile} title="Personas cuidadoras" subtitle={patient ? 'Decide quién puede consultar la información que compartes.' : 'Solicita acceso a una persona que te haya compartido un código.'} />
    {patient ? <section className="invite-create"><div className="invite-icon"><UsersRound size={23} /></div><div><span className="eyebrow">COMPARTIR CON CONFIANZA</span><h2>Invita a alguien de confianza</h2><p>Genera un código de un solo uso. La otra persona podrá solicitar acceso y tú decides si lo apruebas.</p></div><button className="button button-primary" onClick={onCreate} disabled={create.isPending} data-testid="button-create-invitation"><Plus size={18} />{create.isPending ? 'Creando…' : 'Crear código'}</button></section> :
      <section className="invite-create redeem-card"><div className="invite-icon"><HeartHandshake size={23} /></div><div><span className="eyebrow">¿TIENES UN CÓDIGO?</span><h2>Conecta con alguien</h2><p>Al enviar el código, la persona paciente recibirá tu solicitud. Su aprobación es necesaria para compartir datos.</p></div><form className="redeem-form" onSubmit={onRedeem}><label className="visually-hidden" htmlFor="invite-code">Código de invitación</label><input id="invite-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} minLength={6} maxLength={16} required placeholder="Escribe el código" data-testid="input-invitation-code" /><button className="button button-primary" disabled={redeem.isPending} data-testid="button-redeem-invitation">{redeem.isPending ? 'Enviando…' : 'Enviar solicitud'} <ArrowRight size={16} /></button></form></section>}
    {message && <p className="form-message" role="status">{message}</p>}
    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">ACCESOS Y SOLICITUDES</span><h2>{patient ? 'Personas vinculadas' : 'Mis conexiones'}</h2></div></div>
      {invitations.isLoading ? <div className="skeleton-card" /> : invitations.isError ? <ErrorMessage onRetry={() => void invitations.refetch()} /> : !invitations.data?.length ? <EmptyState title={patient ? 'Aún no has compartido tu espacio' : 'Todavía no tienes conexiones'} text={patient ? 'Cuando crees y compartas un código, las solicitudes aparecerán aquí.' : 'Usa el código de invitación que te compartieron para enviar una solicitud.'} /> :
        <div className="invitation-list">{invitations.data.map(invite => <article className="invitation-row" key={invite.id} data-testid={`row-invitation-${invite.id}`}><span className="invite-avatar"><UsersRound size={18} /></span><div className="invitation-info"><strong>{patient ? (invite.caregiverName || 'Solicitud de acompañamiento') : invite.patientName}</strong><span>{invite.status === InvitationStatus.PENDING ? `Solicitud del ${formatDate(invite.createdAt)}` : `Desde ${formatDate(invite.createdAt)}`}</span>{patient && invite.code && invite.status === InvitationStatus.PENDING && <code>{invite.code}</code>}</div><StatusBadge status={invite.status} />
          {patient && invite.status === InvitationStatus.PENDING && <div className="invitation-actions"><button className="button button-confirm" onClick={() => actOn(invite.id, 'ACTIVE')} disabled={update.isPending} data-testid={`button-approve-invitation-${invite.id}`}><Check size={15} /> Aprobar</button><button className="button button-omit" onClick={() => actOn(invite.id, 'REVOKED')} disabled={update.isPending} data-testid={`button-reject-invitation-${invite.id}`}>Rechazar</button></div>}
          {patient && invite.status === InvitationStatus.ACTIVE && <button className="button button-omit" onClick={() => { if (window.confirm('¿Retirar el acceso de esta persona?')) actOn(invite.id, 'REVOKED'); }} disabled={update.isPending} data-testid={`button-revoke-invitation-${invite.id}`}>Retirar acceso</button>}
        </article>)}</div>}
    </section>
  </div>;
}

function ProfilePage({ profile }: { profile: Profile }) {
  const { user } = useUser();
  const client = useQueryClient();
  const save = useSaveProfile();
  const [name, setName] = useState(profile.displayName);
  const [largeText, setLargeText] = useState(profile.largeText);
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ data: { displayName: name.trim(), role: profile.role, timezone: profile.timezone || 'America/Bogota', largeText, notificationsEnabled: profile.notificationsEnabled } }, { onSuccess: () => { setMessage('Tus preferencias se guardaron.'); void client.invalidateQueries({ queryKey: getGetProfileQueryKey() }); }, onError: () => setMessage('No pudimos guardar tus preferencias. Inténtalo de nuevo.') });
  };
  return <div><DashboardHeader profile={profile} title="Mi perfil" subtitle="Ajusta tu información y preferencias de lectura." />
    <div className="profile-layout"><form className="profile-panel form-stack" onSubmit={submit}><div className="section-heading"><div><span className="eyebrow">DATOS DE LA CUENTA</span><h2>Tu información</h2></div></div><div className="account-summary"><span className="profile-avatar large">{initials(profile.displayName)}</span><div><strong>{profile.displayName}</strong><span>{profile.role === UserRole.PATIENT ? 'Persona paciente' : 'Persona cuidadora'}</span></div></div>
      <label>Nombre visible<input value={name} onChange={e => setName(e.target.value)} required maxLength={80} data-testid="input-profile-name" /></label><label>Correo electrónico<input value={user?.primaryEmailAddress?.emailAddress ?? ''} readOnly data-testid="input-profile-email" /><small>Administrado de forma segura por tu cuenta.</small></label>
      <div className="profile-setting"><span><strong>Texto más grande</strong><small>Aumenta el tamaño de lectura en toda la aplicación.</small></span><button type="button" role="switch" aria-checked={largeText} onClick={() => setLargeText(v => !v)} className={`switch ${largeText ? 'switch-on' : ''}`} data-testid="switch-large-text"><i /></button></div>
      {message && <p className="form-message" role="status">{message}</p>}<button className="button button-primary" type="submit" disabled={save.isPending} data-testid="button-save-profile">{save.isPending ? 'Guardando…' : 'Guardar preferencias'} <Check size={17} /></button>
    </form>
    <aside className="profile-aside"><div className="aside-icon"><ShieldCheck size={22} /></div><span className="eyebrow">PRIVACIDAD</span><h3>Tú tienes el control.</h3><p>Los datos de tu espacio se muestran únicamente a las personas autorizadas. Puedes revisar o retirar permisos desde Cuidadores.</p><Link href="/cuidadores" className="text-link" data-testid="link-profile-caregivers">Revisar accesos <ArrowRight size={16} /></Link><hr /><span className="eyebrow">TU ZONA HORARIA</span><strong>Colombia · Bogotá</strong><small>{profile.lastSyncedAt ? `Última sincronización: ${formatDateTime(profile.lastSyncedAt)}` : 'La hora se muestra según tu zona configurada.'}</small></aside></div>
  </div>;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function localISODate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function weekdayLabel(days: number[]) { const labels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']; return days.length === 7 ? 'Todos los días' : days.map(day => labels[day]).join(', '); }

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Te damos la bienvenida', subtitle: 'Ingresa para continuar con tu espacio.' } },
      signUp: { start: { title: 'Crea tu cuenta', subtitle: 'Organiza tu rutina con MEDICAREM.' } },
    }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator /><EventRecorder />
      <ErrorBoundary><Switch>
        <Route path="/"><HomeRedirect /></Route>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/medicamentos"><AuthRoute><ProtectedApp /></AuthRoute></Route>
        <Route path="/historial"><AuthRoute><ProtectedApp /></AuthRoute></Route>
        <Route path="/cuidadores"><AuthRoute><ProtectedApp /></AuthRoute></Route>
        <Route path="/perfil"><AuthRoute><ProtectedApp /></AuthRoute></Route>
        <Route component={NotFound} />
      </Switch></ErrorBoundary>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;
