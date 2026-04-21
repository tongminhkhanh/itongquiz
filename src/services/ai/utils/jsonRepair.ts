/**
 * @module jsonRepair
 * Utilities for parsing, repairing and normalising AI-generated JSON quiz data.
 * Also handles LaTeX formatting fixes within question text fields.
 */

import type { AIProvider } from '../../geminiService';

// ─────────────────────────────────────────────────────────
//  JSON PARSING
// ─────────────────────────────────────────────────────────

/** Parse AI response text that may contain broken JSON, auto-repairing common issues. */
export const parseAndRepairJSON = (text: string): unknown => {
  // Step 1: Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Step 2: Find JSON object boundaries
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error('Không tìm thấy JSON hợp lệ trong response của AI.');
  }

  cleaned = cleaned.substring(startIdx, endIdx + 1);

  // Step 3: Try to parse directly first
  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn('JSON parse failed, attempting repair...');
  }

  // Step 4: Attempt to repair common JSON issues
  let repaired = cleaned;

  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/}\s*{/g, '},{');
  repaired = repaired.replace(/]\s*\[/g, '],[');
  repaired = repaired.replace(/"\s*{/g, '",{');
  repaired = repaired.replace(/}\s*"/g, '},"');
  repaired = repaired.replace(/]\s*"/g, '],"');
  repaired = repaired.replace(/"\s*\[/g, '",[');
  repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
  repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');
  // Handle invalid escapes from model output (for example: "\_") by escaping "\" itself.
  repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Step 5: Try parsing repaired JSON
  try {
    return JSON.parse(repaired);
  } catch (e2) {
    const syntaxError = e2 as SyntaxError;
    const match = /position\s+(\d+)/i.exec(syntaxError.message || '');
    if (match?.[1]) {
      const pos = Number(match[1]);
      const start = Math.max(0, pos - 80);
      const end = Math.min(repaired.length, pos + 80);
      console.error('JSON error context:', repaired.slice(start, end));
    }
    console.error('JSON repair failed:', e2);
    console.error('Original text:', text.substring(0, 500));
    throw new Error('AI trả về JSON không hợp lệ. Vui lòng thử tạo đề lại.');
  }
};
// ─────────────────────────────────────────────────────────
//  LATEX FIXES
// ─────────────────────────────────────────────────────────

const extractPlaceholdersFromLatex = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(/\$([^$]*?\[\d+\][^$]*?)\$/g, (_match: string, inner: string) => {
    let result = inner.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '$1/$2');
    result = result.replace(/\\times/g, '×');
    result = result.replace(/\\div/g, '÷');
    result = result.replace(/\\cdot/g, '·');
    result = result.replace(/\\pm/g, '±');
    result = result.replace(/\\text\{([^}]*)\}/g, '$1');
    result = result.replace(/\\textbf\{([^}]*)\}/g, '$1');
    result = result.replace(/\\[a-zA-Z]+/g, '');
    result = result.replace(/[{}]/g, '');
    result = result.replace(/\s{2,}/g, ' ').trim();
    return result;
  });
};

/** Fix LaTeX formatting issues in a single text string from AI output. */
export const fixLatexInText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Balance missing $ signs around fractions
  result = result.replace(/(^|[^$])(\\frac\{[^{}]*\}\{[^{}]*\})\$/g, '$1$$$2$$');
  result = result.replace(/\$(\\frac\{[^{}]*\}\{[^{}]*\})($|[^$])/g, '$$$1$$$2');

  // Normalize {[N]} → [N] in math blocks
  result = result.replace(/\$([^$]+?)\$/g, (_match: string, inner: string) => {
    let fixed = inner.replace(/\{\[(\d+)\]\}/g, (_: string, n: string) => `[${n}]`);
    fixed = fixed.replace(/\\frac\s*\[(\d+)\]/g, '\\frac{[$1]}');
    fixed = fixed.replace(/\\frac\s*\{([^}]+)\}\s*\[(\d+)\]/g, '\\frac{$1}{[$2]}');
    fixed = fixed.replace(/\\frac\s*\[(\d+)\]\s*\[(\d+)\]/g, '\\frac{[$1]}{[$2]}');
    return `$${fixed}$`;
  });

  // Extract Vietnamese text from inside $...$
  const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐa-zA-Z]/;

  result = result.replace(/\$([^$]+)\$/g, (match, inner) => {
    if (!vietnamesePattern.test(inner)) return match;

    const mathPattern = /(\\frac\{[^}]*\}\{[^}]*\}|\\sqrt\{[^}]*\}|\\[a-z]+|[0-9]+|[+\-×÷=<>^_{}()[\]])/gi;
    const parts: string[] = [];
    let lastIndex = 0;
    const regex = new RegExp(mathPattern.source, 'gi');
    let mathMatch;

    while ((mathMatch = regex.exec(inner)) !== null) {
      if (mathMatch.index > lastIndex) {
        const textPart = inner.substring(lastIndex, mathMatch.index).trim();
        if (textPart) parts.push(textPart);
      }
      parts.push('$' + mathMatch[0] + '$');
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < inner.length) {
      const textPart = inner.substring(lastIndex).trim();
      if (textPart) parts.push(textPart);
    }

    if (parts.length > 1) {
      return parts.join(' ').replace(/\$\s*\$/g, ' ').replace(/\s+/g, ' ').trim();
    }

    let cleaned = inner;
    let prefix = '';
    let suffix = '';

    const prefixMatch = cleaned.match(/^([a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s:.,]+)/);
    if (prefixMatch) { prefix = prefixMatch[1].trim() + ' '; cleaned = cleaned.substring(prefixMatch[0].length); }

    const suffixMatch = cleaned.match(/([a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s:.,?!]+)$/);
    if (suffixMatch) { suffix = ' ' + suffixMatch[1].trim(); cleaned = cleaned.substring(0, cleaned.length - suffixMatch[0].length); }

    if (prefix || suffix) {
      cleaned = cleaned.trim();
      if (cleaned) return prefix + '$' + cleaned + '$' + suffix;
    }

    return match;
  });

  result = result.replace(/\$\\\$/g, '$').replace(/\\\$\$/g, '$').replace(/([^\\])\\\$/g, '$1$').replace(/^\\\$/, '$');
  result = result.replace(/\}\$\$/g, '}$');
  result = result.replace(/\${3,}/g, '$');
  result = result.replace(/\$\$([^$]+)\$\$/g, '$$$1$$');
  result = result.replace(/\$([^$]+)\$/g, (_match: string, inner: string) => {
    const normalizedInner = inner.replace(/\r?\n/g, ' ').replace(/\\n/g, ' ');
    return `$${normalizedInner}$`;
  });
  result = result.replace(/[^\S\n]+/g, ' ');
  result = result.replace(/(\$\\frac\{[^}]+\}\{[^}]+\})(?!\$)(\s*[^$\d{])/g, '$1$$$2');
  result = result.replace(/(?<!\$)\\frac\{([^}]+)\}\{([^}]+)\}(?!\$)/g, '$\\frac{$1}{$2}$');

  return result.trim();
};

/** Apply LaTeX fixes to all text fields in a question object. */
export const fixQuestionLatex = (q: Record<string, unknown>): Record<string, unknown> => {
  const fixedQ = { ...q };

  if (typeof fixedQ.question === 'string') fixedQ.question = fixLatexInText(fixedQ.question);
  if (typeof fixedQ.mainQuestion === 'string') fixedQ.mainQuestion = fixLatexInText(fixedQ.mainQuestion);
  if (Array.isArray(fixedQ.options)) fixedQ.options = (fixedQ.options as string[]).map(fixLatexInText);
  if (typeof fixedQ.correctAnswer === 'string') fixedQ.correctAnswer = fixLatexInText(fixedQ.correctAnswer);
  if (Array.isArray(fixedQ.correctAnswers)) fixedQ.correctAnswers = (fixedQ.correctAnswers as string[]).map(fixLatexInText);
  if (typeof fixedQ.explanation === 'string') fixedQ.explanation = fixLatexInText(fixedQ.explanation);

  if (typeof fixedQ.text === 'string') {
    fixedQ.text = fixedQ.text.replace(/\$([^$]+?)\$/g, (_match: string, inner: string) => {
      let fixed = inner.replace(/\{\[(\d+)\]\}/g, (_: string, n: string) => `[${n}]`);
      fixed = fixed.replace(/\\frac\s*\[(\d+)\]/g, '\\frac{[$1]}');
      fixed = fixed.replace(/\\frac\s*\{([^}]+)\}\s*\[(\d+)\]/g, '\\frac{$1}{[$2]}');
      fixed = fixed.replace(/\\frac\s*\[(\d+)\]\s*\[(\d+)\]/g, '\\frac{[$1]}{[$2]}');
      return `$${fixed}$`;
    });
    fixedQ.text = extractPlaceholdersFromLatex(fixedQ.text as string);
  }

  if (Array.isArray(fixedQ.items)) {
    fixedQ.items = (fixedQ.items as unknown[]).map((item) => {
      if (typeof item === 'string') return fixLatexInText(item);
      const obj = item as Record<string, unknown>;
      if (typeof obj.statement === 'string') obj.statement = fixLatexInText(obj.statement);
      if (typeof obj.content === 'string') obj.content = fixLatexInText(obj.content);
      return obj;
    });
  }

  if (Array.isArray(fixedQ.pairs)) {
    fixedQ.pairs = (fixedQ.pairs as Record<string, unknown>[]).map((pair) => ({
      ...pair,
      left: fixLatexInText(pair.left as string),
      right: fixLatexInText(pair.right as string),
    }));
  }

  return fixedQ;
};

// ─────────────────────────────────────────────────────────
//  METADATA NORMALISATION
// ─────────────────────────────────────────────────────────

export const AI_CORE_SUBJECT_IDS = [
  'toan',
  'tieng-viet',
  'tieng-anh',
  'tu-nhien-xa-hoi',
  'tin-hoc',
] as const;

const stripVietnameseDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeCategoryKey = (value: string): string =>
  stripVietnameseDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const CATEGORY_ALIAS_TO_CORE: Record<string, (typeof AI_CORE_SUBJECT_IDS)[number]> = {
  toan: 'toan', math: 'toan', mathematics: 'toan', 'toan-hoc': 'toan',
  'tieng-viet': 'tieng-viet', tiengviet: 'tieng-viet', 'ngu-van': 'tieng-viet', van: 'tieng-viet',
  'tieng-anh': 'tieng-anh', tienganh: 'tieng-anh', english: 'tieng-anh',
  'tu-nhien-xa-hoi': 'tu-nhien-xa-hoi', 'tu-nhien-va-xa-hoi': 'tu-nhien-xa-hoi',
  'khoa-hoc': 'tu-nhien-xa-hoi', 'khoa-hoc-xa-hoi': 'tu-nhien-xa-hoi',
  'tin-hoc': 'tin-hoc', tinhoc: 'tin-hoc', it: 'tin-hoc',
};

export const normalizeDetectedCategory = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return CATEGORY_ALIAS_TO_CORE[normalizeCategoryKey(trimmed)];
};

export const normalizeDetectedLesson = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, 180);
};

const normalizeTag = (raw: string): string =>
  stripVietnameseDiacritics(raw)
    .toLowerCase()
    .replace(/^#+/g, '')
    .trim()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

export const normalizeSuggestedTags = (raw: unknown): string[] => {
  const source = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    const value = normalizeTag(String(item ?? ''));
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= 5) break;
  }
  return result;
};

// ─────────────────────────────────────────────────────────
//  QUIZ VALIDATION
// ─────────────────────────────────────────────────────────

/** Validate and auto-fix a raw quiz object returned by an AI provider. */
export const validateAndFixQuiz = (quiz: unknown, maxQuestions?: number): unknown => {
  if (!quiz || typeof quiz !== 'object') return quiz;

  const q = quiz as Record<string, unknown>;

  const detectedCategory = normalizeDetectedCategory(q.detectedCategory);
  if (detectedCategory) q.detectedCategory = detectedCategory; else delete q.detectedCategory;

  const detectedLesson = normalizeDetectedLesson(q.detectedLesson);
  if (detectedLesson) q.detectedLesson = detectedLesson; else delete q.detectedLesson;

  const suggestedTags = normalizeSuggestedTags(q.suggestedTags);
  if (suggestedTags.length > 0) q.suggestedTags = suggestedTags; else delete q.suggestedTags;

  if (!q.questions) return q;

  if (maxQuestions && (q.questions as unknown[]).length > maxQuestions) {
    console.warn(`[validateAndFixQuiz] ⚠️ AI returned ${(q.questions as unknown[]).length} questions but only ${maxQuestions} requested. Slicing...`);
    q.questions = (q.questions as unknown[]).slice(0, maxQuestions);
  }

  q.questions = (q.questions as Record<string, unknown>[]).map((item, index) => {
    let fixedItem = fixQuestionLatex(item);

    if (fixedItem.type === 'CATEGORIZATION') {
      const categories = (fixedItem.categories as Record<string, unknown>[] | undefined) || [];
      const items = (fixedItem.items as Record<string, unknown>[] | undefined) || [];

      if (items.length === 0) {
        console.error(`[CATEGORIZATION] ❌ Câu ${index + 1}: items array is EMPTY!`);
        console.error(`[CATEGORIZATION] Question text: "${fixedItem.question}"`);
      } else {
        items.forEach((item, i) => {
          if (!item.content || (item.content as string).trim() === '') {
            console.error(`[CATEGORIZATION] ❌ Item ${i} has EMPTY content!`);
            item.content = item.content || `(Mục ${i + 1})`;
          }
          if (!item.id) item.id = `item_${i + 1}`;
          if (!item.categoryId && categories.length > 0) item.categoryId = categories[0].id;
        });
      }

      categories.forEach((cat, i) => {
        if (!cat.id) cat.id = `cat_${i + 1}`;
        if (!cat.name) cat.name = `Nhóm ${i + 1}`;
      });

      return { ...fixedItem, categories, items };
    }

    return fixedItem;
  });

  if ((q.questions as Record<string, unknown>[]).some((item) => item.difficultyLevel)) {
    (q.questions as Record<string, unknown>[]).sort((a, b) => {
      const la = (a.difficultyLevel as number) || 2;
      const lb = (b.difficultyLevel as number) || 2;
      return la - lb;
    });
  }

  return q;
};

// Re-export AIProvider type so providers don't need to import from the root
export type { AIProvider };

