import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import {
  Cake,
  Bell,
  Gear,
  Lightbulb,
  ArrowRight,
  SignOut,
  UserCircle,
  ShieldCheck,
  List,
  X,
  Pause,
  Play,
  SpinnerGap,
  CaretDown,
  SidebarSimple,
} from '@phosphor-icons/react';
import { ReferenceArt, Avatar, Brand } from './art';
import { api } from './api';
import { AppProvider, useApp } from './context';
import { TimerProvider, useTimer } from './timer';
import { NAV, Button, IconButton } from './ui';
import Auth, { AuthFeedback } from './Auth';
import Forms from './forms';
import WoodBoard from './components/WoodBoard';
import RecordArt from './components/RecordArt';
import { LOFI_TRACKS } from './audio';
import { googleResult } from '../shared/google-auth';
import { useCompactLayout } from './responsive';
const Pau = lazy(() => import('./pages/Pau'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Notes = lazy(() => import('./pages/Notes'));
const Pluses = lazy(() => import('./pages/Pluses'));
const Grades = lazy(() => import('./pages/Grades'));
const Study = lazy(() => import('./pages/Study'));
const Community = lazy(() => import('./pages/Community'));
const Bakery = lazy(() => import('./pages/Bakery'));
const Admin = lazy(() => import('./pages/Admin'));
export class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    return this.state.error ? (
      <div className="loading-screen">
        <h1>La Net necessita tornar a carregar</h1>
        <p>Les teves dades desades es conserven.</p>
        <Button onClick={() => location.reload()}>Tornar a obrir</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Workspace({ onLogout }) {
  const { data, walletBalance, page, go, open, setCommunityTab, savePreferences } = useApp();
  const { timer, remaining, toggle, audioType, audioState, playing, loading, toggleMusic } =
    useTimer();
  const musicTrack = LOFI_TRACKS.find((track) => track.id === audioType) || LOFI_TRACKS[0];
  const musicAction = loading
    ? 'Aturar la càrrega de música'
    : playing
      ? 'Pausar música'
      : audioState === 'paused'
        ? 'Reprendre música'
        : 'Reproduir música';
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(!!data.preferences?.sidebarCollapsed);
  const [collapseBusy, setCollapseBusy] = useState(false);
  const [cakePulse, setCakePulse] = useState(false);
  useEffect(() => {
    let timer;
    const arrived = () => {
      setCakePulse(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCakePulse(false), 850);
    };
    window.addEventListener('lanet:cake-arrived', arrived);
    return () => {
      window.removeEventListener('lanet:cake-arrived', arrived);
      clearTimeout(timer);
    };
  }, []);
  useEffect(
    () => setCollapsed(!!data.preferences?.sidebarCollapsed),
    [data.preferences?.sidebarCollapsed],
  );
  async function collapseSidebar() {
    if (collapseBusy) return;
    const next = !collapsed;
    setCollapsed(next);
    setCollapseBusy(true);
    try {
      await savePreferences({ sidebarCollapsed: next });
    } catch {
      setCollapsed(!next);
    } finally {
      setCollapseBusy(false);
    }
  }
  const smallScreen = useCompactLayout();
  const sidebarRef = useRef(null);
  const menuReturnFocus = useRef(null);
  useEffect(() => {
    if (!mobile || !smallScreen) return;
    const previousFocus = menuReturnFocus.current || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = sidebarRef.current;
    (
      panel?.querySelector('.mobile-more-item[aria-current="page"]') ||
      panel?.querySelector('.mobile-more-item')
    )?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [mobile, smallScreen]);
  function menuKeys(e) {
    if (!smallScreen || !mobile) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setMobile(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const controls = [...sidebarRef.current.querySelectorAll('button,a[href]')].filter(
      (el) => !el.disabled && el.getClientRects().length,
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  useEffect(() => {
    setMobile(false);
  }, [smallScreen, page]);
  useEffect(() => {
    if (!data.user.configured) open('configure');
  }, []);
  const pages = {
    schedule: Schedule,
    notes: Notes,
    pluses: Pluses,
    grades: Grades,
    pau: Pau,
    study: Study,
    community: Community,
    bakery: Bakery,
    admin: Admin,
  };
  const Page = pages[page] || Schedule;
  const navigate = (p) => {
    go(p);
    setMobile(false);
  };
  return (
    <div
      className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}
      data-density={data.preferences?.density || 'compact'}
      data-compact={smallScreen}
    >
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Tancar menú"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="desktop-menu"
        className="sidebar"
        inert={smallScreen}
        aria-hidden={smallScreen ? true : undefined}
      >
        <Brand href="#schedule" onClick={() => navigate('schedule')} />
        <a
          className="compact-brand"
          href="#schedule"
          aria-label="La Net · Anar a l’horari i l’agenda"
          title="La Net"
          onClick={() => navigate('schedule')}
        >
          <img src="/lanet-mark.svg" alt="" width="44" height="44" />
        </a>
        <IconButton
          label={collapsed ? 'Desplegar barra lateral' : 'Plegar barra lateral'}
          className="icon-button collapse-toggle"
          onClick={collapseSidebar}
          disabled={collapseBusy}
          aria-expanded={!collapsed}
        >
          <SidebarSimple size={22} />
        </IconButton>
        <IconButton
          label="Tancar menú"
          className="icon-button sidebar-close"
          onClick={() => setMobile(false)}
        >
          <X size={22} />
        </IconButton>
        <div className="course-label">
          <span className="status-dot" />{' '}
          {data.groups.find((g) => g.id === data.user.group_id)?.name || 'El meu curs'}
        </div>
        <nav aria-label="Principal">
          {NAV.map(([key, label]) => (
            <button
              key={key}
              className={`nav-item ${page === key ? 'active' : ''}`}
              onClick={() => navigate(key)}
              aria-label={label}
              title={label}
              aria-current={page === key ? 'page' : undefined}
            >
              <span className="nav-art" aria-hidden="true">
                <ReferenceArt name={key} originalSize />
              </span>
              <span>
                {key === 'schedule' ? (
                  <>
                    Horari
                    <br />i agenda
                  </>
                ) : (
                  label
                )}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item subtle proposal-shortcut"
            aria-label="Proposa una idea"
            title="Proposa una idea"
            onClick={() => {
              open('proposal');
              setMobile(false);
            }}
          >
            <ReferenceArt name="bulb" size={26} />
            <span>Proposa una idea</span>
          </button>
          <button
            className="nav-item subtle"
            aria-label="Configurar perfil"
            title="Configurar perfil"
            onClick={() => {
              open('profile');
              setMobile(false);
            }}
          >
            <UserCircle size={23} />
            <span>El meu perfil</span>
          </button>
          {data.user.role !== 'student' && (
            <button
              className={`nav-item subtle ${page === 'admin' ? 'active' : ''}`}
              aria-label="Gestió del centre"
              title="Gestió del centre"
              onClick={() => navigate('admin')}
            >
              <ShieldCheck size={20} />
              <span>Gestió del centre</span>
            </button>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar" inert={smallScreen && mobile}>
          <div className="topbar-context">
            {smallScreen && (
              <a
                className="mobile-brand"
                href="#schedule"
                aria-label="La Net · Anar a l’horari i l’agenda"
                onClick={() => navigate('schedule')}
              >
                <img src="/lanet-mark.svg" alt="" width="36" height="36" />
              </a>
            )}
            <IconButton
              label="Obrir menú"
              className="menu-button icon-button"
              onClick={(e) => {
                menuReturnFocus.current = e.currentTarget;
                setMobile(true);
              }}
            >
              <List size={24} />
            </IconButton>
            <span className="breadcrumb workspace-course">
              {data.groups.find((g) => g.id === data.user.group_id)?.name || 'El meu curs'}
            </span>
          </div>
          <WoodBoard />
          <div className="topbar-actions">
            <button
              type="button"
              className="audio-pill music-header-control"
              data-music-state={audioState}
              aria-label={`${musicAction}: ${musicTrack.title}`}
              aria-pressed={playing || loading}
              title={`${musicAction} · ${musicTrack.title}`}
              onClick={toggleMusic}
            >
              <RecordArt track={musicTrack} spinning={playing} />
              <span className="music-header-action" aria-hidden="true">
                {loading ? (
                  <SpinnerGap className="spin" size={12} />
                ) : playing ? (
                  <Pause size={10} weight="fill" />
                ) : (
                  <Play size={10} weight="fill" />
                )}
              </span>
            </button>
            {timer.running && (
              <button
                className="timer-pill"
                aria-label={`Pastisdoro: ${Math.floor(remaining / 60)} minuts. Obrir estudi`}
                onClick={() => navigate('study')}
              >
                <span className="status-dot" />
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </button>
            )}
            <button
              className={`cake-balance ${cakePulse ? 'receiving-cake' : ''}`}
              onClick={() => navigate('bakery')}
              aria-label={`${walletBalance} pastissos. Obrir la Pastisseria`}
            >
              <ReferenceArt name="cake" size={42} />
              <strong>{walletBalance}</strong>
            </button>
            <IconButton
              label="Veure avisos"
              onClick={() => {
                setCommunityTab('notices');
                navigate('community');
              }}
            >
              <ReferenceArt name="bell" size={27} />
            </IconButton>
            <button
              className="profile-button"
              aria-label={`Perfil de ${data.user.name}`}
              onClick={() => open('profile')}
            >
              <Avatar name={data.user.name} src={data.user.avatar_url} />
              <span>
                <strong>{data.user.name}</strong>
              </span>
              <CaretDown size={20} />
            </button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={`main-content page-${page}`}
          inert={smallScreen && mobile}
        >
          <Suspense fallback={<p role="status">Carregant apartat…</p>}>
            <Page />
          </Suspense>
        </main>
        <footer className="app-footer" inert={smallScreen && mobile}>
          <span>{data.settings.school_name || 'La Net'} · Feta pels estudiants</span>
          <button onClick={onLogout}>
            <SignOut size={16} /> Sortir
          </button>
        </footer>
        <div
          ref={sidebarRef}
          className="mobile-navigation"
          role={smallScreen && mobile ? 'dialog' : undefined}
          aria-modal={smallScreen && mobile ? true : undefined}
          aria-label={smallScreen && mobile ? 'Menú principal' : undefined}
          onKeyDown={menuKeys}
        >
          {smallScreen && mobile && (
            <section id="main-menu" className="mobile-more-panel" aria-label="Més seccions">
              <div className="mobile-more-heading">
                <h2>Tots els apartats</h2>
                <IconButton label="Tancar menú" onClick={() => setMobile(false)}>
                  <X size={21} />
                </IconButton>
              </div>
              <nav className="mobile-more-grid" aria-label="Tots els apartats">
                {NAV.map(([key, label]) => (
                  <button
                    key={key}
                    className={`mobile-more-item ${page === key ? 'active' : ''}`}
                    aria-current={page === key ? 'page' : undefined}
                    aria-label={label}
                    title={label}
                    onClick={() => navigate(key)}
                  >
                    <ReferenceArt name={key} size={32} />
                    <span>{key === 'schedule' ? 'Curs' : key === 'pau' ? 'PAU' : label}</span>
                  </button>
                ))}
              </nav>
              <div className="mobile-more-account">
                <button
                  onClick={() => {
                    setMobile(false);
                    open('profile');
                  }}
                  aria-label="Configurar perfil"
                >
                  <UserCircle size={23} />
                  <span>El meu perfil</span>
                </button>
                <button
                  onClick={() => {
                    setMobile(false);
                    open('proposal');
                  }}
                  aria-label="Proposa una idea"
                >
                  <Lightbulb size={23} />
                  <span>Proposa una idea</span>
                </button>
                {data.user.role !== 'student' && (
                  <button
                    onClick={() => navigate('admin')}
                    aria-current={page === 'admin' ? 'page' : undefined}
                  >
                    <ShieldCheck size={23} />
                    <span>Gestió del centre</span>
                  </button>
                )}
              </div>
            </section>
          )}
          <nav className="bottom-nav" aria-label="Navegació mòbil">
            {[
              ['schedule', 'Curs'],
              ['notes', 'Continguts'],
              ['grades', 'Notes'],
              ['study', 'Estudi'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-current={page === key ? 'page' : undefined}
                className={page === key ? 'active' : ''}
                onClick={() => navigate(key)}
              >
                <ReferenceArt name={key} size={29} />
                <span>{label}</span>
              </button>
            ))}
            <button
              aria-label="Més seccions"
              aria-expanded={mobile}
              aria-controls="main-menu"
              className={
                mobile || ['pluses', 'pau', 'community', 'bakery', 'admin'].includes(page)
                  ? 'active'
                  : ''
              }
              onClick={(e) => {
                menuReturnFocus.current = e.currentTarget;
                setMobile((visible) => !visible);
              }}
            >
              {mobile ? <X size={27} /> : <List size={27} weight="duotone" />}
              <span>Més</span>
            </button>
          </nav>
        </div>
      </div>
      <Forms />
    </div>
  );
}
export default function App() {
  const [data, setData] = useState(null),
    [status, setStatus] = useState(null),
    [error, setError] = useState('');
  const [authResult, setAuthResult] = useState(() => googleResult(location.href));
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.has('auth_result')) {
      url.searchParams.delete('auth_result');
      history.replaceState(history.state, '', url.href);
    }
  }, []);
  useEffect(() => {
    const expired = () => setData(null);
    window.addEventListener('lanet:sessionexpired', expired);
    return () => window.removeEventListener('lanet:sessionexpired', expired);
  }, []);
  useEffect(() => {
    api('/auth/status')
      .then(async (s) => {
        const d = s.authenticated ? await api('/bootstrap') : null;
        setStatus(s);
        setData(d);
        // The workspace itself confirms successful entry; avoid covering its controls.
        if (d) setAuthResult((current) => (current?.type === 'success' ? null : current));
      })
      .catch((e) => setError(e.message));
  }, []);
  async function logout() {
    await api('/auth/logout', { method: 'POST', body: {} });
    setData(null);
    setAuthResult(null);
    location.hash = '';
  }
  if (error) return <AuthFeedback error={error} onRetry={() => location.reload()} />;
  if (!status) return <AuthFeedback />;
  const resultNotice = authResult && (
    <div
      className={`auth-result ${authResult.type}`}
      role={authResult.type === 'error' ? 'alert' : 'status'}
    >
      <p>{authResult.message}</p>
      <button type="button" aria-label="Tancar missatge" onClick={() => setAuthResult(null)}>
        <X size={18} />
      </button>
    </div>
  );
  if (!data)
    return (
      <Boundary>
        <Auth status={status} notice={authResult} onDismissNotice={() => setAuthResult(null)} />
      </Boundary>
    );
  return (
    <Boundary>
      <AppProvider key={data.user.id} initial={data}>
        {resultNotice}
        <TimerProvider>
          <a
            className="skip-link"
            href="#main-content"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById('main-content')?.focus();
            }}
          >
            Saltar al contingut
          </a>
          <Workspace onLogout={logout} />
        </TimerProvider>
      </AppProvider>
    </Boundary>
  );
}
