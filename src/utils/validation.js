const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Введите почту';
  if (!EMAIL_RE.test(email.trim())) return 'Проверьте адрес почты';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Введите пароль';
  if (password.length < 8) return 'Минимум 8 символов';
  if (!/[a-zA-Zа-яА-Я]/.test(password) || !/\d/.test(password)) return 'Нужны буквы и хотя бы одна цифра';
  return '';
}

export function validateConfirm(password, confirm) {
  if (!confirm) return 'Повторите пароль';
  if (password !== confirm) return 'Пароли не совпадают';
  return '';
}

/** Оценка сложности пароля 0–4 для индикатора на форме регистрации. */
export function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-ZА-Я]/.test(password) && /[a-zа-я]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^a-zA-Zа-яА-Я0-9]/.test(password)) score += 1;
  return score;
}

export const STRENGTH_LABELS = ['Слишком простой', 'Слабый', 'Средний', 'Хороший', 'Надёжный'];
