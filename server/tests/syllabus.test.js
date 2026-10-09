const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSyllabusText, validateChapters } = require('../services/syllabus');

test('groups extracted syllabus topics under chapter headings', () => {
    const outline = parseSyllabusText('Chapter 1: Foundations\n1.1 Variables\n- Functions\nUnit 2: Data\nArrays and objects');
    assert.deepEqual(outline.chapters, [
        { title: 'Chapter 1 Foundations', topics: ['Variables', 'Functions'] },
        { title: 'Unit 2 Data', topics: ['Arrays and objects'] },
    ]);
});

test('reports scanned or empty documents as unsupported without OCR', () => {
    assert.throws(() => parseSyllabusText('  '), (error) => error.code === 'NO_TEXT' && /OCR/.test(error.message));
});

test('validates user-corrected outline before saving', () => {
    assert.deepEqual(validateChapters([{ title: 'Basics', topics: ['Variables', 'Functions'] }]), [{ title: 'Basics', topics: ['Variables', 'Functions'] }]);
    assert.throws(() => validateChapters([{ title: 'Empty', topics: [] }]), /at least one topic/);
});