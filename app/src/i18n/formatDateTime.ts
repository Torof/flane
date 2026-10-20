// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * French date and time, "jj/mm/aaaa hh:mm", in the device's time zone. Written by
 * hand so that Jest (Node) and the phone (Hermes) render exactly the same thing.
 */
export function formatDateTime(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}`;
}
