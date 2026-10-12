import React from 'react';
import { Clock, MapPin, BookOpen, ArrowRight } from '@phosphor-icons/react';
import { useApp } from './context';
import { Modal, SubjectChip, RichText, Button } from './ui';
import { dateLabel, DAYS } from '../shared/domain';
import { BoardDetail } from './components/WoodBoard';
import { CourseSubject } from './components/CourseGrades';
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
  const { modal, close, subject, go, setSubjectFilter } = useApp();
  if (!modal) return null;
  const { type, item } = modal;
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
      wide={['note', 'reader', 'gradeSheet', 'offering', 'template', 'plus'].includes(type)}
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
              {item.offering.teacher} · {item.offering.variant}
            </li>
            <li>
              <Clock size={19} />
              {DAYS[item.slot.day]} · {item.slot.start} — {item.slot.end}
            </li>
            <li>
              <MapPin size={19} />
              {item.slot.room || 'Aula per confirmar'}
            </li>
          </ul>
          <Button
            variant="primary"
            onClick={() => {
              setSubjectFilter(item.subject.id);
              go('notes');
              close();
            }}
          >
            Apunts de l’assignatura
            <ArrowRight size={18} />
          </Button>
        </div>
      ) : type === 'eventDetail' ? (
        <div>
          <SubjectChip subject={subject(item.subject_id)} />
          <p>
            {dateLabel(item.date, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {item.start || 'Tot el dia'}
          </p>
          <p>{item.room}</p>
          <RichText text={item.body} />
        </div>
      ) : null}
    </Modal>
  );
}
