'use client';
import { useState } from 'react';
import { saveAcademic } from '@/api/academics-client';
import type { AcademicOverview } from '@/libs/types/academics';

export function AcademicManager({
  data,
  disabled,
  mutate,
}: {
  data: AcademicOverview;
  disabled: boolean;
  mutate: (operation: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [archive, setArchive] = useState('');
  const [renaming, setRenaming] = useState('');
  return (
    <section
      className="academic-management surface"
      aria-label="Semesters and timetables"
    >
      <h2>Organize your semester</h2>
      <p className="muted">
        Keep alternate timetables separate, then choose which one opens on home.
      </p>
      <div className="academic-management-forms">
        <form
          className="academic-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            if (
              await mutate(() =>
                saveAcademic('terms', {
                  name: String(new FormData(form).get('name')),
                }),
              )
            )
              form.reset();
          }}
        >
          <fieldset disabled={disabled}>
            <label>
              New semester
              <input
                name="name"
                required
                maxLength={60}
                placeholder="e.g. 2026 Fall"
              />
            </label>
            <button className="secondary-button">Add semester</button>
          </fieldset>
        </form>
        <form
          className="academic-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fields = new FormData(form);
            if (
              await mutate(() =>
                saveAcademic('timetables', {
                  name: String(fields.get('name')),
                  termId: String(fields.get('termId')),
                }),
              )
            )
              form.reset();
          }}
        >
          <fieldset
            disabled={disabled || !data.terms.some((term) => !term.archivedAt)}
          >
            <label>
              Semester
              <select name="termId" required defaultValue="">
                <option value="" disabled>
                  Choose semester
                </option>
                {data.terms
                  .filter((term) => !term.archivedAt)
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              New timetable
              <input
                name="name"
                required
                maxLength={60}
                placeholder="e.g. Main timetable"
              />
            </label>
            <button className="secondary-button">Add timetable</button>
          </fieldset>
        </form>
      </div>
      {data.terms
        .filter((term) => !term.archivedAt)
        .map((term) => (
          <div className="semester-row" key={term.id}>
            {renaming === term.id ? (
              <form
                className="academic-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const name = String(
                    new FormData(event.currentTarget).get('name'),
                  );
                  if (
                    await mutate(() =>
                      saveAcademic(`terms/${term.id}`, { name }, 'PATCH'),
                    )
                  )
                    setRenaming('');
                }}
              >
                <fieldset disabled={disabled}>
                  <label>
                    Semester name
                    <input
                      name="name"
                      required
                      maxLength={60}
                      defaultValue={term.name}
                    />
                  </label>
                  <button className="secondary-button">Save semester</button>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => setRenaming('')}
                  >
                    Cancel
                  </button>
                </fieldset>
              </form>
            ) : (
              <>
                <span>{term.name}</span>
                <button
                  className="text-link"
                  disabled={disabled}
                  onClick={() => setRenaming(term.id)}
                >
                  Rename semester
                </button>
              </>
            )}
            {archive === term.id ? (
              <div>
                <p>
                  Archive this semester? Materials stay available, but classes
                  and documents become read-only.
                </p>
                <button
                  className="secondary-button"
                  disabled={disabled}
                  onClick={async () => {
                    if (
                      await mutate(() =>
                        saveAcademic(`terms/${term.id}/archive`),
                      )
                    )
                      setArchive('');
                  }}
                >
                  Confirm archive
                </button>
                <button className="text-link" onClick={() => setArchive('')}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="text-link"
                disabled={disabled}
                onClick={() => setArchive(term.id)}
              >
                Archive semester
              </button>
            )}
          </div>
        ))}
    </section>
  );
}
