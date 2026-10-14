import React, { useRef, useState } from 'react';
import { Check, SignOut, ShieldCheck } from '@phosphor-icons/react';
import { useApp } from '../context';
import { ReferenceArt, Avatar } from '../art';
import { Button, FormError } from '../ui';
import CourseSetup from './CourseSetup';
import '../onboarding.css';

const steps = ['Benvinguda', 'Itinerari', 'Assignatures', 'Tot a punt'];
function Welcome() {
  return (
    <div className="onboarding-welcome">
      <span className="onboarding-eyebrow">El teu dia a dia, més fàcil</span>
      <h1 tabIndex={-1}>
        Menys embolics.
        <br />
        <span>Més espai per aprendre.</span>
      </h1>
      <p className="onboarding-lead">
        Horaris, materials i companys, en un mateix lloc. Preparem La Net amb les assignatures que
        fas de veritat.
      </p>
      <div className="onboarding-features">
        {[
          ['schedule', 'El curs, sota control', 'El teu horari, exàmens i entregues, sempre a mà.'],
          [
            'notes',
            'Aprendre en companyia',
            'Materials compartits, formularis i eines per a cada assignatura.',
          ],
          [
            'study',
            'Troba el teu ritme',
            'Sessions de concentració, música i notes per seguir el teu progrés.',
          ],
        ].map(([art, title, text]) => (
          <div className="onboarding-feature" key={art}>
            <ReferenceArt name={art} size={52} />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="onboarding-reassurance">
        <ShieldCheck size={18} /> Pots canviar el curs i les assignatures més endavant, des del
        perfil.
      </p>
    </div>
  );
}

export default function Onboarding({ onLogout }) {
  const { data } = useApp();
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function leave() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onLogout();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <div className="onboarding-brand">
          <img src="/lanet-mark.svg" width="42" height="42" alt="" />
          <span>
            La Net<span>El teu espai d’estudi</span>
          </span>
        </div>
        <div className="onboarding-account">
          <Avatar name={data.user.name} src={data.user.avatar_url} />
          <span>{data.user.name}</span>
          <Button variant="ghost" onClick={leave} busy={busy} aria-label="Tancar sessió">
            <SignOut size={20} />
            <span>Tancar sessió</span>
          </Button>
        </div>
      </header>
      <div className="onboarding-layout">
        <aside className="onboarding-aside" aria-label="Progrés de la primera entrada">
          <div>
            <span className="onboarding-eyebrow">Comencem amb tu</span>
            <h2>
              Un espai
              <br />a la teva mida.
            </h2>
            <p>
              Unes poques tries.
              <br />
              Tot el curs connectat.
            </p>
          </div>
          <ol className="onboarding-progress">
            {steps.map((label, i) => (
              <li
                key={label}
                aria-current={i === step + 1 ? 'step' : undefined}
                data-done={i < step + 1}
              >
                <span aria-hidden="true">
                  {i < step + 1 ? <Check size={17} weight="bold" /> : `0${i + 1}`}
                </span>
                <div>
                  {label}
                  <small>
                    {
                      [
                        'Descobreix La Net',
                        'El teu camí',
                        'Optatives i professorat',
                        'Revisa el teu horari',
                      ][i]
                    }
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <div className="onboarding-aside-art" aria-hidden="true">
            <ReferenceArt
              name={step < 1 ? 'notebook' : step === 1 ? 'books' : 'schedule'}
              size={124}
            />
            <span>2n de batxillerat · 2026–2027</span>
          </div>
        </aside>
        <main id="main-content" className="onboarding-main" tabIndex={-1}>
          <FormError error={error} />
          <CourseSetup onboarding welcome={<Welcome />} onStepChange={setStep} />
        </main>
      </div>
    </div>
  );
}
