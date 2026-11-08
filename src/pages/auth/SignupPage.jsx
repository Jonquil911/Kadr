import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Field from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import {
  passwordStrength,
  STRENGTH_LABELS,
  validateConfirm,
  validateEmail,
  validatePassword,
} from '../../utils/validation';
import AuthShell, { FormError, GoogleButton } from './AuthShell';

export default function SignupPage() {
  const { signup, loginWithGoogle, pending, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => clearError, [clearError]);

  const validate = (values) => ({
    name: values.name.trim().length > 40 ? 'Не длиннее 40 символов' : '',
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirm: validateConfirm(values.password, values.confirm),
  });

  const onChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    // после первой попытки проверяем поля на лету
    if (touched[e.target.name]) setErrors(validate(next));
  };

  const onBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    if (form[e.target.name]) setErrors((er) => ({ ...er, [e.target.name]: validate(form)[e.target.name] }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.values(next).some(Boolean)) return;
    try {
      await signup({ email: form.email.trim(), password: form.password, displayName: form.name.trim() });
      toast.success('Аккаунт создан. Мы отправили письмо для подтверждения почты.');
      navigate('/profile', { replace: true });
    } catch {
      /* ошибка показана в форме */
    }
  };

  const onGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) navigate('/profile', { replace: true });
    } catch {
      /* ошибка показана в форме */
    }
  };

  const strength = passwordStrength(form.password);

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Аккаунт нужен, чтобы дневник сохранялся и был доступен с любого устройства."
      footer={
        <p>
          Уже есть аккаунт?{' '}
          <Link to="/login" state={location.state}>
            Войдите
          </Link>
        </p>
      }
    >
      <GoogleButton onClick={onGoogle} disabled={pending} label="Зарегистрироваться через Google" />
      <div className="divider">
        <span>или по почте</span>
      </div>
      <form className="form" onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <Field
          label="Имя"
          name="name"
          autoComplete="nickname"
          value={form.name}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.name}
          hint="Необязательно. Так к вам будет обращаться дневник."
        />
        <Field
          label="Почта"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.email}
          placeholder="you@example.com"
        />
        <Field
          label="Пароль"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.password}
          hint="Не меньше 8 символов, буквы и цифры"
        />
        {form.password && (
          <div className={`strength strength--${strength}`} aria-live="polite">
            <div className="strength__bar">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < strength ? 'is-on' : ''} />
              ))}
            </div>
            <span>{STRENGTH_LABELS[strength]}</span>
          </div>
        )}
        <Field
          label="Повторите пароль"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.confirm}
        />
        <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
          {pending ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </button>
      </form>
    </AuthShell>
  );
}
