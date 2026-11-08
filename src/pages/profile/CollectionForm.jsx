import { useEffect, useState } from 'react';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';

const EMOJIS = ['🎬', '🍿', '❤️', '🌙', '🎄', '👻', '🚀', '🕵️', '😂', '🎻', '🏆', '📼'];

export default function CollectionForm({ open, onClose, onSubmit, initial, loading }) {
  const [values, setValues] = useState({ name: '', description: '', emoji: '🎬' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues({ name: initial?.name ?? '', description: initial?.description ?? '', emoji: initial?.emoji ?? '🎬' });
      setError('');
    }
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Дайте подборке название');
      return;
    }
    onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Изменить подборку' : 'Новая подборка'}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form="collection-form" className="btn btn--primary" disabled={loading}>
            {initial ? 'Сохранить' : 'Создать подборку'}
          </button>
        </>
      }
    >
      <form id="collection-form" className="form" onSubmit={submit} noValidate>
        <Field
          label="Название"
          value={values.name}
          maxLength={60}
          onChange={(e) => {
            setValues((v) => ({ ...v, name: e.target.value }));
            setError('');
          }}
          error={error}
          placeholder="Например, «Посмотреть с родителями»"
        />
        <Field
          label="Описание"
          textarea
          rows={3}
          maxLength={300}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          hint="Необязательно"
        />
        <fieldset className="emoji-picker">
          <legend>Значок</legend>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={values.emoji === emoji ? 'is-on' : ''}
              onClick={() => setValues((v) => ({ ...v, emoji }))}
              aria-pressed={values.emoji === emoji}
              aria-label={`Значок ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}
