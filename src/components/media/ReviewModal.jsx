import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';

const MAX = 2000;

export default function ReviewModal({ open, onClose, onSave, title, initialValue }) {
  const [text, setText] = useState(initialValue);
  useEffect(() => {
    if (open) setText(initialValue);
  }, [open, initialValue]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Рецензия: ${title}`}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onSave(text)}>
            {text.trim() ? 'Сохранить рецензию' : initialValue ? 'Удалить рецензию' : 'Готово'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="review-text">Что вы думаете о фильме?</label>
        <div className="field__control">
          <textarea
            id="review-text"
            rows={8}
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Пара предложений для себя из будущего: что понравилось, что нет, с кем стоит пересмотреть."
          />
        </div>
        <p className="field__hint">
          {text.length} / {MAX}
        </p>
      </div>
    </Modal>
  );
}
