'use workflow';

import { sendWelcomeEmail, createUserRecord } from './user-signup.steps.js';

export async function handleUserSignup(email: string) {
  await sendWelcomeEmail(email);
  await createUserRecord(email);
}
