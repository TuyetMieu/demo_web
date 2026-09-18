'use client';

/* eslint-disable @next/next/no-img-element */
// Shared presentational pieces for the two Studio renderers: PythonStudio (the
// hand-built List & Mutability lesson) and StudioLesson (anything imported from
// a document). Both paint with studio.module.css, so they stay identical.
import { Fragment, type ReactNode } from 'react';
import s from './studio.module.css';

/**
 * Figma exported one SVG per icon per screen, so an icon is addressed by the
 * screen it came from plus its index (see public/static/python-studio/).
 */
export function Icon({
  step = 1,
  n = '',
  vector = false,
}: {
  step?: number;
  n?: number | string;
  vector?: boolean;
}) {
  return (
    <img
      className={s.icon}
      src={`/static/python-studio/s${step}-img${vector ? 'Vector' : 'Container'}${n}.svg`}
      alt=""
    />
  );
}

export const STEP_NAMES = [
  'S1: Hiểu & Dự đoán',
  'S2: Bẫy ngộ nhận',
  'S3: Bộ nhớ trực quan',
  'S4: Sandbox IDE',
];

/** S3's "Stepper Status indicator" frame: S1-S4 progress at a glance. */
export function Stepper({
  current,
  names = STEP_NAMES,
}: {
  current: number;
  names?: string[];
}) {
  return (
    <div
      className={s.stepper}
      aria-label={`Bước ${current} trên ${names.length}`}
    >
      {names.map((label, index) => {
        const n = index + 1;
        const state =
          n < current ? s.stepDone : n === current ? s.stepCurrent : s.stepTodo;
        return (
          <Fragment key={label}>
            {index > 0 && <i className={s.stepDivider} />}
            <span
              className={`${s.step} ${state}`}
              aria-current={n === current ? 'step' : undefined}
            >
              <span className={s.stepMark}>
                {n < current ? (
                  <img src="/static/python-studio/s3-stepper-check.svg" alt="" />
                ) : (
                  n
                )}
              </span>
              {label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${s.card} ${className}`}>{children}</section>;
}

/** Numbered code block with the lightweight Python highlighting the design uses. */
export function Code({ code, active = -1 }: { code: string; active?: number }) {
  return (
    <div className={s.codeLines}>
      {code.split('\n').map((line, i) => (
        <div className={active === i ? s.activeLine : ''} key={i}>
          <span>{i + 1}</span>
          <code>
            {line
              .split(
                /(#.*$|"[^"\n]*"|'[^'\n]*'|\b(?:def|return|for|in|if|else|print|len|round)\b|\b\d+(?:\.\d+)?\b)/g,
              )
              .map((part, j) => (
                <span
                  key={j}
                  className={
                    part.startsWith('#')
                      ? s.comment
                      : /^(def|return|for|in|if|else)$/.test(part)
                        ? s.keyword
                        : /^\d|^["']/.test(part)
                          ? s.literal
                          : ''
                  }
                >
                  {part}
                </span>
              ))}
          </code>
        </div>
      ))}
    </div>
  );
}

export function Choice({
  name,
  value,
  selected,
  onChange,
  title,
  detail,
}: {
  name: string;
  value: string;
  selected: string;
  onChange: (v: string) => void;
  title: string;
  detail?: string;
}) {
  return (
    <label className={`${s.choice} ${selected === value ? s.selected : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      <span>
        {title}
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}
