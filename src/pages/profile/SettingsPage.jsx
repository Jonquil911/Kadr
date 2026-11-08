import { Download, KeyRound, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Avatar, { AVATAR_COLORS } from '../../components/ui/Avatar';
import Field from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  useChangePassword,
  useDeleteAccount,
  useExportData,
  useUpdateAccount,
  useUpdatePreferences,
  useUserProfile,
} from '../../hooks/useAccount';
import { hasPasswordProvider } from '../../utils/providers';
import { validateConfirm, validatePassword } from '../../utils/validation';

function ProfileSection() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const save = useUpdateAccount();
  const [values, setValues] = useState({ displayName: '', photoURL: '', bio: '', avatarColor: 'amber' });

  useEffect(() => {
    setValues({
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      bio: profile?.bio ?? '',
      avatarColor: profile?.avatarColor ?? 'amber',
    });
  }, [user.displayName, user.photoURL, profile?.bio, profile?.avatarColor]);

  const photoError =
    values.photoURL && !/^https?:\/\/.+/i.test(values.photoURL) ? 'Ссылка должна начинаться с http:// или https://' : '';

  const submit = (e) => {
    e.preventDefault();
    if (photoError) return;
    save.mutate({
      displayName: values.displayName.trim(),
      photoURL: values.photoURL.trim(),
      bio: values.bio.trim(),
      avatarColor: values.avatarColor,
    });
  };

  return (
    <section className="panel" aria-labelledby="settings-profile">
      <h2 id="settings-profile">Профиль</h2>
      <form className="form settings-form" onSubmit={submit} noValidate>
        <div className="settings-avatar">
          <Avatar
            name={values.displayName}
            email={user.email}
            photoURL={values.photoURL}
            color={values.avatarColor}
            size={72}
          />
          <fieldset className="color-picker">
            <legend>Цвет аватара без фото</legend>
            {Object.entries(AVATAR_COLORS).map(([name, [bg]]) => (
              <button
                key={name}
                type="button"
                style={{ background: bg }}
                className={values.avatarColor === name ? 'is-on' : ''}
                onClick={() => setValues((v) => ({ ...v, avatarColor: name }))}
                aria-label={`Цвет ${name}`}
                aria-pressed={values.avatarColor === name}
              />
            ))}
          </fieldset>
        </div>
        <Field
          label="Имя"
          value={values.displayName}
          maxLength={40}
          onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
        />
        <Field
          label="Ссылка на фото"
          type="url"
          value={values.photoURL}
          onChange={(e) => setValues((v) => ({ ...v, photoURL: e.target.value }))}
          error={photoError}
          hint="Оставьте пустым, чтобы показывать инициалы"
          placeholder="https://…"
        />
        <Field
          label="О себе"
          textarea
          rows={3}
          maxLength={200}
          value={values.bio}
          onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
          placeholder="Например: люблю нуар и корейские триллеры"
        />
        <div>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? 'Сохраняем…' : 'Сохранить профиль'}
          </button>
        </div>
      </form>
    </section>
  );
}

function PreferencesSection() {
  const { data: profile } = useUserProfile();
  const updatePrefs = useUpdatePreferences();
  const { theme, setTheme } = useTheme();
  const [goal, setGoal] = useState(50);

  useEffect(() => setGoal(profile?.yearlyGoal ?? 50), [profile?.yearlyGoal]);

  return (
    <section className="panel" id="goal" aria-labelledby="settings-prefs">
      <h2 id="settings-prefs">Предпочтения</h2>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Math.min(1000, Math.max(1, Number(goal) || 1));
          updatePrefs.mutate({ yearlyGoal: value }, { onSuccess: () => toast.success(`Цель: ${value} за год`) });
        }}
      >
        <label className="field field--inline">
          <span>Цель на год, просмотров</span>
          <input type="number" min={1} max={1000} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        <button type="submit" className="btn btn--ghost" disabled={updatePrefs.isPending}>
          Сохранить цель
        </button>
      </form>

      <div className="segmented" role="radiogroup" aria-label="Тема оформления">
        <button type="button" role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'is-on' : ''} onClick={() => setTheme('dark')}>
          <Moon size={16} /> Тёмная
        </button>
        <button type="button" role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'is-on' : ''} onClick={() => setTheme('light')}>
          <Sun size={16} /> Светлая
        </button>
      </div>
    </section>
  );
}

function SecuritySection() {
  const { user, resetPassword } = useAuth();
  const change = useChangePassword();
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});

  if (!hasPasswordProvider(user)) {
    return (
      <section className="panel" aria-labelledby="settings-security">
        <h2 id="settings-security">Безопасность</h2>
        <p className="muted">Вы входите через Google — паролем управляет ваш аккаунт Google.</p>
      </section>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const next = {
      current: values.current ? '' : 'Введите текущий пароль',
      next: validatePassword(values.next) || (values.next === values.current ? 'Новый пароль совпадает со старым' : ''),
      confirm: validateConfirm(values.next, values.confirm),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    change.mutate(
      { currentPassword: values.current, newPassword: values.next },
      { onSuccess: () => setValues({ current: '', next: '', confirm: '' }) },
    );
  };

  const sendReset = async () => {
    try {
      await resetPassword(user.email);
      toast.success(`Ссылка для сброса отправлена на ${user.email}`);
    } catch (e) {
      toast.error(e.userMessage);
    }
  };

  const onChange = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  };

  return (
    <section className="panel" aria-labelledby="settings-security">
      <h2 id="settings-security">Смена пароля</h2>
      <form className="form settings-form" onSubmit={submit} noValidate>
        <Field label="Текущий пароль" type="password" autoComplete="current-password" value={values.current} onChange={onChange('current')} error={errors.current} />
        <Field label="Новый пароль" type="password" autoComplete="new-password" value={values.next} onChange={onChange('next')} error={errors.next} hint="Не меньше 8 символов, буквы и цифры" />
        <Field label="Повторите новый пароль" type="password" autoComplete="new-password" value={values.confirm} onChange={onChange('confirm')} error={errors.confirm} />
        <div className="form__row">
          <button type="submit" className="btn btn--primary" disabled={change.isPending}>
            <KeyRound size={16} /> {change.isPending ? 'Меняем…' : 'Сменить пароль'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={sendReset}>
            Не помню текущий пароль
          </button>
        </div>
      </form>
    </section>
  );
}

function DataSection() {
  const { user } = useAuth();
  const exportData = useExportData();
  const removeAccount = useDeleteAccount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const needsPassword = hasPasswordProvider(user);
  const canDelete = confirmText.trim().toLowerCase() === 'удалить' && (!needsPassword || password);

  return (
    <section className="panel panel--danger" aria-labelledby="settings-data">
      <h2 id="settings-data">Данные и аккаунт</h2>
      <div className="data-actions">
        <div>
          <h3>Скачать мои данные</h3>
          <p className="muted">Библиотека, оценки, рецензии, подборки и история в одном JSON-файле.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          <Download size={16} /> {exportData.isPending ? 'Готовим файл…' : 'Скачать JSON'}
        </button>
      </div>
      <div className="data-actions">
        <div>
          <h3>Удалить аккаунт</h3>
          <p className="muted">Аккаунт и весь дневник будут удалены без возможности восстановления.</p>
        </div>
        <button type="button" className="btn btn--danger" onClick={() => setOpen(true)}>
          Удалить аккаунт
        </button>
      </div>

      <ConfirmDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setPassword('');
          setConfirmText('');
        }}
        title="Удалить аккаунт навсегда?"
        text="Будут удалены профиль, библиотека, рецензии, подборки и история. Отменить это нельзя."
        confirmLabel="Удалить навсегда"
        danger
        loading={removeAccount.isPending || !canDelete}
        onConfirm={() =>
          removeAccount.mutate(password, {
            onSuccess: () => navigate('/', { replace: true }),
          })
        }
      >
        <div className="form">
          {needsPassword ? (
            <Field label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          ) : (
            <p className="muted">После подтверждения откроется окно Google для повторного входа.</p>
          )}
          <Field label="Напишите «удалить», чтобы подтвердить" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
      </ConfirmDialog>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <h1>Настройки</h1>
      </header>
      <ProfileSection />
      <PreferencesSection />
      <SecuritySection />
      <DataSection />
    </div>
  );
}
