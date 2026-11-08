import { MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import AuthShell, { FormError } from './AuthShell';

export default function ForgotPasswordPage() {
  const { resetPassword, pending, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sentTo, setSentTo] = useState('');

  useEffect(() => clearError, [clearError]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const message = validateEmail(email);
    setFieldError(message);
    if (message) return;
    try {
      await resetPassword(email.trim());
      setSentTo(email.trim());
    } catch {
      /* ошибка показана в форме */
    }
  };

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Пришлём на почту ссылку, по которой можно задать новый пароль."
      footer={
        <p>
          Вспомнили пароль? <Link to="/login">Войти</Link>
        </p>
      }
    >
      {sentTo ? (
        <div className="notice notice--success">
          <MailCheck size={22} />
          <p>
            Если аккаунт с адресом <strong>{sentTo}</strong> существует, письмо уже в пути. Проверьте и папку «Спам».
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <FormError message={error} />
          <Field
            label="Почта"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError('');
            }}
            error={fieldError}
            placeholder="you@example.com"
          />
          <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
            {pending ? 'Отправляем…' : 'Отправить ссылку'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
