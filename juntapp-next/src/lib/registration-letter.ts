import 'server-only';
import { publicAppUrl, sendTransactionalEmail } from '@/lib/email';
import { registrationRequestTemplate } from '@/lib/email-templates';

type RegistrationLetter = {
  secretaryEmail: string;
  boardEmails: string[];
  juntaName: string;
  applicantName: string;
  applicantRut: string;
  applicantAddress: string;
  applicantPhone: string;
  applicantEmail: string;
  applicationId: string;
};

export async function sendRegistrationLetter(letter: RegistrationLetter) {
  const template = registrationRequestTemplate({
    juntaName: letter.juntaName,
    applicantName: letter.applicantName,
    applicantRut: letter.applicantRut,
    applicantAddress: letter.applicantAddress,
    applicantPhone: letter.applicantPhone,
    applicantEmail: letter.applicantEmail,
    reviewUrl: `${publicAppUrl()}/socios?solicitud=${letter.applicationId}`,
  });
  return sendTransactionalEmail({
    to: [letter.secretaryEmail, ...letter.boardEmails],
    ...template,
    idempotencyKey: `membership-request:${letter.applicationId}`,
  });
}
