const parseSyllabusText = (sourceText) => {
    const text = String(sourceText || '').replace(/\r/g, '').slice(0, 60000);
    if (!text.trim()) {
        const error = new Error('No selectable text was found. Scanned PDFs need OCR before they can be imported.');
        error.code = 'NO_TEXT';
        throw error;
    }

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 1200);
    const chapterPattern = /^(chapter|unit|module|section)\s*([\w.-]+)?\s*[:.)-]?\s*(.*)$/i;
    const chapters = [];
    for (const line of lines) {
        const heading = line.match(chapterPattern);
        if (heading) {
            chapters.push({ title: `${heading[1]} ${heading[2] || ''} ${heading[3]}`.trim().slice(0, 160), topics: [] });
            continue;
        }
        const topic = line.replace(/^(?:[-*•]|\d+(?:\.\d+)*[.)]?)\s*/, '').trim();
        if (!topic || topic.length < 3 || topic.length > 200 || /^[\d.]+$/.test(topic)) continue;
        if (!chapters.length) chapters.push({ title: 'Extracted topics', topics: [] });
        chapters[chapters.length - 1].topics.push(topic);
    }

    const usefulChapters = chapters
        .map(({ title, topics: chapterTopics }) => ({ title, topics: [...new Set(chapterTopics)].slice(0, 30) }))
        .filter(({ topics: chapterTopics }) => chapterTopics.length);
    if (!usefulChapters.length) {
        const error = new Error('Could not identify chapters or topics in this PDF. Review a text-based syllabus and try again.');
        error.code = 'NO_TOPICS';
        throw error;
    }
    return { chapters: usefulChapters.slice(0, 40), extractedText: text };
};

const validateChapters = (chapters) => {
    if (!Array.isArray(chapters) || chapters.length < 1 || chapters.length > 40) throw new Error('Provide between 1 and 40 chapters.');
    const clean = chapters.map((chapter) => {
        if (typeof chapter.title !== 'string' || !chapter.title.trim() || !Array.isArray(chapter.topics) || chapter.topics.length > 30) {
            throw new Error('Each chapter needs a title and up to 30 topics.');
        }
        const topics = chapter.topics.map((topic) => String(topic).trim()).filter(Boolean);
        if (!topics.length || topics.some((topic) => topic.length > 200)) throw new Error('Each chapter needs at least one topic under 200 characters.');
        return { title: chapter.title.trim().slice(0, 160), topics: [...new Set(topics)] };
    });
    return clean;
};

module.exports = { parseSyllabusText, validateChapters };