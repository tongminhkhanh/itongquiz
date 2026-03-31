import { GeneratedQuestionSchema, GeneratedQuestion } from "./QuestionSchema";

/**
 * Kiểm tra số chẵn/lẻ của `$` và đóng mở ngoặc nhọn `{}`
 */
export function validateLatexSyntax(text: string): void {
  const unescapedText = text.replace(/\\\$/g, '');
  const dollarCount = (unescapedText.match(/\$/g) || []).length;

  if (dollarCount % 2 !== 0) {
    throw new Error(`Invalid LaTeX syntax: Mismatched '$' symbols (found ${dollarCount}). All math blocks must be closed.`);
  }

  const mathBlocks = unescapedText.match(/\$([^$]+)\$/g) || [];
  for (const block of mathBlocks) {
    let openCount = 0;
    for (const char of block) {
      if (char === '{') openCount++;
      if (char === '}') openCount--;
      if (openCount < 0) {
        throw new Error(`Invalid LaTeX syntax: Unmatched '}' found in math block: ${block}`);
      }
    }
    if (openCount !== 0) {
      throw new Error(`Invalid LaTeX syntax: Unmatched '{' found in math block (missing ${openCount} closing brackets): ${block}`);
    }
  }
}

/**
 * Đảm bảo tất cả `[N]` hoặc `[word]` trong text đều khớp với mảng ID/Giá trị của blanks
 */
export function validateBlankMapping(text: string, blanks: any[]): void {
  const textBlankIds = new Set<string>();
  const regex = /\[(.*?)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    textBlankIds.add(match[1]);
  }

  // Handle both array of strings (current app) and array of objects (new schema)
  const providedBlankIds = new Set(
    blanks.map(b => typeof b === 'string' ? b : b.id)
  );

  for (const id of textBlankIds) {
    // If ID is numeric (e.g. "1"), check if it corresponds to an index in blanks array
    const numId = parseInt(id);
    if (!isNaN(numId) && numId > 0 && numId <= blanks.length) {
      continue; // Valid index-based blank
    }

    // Otherwise check for direct ID/value match
    if (!providedBlankIds.has(id)) {
      throw new Error(`Text contains blank [${id}] but no corresponding blank was provided in blanks array.`);
    }
  }

  // Not enforcing reverse because AI might provide extra options/distractors in blanks array accidentally, 
  // but it's safer to only throw if the text asks for something missing.
}

/**
 * Full AI Question validation
 */
export function validateAIQuestion(questionData: any): GeneratedQuestion {
  const parsed = GeneratedQuestionSchema.parse(questionData);
  const { text, blanks } = parsed.question;

  validateBlankMapping(text, blanks);
  validateLatexSyntax(text);

  return parsed;
}
