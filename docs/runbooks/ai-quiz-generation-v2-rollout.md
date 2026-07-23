# Runbook: AI Quiz Generation V2

## Má»¥c tiÃªu

Triá»ƒn khai cÃ³ kiá»ƒm soÃ¡t luá»“ng táº¡o Ä‘á» AI V2 gá»“m:

- ma tráº­n sá»‘ cÃ¢u theo dáº¡ng vÃ  Ä‘á»™ khÃ³;
- phÃ¢n biá»‡t rÃµ Ä‘á» thi vÃ  Ä‘á» Ã´n táº­p;
- OCR theo trang, cho phÃ©p giÃ¡o viÃªn chá»n trang;
- tiáº¿n trÃ¬nh tháº­t vÃ  há»§y yÃªu cáº§u;
- schema Zod, kiá»ƒm tra blueprint, phÃ¡t hiá»‡n cÃ¢u gáº§n trÃ¹ng;
- tá»‘i Ä‘a má»™t láº§n sá»­a cÃ³ má»¥c tiÃªu;
- háº¡n má»©c vÃ  idempotency Ä‘Æ°á»£c cÆ°á»¡ng cháº¿ táº¡i Worker.

Feature flag frontend:

```env
VITE_FEATURE_AI_QUIZ_V2=false
```

Máº·c Ä‘á»‹nh pháº£i lÃ  `false`. Thay Ä‘á»•i flag cáº§n build vÃ  deploy láº¡i frontend.

## Äiá»u kiá»‡n trÆ°á»›c khi báº­t

1. Migration D1 `0039_create_ai_generation_actions.sql` Ä‘Ã£ Ã¡p dá»¥ng thÃ nh cÃ´ng.
2. Worker production Ä‘Ã£ cÃ³ phiÃªn báº£n kiá»ƒm tra quyá»n, workflow, quota vÃ  `actionId`.
3. `JWT_SECRET` vÃ  `CLIPROXY_TOKEN` tá»“n táº¡i dÆ°á»›i dáº¡ng Cloudflare Worker secrets.
4. Test táº­p trung AI, toÃ n bá»™ Vitest, TypeScript, security scan vÃ  production build Ä‘á»u Ä‘áº¡t.
5. Smoke test tÃ i khoáº£n giÃ¡o viÃªn vÃ  admin Ä‘Ã£ Ä‘áº¡t trÃªn preview/staging.
6. CÃ³ ngÆ°á»i trá»±c giÃ¡m sÃ¡t Ã­t nháº¥t 30 phÃºt sau má»—i bÆ°á»›c má»Ÿ rá»™ng rollout.

## Kiá»ƒm tra trÆ°á»›c deploy

```bash
npx vitest run \
  tests/quizBlueprint.test.ts \
  tests/quizPromptBuilder.test.ts \
  tests/quizGenerationSchema.test.ts \
  tests/quizAudit.test.ts \
  tests/quizRepair.test.ts \
  tests/quizGenerationPipeline.test.ts \
  tests/quizGenerationWorkflow.test.tsx \
  tests/OcrPreviewSection.test.tsx \
  tests/GenerationProgressPanel.test.tsx \
  tests/utf8SourceGuard.test.ts

npm run test:run
npx tsc --noEmit
npm run security:scan
npm run build
```

Cháº¡y Cypress vá»›i frontend Ä‘Æ°á»£c build/dev báº±ng flag V2:

```bash
set VITE_FEATURE_AI_QUIZ_V2=true
npm run dev -- --port 3001
npx cypress run --spec cypress/e2e/ai-quiz-generation-v2.cy.ts
```

PowerShell:

```powershell
$env:VITE_FEATURE_AI_QUIZ_V2='true'
npm run dev -- --port 3001
npx cypress run --spec cypress/e2e/ai-quiz-generation-v2.cy.ts
```

## TrÃ¬nh tá»± rollout

### BÆ°á»›c 0 â€” deploy code, giá»¯ flag táº¯t

- Deploy Worker trÆ°á»›c.
- Deploy frontend vá»›i `VITE_FEATURE_AI_QUIZ_V2=false`.
- XÃ¡c minh luá»“ng cÅ© váº«n táº¡o Ä‘Æ°á»£c Ä‘á» tá»« chá»§ Ä‘á» vÃ  tÃ i liá»‡u.
- XÃ¡c minh gá»i trá»±c tiáº¿p `/api/ai/chat` khÃ´ng cÃ³ metadata bá»‹ tá»« chá»‘i.

TiÃªu chÃ­ qua bÆ°á»›c:

- khÃ´ng tÄƒng lá»—i 4xx/5xx báº¥t thÆ°á»ng;
- quota Ä‘á»c Ä‘Ãºng;
- luá»“ng cÅ© khÃ´ng há»“i quy.

### BÆ°á»›c 1 â€” preview/staging

Báº­t:

```env
VITE_FEATURE_AI_QUIZ_V2=true
```

Kiá»ƒm tra báº±ng Ã­t nháº¥t ba bá»™ dá»¯ liá»‡u:

1. ToÃ¡n lá»›p 4, 10 cÃ¢u, 4 dáº¡ng;
2. Tiáº¿ng Viá»‡t lá»›p 3, tÃ i liá»‡u 3 trang, bá» chá»n trang 2;
3. Tiáº¿ng Anh lá»›p 5, Ä‘á» thi khÃ´ng gá»£i Ã½.

Vá»›i má»—i Ä‘á», xÃ¡c nháº­n:

- tá»•ng sá»‘ cÃ¢u Ä‘Ãºng;
- phÃ¢n bá»• dáº¡ng cÃ¢u Ä‘Ãºng;
- phÃ¢n bá»• Ä‘á»™ khÃ³ Ä‘Ãºng;
- khÃ´ng cÃ³ cÃ¢u gáº§n trÃ¹ng;
- Ä‘Ã¡p Ã¡n thuá»™c lá»±a chá»n;
- lá»i giáº£i tá»“n táº¡i;
- nÃºt há»§y giá»¯ nguyÃªn biá»ƒu máº«u;
- reviewer lá»—i váº«n giá»¯ báº£n há»£p lá»‡ báº±ng mÃ£;
- sinh láº¡i má»™t cÃ¢u thÃ nh cÃ´ng tÃ­nh má»™t lÆ°á»£t má»›i.

### BÆ°á»›c 2 â€” nhÃ³m ná»™i bá»™ nhá»

- Báº­t V2 cho mÃ´i trÆ°á»ng/Ä‘á»£t deploy dÃ nh cho nhÃ³m giÃ¡o viÃªn thá»­ nghiá»‡m.
- Quy mÃ´ Ä‘á» xuáº¥t: 5â€“10 giÃ¡o viÃªn trong 1 ngÃ y há»c.
- KhÃ´ng thay Ä‘á»•i háº¡n má»©c trong giai Ä‘oáº¡n thá»­ nghiá»‡m.
- Thu tháº­p lá»—i báº±ng `actionId`; khÃ´ng ghi prompt, ná»™i dung cÃ¢u há»i hoáº·c OCR vÃ o log.

TiÃªu chÃ­ má»Ÿ rá»™ng:

- khÃ´ng cÃ³ truy cáº­p trÃ¡i quyá»n;
- khÃ´ng cÃ³ trá»« lÆ°á»£t trÃ¹ng;
- tá»· lá»‡ schema há»£p lá»‡ sau repair Ä‘áº¡t má»¥c tiÃªu;
- khÃ´ng cÃ³ lá»—i cháº·n lÆ°u Ä‘á»;
- pháº£n há»“i OCR/chá»n trang hiá»ƒu Ä‘Æ°á»£c vá»›i giÃ¡o viÃªn.

### BÆ°á»›c 3 â€” má»Ÿ rá»™ng 25% rá»“i 100%

Do flag hiá»‡n á»Ÿ cáº¥p build, triá»ƒn khai theo tá»«ng mÃ´i trÆ°á»ng hoáº·c nhÃ³m phÃ¢n phá»‘i frontend:

1. 25% giÃ¡o viÃªn, theo dÃµi tá»‘i thiá»ƒu 30 phÃºt vÃ  má»™t phiÃªn sá»­ dá»¥ng thá»±c táº¿;
2. 100% sau khi cÃ¡c chá»‰ sá»‘ á»•n Ä‘á»‹nh.

KhÃ´ng má»Ÿ rá»™ng náº¿u cÃ³ lá»—i P0/P1 hoáº·c tá»· lá»‡ táº¡o Ä‘á» tháº¥t báº¡i tÄƒng Ä‘Ã¡ng ká»ƒ so vá»›i baseline.

## Chá»‰ sá»‘ cáº§n theo dÃµi

Theo `actionId`, `workflow`, `stage`, provider vÃ  mÃ£ lá»—i; tuyá»‡t Ä‘á»‘i khÃ´ng log ná»™i dung há»c sinh/giÃ¡o viÃªn.

- sá»‘ action `QUIZ_CREATE` báº¯t Ä‘áº§u, hoÃ n táº¥t, há»§y vÃ  tháº¥t báº¡i;
- thá»i gian OCR, GENERATE, REPAIR, REVIEW;
- tá»· lá»‡ cáº§n REPAIR;
- tá»· lá»‡ reviewer lá»—i;
- tá»· lá»‡ schema/audit khÃ´ng Ä‘áº¡t sau má»™t láº§n repair;
- sá»‘ lá»—i `QUOTA_EXCEEDED`, `ACTION_STAGE_INVALID`, `ACTION_STAGE_LIMIT_EXCEEDED`;
- sá»‘ action bá»‹ hoÃ n lÆ°á»£t vÃ  chá»‘t lÆ°á»£t;
- tá»· lá»‡ 429/503/timeout;
- sá»‘ láº§n giÃ¡o viÃªn bá» chá»n trang OCR;
- sá»‘ láº§n sinh láº¡i má»™t cÃ¢u.

## Smoke test production

DÃ¹ng tÃ i khoáº£n giÃ¡o viÃªn thá»­ nghiá»‡m:

1. Má»Ÿ tab **Táº¡o Ä‘á» má»›i**.
2. XÃ¡c nháº­n cÃ³ **Dáº¡ng cÃ¢u há»i & ma tráº­n** khi flag báº­t.
3. Chá»n 10 cÃ¢u, tá»•ng dáº¡ng cÃ¢u pháº£i báº±ng 10.
4. Táº£i PDF ba trang.
5. XÃ¡c nháº­n tráº¡ng thÃ¡i **Äang Ä‘á»c tÃ i liá»‡u**.
6. Bá» chá»n má»™t trang vÃ  táº¡o Ä‘á».
7. XÃ¡c nháº­n tiáº¿n trÃ¬nh GENERATE/REPAIR/REVIEW pháº£n Ã¡nh Ä‘Ãºng request thá»±c táº¿.
8. XÃ¡c nháº­n Ä‘á» cÃ³ Ä‘Ãºng 10 cÃ¢u vÃ  nÃºt **LÆ°u Ä‘á»** hoáº¡t Ä‘á»™ng.
9. Há»§y má»™t request khÃ¡c vÃ  kiá»ƒm tra dá»¯ liá»‡u biá»ƒu máº«u cÃ²n nguyÃªn.
10. Sinh láº¡i riÃªng má»™t cÃ¢u; xÃ¡c nháº­n sá»‘ lÆ°á»£t giáº£m Ä‘Ãºng má»™t khi thÃ nh cÃ´ng.

DÃ¹ng tÃ i khoáº£n há»c sinh:

1. Gá»i UI táº¡o Ä‘á» khÃ´ng Ä‘Æ°á»£c hiá»ƒn thá»‹.
2. Gá»i trá»±c tiáº¿p `/api/ai/chat` pháº£i bá»‹ tá»« chá»‘i.

## Rollback

### Rollback nhanh frontend

Äáº·t:

```env
VITE_FEATURE_AI_QUIZ_V2=false
```

Build vÃ  deploy láº¡i frontend. Luá»“ng cÅ© váº«n callable; khÃ´ng cáº§n rollback dá»¯ liá»‡u D1.

### Khi nÃ o rollback ngay

- há»c sinh hoáº·c ngÆ°á»i khÃ´ng Ä‘Ãºng vai trÃ² gá»i AI thÃ nh cÃ´ng;
- má»™t action bá»‹ trá»« nhiá»u lÆ°á»£t;
- action tháº¥t báº¡i váº«n bá»‹ chá»‘t lÆ°á»£t;
- lá»—i schema lÃ m máº¥t/sai Ä‘Ã¡p Ã¡n;
- khÃ´ng thá»ƒ lÆ°u Ä‘á» sau khi táº¡o;
- lá»—i 5xx tÄƒng máº¡nh hoáº·c Worker khÃ´ng á»•n Ä‘á»‹nh;
- OCR gá»­i láº¡i file á»Ÿ stage GENERATE;
- phÃ¡t hiá»‡n log chá»©a prompt, OCR hoáº·c ná»™i dung cÃ¢u há»i.

### Rollback Worker

Chá»‰ rollback Worker náº¿u lá»—i náº±m á»Ÿ backend vÃ  frontend flag táº¯t chÆ°a Ä‘á»§. KhÃ´ng xÃ³a hai báº£ng quota/action. Giá»¯ migration vÃ¬ dá»¯ liá»‡u cÃ³ thá»ƒ cáº§n phá»¥c vá»¥ Ä‘iá»u tra vÃ  phiÃªn báº£n má»›i váº«n tÆ°Æ¡ng thÃ­ch.

Thá»© tá»±:

1. táº¯t frontend V2;
2. deploy láº¡i Worker phiÃªn báº£n á»•n Ä‘á»‹nh gáº§n nháº¥t;
3. smoke test quyá»n/quota;
4. xÃ¡c nháº­n action Ä‘ang treo khÃ´ng tiáº¿p tá»¥c bá»‹ chá»‘t sai;
5. láº­p bÃ¡o cÃ¡o sá»± cá»‘ trÆ°á»›c khi báº­t láº¡i.

## Xá»­ lÃ½ sá»± cá»‘ thÆ°á»ng gáº·p

### OCR xong nhÆ°ng khÃ´ng cÃ³ trang

- kiá»ƒm tra response OCR cÃ³ JSON Ä‘Ãºng schema;
- kiá»ƒm tra `pages[].pageNumber` khÃ´ng trÃ¹ng vÃ  `text` khÃ´ng rá»—ng;
- thá»­ file rÃµ hÆ¡n;
- khÃ´ng tá»± chuyá»ƒn sang táº¡o Ä‘á» báº±ng ná»™i dung rá»—ng.

### Ma tráº­n khÃ´ng khá»›p

- dÃ¹ng **AI tá»± cÃ¢n Ä‘á»‘i**;
- tá»•ng sá»‘ cÃ¢u theo dáº¡ng pháº£i báº±ng tá»•ng Ä‘á»™ khÃ³;
- khÃ´ng cho gá»­i request khi validation cÃ²n lá»—i.

### Reviewer lá»—i

- giá»¯ báº£n Ä‘Ã£ qua schema vÃ  audit;
- khÃ´ng gá»i reviewer láº·p vÃ´ háº¡n;
- ghi mÃ£ lá»—i vÃ  stage, khÃ´ng ghi ná»™i dung Ä‘á».

### Repair váº«n khÃ´ng Ä‘áº¡t

- dá»«ng sau má»™t láº§n repair;
- hiá»ƒn thá»‹ lá»—i rÃµ rÃ ng Ä‘á»ƒ giÃ¡o viÃªn thá»­ láº¡i;
- khÃ´ng cáº¯t bá»›t hoáº·c tá»± bá»‹a cÃ¢u há»i.

## Káº¿t thÃºc rollout

Rollout Ä‘Æ°á»£c xem lÃ  hoÃ n táº¥t khi:

- 100% nhÃ³m má»¥c tiÃªu dÃ¹ng V2 á»•n Ä‘á»‹nh;
- khÃ´ng cÃ³ P0/P1 trong thá»i gian giÃ¡m sÃ¡t;
- quyá»n, quota vÃ  idempotency Ä‘áº¡t yÃªu cáº§u;
- ba mÃ´n smoke test Ä‘áº¡t;
- tÃ i liá»‡u há»— trá»£ giÃ¡o viÃªn vÃ  quy trÃ¬nh rollback Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n.
