'use client';
import { useState } from 'react';
import type { Course } from '@/libs/types/courses';
import type {
  ScheduleInput,
  ScheduledCourseInput,
} from '@/libs/types/academics';
import { weekDays } from './schedule';

export function CourseEditor({
  initial,
  timetableId,
  pending,
  onSave,
  onCancel,
}: {
  initial?: Pick<Course, 'title' | 'professor' | 'color' | 'schedules'>;
  timetableId: string;
  pending: boolean;
  onSave: (data: ScheduledCourseInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [slots, setSlots] = useState<ScheduleInput[]>(initial?.schedules ?? []);
  const [error, setError] = useState('');
  const update = (index: number, patch: Partial<ScheduleInput>) =>
    setSlots((values) =>
      values.map((slot, position) =>
        position === index ? { ...slot, ...patch } : slot,
      ),
    );
  return (
    <form
      className="academic-form course-editor"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        if (
          slots.some(
            (slot) => !slot.days.length || slot.startTime >= slot.endTime,
          )
        ) {
          setError(
            'Choose at least one day and an end time after the start time for every class.',
          );
          return;
        }
        const data = new FormData(event.currentTarget);
        void onSave({
          title: String(data.get('title')).trim(),
          professor: String(data.get('professor')).trim(),
          color: String(data.get('color')),
          timetableId,
          schedules: slots,
        });
      }}
    >
      <h2>{initial ? 'Edit class' : 'Add a class'}</h2>
      <fieldset disabled={pending}>
        <label>
          Course name
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={initial?.title ?? ''}
          />
        </label>
        <div className="academic-form-row">
          <label>
            Professor
            <input
              name="professor"
              maxLength={100}
              defaultValue={initial?.professor ?? ''}
            />
          </label>
          <label>
            Color
            <input
              name="color"
              type="color"
              defaultValue={initial?.color ?? '#396c50'}
            />
          </label>
        </div>
        {slots.map((slot, index) => (
          <fieldset key={index} className="schedule-editor">
            <legend>Class time {index + 1}</legend>
            <div className="weekday-checkboxes">
              {weekDays.map((day, value) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={slot.days.includes(value)}
                    onChange={(event) =>
                      update(index, {
                        days: event.target.checked
                          ? [...slot.days, value].sort()
                          : slot.days.filter((day) => day !== value),
                      })
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
            <div className="academic-form-row">
              <label>
                Start
                <input
                  type="time"
                  value={slot.startTime}
                  required
                  onChange={(event) =>
                    update(index, { startTime: event.target.value })
                  }
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={slot.endTime}
                  required
                  onChange={(event) =>
                    update(index, { endTime: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Room
              <input
                maxLength={100}
                value={slot.room}
                onChange={(event) =>
                  update(index, { room: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setSlots((values) =>
                  values.filter((_, position) => position !== index),
                )
              }
            >
              Remove this time
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="secondary-button"
          disabled={slots.length >= 14}
          onClick={() =>
            setSlots((values) => [
              ...values,
              { days: [0], startTime: '09:00', endTime: '10:00', room: '' },
            ])
          }
        >
          Add class time
        </button>
        {error ? (
          <p className="course-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="academic-actions">
          <button className="primary-button">
            {pending ? 'Saving…' : 'Save class'}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
