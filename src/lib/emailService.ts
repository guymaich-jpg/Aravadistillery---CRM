// Email Service — sends access request notifications to managers via EmailJS.
//
// Setup required:
// 1. Create free account at https://www.emailjs.com
// 2. Add your Gmail as an Email Service (service ID → VITE_EMAILJS_SERVICE_ID)
// 3. Create an email template with these variables:
//    - {{requester_name}}  — name of the person requesting access
//    - {{requester_email}} — their email
//    - {{approve_url}}     — link to approve
//    - {{decline_url}}     — link to decline
//    Template ID → VITE_EMAILJS_TEMPLATE_ID
// 4. Copy your Public Key → VITE_EMAILJS_PUBLIC_KEY

import emailjs from '@emailjs/browser';
import type { AccessRequest } from './accessRequests';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const MANAGER_EMAILS = ['guymaich@gmail.com', 'yonatangarini@gmail.com'];

function getAppBaseUrl(): string {
  return window.location.origin + (import.meta.env.BASE_URL || '/');
}

export function isEmailServiceConfigured(): boolean {
  return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

/** Send access-request notification emails to both managers. */
export async function sendAccessRequestEmails(request: AccessRequest): Promise<void> {
  if (!isEmailServiceConfigured()) {
    console.warn('EmailJS not configured — skipping email send.');
    return;
  }

  const baseUrl = getAppBaseUrl();
  const approveUrl = `${baseUrl}?action=approve&requestId=${request.id}&token=${request.token}`;
  const declineUrl = `${baseUrl}?action=decline&requestId=${request.id}&token=${request.token}`;

  const sendPromises = MANAGER_EMAILS.map(managerEmail =>
    emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: managerEmail,
        requester_name: request.name,
        requester_email: request.email,
        approve_url: approveUrl,
        decline_url: declineUrl,
      },
      PUBLIC_KEY,
    ),
  );

  await Promise.allSettled(sendPromises);
}
