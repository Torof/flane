// SPDX-License-Identifier: AGPL-3.0-or-later
import { formatDateTime } from './formatDateTime';

describe('formatDateTime', () => {
  it('writes day/month/year hour:minute with two digits, in local time', () => {
    // Local components, so the expected text does not depend on the time zone.
    expect(formatDateTime(new Date(2026, 9, 20, 18, 5))).toBe('20/10/2026 18:05');
    expect(formatDateTime(new Date(2027, 0, 1, 0, 0))).toBe('01/01/2027 00:00');
  });
});
