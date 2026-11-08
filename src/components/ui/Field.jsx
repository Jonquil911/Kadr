import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

export default function Field({ label, error, hint, type = 'text', className = '', textarea, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Control = textarea ? 'textarea' : 'input';

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="field__control">
        <Control
          id={id}
          type={textarea ? undefined : isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
