'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </div>
  );
}

export function PasswordField({
  label,
  hint,
  ...input
}: Omit<FieldProps, 'type'>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          {...input}
          id={id}
          type={visible ? 'text' : 'password'}
          maxLength={128}
          required
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </div>
  );
}
