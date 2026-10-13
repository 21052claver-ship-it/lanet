import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { useApp } from '../context';
import { SubjectChip } from '../ui';
import { evaluationKind, SCHOOL_RESOURCES } from '../../shared/student-guide';
import '../student-guide.css';

export default function SchoolGuide() {
  const { enrolled } = useApp();
  return (
    <div className="school-guide">
      <section className="panel">
        <h2>Com s’avaluen les teves matèries</h2>
        <div className="school-evaluation-grid">
          {[
            ['cumulative', 'Acumulatives'],
            ['equal', 'No acumulatives'],
          ].map(([kind, label]) => (
            <div key={kind}>
              <h3>{label}</h3>
              <div className="school-subjects">
                {enrolled
                  .filter((subject) => evaluationKind(subject.id) === kind)
                  .map((subject) => (
                    <SubjectChip key={subject.id} subject={subject} />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <p className="assessment-hint">
          Classificació de la presentació BAT2, pàgina 9. A Notes pots configurar els pesos exactes
          del professorat per a cada assignatura.
        </p>
      </section>
      <section className="panel">
        <h2>Plusos acadèmics i de voluntariat</h2>
        <p>
          Comparteixen un màxim de <strong>0,50 punts per matèria</strong>: dos de 0,25 o un de
          0,50. Registra la nota corregida a la nota final del curs.
        </p>
        <p>
          El voluntariat ha de ser un servei als altres no remunerat. Cada plus de voluntariat
          equival a 0,25 punts; el centre en determina l’assignació i la validació. Si una matèria
          ja té +0,50, no s’hi pot sumar un altre complement.
        </p>
      </section>
      <section className="panel">
        <h2>Recursos d’orientació</h2>
        <div className="school-resource-grid">
          {SCHOOL_RESOURCES.map((resource) => (
            <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">
              <strong>
                {resource.title} <ArrowSquareOut size={17} />
              </strong>
              <span>{resource.text}</span>
            </a>
          ))}
        </div>
      </section>
      <details className="panel school-procedures">
        <summary>Canvis de matèria, absències i proves</summary>
        <p>
          La presentació fixa l’1 d’octubre com a límit de canvi de matèries o modalitat. La família
          ho sol·licita al tutor amb còpia a la direcció d’etapa. Personalitzar La Net no tramita un
          canvi acadèmic.
        </p>
        <p>
          Si no pots assistir a una prova, contacta amb el professorat; la família ha d’avisar el
          tutor per correu. La recuperació depèn dels criteris de cada matèria.
        </p>
      </details>
    </div>
  );
}
