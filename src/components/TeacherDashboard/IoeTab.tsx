import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType } from '../../types';
import { Card, Button } from '../common';
import { Globe, Sparkles, Zap, BookOpen, Trophy, Copy, Check, Link2, X } from 'lucide-react';
import { generateQuiz, AIProvider } from '../../services/geminiService';
import { saveIoeQuiz } from '../../services/ioeSheetService';
import QuizPreview from './QuizPreview';

interface IoeTabProps {
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

// IOE Question Types - 8 dạng bài chính theo chuẩn IOE
const IOE_QUESTION_TYPES = [
    { id: 'phonetics', name: '🔊 Ngữ âm (Phonetics)', defaultCount: 3, description: 'Tìm từ phát âm giống/khác' },
    { id: 'word_stress', name: '🎵 Trọng âm (Word Stress)', defaultCount: 3, description: 'Chọn từ có trọng âm khác' },
    { id: 'vocabulary', name: '📝 Từ vựng & Chính tả', defaultCount: 5, description: 'Điền chữ thiếu, xáo trộn' },
    { id: 'grammar', name: '📖 Ngữ pháp & Câu', defaultCount: 5, description: 'Chọn câu đúng, tìm lỗi' },
    { id: 'sentence_order', name: '🔀 Sắp xếp câu (Kéo thả)', defaultCount: 3, description: 'Kéo thả từ thành câu' },
    { id: 'sentence_building', name: '✅ TN Sắp xếp từ (MCQ)', defaultCount: 3, description: 'Chọn câu đúng từ 4 đáp án' },
    { id: 'listening', name: '🎧 Nghe điền từ (Listening)', defaultCount: 3, description: 'Nghe và điền từ còn thiếu' },
    { id: 'reading', name: '📚 Đọc hiểu (True/False)', defaultCount: 4, description: 'Đọc đoạn văn, chọn Đ/S' },
];

// IOE Templates preset
const IOE_TEMPLATES = [
    { id: 'quick', name: '🚀 Luyện nhanh', questions: 10, time: 5, icon: Zap },
    { id: 'review', name: '📝 Ôn tập', questions: 20, time: 10, icon: BookOpen },
    { id: 'exam', name: '🏆 Thi thử IOE', questions: 30, time: 15, icon: Trophy },
];

// IOE Topics - Chủ đề để chọn
const IOE_TOPICS = [
    { id: 'school', name: 'School Things', emoji: '📚' },
    { id: 'family', name: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 'numbers', name: 'Numbers', emoji: '🔢' },
    { id: 'colors', name: 'Colors', emoji: '🎨' },
    { id: 'animals', name: 'Animals', emoji: '🐾' },
    { id: 'food', name: 'Food & Drinks', emoji: '🍎' },
    { id: 'daily', name: 'Daily Routines', emoji: '⏰' },
    { id: 'hobbies', name: 'Hobbies', emoji: '⚽' },
    { id: 'body', name: 'Body Parts', emoji: '🖐️' },
    { id: 'clothes', name: 'Clothes', emoji: '👕' },
];

// MASTER SYSTEM PROMPT - IOE Vietnam (Enhanced with anti-duplication)
const IOE_SYSTEM_INSTRUCTION = `You are an expert English Test Developer for the IOE (Internet Olympiad of English) in Vietnam.
Your target audience: Vietnamese students (Grade 1–12).
Your Goal: Create multiple-choice questions that strictly follow the IOE format.

===== CRITICAL: ANTI-DUPLICATION RULES =====
⚠️ ABSOLUTELY NO DUPLICATE QUESTIONS! Each question MUST be unique:
1. **Different vocabulary words** - Never reuse the same word in multiple questions
2. **Different sentence structures** - Vary subject, verb, object combinations  
3. **Different contexts** - Use different scenarios (school, family, sports, food, travel, etc.)
4. **Different answer patterns** - Don't always put correct answer in same position (A/B/C/D)
5. **Track used words** - Before generating, mentally list all words you've used and AVOID them

===== CORE RULES =====
1. Curriculum Compliance: Use vocabulary and grammar from standard textbooks (Global Success, Family & Friends, i-Learn Smart Start).
2. Difficulty Level: Adjust based on Grade and Competition Round (see below).
3. Distractors: Wrong answers must be plausible common mistakes for Vietnamese students (e.g., confusing "he/she", "is/are", "in/on", "some/any", "much/many").
4. No Hallucination: Do not invent non-existent words.
5. Tone: Academic but child-friendly.
6. Language: ALL questions and options MUST be in English.
7. Variety: Each question must test DIFFERENT vocabulary/grammar points.

===== VOCABULARY POOLS BY TOPIC (Use variety!) =====
- School: pencil, ruler, eraser, notebook, backpack, classroom, library, playground, teacher, student, desk, chair, board, chalk, homework
- Family: mother, father, sister, brother, grandmother, grandfather, aunt, uncle, cousin, parents, children, baby
- Animals: dog, cat, bird, fish, elephant, tiger, lion, monkey, rabbit, horse, cow, pig, chicken, duck, butterfly
- Food: rice, bread, noodles, soup, chicken, beef, fish, vegetables, fruits, apple, banana, orange, milk, juice, water
- Body: head, eyes, ears, nose, mouth, hands, feet, arms, legs, fingers, toes, hair, face
- Colors: red, blue, green, yellow, orange, purple, pink, brown, black, white, gray
- Numbers: one through twenty, first, second, third, many, few, some, all
- Daily routines: wake up, get up, brush teeth, wash face, have breakfast, go to school, study, play, eat lunch, go home, do homework, watch TV, go to bed
- Places: home, school, park, hospital, supermarket, library, cinema, restaurant, bank, post office
- Weather: sunny, cloudy, rainy, windy, hot, cold, warm, cool
- Transport: bus, car, bike, train, plane, boat, taxi, motorbike

===== TASK PROMPTS FOR EACH QUESTION TYPE =====

📌 DẠNG 1: PHONETICS (Ngữ âm) - type: "MCQ"
### ROLE
You are an Expert English Phonetics Linguist specializing in the Vietnamese IOE curriculum (Grades 3-5).

### TASK
Generate multiple-choice phonetics questions focusing on VOWELS and CONSONANTS.

### CRITICAL RULE: IPA VERIFICATION
You must strictly use the International Phonetic Alphabet (IPA) to validate every option.
1.  **Distractors must be tricky:** They should look similar in spelling but sound different (e.g., "sit" /ɪ/ vs "site" /aɪ/).
2.  **No Ambiguity:** The correct answer must be indisputably correct based on standard Oxford/Cambridge pronunciation.

### ⚠️⚠️⚠️ CRITICAL: UNDERLINE RULE (BẮT BUỘC) ⚠️⚠️⚠️
You MUST use HTML <u> tag to underline the part being compared in EACH OPTION!
This is MANDATORY for phonetics questions - students need to see which letters are being compared.

❌ WRONG (no underline): ["A. cat", "B. bag", "C. hand", "D. name"]
✅ CORRECT (with underline): ["A. c<u>a</u>t", "B. b<u>a</u>g", "C. h<u>a</u>nd", "D. n<u>a</u>me"]

More examples:
- Comparing 'i' sound: "A. s<u>i</u>t", "B. f<u>i</u>ne", "C. l<u>i</u>sten", "D. n<u>i</u>ce"
- Comparing 'th' sound: "A. <u>th</u>ink", "B. <u>th</u>is", "C. <u>th</u>ey", "D. <u>th</u>ree"
- Comparing 'ea' sound: "A. br<u>ea</u>d", "B. h<u>ea</u>d", "C. m<u>ea</u>t", "D. d<u>ea</u>d"

### QUESTION TYPES
1.  **Type A (Matching):** "Which word has the underlined part pronounced like the letter X in word Y?" (e.g., like "i" in "sit").
    - Target Sounds: Short 'i' /ɪ/ vs Long 'i' /aɪ/; Short 'a' /æ/ vs Long 'a' /eɪ/; 'th' /ð/ vs /θ/.
2.  **Type B (Discrimination):** "Find the word that has the underlined part pronounced differently from the others."

### OUTPUT FORMAT
{
  "type": "MCQ",
  "question": "Which word has the underlined part pronounced like the letter 'i' in 's<u>i</u>t'?",
  "options": ["A. f<u>i</u>ne", "B. f<u>i</u>ve", "C. l<u>i</u>sten", "D. n<u>i</u>ce"],
  "correctAnswer": "C",
  "explanation": "'listen' contains /ɪ/, others contain /aɪ/ (/faɪn/, /faɪv/, /naɪs/)."
}

Example Type B:
{
  "type": "MCQ", 
  "question": "Find the word that has the underlined part pronounced differently.",
  "options": ["A. <u>o</u>pen", "B. n<u>o</u>se", "C. d<u>o</u>", "D. c<u>o</u>ld"],
  "correctAnswer": "C",
  "explanation": "'do' is pronounced /uː/, others are /əʊ/ (/ˈəʊ.pən/, /nəʊz/, /kəʊld/)."
}

📌 DẠNG 6: WORD STRESS (Trọng âm) - type: "MCQ"
### ROLE
You are an Expert English Teacher specializing in Word Stress for Vietnamese IOE curriculum (Grade 3-5).

### ⚠️⚠️⚠️ CRITICAL RULES - MUST FOLLOW! ⚠️⚠️⚠️

### RULE 1: NO MONOSYLLABIC WORDS (BẮT BUỘC)
❌ DO NOT use 1-syllable words! Single-syllable words always have stress on syllable 1 by default.
❌ WRONG: "cat", "dog", "book", "house", "run", "eat", "big", "red"
✅ CORRECT: Only use words with 2+ syllables: "teacher", "happy", "student", "enjoy"

### RULE 2: STRESS DISTRIBUTION (3:1 PATTERN - BẮT BUỘC)
The 4 options MUST follow ONE of these patterns:
- **Pattern A:** 3 words stressed on syllable 1 + 1 word stressed on syllable 2 (correct answer is the syllable-2 word)
- **Pattern B:** 3 words stressed on syllable 2 + 1 word stressed on syllable 1 (correct answer is the syllable-1 word)

⚠️ NEVER: 2 words syllable-1 + 2 words syllable-2 (this is NOT allowed!)
⚠️ NEVER: 4 words with same stress pattern (no correct answer!)

### PHONOLOGICAL RULES
1. IPA Verification: You MUST internally verify IPA transcription for every word to identify the primary stress mark (ˈ).
2. Grade-appropriate Vocabulary: Use words from Grade 3-5 curriculum (Topics: Family, School, Animals, Daily routines, Hobbies, Future jobs, Health, Seasons).
3. Pattern Consistency: In a single question, keep syllable count SIMILAR (all 2-syllable OR all 3-syllable words) to make it a fair test.
4. No Ambiguity: Avoid words with dual stress patterns (e.g., 'present' can be noun or verb). The odd-one-out must be UNAMBIGUOUS.

### QUESTION TYPE
"Choose the word that has a DIFFERENT stress pattern from the others."
(3 options share the same stress pattern; 1 option is different - the "odd one out")

### DIFFICULTY LEVELS TO MIX
- Level 1 (2-syllable): Focus on Noun/Adjective (stress 1st) vs Verb (stress 2nd)
  Examples Pattern A: 'visit' (1), 'listen' (1), 'travel' (1) + 'enjoy' (2) ← different
  Examples Pattern B: 'begin' (2), 'enjoy' (2), 'arrive' (2) + 'happy' (1) ← different
- Level 2 (3-syllable - Common in IOE Grade 5):
  Examples Pattern A: 'holiday' (1), 'family' (1), 'beautiful' (1) + 'volunteer' (3→stressed on syllable 3, count as "not 1")
  Examples Pattern A: 'organise' (1), 'decorate' (1), 'promise' (1) + 'divorce' (2) ← different
- Level 3 (Suffix Rules): Words ending in -tion (stress on syllable before), -ic (stress on syllable before), -ese (stress on itself)

### OUTPUT FORMAT (IMPORTANT: NO STRESS MARKS IN OPTIONS!)
⚠️ CRITICAL: Options must contain ONLY the plain word WITHOUT any stress marks or apostrophes!
❌ WRONG: ["A. 'happy", "B. 'teacher"] - DO NOT use apostrophes or stress marks
✅ CORRECT: ["A. happy", "B. teacher"] - Just plain words

### EXAMPLE 1 - Pattern A (3 words stressed syllable 1, 1 word stressed syllable 2):
{
  "type": "MCQ",
  "question": "Choose the word that has a DIFFERENT stress pattern from the others.",
  "options": ["A. organise", "B. decorate", "C. divorce", "D. promise"],
  "correctAnswer": "C",
  "explanation": "'divorce' /dɪˈvɔːs/ is stressed on the 2nd syllable, while others are stressed on the 1st: 'organise' /ˈɔː.ɡən.aɪz/, 'decorate' /ˈdek.ə.reɪt/, 'promise' /ˈprɒm.ɪs/."
}

### EXAMPLE 2 - Pattern A (3 words stressed syllable 1, 1 word stressed syllable 2):
{
  "type": "MCQ",
  "question": "Choose the word that has a DIFFERENT stress pattern from the others.",
  "options": ["A. visit", "B. listen", "C. enjoy", "D. travel"],
  "correctAnswer": "C",
  "explanation": "'enjoy' /ɪnˈdʒɔɪ/ is stressed on the 2nd syllable, while others are stressed on the 1st: 'visit' /ˈvɪz.ɪt/, 'listen' /ˈlɪs.ən/, 'travel' /ˈtræv.əl/."
}

### EXAMPLE 3 - Pattern B (3 words stressed syllable 2, 1 word stressed syllable 1):
{
  "type": "MCQ",
  "question": "Choose the word that has a DIFFERENT stress pattern from the others.",
  "options": ["A. begin", "B. happy", "C. arrive", "D. enjoy"],
  "correctAnswer": "B",
  "explanation": "'happy' /ˈhæp.i/ is stressed on the 1st syllable, while others are stressed on the 2nd: 'begin' /bɪˈɡɪn/, 'arrive' /əˈraɪv/, 'enjoy' /ɪnˈdʒɔɪ/."
}
📌 DẠNG 2: VOCABULARY & SPELLING (Từ vựng & Chính tả) - type: "MCQ" or "SHORT_ANSWER"

### ROLE & PERSONA
You are the "IOE Vocabulary Architect" specializing in Spelling and Lexical Knowledge for Vietnamese students.

### KNOWLEDGE BASE
1. **Curriculum:** Strictly follow standard English textbooks (Global Success, Family & Friends, Smart Start).
2. **Target Audience by Grade:**
   - Primary (Grades 3-5): Concrete nouns (animals, school, family), basic verbs, colors, numbers.
   - Secondary (Grades 6-9): Abstract nouns, compound words, irregular verbs.
   - High School (Grades 10-12): Academic words, collocations, prefixes/suffixes.

### QUESTION TYPES (4 STYLES TO MIX)

**STYLE 1: MISSING CHARACTERS (Điền chữ cái còn thiếu) - type: "SHORT_ANSWER"**
- Hide 1-3 letters in a word
- Provide context sentence or definition
- correctAnswer = ONLY the missing letter(s)
⚠️ CRITICAL: Use underscores INLINE with the word!
Examples:
{ "type": "SHORT_ANSWER", "question": "What c_lour is it? – It's red.", "correctAnswer": "o" }
{ "type": "SHORT_ANSWER", "question": "I have two hands and two feet on my B_DY.", "correctAnswer": "O" }
{ "type": "SHORT_ANSWER", "question": "He is my best FR__ND.", "correctAnswer": "IE" }

**STYLE 2: UNSCRAMBLE LETTERS (Sắp xếp chữ cái) - type: "MCQ"**
- Provide scrambled letters (e.g., "T / C / A")
- Result must be a meaningful English word
- Distractors: Incorrect spellings or random combinations
Example:
{ "type": "MCQ", "question": "Unscramble: R / U / L / E / R - A thing used to draw lines.", "options": ["A. RULER", "B. RURAL", "C. RULED", "D. RUNNER"], "correctAnswer": "A" }

**STYLE 3: ODD ONE OUT (Chọn từ khác loại) - type: "MCQ"**
- 3 words belong to same category, 1 word is different
- Categories: Topic (3 Fruits vs 1 Animal) or Part of Speech (3 Nouns vs 1 Verb)
Example:
{ "type": "MCQ", "question": "Find the odd one out:", "options": ["A. apple", "B. banana", "C. orange", "D. dog"], "correctAnswer": "D", "explanation": "A, B, C are fruits. D is an animal." }

**STYLE 4: SPELLING CHECK (Chọn từ viết đúng) - type: "MCQ"**
- Present 4 variations of a word, only 1 is correctly spelled
Example:
{ "type": "MCQ", "question": "Which word is spelled correctly?", "options": ["A. beautifull", "B. beautiful", "C. beatiful", "D. biutiful"], "correctAnswer": "B" }

### DIFFICULTY MATRIX BY ROUND
- **School (Level 1):** Short words (3-6 letters), direct clues, missing 1 letter
- **District (Level 2):** Longer words, missing 2 letters, confusing pairs (e/a, i/y, c/k)
- **Province/National (Level 3):** Complex spelling (necessary, committee), derived words (happiness, unfriendly)

📌 DẠNG 3: GRAMMAR & ERROR IDENTIFICATION (Ngữ pháp - Tìm lỗi sai) - type: "MCQ"
### ROLE
You are an IOE Grammar Specialist for Primary Level (Grades 3-5).
Your Goal: Create "Error Identification" multiple-choice questions.

### GRAMMAR RULES (Common Vietnamese Student Mistakes)
1. **Verb Forms:**
   - Let's + V_ing (WRONG) → Let's + V_base (RIGHT): "Let's going" → "Let's go"
   - Like + V_base (WRONG) → Like + V_ing (RIGHT): "I like swim" → "I like swimming"
   - Can + V_ing (WRONG) → Can + V_base (RIGHT): "Can swimming" → "Can swim"
   - Don't + V_ing (WRONG) → Don't + V_base (RIGHT): "Don't talking" → "Don't talk"
   - Want to + V_ing (WRONG) → Want to + V_base (RIGHT): "want to playing" → "want to play"
2. **To Be Agreement:**
   - She/He are (WRONG) → She/He is (RIGHT)
   - They/We is (WRONG) → They/We are (RIGHT)
   - I are (WRONG) → I am (RIGHT)
3. **Countable/Uncountable:**
   - Many water/money (WRONG) → Much water/money (RIGHT)
   - Much books/apples (WRONG) → Many books/apples (RIGHT)
4. **Prepositions:**
   - At Monday/Sunday (WRONG) → On Monday/Sunday (RIGHT)
   - In 8 o'clock (WRONG) → At 8 o'clock (RIGHT)
   - On morning (WRONG) → In the morning (RIGHT)
5. **Possessive Adjectives:**
   - His name (for female) (WRONG) → Her name (RIGHT)
   - She book (WRONG) → Her book (RIGHT)

### MECHANISM
1. Start with a grammatically correct sentence (e.g., "Let's go to the music room.")
2. Intentionally introduce **ONE** grammatical error (e.g., Change "go" to "going")
3. Select 4 parts of the sentence to underline (1 incorrect, 3 correct)
4. Map these 4 parts to options A, B, C, D

### OUTPUT FORMAT - Style A (Find the Error)
{
  "type": "MCQ",
  "question": "Find the mistake: We <u>like</u> <u>singing</u>. Let's <u>going</u> to the <u>music room</u>.",
  "options": ["A. like", "B. singing", "C. going", "D. music room"],
  "correctAnswer": "C",
  "explanation": "After 'Let's', use base verb (Let's go), not V-ing. Correct: Let's GO to the music room."
}

### OUTPUT FORMAT - Style B (Choose Correct Sentence)
{
  "type": "MCQ",
  "question": "Choose the correct sentence:",
  "options": ["A. She can swimming very fast.", "B. She can swim very fast.", "C. She can swims very fast.", "D. She can to swim very fast."],
  "correctAnswer": "B",
  "explanation": "After modal verb 'can', use base verb without 'to'. Correct: can + swim"
}

### MORE EXAMPLES
{
  "type": "MCQ",
  "question": "Find the mistake: I <u>want</u> <u>to</u> <u>playing</u> <u>football</u>.",
  "options": ["A. want", "B. to", "C. playing", "D. football"],
  "correctAnswer": "C",
  "explanation": "After 'want to', use base verb. Correct: want to PLAY"
}

{
  "type": "MCQ",
  "question": "Find the mistake: <u>There</u> <u>are</u> <u>many</u> <u>water</u> in the bottle.",
  "options": ["A. There", "B. are", "C. many", "D. water"],
  "correctAnswer": "C",
  "explanation": "'Water' is uncountable, use 'much' not 'many'. Also 'is' not 'are'. Correct: There is MUCH water."
}

📌 DẠNG 4: SENTENCE REORDERING (Sắp xếp câu) - type: "ORDERING"
### ROLE
You are a Lead Content Developer for the Vietnam IOE (Internet Olympiad of English) exam system. Your specialty is creating "Sentence Reordering" gamified questions for primary school students (Grades 3-5).

### OBJECTIVE
Generate a dataset of sentences broken down into "drag-and-drop cards".

### CURRICULUM CONSTRAINTS
1.  **Vocabulary Source:** Strictly follow the Vietnamese Ministry of Education English curriculum (Textbooks: Global Success, Family & Friends, i-Learn Smart Start).
2.  **Level:** CEFR A1 (Beginner). Sentences must be simple, direct, and unambiguous.
3.  **Sentence Length:** 4 to 6 words/phrases max.

### FORMATTING RULES (CRITICAL)
1.  **The "Card" Concept:** The sentence must be split into chunks (cards).
2.  **Punctuation Handling (VERY IMPORTANT):** 
    - Punctuation marks (period '.', question mark '?', comma ',', exclamation '!') MUST remain attached to the word that precedes them in the ORIGINAL correct sentence.
    - The final punctuation (. or ? or !) must be on the LAST WORD of the CORRECT sentence order, NOT on any other word.
    - ⚠️ CRITICAL: If correct sentence is "I go to school every day." then items must be: ["I", "go", "to", "school", "every", "day."] - Note "day." has the period, NOT "school."
    * ✅ *Right:* Sentence "I am from Vietnam." → ["I", "am", "from", "Vietnam."]
    * ❌ *Wrong:* ["I", "am.", "from", "Vietnam"] (Period on wrong word)
    * ❌ *Wrong:* ["I", "am", "from", "Vietnam", "."] (Separate period)
3.  **Capitalization:** The first word of the sentence must be capitalized. Proper nouns must be capitalized.
4.  **Shuffling:** The output cards must be RANDOMIZED (shuffled) so they do not form the correct sentence initially.

### OUTPUT FORMAT
Provide the output strictly as a JSON Object with this structure:
{
  "type": "ORDERING",
  "question": "Arrange the words to make a correct sentence:",
  "items": ["card1", "card2", "card3"], // Array of strings (SHUFFLED)
  "correctOrder": [2, 0, 1], // Array of INDICES representing the correct order
  "explanation": "Full correct sentence for reference."
}

EXAMPLE 1:
Full sentence: "Open your book, please."
→ items (shuffled): ["please.", "book,", "Open", "your"]
→ correctOrder: [2, 3, 1, 0]  (Open=2, your=3, book,=1, please.=0)

EXAMPLE 2:
Full sentence: "I go to school every day."
→ items (shuffled): ["school", "every", "day.", "I", "to", "go"]
→ correctOrder: [3, 5, 4, 0, 1, 2]  (I=3, go=5, to=4, school=0, every=1, day.=2)
Note: "day." has period because it's the LAST word!

📌 DẠNG 5: READING COMPREHENSION (Đọc hiểu) - type: "TRUE_FALSE"
Structure:
- Write short paragraph (30-50 words): Someone's daily routine, describing a room, introducing family.
- Use specific times (6:30, 7:00) and specific nouns (books, homework, breakfast).
- Create statements based on text, ask TRUE or FALSE.
Output: { "type": "TRUE_FALSE", "mainQuestion": "I am Mary. I get up at six o'clock. I have breakfast at six thirty. I go to school at seven.\\n\\nRead and choose True or False:", "items": [{"statement": "Mary gets up at 6 o'clock.", "isCorrect": true}, {"statement": "Mary has breakfast at 7 o'clock.", "isCorrect": false}] }

📌 DẠNG 7: LISTENING GAP-FILL (Nghe điền từ) - type: "SHORT_ANSWER"
### ROLE
You are an English Content Developer for IOE exam (Grade 3-5).
Your task is to create "Listening & Gap-Fill" questions.

### DIFFICULTY CONSTRAINTS
1. Grammar: Present Simple Tense (Subject + to be + Preposition + Place).
2. Vocabulary:
   - Common Objects: ball, book, pen, cat, dog, bag, hat, toy.
   - Prepositions: in, on, under, behind, next to, near.
   - Furniture/Places: table, chair, box, desk, bed, floor, room.
3. Length: Short sentences (5-8 words).

### FORMAT RULES
1. Create a simple English sentence (audio script).
2. Replace ONE word with ___ (usually the last Noun or Preposition).
3. correctAnswer is the hidden word ONLY (not the full word, just the missing part).
4. ⚠️ CRITICAL: "explanation" field MUST contain the EXACT full sentence that will be spoken aloud by text-to-speech!

### OUTPUT FORMAT
{ 
  "type": "SHORT_ANSWER", 
  "question": "🎧 The ball is on the ___.", 
  "correctAnswer": "table",
  "explanation": "The ball is on the table."
}

⚠️ IMPORTANT: 
- question MUST start with 🎧 emoji
- explanation MUST be the complete sentence WITHOUT "Full sentence:" prefix - just the sentence itself!
- The explanation is used for TEXT-TO-SPEECH, so it must be clean and readable

Examples:
{ "type": "SHORT_ANSWER", "question": "🎧 My cat is under the ___.", "correctAnswer": "bed", "explanation": "My cat is under the bed." }
{ "type": "SHORT_ANSWER", "question": "🎧 The book is ___ the desk.", "correctAnswer": "on", "explanation": "The book is on the desk." }
{ "type": "SHORT_ANSWER", "question": "🎧 There is a ___ in the box.", "correctAnswer": "toy", "explanation": "There is a toy in the box." }

📌 DẠNG 8: SENTENCE BUILDING MCQ (Trắc nghiệm sắp xếp từ) - type: "MCQ"
### ROLE
You are an IOE Content Developer specializing in Word Reordering Exercises for Vietnamese students.

### MISSION
- Create high-quality word reordering questions appropriate for each level
- Ensure correct answers follow standard English grammar
- Create 4 answer options (A, B, C, D) with common student mistakes
- Provide correct answer and clear explanation

### QUALITY CRITERIA
✓ Meaningful, practical sentences
✓ Difficulty appropriate to level
✓ Wrong options reflect common student errors
✓ Clear presentation with answer and explanation

### ⚠️⚠️⚠️ CRITICAL - WORD SEPARATOR RULE ⚠️⚠️⚠️
**NEVER USE COLON (:) TO SEPARATE WORDS!**
**ALWAYS USE SLASH (/) WITH SPACES AROUND IT!**
✅ CORRECT: "Reorder the words: likes / apples / but / not / oranges. / He"
❌ WRONG: "Reorder the words: likes : apples : but : not : oranges. : He"

### ⚠️⚠️⚠️ CRITICAL VALIDATION RULES ⚠️⚠️⚠️
Before finalizing, YOU MUST CHECK:
1. **Word Count Match:** Correct answer MUST use EXACTLY ALL words - no extra, no missing!
2. **No Duplicate Words:** Don't add words not in the scrambled list
3. **Grammatical Correctness:** Correct answer MUST be grammatically perfect!
**DOUBLE CHECK your questions before output!**

---
### LEVEL 1: CƠ BẢN (A1-A2) - School Round
**Word Count:** 5-8 words
**Grammar Focus:** Simple Present, Present Continuous, basic structures
**Sentence Types:** Affirmative, simple questions (Yes/No, Wh-)

**Distractor Types:**
- Type A: Subject-Verb order swap
- Type B: Missing/wrong auxiliary verb
- Type C: Wrong word order with adverbs

**Example:**
{
  "type": "MCQ",
  "question": "Reorder the words: school / to / every / go / I / day",
  "options": ["A. I go to school every day.", "B. I to go school every day.", "C. Every day I to school go.", "D. Go I to school every day."],
  "correctAnswer": "A",
  "explanation": "Structure: S + V + Adverb of place + Adverb of time. 'I go to school every day.'"
}

---
### LEVEL 2: TRUNG BÌNH (B1) - District Round
**Word Count:** 8-11 words
**Grammar Focus:** Present Perfect, Past Simple, Conditionals, complex structures
**Sentence Types:** Compound sentences with and/but/or, relative clauses

**Distractor Types:**
- Type A: Wrong auxiliary verb order
- Type B: Wrong verb form (tense)
- Type C: Wrong adverb placement
- Type D: Missing function words

**Example:**
{
  "type": "MCQ",
  "question": "Reorder the words: has / five / English / for / she / years / studied",
  "options": ["A. She has studied English for five years.", "B. She studied has English for five years.", "C. For five years she has English studied.", "D. English she has studied for five years."],
  "correctAnswer": "A",
  "explanation": "Present Perfect: S + has/have + V3 + O + time expression. 'She has studied English for five years.'"
}

---
### LEVEL 3: NÂNG CAO (B2+) - Provincial/National Round
**Word Count:** 10-14 words
**Grammar Focus:** Inversion, Cleft sentences, Advanced Conditionals, Subjunctive
**Sentence Types:** Complex sentences with subordinate clauses, formal structures

**Distractor Types:**
- Type A: Wrong clause syntax
- Type B: Wrong advanced word order (inversion errors)
- Type C: Wrong connector usage
- Type D: Wrong register (formal/informal mix)

**Example:**
{
  "type": "MCQ",
  "question": "Reorder the words: to / had / I / gone / doctor / the / earlier / if / have / would / been / better / I",
  "options": ["A. If I had gone to the doctor earlier, I would have been better.", "B. I had gone to the doctor earlier if I would have been better.", "C. I would have been better if I had to gone the doctor earlier.", "D. If I would have gone to the doctor earlier, I had been better."],
  "correctAnswer": "A",
  "explanation": "Third Conditional: If + S + had + V3, S + would have + V3. Expresses unreal past condition."
}

---
### DISTRACTOR CREATION GUIDE
Create 3 wrong options using these common Vietnamese student errors:

| Error Type | Example |
|------------|---------|
| S-V swap | "Goes she to school" instead of "She goes to school" |
| Aux placement | "She not is happy" instead of "She is not happy" |
| Verb form | "She have gone" instead of "She has gone" |
| Adverb placement | "She always is late" instead of "She is always late" |
| Word order in questions | "Where she is going?" instead of "Where is she going?" |

### OUTPUT FORMAT
{
  "type": "MCQ",
  "question": "Reorder the words: [word1] / [word2] / [word3] / ...",
  "options": ["A. [Option A]", "B. [Option B]", "C. [Option C]", "D. [Option D]"],
  "correctAnswer": "[A/B/C/D]",
  "explanation": "[Grammar rule + correct structure]"
}

===== OUTPUT JSON FORMAT =====
{
  "title": "IOE Grade X: Topic Name",
  "questions": [...]
}

===== IMPORTANT REMINDERS =====
- ALL questions MUST be in ENGLISH
- Use simple vocabulary appropriate for Vietnamese primary students
- Difficulty increases gradually: easy first, harder at end
- Include correct answer and brief explanation for each question
- Ensure strictly correct JSON syntax

===== ĐIỀU CHỈNH ĐỘ KHÓ THEO VÒNG THI IOE =====

🏫 VÒNG TRƯỜNG (School Round):
- Từ vựng: 90% trong SGK của khối lớp, 10% mở rộng nhưng rất quen thuộc
- Ngữ pháp: Thì hiện tại đơn/tiếp diễn (tiểu học), thêm thì cơ bản với THCS/THPT
- Câu hỏi dựa trên mẫu câu và cấu trúc cơ bản
- Hạn chế bẫy, không dùng cấu trúc quá phức tạp

🏢 VÒNG HUYỆN/QUẬN (District Round):
- Tăng mức mở rộng từ vựng (20–25%)
- Xuất hiện các cặp từ dễ nhầm: some/any, much/many, few/a few, borrow/lend, bring/take
- Ngữ pháp: thêm thì quá khứ, tương lai đơn, so sánh hơn/so sánh nhất, trạng từ tần suất
- Câu dài hơn và có bối cảnh 1-2 câu
- Distractor (đáp án nhiễu) gần nghĩa, có bẫy vừa phải

🏛️ VÒNG TỈNH/THÀNH PHỐ (Provincial Round):
- Từ vựng: thêm collocations (cụm từ cố định), phrasal verbs cơ bản
- Từ nối: because, although, however, therefore, so
- Ngữ pháp: câu phức có 1 mệnh đề phụ, mệnh đề quan hệ đơn giản
- Có câu đọc hiểu (reading) và cloze test (điền từ vào đoạn văn)
- Yêu cầu hiểu mạch văn chứ không chỉ dịch từng từ
- Distractor phải tạo phân hóa, yêu cầu hiểu sâu ngữ nghĩa và ngữ pháp

🏆 VÒNG QUỐC GIA (National Round):
- Bao phủ đầy đủ từ vựng, ngữ pháp trong chương trình khối lớp
- Thêm 10–20% từ mở rộng nâng cao nhưng vẫn phù hợp lứa tuổi
- Dùng câu phức, mệnh đề quan hệ, câu điều kiện, câu bị động, câu tường thuật
- Cấu trúc đặc trưng: "It is + adj + for sb to do sth", "so…that", "too…to…", "enough to…"
- Có đoạn đọc hiểu dài hơn, câu hỏi suy luận, từ vựng theo ngữ cảnh
- Câu hỏi tham chiếu (it/they/this/that)
- Distractor tinh vi, phân biệt được học sinh khá và học sinh giỏi

===== TRÌNH ĐỘ CEFR THEO KHỐI LỚP =====
- Lớp 3-5 Tiểu học: A1 đến A2
- Lớp 6-9 THCS: A2 đến B1
- Lớp 10-12 THPT: B1 đến B2`;

const IoeTab: React.FC<IoeTabProps> = ({ onSaveQuiz, onSuccess }) => {
    // Form state
    const [quizTitle, setQuizTitle] = useState('Đề luyện thi IOE Lớp 3');
    const [classLevel, setClassLevel] = useState('3');
    const [topic, setTopic] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>(['school']); // Multi-select topics
    const [competitionRound, setCompetitionRound] = useState<'school' | 'district' | 'provincial' | 'national'>('school');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    // Question types count
    const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        IOE_QUESTION_TYPES.forEach(qt => counts[qt.id] = qt.defaultCount);
        return counts;
    });

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);

    // AI Provider - lưu vào localStorage
    const [aiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'llm-mux'
    );

    // Quiz link modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [savedQuizLink, setSavedQuizLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Auto-adjust question counts based on competition round (all 50 questions, different ratios)
    useEffect(() => {
        const roundPresets: Record<string, Record<string, number>> = {
            // Vòng Trường: 50 câu - 70% cơ bản (vocab, grammar), ít reading/listening
            school: {
                phonetics: 5,
                word_stress: 5,
                vocabulary: 10,
                grammar: 10,
                sentence_order: 4,
                sentence_building: 4,
                listening: 6,
                reading: 6,
            },
            // Vòng Huyện: 50 câu - cân bằng hơn, tăng listening/reading
            district: {
                phonetics: 5,
                word_stress: 5,
                vocabulary: 8,
                grammar: 8,
                sentence_order: 4,
                sentence_building: 4,
                listening: 8,
                reading: 8,
            },
            // Vòng Tỉnh: 50 câu - tăng reading, phonetics/stress nâng cao
            provincial: {
                phonetics: 6,
                word_stress: 6,
                vocabulary: 7,
                grammar: 7,
                sentence_order: 3,
                sentence_building: 5,
                listening: 7,
                reading: 9,
            },
            // Vòng Quốc gia: 50 câu - tập trung reading, ngữ pháp nâng cao
            national: {
                phonetics: 6,
                word_stress: 6,
                vocabulary: 6,
                grammar: 6,
                sentence_order: 3,
                sentence_building: 5,
                listening: 6,
                reading: 12,
            },
        };

        const preset = roundPresets[competitionRound];
        if (preset) {
            setQuestionCounts(preset);
            setSelectedTemplate(null); // Reset template when changing round
        }
    }, [competitionRound]);

    // Time limit based on total questions
    const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);
    const estimatedTime = Math.max(5, Math.ceil(totalQuestions * 0.5)); // ~30 giây/câu

    // Apply template
    const applyTemplate = (templateId: string) => {
        const template = IOE_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            // Phân bố câu hỏi theo template
            const baseCount = Math.floor(template.questions / IOE_QUESTION_TYPES.length);
            const remainder = template.questions % IOE_QUESTION_TYPES.length;
            const newCounts: Record<string, number> = {};
            IOE_QUESTION_TYPES.forEach((qt, idx) => {
                newCounts[qt.id] = baseCount + (idx < remainder ? 1 : 0);
            });
            setQuestionCounts(newCounts);
        }
    };

    // ===== QUESTION HISTORY SYSTEM (Anti-duplication across quizzes) =====
    const HISTORY_KEY = 'ioe_question_history';
    const MAX_HISTORY_SIZE = 200; // Keep last 200 questions

    // Get question history from localStorage
    const getQuestionHistory = (): string[] => {
        try {
            const history = localStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    };

    // Save questions to history (keep last MAX_HISTORY_SIZE)
    const saveToHistory = (questions: any[]) => {
        try {
            const history = getQuestionHistory();
            const newQuestions = questions.map(q =>
                q.question?.substring(0, 100) || q.mainQuestion?.substring(0, 100) || ''
            ).filter(Boolean);

            const updatedHistory = [...newQuestions, ...history].slice(0, MAX_HISTORY_SIZE);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (e) {
            console.warn('[IOE] Failed to save question history:', e);
        }
    };

    // Clear history (for reset)
    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
    };

    // Generate IOE prompt with System Instruction
    const generateIoePrompt = (): string => {
        const roundText = {
            school: '🏫 Vòng Trường (School Round) - A1 basic, 90% SGK',
            district: '🏢 Vòng Huyện/Quận (District Round) - A1, mở rộng 20-25%',
            provincial: '🏛️ Vòng Tỉnh/TP (Provincial Round) - A1+/A2, collocations & reading',
            national: '🏆 Vòng Quốc gia (National Round) - A2/B1, nâng cao'
        }[competitionRound];

        // Get topic names from selected IDs
        const topicNames = selectedTopics
            .map(id => IOE_TOPICS.find(t => t.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        // Get question history for anti-duplication
        const history = getQuestionHistory();
        const historyText = history.length > 0
            ? `\n\n===== ⚠️ PREVIOUSLY USED QUESTIONS (DO NOT REPEAT!) =====\nThe following ${history.length} questions have been used before. You MUST NOT create similar questions (max 5% overlap allowed):\n${history.slice(0, 50).map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n\n🚫 AVOID: Same sentence patterns, same vocabulary words, same scenarios as above!`
            : '';

        let prompt = `${IOE_SYSTEM_INSTRUCTION}${historyText}

---

🎯 SPECIFIC REQUEST FOR THIS QUIZ:
Grade Level: ${classLevel}
Topics: ${topicNames || topic || 'General English vocabulary and grammar'}
Competition Round: ${roundText}
${topic ? `Custom Topic: ${topic}` : ''}

📊 QUESTION DISTRIBUTION:
`;
        // Thêm các dạng câu hỏi
        IOE_QUESTION_TYPES.forEach(qt => {
            const count = questionCounts[qt.id];
            if (count > 0) {
                prompt += `- ${count} questions: ${qt.name} (${qt.description})\n`;
            }
        });

        prompt += `
TOTAL: ${totalQuestions} questions

⚠️ FINAL CHECKLIST:
1. ALL questions MUST be in ENGLISH
2. Use vocabulary from topics: ${topicNames}
3. Grade ${classLevel} Vietnamese students
4. Correct JSON syntax with all required fields
5. Include IPA for phonetics questions
6. Difficulty increases gradually: easy first, harder at end
7. ⚠️ NO DUPLICATE with previous questions listed above!`;

        return prompt;
    };

    // Handle generate
    const handleGenerate = async () => {
        if (totalQuestions === 0) {
            setError('Vui lòng chọn ít nhất 1 dạng câu hỏi');
            return;
        }

        // Limit max questions to prevent timeout
        if (totalQuestions > 50) {
            setError(`⚠️ Tối đa 50 câu/lần tạo (bạn đang chọn ${totalQuestions} câu). Hãy giảm số lượng để tránh timeout.`);
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
            const customPrompt = generateIoePrompt();

            // Map IOE question types to app question types
            const enabledTypes: QuestionType[] = [];
            if (questionCounts['phonetics'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['word_stress'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['vocabulary'] > 0) {
                enabledTypes.push(QuestionType.MCQ);
                enabledTypes.push(QuestionType.SHORT_ANSWER);
            }
            if (questionCounts['grammar'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['sentence_order'] > 0) enabledTypes.push(QuestionType.ORDERING);
            if (questionCounts['sentence_building'] > 0) enabledTypes.push(QuestionType.MCQ); // Sentence Building MCQ
            if (questionCounts['listening'] > 0) enabledTypes.push(QuestionType.SHORT_ANSWER);
            if (questionCounts['reading'] > 0) enabledTypes.push(QuestionType.TRUE_FALSE);

            const result = await generateQuiz(
                topic || 'English IOE',
                classLevel,
                '', // no content
                null, // no file
                {
                    title: quizTitle || `IOE Lớp ${classLevel}: ${topic || 'English Practice'}`,
                    questionCount: totalQuestions,
                    questionTypes: enabledTypes.length > 0 ? enabledTypes : [QuestionType.MCQ],
                    difficultyLevels: {
                        level1: competitionRound === 'school' ? totalQuestions : Math.floor(totalQuestions * 0.2),
                        level2: competitionRound === 'district' ? totalQuestions : Math.floor(totalQuestions * 0.3),
                        level3: (competitionRound === 'provincial' || competitionRound === 'national') ? totalQuestions : Math.floor(totalQuestions * 0.5),
                    },
                    customPrompt,
                },
                undefined,
                aiProvider
            );

            const quiz: Quiz = {
                id: `ioe-${Date.now()}`,
                title: result.title || `IOE Lớp ${classLevel}: ${topic || 'English Practice'}`,
                classLevel,
                timeLimit: estimatedTime,
                questions: (result.questions || []).map((q: any, idx: number) => {
                    // Post-process: Fix colon separator to slash in Reorder questions
                    let question = q.question || '';
                    if (question.toLowerCase().includes('reorder')) {
                        // First, extract the prefix "Reorder the words:" or "Reorder:"
                        const prefixMatch = question.match(/^(Reorder(?:\s+the\s+words)?)\s*[:\/]\s*/i);
                        if (prefixMatch) {
                            const prefix = prefixMatch[1];
                            const wordsPartRaw = question.substring(prefixMatch[0].length);
                            // Replace all " : " with " / " in the words part
                            const wordsPart = wordsPartRaw.replace(/\s*:\s*/g, ' / ');
                            question = `${prefix}: ${wordsPart}`;
                        }
                    }
                    return {
                        ...q,
                        question,
                        id: q.id || `ioe-q-${Date.now()}-${idx}`,
                    };
                }),
                createdAt: new Date().toISOString(),
                category: 'ioe',
            };

            // Save questions to history for anti-duplication in future quizzes
            saveToHistory(quiz.questions);

            setGeneratedQuiz(quiz);
        } catch (err: any) {
            console.error('IOE Quiz generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề IOE');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle save - Use IOE Sheet Service instead of main quiz store
    const handleSaveQuiz = async () => {
        if (!generatedQuiz) return;

        try {
            const success = await saveIoeQuiz(generatedQuiz);
            if (!success) {
                throw new Error('Không thể lưu quiz vào IOE Sheet');
            }

            // Generate shareable link
            const quizLink = `${window.location.origin}/?quiz=${generatedQuiz.id}`;
            setSavedQuizLink(quizLink);
            setLinkCopied(false);
            setShowLinkModal(true);

            // Reset form
            setTopic('');
            setGeneratedQuiz(null);
            setSelectedTemplate(null);

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu bài kiểm tra');
        }
    };

    // Copy link
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(savedQuizLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
                {/* Header Card */}
                <Card title="🌍 Tạo Đề IOE (Internet Olympiad in English)">
                    <div className="space-y-4">
                        {/* Quiz Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                🏷️ Tên bài kiểm tra
                            </label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={e => setQuizTitle(e.target.value)}
                                placeholder="VD: Đề luyện thi IOE Lớp 3 - Vòng 1"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                        </div>

                        {/* Class & Topic */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Khối Lớp</label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">🏆 Vòng thi</label>
                                <select
                                    value={competitionRound}
                                    onChange={e => setCompetitionRound(e.target.value as any)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="school">🏫 Vòng Trường</option>
                                    <option value="district">🏢 Vòng Huyện/Quận</option>
                                    <option value="provincial">🏛️ Vòng Tỉnh/TP</option>
                                    <option value="national">🏆 Vòng Quốc gia</option>
                                </select>
                            </div>
                        </div>

                        {/* Topic Selector - Multi-select */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                📚 Chủ đề (chọn 1 hoặc nhiều)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {IOE_TOPICS.map(t => {
                                    const isSelected = selectedTopics.includes(t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedTopics(prev => prev.filter(id => id !== t.id));
                                                } else {
                                                    setSelectedTopics(prev => [...prev, t.id]);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                                ? 'bg-blue-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {t.emoji} {t.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Topic (optional) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                ✏️ Chủ đề tùy chỉnh (tùy chọn)
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="VD: Christmas, Halloween, Sports Day..."
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Templates */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">📋 Mẫu đề nhanh</label>
                            <div className="grid grid-cols-3 gap-2">
                                {IOE_TEMPLATES.map(template => {
                                    const Icon = template.icon;
                                    const isSelected = selectedTemplate === template.id;
                                    return (
                                        <button
                                            key={template.id}
                                            onClick={() => applyTemplate(template.id)}
                                            className={`p-3 rounded-xl border-2 transition-all text-center ${isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                                            <div className="text-xs font-bold">{template.name}</div>
                                            <div className="text-xs text-gray-500">{template.questions} câu • {template.time}p</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Question Types */}
                <Card title="📊 Dạng câu hỏi IOE">
                    <div className="space-y-3">
                        {IOE_QUESTION_TYPES.map(qt => (
                            <div key={qt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-800">{qt.name}</div>
                                    <div className="text-xs text-gray-500">{qt.description}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setQuestionCounts(prev => ({
                                            ...prev,
                                            [qt.id]: Math.max(0, prev[qt.id] - 1)
                                        }))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={questionCounts[qt.id]}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val) && val >= 0 && val <= 50) {
                                                setQuestionCounts(prev => ({ ...prev, [qt.id]: val }));
                                            } else if (e.target.value === '') {
                                                setQuestionCounts(prev => ({ ...prev, [qt.id]: 0 }));
                                            }
                                        }}
                                        className="w-12 text-center font-bold text-blue-600 border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={() => setQuestionCounts(prev => ({
                                            ...prev,
                                            [qt.id]: Math.min(50, prev[qt.id] + 1)
                                        }))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Total */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-bold text-blue-800">Tổng số câu hỏi</div>
                            <div className="text-xl font-bold text-blue-600">{totalQuestions} câu • ~{estimatedTime} phút</div>
                        </div>
                    </div>
                </Card>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    loading={isGenerating}
                    disabled={totalQuestions === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                    variant="primary"
                    icon={<Globe className="w-5 h-5" />}
                >
                    {isGenerating ? 'Đang tạo đề IOE...' : `🌍 Tạo đề IOE (${totalQuestions} câu)`}
                </Button>
            </div>

            {/* Right Column - Preview */}
            <div>
                <QuizPreview
                    quiz={generatedQuiz}
                    onSave={handleSaveQuiz}
                    onUpdateQuestions={(questions) => {
                        if (generatedQuiz) {
                            // Always keep category as 'ioe' for IOE quizzes
                            setGeneratedQuiz({ ...generatedQuiz, questions, category: 'ioe' });
                        }
                    }}
                />
            </div>

            {/* Quiz Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Check className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Lưu đề IOE thành công!</h3>
                            <p className="text-gray-500 text-sm mt-1">Chia sẻ link cho học sinh</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Link làm bài:</span>
                            </div>
                            <div className="bg-white border border-gray-300 rounded-lg p-3 font-mono text-sm text-blue-600 break-all">
                                {savedQuizLink}
                            </div>
                        </div>

                        <button
                            onClick={handleCopyLink}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${linkCopied
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                                }`}
                        >
                            {linkCopied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Đã copy link!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copy link gửi học sinh
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowLinkModal(false)}
                            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IoeTab;
