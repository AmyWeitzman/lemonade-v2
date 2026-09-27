/**
 * Certification and License System
 *
 * Tracks CPR certification (expires after 2 years) and professional licenses
 * granted by jobs or educational programs.
 *
 * Requirements: Req 43
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CertificationEntry {
  type: string;           // e.g. 'cpr', 'nursing_license', 'teaching_license'
  grantedYear: number;
  expiresYear: number | null; // null = never expires
}

export interface CertificationStatus extends CertificationEntry {
  isExpired: boolean;
  isValid: boolean;
}

// CPR expires after 2 years; professional licenses do not expire
const CPR_EXPIRY_YEARS = 2;

// Map of job titles → professional license cert type they grant
const JOB_LICENSE_MAP: Record<string, string> = {
  'Nurse': 'nursing_license',
  'General Practitioner': 'medical_license',
  'Surgeon': 'medical_license',
  'Chiropractor': 'chiropractic_license',
  'Dentist': 'dental_license',
  'Physical Therapist': 'physical_therapy_license',
  'Psychologist': 'psychology_license',
  'Pharmacist': 'pharmacy_license',
  'Optometrist': 'optometry_license',
  'Teacher': 'teaching_license',
  'Lawyer': 'law_license',
  'Realtor': 'real_estate_license',
  'Exterminator': 'exterminator_license',
  'Pilot': 'pilot_license',
  'Astronaut': 'astronaut_license',
};

// Map of education program names → cert types granted on graduation
// (supplements the grantsOnGraduation field already on programs)
const EDUCATION_CERT_MAP: Record<string, string> = {
  'CPR Training': 'cpr',
  'Nursing': 'nursing_license',
  'Teaching Credential': 'teaching_license',
  'Law School': 'law_license',
  'Pharmacy School': 'pharmacy_license',
  'Chiropractic School': 'chiropractic_license',
  'Dental School': 'dental_license',
  'Physical Therapy School': 'physical_therapy_license',
  'Optometry School': 'optometry_license',
  'Flight School': 'pilot_license',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCertifications(raw: unknown): CertificationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is CertificationEntry =>
      typeof c === 'object' && c !== null && typeof (c as CertificationEntry).type === 'string',
  );
}

// ─── getCertificationStatus ───────────────────────────────────────────────────

/**
 * Returns all certifications with expiration/validity info.
 */
export function getCertificationStatus(
  player: { certifications: unknown },
  currentYear: number,
): CertificationStatus[] {
  const certs = parseCertifications(player.certifications);
  return certs.map((cert) => {
    const isExpired =
      cert.expiresYear !== null && currentYear > cert.expiresYear;
    return {
      ...cert,
      isExpired,
      isValid: !isExpired,
    };
  });
}

// ─── hasCertification ─────────────────────────────────────────────────────────

/**
 * Returns true if the player has a valid (non-expired) certification of the given type.
 */
export function hasCertification(
  player: { certifications: unknown },
  certType: string,
  currentYear: number,
): boolean {
  const certs = parseCertifications(player.certifications);
  return certs.some((c) => {
    if (c.type !== certType) return false;
    if (c.expiresYear !== null && currentYear > c.expiresYear) return false;
    return true;
  });
}

// ─── grantCertification ───────────────────────────────────────────────────────

/**
 * Adds a certification to the player's list.
 * CPR expires after 2 years; professional licenses never expire.
 * If the player already has a valid cert of this type, it is refreshed.
 */
export function grantCertification(
  player: { certifications: unknown },
  certType: string,
  currentYear: number,
): CertificationEntry[] {
  const certs = parseCertifications(player.certifications);
  const isCpr = certType === 'cpr';
  const expiresYear = isCpr ? currentYear + CPR_EXPIRY_YEARS : null;

  // Remove any existing entry for this cert type (refresh / re-grant)
  const filtered = certs.filter((c) => c.type !== certType);

  filtered.push({ type: certType, grantedYear: currentYear, expiresYear });
  return filtered;
}

// ─── revokeCertification ──────────────────────────────────────────────────────

/**
 * Removes a certification from the player's list.
 */
export function revokeCertification(
  player: { certifications: unknown },
  certType: string,
): CertificationEntry[] {
  const certs = parseCertifications(player.certifications);
  return certs.filter((c) => c.type !== certType);
}

// ─── checkCertificationExpiry ─────────────────────────────────────────────────

/**
 * Returns the list of certifications that have expired this year.
 */
export function checkCertificationExpiry(
  player: { certifications: unknown },
  currentYear: number,
): CertificationEntry[] {
  const certs = parseCertifications(player.certifications);
  return certs.filter(
    (c) => c.expiresYear !== null && currentYear > c.expiresYear,
  );
}

// ─── autoGrantFromEducation ───────────────────────────────────────────────────

/**
 * Grants certifications awarded by completing an education program.
 * Uses the program's grantsOnGraduation list (legacy string[] format) and
 * the EDUCATION_CERT_MAP for structured cert entries.
 *
 * Returns the updated certifications array.
 */
export function autoGrantFromEducation(
  player: { certifications: unknown },
  programName: string,
  grantsOnGraduation: string[],
  currentYear: number,
): CertificationEntry[] {
  let certs = parseCertifications(player.certifications);

  // Handle legacy string[] format from grantsOnGraduation (e.g. ['CPR'])
  for (const grant of grantsOnGraduation) {
    const certType = grant.toLowerCase();
    const isCpr = certType === 'cpr';
    const expiresYear = isCpr ? currentYear + CPR_EXPIRY_YEARS : null;
    certs = certs.filter((c) => c.type !== certType);
    certs.push({ type: certType, grantedYear: currentYear, expiresYear });
  }

  // Also check EDUCATION_CERT_MAP for structured cert grants
  const mappedCert = EDUCATION_CERT_MAP[programName];
  if (mappedCert && !grantsOnGraduation.map((g) => g.toLowerCase()).includes(mappedCert)) {
    const isCpr = mappedCert === 'cpr';
    const expiresYear = isCpr ? currentYear + CPR_EXPIRY_YEARS : null;
    certs = certs.filter((c) => c.type !== mappedCert);
    certs.push({ type: mappedCert, grantedYear: currentYear, expiresYear });
  }

  return certs;
}

// ─── autoGrantFromJob ─────────────────────────────────────────────────────────

/**
 * Grants professional licenses associated with a job title.
 * Professional licenses never expire.
 *
 * Returns the updated certifications array, or null if no license for this job.
 */
export function autoGrantFromJob(
  player: { certifications: unknown },
  jobTitle: string,
  currentYear: number,
): CertificationEntry[] | null {
  const licenseType = JOB_LICENSE_MAP[jobTitle];
  if (!licenseType) return null;

  const certs = parseCertifications(player.certifications);

  // Already has this license — no change needed
  if (certs.some((c) => c.type === licenseType)) return null;

  return [
    ...certs,
    { type: licenseType, grantedYear: currentYear, expiresYear: null },
  ];
}
