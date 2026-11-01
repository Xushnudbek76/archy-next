import assert from 'node:assert/strict';
import test from 'node:test';
import { isProfile, isNoteFormats } from '../libs/types/preferences.ts';
import { translate } from '../libs/i18n/messages.ts';

test('profile contracts keep language and note format choices bounded', () => {
  const value = {
    displayName: 'Kim',
    email: 'kim@example.com',
    university: '',
    department: '',
    uiLanguage: 'ko',
    summaryLanguage: 'auto',
    noteFormat: 'outline',
  };
  assert.equal(isProfile(value), true);
  assert.equal(isProfile({ ...value, summaryLanguage: 'ru' }), false);
  assert.equal(isProfile({ ...value, displayName: null }), false);
  assert.equal(
    isNoteFormats({
      items: [
        {
          id: 'outline',
          name: 'Outline',
          description: '',
          instructions: '',
          custom: false,
        },
      ],
    }),
    true,
  );
  assert.equal(
    isNoteFormats({ items: [{ id: 'outline', instructions: 12 }] }),
    false,
  );
});
test('Korean UI copy is explicit and does not alter unknown document content', () => {
  assert.equal(translate('ko', 'Dashboard'), '대시보드');
  assert.equal(translate('en', 'Dashboard'), 'Dashboard');
  assert.equal(
    translate('ko', 'A private lecture title'),
    'A private lecture title',
  );
});
