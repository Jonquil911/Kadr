import { useState } from 'react';
import { getInitials } from '../../utils/format';

export const AVATAR_COLORS = {
  amber: ['#F4C95D', '#3A2A00'],
  coral: ['#F28B82', '#3D0F0B'],
  mint: ['#7FD8BE', '#06352A'],
  sky: ['#8AB4F8', '#0B2552'],
  lilac: ['#C3A6F7', '#2B1352'],
  sand: ['#E6D5B8', '#3B2F1B'],
};

export default function Avatar({ name, email, photoURL, color = 'amber', size = 40 }) {
  const [failed, setFailed] = useState(false);
  const [bg, fg] = AVATAR_COLORS[color] ?? AVATAR_COLORS.amber;

  if (photoURL && !failed) {
    return (
      <img
        className="avatar"
        src={photoURL}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className="avatar avatar--initials"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </span>
  );
}
