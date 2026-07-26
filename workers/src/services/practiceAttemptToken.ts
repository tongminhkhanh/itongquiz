import { errors, jwtVerify, SignJWT } from 'jose';

const PRACTICE_TOKEN_ISSUER = 'itongquiz-practice';
const PRACTICE_TOKEN_AUDIENCE = 'itongquiz-practice-web';
const PRACTICE_TOKEN_PURPOSE = 'practice_attempt';
const MAX_ATTEMPT_QUESTIONS = 50;

export interface PracticeAttemptClaims {
  studentId: string;
  topic: string;
  questionIds: string[];
}

export type PracticeAttemptVerification =
  | { ok: true; claims: PracticeAttemptClaims }
  | { ok: false; reason: 'expired' | 'invalid' };

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export async function signPracticeAttemptToken(
  claims: PracticeAttemptClaims,
  secret: string,
): Promise<string> {
  if (!claims.studentId || !claims.topic || claims.questionIds.length < 1
    || claims.questionIds.length > MAX_ATTEMPT_QUESTIONS) {
    throw new Error('Invalid practice attempt claims');
  }

  return new SignJWT({
    purpose: PRACTICE_TOKEN_PURPOSE,
    topic: claims.topic,
    questionIds: claims.questionIds,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'practice+jwt' })
    .setSubject(claims.studentId)
    .setIssuer(PRACTICE_TOKEN_ISSUER)
    .setAudience(PRACTICE_TOKEN_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey(secret));
}

export async function verifyPracticeAttemptToken(
  token: string,
  secret: string,
): Promise<PracticeAttemptVerification> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ['HS256'],
      issuer: PRACTICE_TOKEN_ISSUER,
      audience: PRACTICE_TOKEN_AUDIENCE,
    });
    const questionIds = payload.questionIds;
    if (payload.purpose !== PRACTICE_TOKEN_PURPOSE
      || typeof payload.sub !== 'string'
      || typeof payload.topic !== 'string'
      || !Array.isArray(questionIds)
      || questionIds.length < 1
      || questionIds.length > MAX_ATTEMPT_QUESTIONS
      || questionIds.some(id => typeof id !== 'string' || !id || id.length > 128)
      || new Set(questionIds).size !== questionIds.length) {
      return { ok: false, reason: 'invalid' };
    }

    return {
      ok: true,
      claims: {
        studentId: payload.sub,
        topic: payload.topic,
        questionIds,
      },
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}
