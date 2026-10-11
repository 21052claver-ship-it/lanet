import React, { useEffect, useRef, useState } from 'react';
import {
  ImageSquare,
  TextT,
  Article,
  Cake,
  Check,
  UserCircle,
  EyeSlash,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { upload, api } from '../api';
import { useSubmit } from '../form-utils';
import { Button, Field, FormError, FormFooter } from '../ui';
import { WoodMessage } from './WoodBoard';
import BannerImageEditor from './BannerImageEditor';
import { exportBannerImage } from '../banner-image';
import { bannerSpaces } from '../../shared/banner';

export default function BannerComposer({ item = {} }) {
  const { data: appData, close, mutate, refresh, notify } = useApp();
  const spaces = bannerSpaces(appData);
  const [slot, setSlot] = useState(item.slot || spaces.find((s) => !s.banner)?.slot || 1);
  const space = spaces.find((s) => s.slot === slot);
  const data = { ...appData, banner: space.banner, minBid: space.minBid };
  const [reviewedId, setReviewedId] = useState(data.banner?.id || null);
  const [format, setFormat] = useState('text');
  const [f, setF] = useState({
    title: '',
    body: '',
    color: 'peach',
    amount: data.minBid,
    anonymous: false,
  });
  const [image, setImage] = useState(null),
    [loadingImage, setLoadingImage] = useState(false);
  const uploaded = useRef(null);
  useEffect(
    () => () => {
      if (uploaded.current?.id)
        api('/files/' + uploaded.current.id, { method: 'DELETE' }).catch(() => {});
    },
    [],
  );
  const { busy, error, submit } = useSubmit();
  const currentId = data.banner?.id || null;
  const changed = reviewedId !== currentId;
  const usesImage = format !== 'text',
    usesText = format !== 'image';
  const validContent = (!usesImage || !!image) && (!usesText || !!f.title.trim());
  const validAmount =
    Number.isInteger(f.amount) && f.amount >= data.minBid && f.amount <= data.user.balance;
  const quickAmounts = [...new Set([data.minBid, 5, 10, 20, 50, 100, data.minBid * 2])]
    .filter((n) => n >= data.minBid && n <= 100000)
    .sort((a, b) => a - b)
    .slice(0, 4);
  async function publish() {
    if (loadingImage) throw new Error('Espera que acabi de carregar la imatge.');
    if (changed) throw new Error('El cartell ha canviat. Revisa l’oferta abans de publicar.');
    if (!validContent)
      throw new Error(
        usesImage && !image ? 'Tria una imatge per al cartell.' : 'Escriu el missatge principal.',
      );
    if (!validAmount) throw new Error('Revisa l’import i el saldo disponible.');
    let fileId = null;
    if (usesImage) {
      if (uploaded.current?.draft !== image) {
        if (uploaded.current?.id) {
          await api('/files/' + uploaded.current.id, { method: 'DELETE' });
          uploaded.current = null;
        }
        const file = await upload(await exportBannerImage(image), 'banner');
        uploaded.current = { draft: image, id: file.id };
      }
      fileId = uploaded.current.id;
    }
    return mutate(
      '/banner',
      { ...f, slot, title: usesText ? f.title : '', previous_id: reviewedId, file_id: fileId },
      undefined,
      () => {
        uploaded.current = null;
        notify('El teu anunci ja és al cartell.');
        close();
      },
    ).catch(async (err) => {
      if ([400, 404, 410].includes(err.status) || err.code === 'file_retired')
        uploaded.current = null;
      if (err.status === 409) await refresh();
      throw err;
    });
  }
  const preview = (
    <div className="banner-live-preview">
      <span className="banner-preview-label">Així es veurà</span>
      <div className="banner-preview-sizes">
        <div>
          <small>Cartell</small>
          <WoodMessage
            mode={format}
            title={usesText ? f.title || 'El teu missatge' : ''}
            imageDraft={usesImage ? image : null}
            author={f.anonymous ? null : data.user.name}
            anonymous={f.anonymous}
          />
        </div>
        <div>
          <small>Mòbil</small>
          <WoodMessage
            compact
            mode={format}
            title={usesText ? f.title || 'El teu missatge' : ''}
            imageDraft={usesImage ? image : null}
            author={f.anonymous ? null : data.user.name}
            anonymous={f.anonymous}
          />
        </div>
      </div>
      <p className="banner-preview-author" role="status">
        {f.anonymous ? 'Anunci anònim' : `Anunci de ${data.user.name}`}
      </p>
    </div>
  );
  return (
    <form className="banner-composer" onSubmit={submit(publish)}>
      <fieldset className="banner-composer-fields" disabled={busy || loadingImage}>
        <legend className="sr-only">Contingut del cartell</legend>
        <div className="banner-space-options" role="group" aria-label="Tria l’espai de l’anunci">
          {spaces.map((s) => (
            <button
              type="button"
              key={s.slot}
              aria-pressed={slot === s.slot}
              onClick={() => {
                setSlot(s.slot);
                setReviewedId(s.banner?.id || null);
                setF({ ...f, amount: s.minBid });
              }}
            >
              <strong>Espai {s.slot}</strong>
              <span>
                {s.banner ? 'Ocupat' : 'Disponible'} · des de {s.minBid}{' '}
                {s.minBid === 1 ? 'pastís' : 'pastissos'}
              </span>
            </button>
          ))}
        </div>
        <div className="banner-format-options" aria-label="Format del cartell">
          {[
            ['image', ImageSquare, 'Només imatge'],
            ['text', TextT, 'Text gran'],
            ['mixed', Article, 'Imatge i text'],
          ].map(([key, Icon, title]) => (
            <button
              type="button"
              key={key}
              aria-pressed={format === key}
              onClick={() => setFormat(key)}
            >
              <Icon size={21} />
              <span>{title}</span>
              {format === key && <Check size={15} weight="bold" />}
            </button>
          ))}
        </div>
        <BannerIdentity
          anonymous={f.anonymous}
          onChange={(anonymous) => setF({ ...f, anonymous })}
          name={data.user.name}
        />
        {usesText && (
          <Field
            label="Missatge principal"
            hint="Com més curt, més gran es veurà. El text complet sempre es pot obrir al detall."
          >
            <textarea
              rows={2}
              maxLength={80}
              required
              value={f.title}
              onChange={(event) => setF({ ...f, title: event.target.value })}
              placeholder="El teu missatge, ben visible"
            />
          </Field>
        )}
        <BannerImageEditor
          value={image}
          onChange={setImage}
          hidden={!usesImage}
          disabled={busy}
          onBusyChange={setLoadingImage}
          preview={usesImage ? preview : null}
        />
        {!usesImage && preview}
        <details className="banner-extra quiet-disclosure">
          <summary>
            {format === 'image'
              ? 'Descripció accessible (opcional)'
              : 'Context al detall (opcional)'}
          </summary>
          <Field label={format === 'image' ? 'Descriu la imatge' : 'Una mica de context'}>
            <textarea
              rows={2}
              maxLength={180}
              value={f.body}
              onChange={(event) => setF({ ...f, body: event.target.value })}
            />
          </Field>
        </details>
        {changed && (
          <div className="bid-conflict" role="alert">
            <strong>Algú ha actualitzat el cartell.</strong>
            <p>
              El teu anunci i el retall es conserven. El mínim ara és {data.minBid}{' '}
              {data.minBid === 1 ? 'pastís' : 'pastissos'}.
            </p>
            <Button
              type="button"
              onClick={() => {
                setReviewedId(currentId);
                setF({ ...f, amount: Math.max(f.amount, data.minBid) });
              }}
            >
              Revisar amb el nou mínim
            </Button>
          </div>
        )}
        <div className="banner-bid-heading">
          <strong>La teva oferta</strong>
          <span>
            Des de {data.minBid} {data.minBid === 1 ? 'pastís' : 'pastissos'}
          </span>
        </div>
        <div className="bid-options" aria-label="Ofertes ràpides">
          {quickAmounts.map((amount) => (
            <button
              type="button"
              key={amount}
              aria-pressed={f.amount === amount}
              onClick={() => setF({ ...f, amount })}
            >
              {f.amount === amount && <Check size={17} weight="bold" />}
              <Cake size={19} />
              {amount}
            </button>
          ))}
        </div>
        <Field label="Oferta en pastissos">
          <input
            type="number"
            min={data.minBid}
            max="100000"
            step="1"
            required
            value={f.amount}
            onChange={(event) => setF({ ...f, amount: Number(event.target.value) })}
          />
        </Field>
        <div className="bid-balance">
          <span>
            Saldo actual<strong>{data.user.balance}</strong>
          </span>
          <span>
            Cost<strong>−{f.amount || 0}</strong>
          </span>
          <span>
            Saldo resultant<strong>{data.user.balance - (f.amount || 0)}</strong>
          </span>
        </div>
        {f.amount > data.user.balance && (
          <p className="form-error" role="status">
            {f.amount - data.user.balance === 1 ? 'Et falta' : 'Et falten'}{' '}
            {f.amount - data.user.balance}{' '}
            {f.amount - data.user.balance === 1 ? 'pastís' : 'pastissos'} per a aquesta oferta.
          </p>
        )}
        <details className="banner-extra quiet-disclosure">
          <summary>Com funciona l’oferta</summary>
          <p className="muted small">
            Cada espai és independent. La primera oferta és d’1 pastís. L’oferta es gasta en
            publicar i no es retorna quan substitueixen el cartell. El valor baixa un 10% cada 24
            hores; una nova oferta ha de doblar el valor actual.
          </p>
        </details>
      </fieldset>
      {usesImage && (
        <small>
          La imatge es comprova al servidor abans de publicar el cartell. Si no supera el filtre, no
          es cobra l’oferta. S’elimina quan l’anunci és substituït.
        </small>
      )}
      <FormError error={error} />
      <FormFooter
        busy={busy || loadingImage}
        disabled={!validContent || !validAmount || changed}
        onCancel={close}
        label={`Publicar per ${f.amount || 0} ${f.amount === 1 ? 'pastís' : 'pastissos'}`}
      />
    </form>
  );
}

export function BannerIdentity({ anonymous, onChange, name }) {
  return (
    <fieldset className="banner-identity">
      <legend>Publicar com</legend>
      <div className="banner-identity-options">
        {[
          [false, UserCircle, 'Amb el meu nom'],
          [true, EyeSlash, 'Anònim'],
        ].map(([value, Icon, label]) => (
          <label className="banner-identity-option" key={String(value)}>
            <input
              type="radio"
              name="banner-identity"
              value={value ? 'anonymous' : 'named'}
              checked={anonymous === value}
              onChange={() => onChange(value)}
            />
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className="muted small">
        {anonymous ? 'El teu nom no es mostrarà al cartell.' : `Es mostrarà el teu nom: ${name}.`}
      </p>
    </fieldset>
  );
}
