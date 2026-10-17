import React from 'react';
import { Clock, MapPin, BookOpen, ArrowRight, Plus } from '@phosphor-icons/react';
import { useApp } from './context';
import { Modal, SubjectChip, RichText, Button } from './ui';
import { dateLabel, DAYS } from '../shared/domain';
import { slotTeacher } from '../shared/official-schedule';
import { BoardDetail } from './components/WoodBoard';
import { CourseSubject } from './components/CourseGrades';
import { AgendaReview } from './components/Delegates';
import TaskProgressButton from './components/TaskProgressButton';
import { eventSubjectIds } from '../shared/agenda';
import {
  ConfigureForm,
  EventForm,
  ProposalForm,
  ResponseForm,
  AnnouncementForm,
  ProfileForm,
  DeleteForm,
  ReportForm,
  FocusForm,
} from './forms-general';
import {
  NoteForm,
  Reader,
  PlusForm,
  PlusDetail,
  GradeSheetForm,
  GoalForm,
  RestoreForm,
  BannerForm,
} from './forms-resources';
import {
  SchoolForm,
  GroupForm,
  SubjectForm,
  OfferingForm,
  TemplateForm,
  ManageUserForm,
} from './forms-admin';
const forms = {
  configure: ConfigureForm,
  event: EventForm,
  agendaReview: AgendaReview,
  proposal: ProposalForm,
  proposalResponse: ResponseForm,
  announcement: AnnouncementForm,
  profile: ProfileForm,
  delete: DeleteForm,
  report: ReportForm,
  focus: FocusForm,
  note: NoteForm,
  reader: Reader,
  plus: PlusForm,
  plusDetail: PlusDetail,
  gradeSheet: GradeSheetForm,
  courseSubject: CourseSubject,
  goal: GoalForm,
  restoreGrades: RestoreForm,
  banner: BannerForm,
  board: BoardDetail,
  school: SchoolForm,
  group: GroupForm,
  subject: SubjectForm,
  offering: OfferingForm,
  template: TemplateForm,
  manageUser: ManageUserForm,
};
const titles = {
  configure: 'Configurar el meu curs',
  event: 'Una data al calendari',
  agendaReview: 'Validar una proposta de l’agenda',
  proposal: 'Proposa una idea',
  proposalResponse: 'Gestionar la proposta',
  announcement: 'Avís al centre',
  profile: 'El meu perfil',
  delete: 'Retirar contingut',
  report: 'Informar d’un problema',
  focus: 'El teu Pastisdoro',
  note: 'Comparteix els teus apunts',
  plus: 'Publicar un plus acadèmic',
  gradeSheet: 'Full i pesos personals',
  courseSubject: 'Nota final i plusos',
  goal: 'Objectiu i previsió',
  restoreGrades: 'Recuperar la plantilla del delegat',
  banner: 'El teu missatge a la comunitat',
  board: 'Cartell de la comunitat',
  school: 'Configurar el centre',
  group: 'Grup del centre',
  subject: 'Assignatura',
  offering: 'Variant i franges del curs',
  template: 'Plantilla de percentatges',
  manageUser: 'Gestionar compte',
};
export default function Forms({ onLogout, logoutBusy = false, logoutError = '' }) {
  const { data, modal, close, open, subject, go, subjectFilter, setSubjectFilter } = useApp();
  if (!modal) return null;
  const { type, item } = modal;
  const event = type === 'eventDetail' ? data.events.find((e) => e.id === item.id) || item : null;
  const eventSubjects = eventSubjectIds(event);
  const Form = forms[type];
  const title =
    type === 'reader' || type === 'plusDetail' || type === 'eventDetail'
      ? item.title
      : type === 'class'
        ? item.subject.name
        : titles[type] || 'La Net';
  return (
    <Modal
      open
      onClose={close}
      title={title}
      wide={['configure', 'note', 'reader', 'gradeSheet', 'offering', 'template', 'plus'].includes(
        type,
      )}
    >
      {Form ? (
        <Form
          key={`${type}-${item.id || item.subject_id || ''}`}
          item={item}
          onLogout={onLogout}
          logoutBusy={logoutBusy}
          logoutError={logoutError}
        />
      ) : type === 'class' ? (
        <div>
          <SubjectChip subject={item.subject} />
          <ul className="detail-list">
            <li>
              <BookOpen size={19} />
              {slotTeacher(item.slot, item.offering) || item.slot.note || 'Treball personal'}
            </li>
            <li>
              <Clock size={19} />
              {DAYS[item.slot.day]} · {item.slot.start} — {item.slot.end}
            </li>
            <li>
              <MapPin size={19} />
              {item.slot.room ? `Aula ${item.slot.room}` : 'Aula per confirmar'}
            </li>
          </ul>
          <div className="class-agenda-actions">
            <p>
              {item.date &&
                dateLabel(item.date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <Button
              variant="primary"
              onClick={() =>
                open('event', {
                  subject_id: item.subject.id,
                  offering_id: item.offering.id,
                  date: item.date,
                  start: item.slot.start,
                  end: item.slot.end,
                  room: item.slot.room || '',
                  kind: 'task',
                  contextual: true,
                })
              }
            >
              <Plus size={18} /> Afegir tasca o examen
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setSubjectFilter(item.subject.id);
              go('notes');
              close();
            }}
          >
            Continguts de l’assignatura
            <ArrowRight size={18} />
          </Button>
        </div>
      ) : type === 'eventDetail' ? (
        <div>
          <div className="card-tags">
            {eventSubjects.map((id) => (
              <SubjectChip key={id} subject={subject(id)} />
            ))}
          </div>
          <p>
            {dateLabel(item.date, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {item.start || 'Tot el dia'}
          </p>
          <p>{item.room}</p>
          <RichText text={item.body} />
          <div className="event-detail-actions">
            <TaskProgressButton event={event} />
            {!!eventSubjects.length && (
              <Button
                onClick={() => {
                  setSubjectFilter(
                    eventSubjects.includes(subjectFilter) ? subjectFilter : eventSubjects[0],
                  );
                  go('notes');
                  close();
                }}
              >
                Materials per preparar-ho <ArrowRight size={18} />
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
