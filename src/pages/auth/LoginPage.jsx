import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Field from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import AuthShell, { FormError, GoogleButton } from './AuthShell';

export default function LoginPage() {
  const { login, loginWithGoogle, pending, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});

  useEffect(() => clearError, [clearError]); // не показываем старую ошибку на другой странице

  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search ?? ''}` : '/profile';

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = { email: validateEmail(form.email), password: form.password ? '' : 'Введите пароль' };
    setErrors(next);
    if (next.email || next.password) return;
    try {
      const user = await login({ email: form.email.trim(), password: form.password, remember: form.remember });
      toast.success(`С возвращением${user.displayName ? `, ${user.displayName}` : ''}!`);
      navigate(redirectTo, { replace: true });
    } catch {
      /* текст ошибки уже в error из контекста */
    }
  };

  const onGoogle = async () => {
    try {
      const user = await loginWithGoogle({ remember: form.remember });
      if (user) {
        toast.success('Вы вошли через Google');
        navigate(redirectTo, { replace: true });
      }
    } catch {
      /* ошибка показана в форме */
    }
  };

  return (
    <AuthShell
      title="Вход"
      subtitle="Ваши списки, оценки и подборки ждут вас."
      footer={
        <p>
          Нет аккаунта?{' '}
          <Link to="/signup" state={location.state}>
            Зарегистрируйтесь
          </Link>
        </p>
      }
    >
      <GoogleButton onClick={onGoogle} disabled={pending} />
      <div className="divider">
        <span>или по почте</span>
      </div>
      <form className="form" onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <Field
          label="Почта"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          error={errors.email}
          placeholder="you@example.com"
        />
        <Field
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
          error={errors.password}
        />
        <div className="form__row">
          <label className="checkbox">
            <input type="checkbox" name="remember" checked={form.remember} onChange={onChange} />
            <span>Запомнить меня</span>
          </label>
          <Link to="/forgot-password" className="link-inline">
            Забыли пароль?
          </Link>
        </div>
        <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </AuthShell>
  );
}
