/**
 * HomePage — "Tending the Garden" (Player Profile)
 *
 * Full-page profile view showing skills, traits, vitals, current life status
 * (job, housing, transportation, education), family, finances, and timeline.
 */
import type { ReactNode } from 'react';
import {
  Box, Typography, Stack, Grid, Paper, LinearProgress, Chip,
  Skeleton, Divider, Tooltip,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../store';
import api from '../lib/api';
import {
  TRAIT_LABELS,
  TRAIT_ICONS,
  SKILL_LABELS,
  SKILL_ICONS,
} from '../features/profile/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerProfile {
  id: string;
  name: string;
  age: number;
  health: number;
  maxHealth: number;
  stress: number;
  money: number;
  projectedIncome: number;
  retirementSavings: number;
  collegeFund: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  chronicConditions: string[];
  certifications: Array<{ type: string; expiryYear?: number }>;
  maritalStatus: string;
  spouse: { name: string; age?: number; job?: string; isRetired?: boolean; originalSavings?: number } | null;
  children: Array<{
    id: string;
    age: number;
    isAdopted: boolean;
    hasChildren: boolean;
    childrenCount: number;
  }>;
  pets: Array<{ id: string; type: string; age: number; isAlive: boolean }>;
  loans: Array<{ id: string; currentBalance: number; owner: string; isJoint: boolean }>;
  employments: Array<{
    jobId: string;
    startAge: number;
    currentSalary: number;
    isActive: boolean;
    isPartTime?: boolean;
    yearsOfService?: number;
    job?: { title: string };
  }>;
  educations: Array<{
    programId: string;
    startAge: number;
    graduated: boolean;
    graduationAge?: number;
    isActive?: boolean;
    program?: { name: string; type: string };
  }>;
  // Insurance
  hasHealthInsurance: boolean;
  healthInsuranceType: string;
  hasHomeInsurance: boolean;
  autoInsuranceRate: number;
}

interface HousingItem {
  id: string;
  name: string;
  isRental: boolean;
  isCurrentHome: boolean;
  rentPerYear?: number;
  purchasePrice?: number;
  chosenLocation?: string;
  insurancePerYear?: number | null;
}

interface OwnedVehicleEntry {
  ownership: {
    id: string;
    isSpouseVehicle: boolean;
    wasParentGift: boolean;
    yearsOwned: number;
    startAge: number;
  };
  vehicle: {
    id: string;
    name: string;
    type: string;
    fuelType: string;
    ageVariant: string;
    passengerCapacity: number;
  };
  annualCosts: { total: number; insurance: number; gas: number; maintenance: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function healthColor(v: number): string {
  if (v > 70) return '#4caf50';
  if (v >= 50) return '#ff9800';
  return '#f44336';
}

function stressColor(v: number): string {
  if (v < 40) return '#4caf50';
  if (v <= 70) return '#ff9800';
  return '#f44336';
}

function skillColor(v: number): string {
  if (v >= 70) return '#2e7d32';
  if (v >= 40) return '#1565c0';
  return '#6d4c41';
}

function ageLabel(ageVariant: string): string {
  const map: Record<string, string> = { new: 'New', used_5yr: '5yr used', used_10yr: '10yr used' };
  return map[ageVariant] ?? ageVariant;
}

function vehicleTypeEmoji(type: string): string {
  const map: Record<string, string> = { bike: '🚲', public_transit: '🚌', car: '🚗', motorcycle: '🏍️' };
  return map[type] ?? '🚗';
}

function degreeType(type: string): string {
  const map: Record<string, string> = {
    associates: "Associate's",
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'PhD',
    certificate: 'Certificate',
    trade: 'Trade',
    bootcamp: 'Bootcamp',
  };
  return map[type] ?? type;
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}) {
  const barColor = color ?? skillColor(value);
  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.35 }}>
        <Typography variant="caption" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon && <span style={{ fontSize: '0.85em' }}>{icon}</span>}
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: barColor, minWidth: 30, textAlign: 'right' }}>
          {Math.round(value)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, value))}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.25, bgcolor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {icon}
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ p: 2, flex: 1 }}>{children}</Box>
    </Paper>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, mr: 1 }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right' }}>{value}</Box>
    </Stack>
  );
}

// ─── VitalsCard ───────────────────────────────────────────────────────────────

function VitalsCard({ profile }: { profile: PlayerProfile }) {
  const hasChronicCap = profile.chronicConditions.length > 0 && profile.maxHealth < 100;
  const filledPct = Math.min(profile.health, profile.maxHealth);
  const grayedPct = hasChronicCap ? profile.maxHealth - filledPct : 0;
  const hColor = healthColor(profile.health);
  const sColor = stressColor(profile.stress);

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, p: 2.5, bgcolor: 'rgba(255,255,255,0.7)' }}
    >
      <Grid container spacing={3} alignItems="flex-start">
        {/* Character name + age badge to the right */}
        <Grid item xs={12} sm="auto">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1 }}>
              {profile.name}
            </Typography>
            <Chip
              label={`Age ${profile.age}`}
              color="primary"
              sx={{ fontWeight: 800, fontSize: '0.95rem', height: 32, px: 0.5 }}
            />
          </Stack>
          {profile.maritalStatus === 'married' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              💍 Married
            </Typography>
          )}
        </Grid>

        {/* Health + Stress bars */}
        <Grid item xs={12} sm>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700}>❤️ Health</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {hasChronicCap && (
                    <Tooltip title={`Chronic condition caps max health at ${profile.maxHealth}%`}>
                      <Chip label={`Cap: ${profile.maxHealth}%`} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'grey.300' }} />
                    </Tooltip>
                  )}
                  <Typography variant="caption" fontWeight={800} sx={{ color: hColor }}>
                    {Math.round(profile.health)}%
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: 'grey.200', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${filledPct}%`, bgcolor: hColor, borderRadius: 5, transition: 'width 0.3s' }} />
                {hasChronicCap && grayedPct > 0 && (
                  <Box sx={{ position: 'absolute', left: `${filledPct}%`, top: 0, height: '100%', width: `${grayedPct}%`, bgcolor: 'grey.400', opacity: 0.5 }} />
                )}
                {hasChronicCap && (
                  <Box sx={{ position: 'absolute', left: `${profile.maxHealth}%`, top: 0, width: 2, height: '100%', bgcolor: 'error.main', transform: 'translateX(-50%)' }} />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700}>😰 Stress</Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: sColor }}>
                  {Math.round(profile.stress)}%
                </Typography>
              </Stack>
              <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'grey.200', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${Math.min(100, profile.stress)}%`, bgcolor: sColor, borderRadius: 5, transition: 'width 0.3s' }} />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
}

// ─── SkillsCard ───────────────────────────────────────────────────────────────

function SkillsCard({ skills }: { skills: Record<string, number> }) {
  return (
    <SectionCard icon={<span>🛠️</span>} title="Skills">
      <Grid container columnSpacing={3}>
        {Object.entries(SKILL_LABELS).map(([key, label]) => (
          <Grid item xs={12} sm={6} key={key}>
            <StatBar label={label} value={skills[key] ?? 0} color="#1565c0" icon={SKILL_ICONS[key]} />
          </Grid>
        ))}
      </Grid>
    </SectionCard>
  );
}

// ─── TraitsCard ───────────────────────────────────────────────────────────────

function TraitsCard({ traits }: { traits: Record<string, number> }) {
  return (
    <SectionCard icon={<span>😊</span>} title="Traits">
      <Grid container columnSpacing={3}>
        {Object.entries(TRAIT_LABELS).map(([key, label]) => (
          <Grid item xs={12} sm={6} key={key}>
            <StatBar label={label} value={traits[key] ?? 0} color="#6a1b9a" icon={TRAIT_ICONS[key]} />
          </Grid>
        ))}
      </Grid>
    </SectionCard>
  );
}

// ─── LifeCard ─────────────────────────────────────────────────────────────────

function LifeCard({
  profile,
  currentHome,
  ownedVehicles,
}: {
  profile: PlayerProfile;
  currentHome: HousingItem | null;
  ownedVehicles: OwnedVehicleEntry[];
}) {
  const activeJobs = profile.employments.filter((e) => e.isActive);
  const activeEducations = profile.educations.filter((e) => !e.graduated && e.isActive !== false);
  const myVehicle = ownedVehicles.find((v) => !v.ownership.isSpouseVehicle);
  const spouseVehicle = ownedVehicles.find((v) => v.ownership.isSpouseVehicle);

  return (
    <SectionCard icon={<WorkIcon fontSize="small" sx={{ color: '#1565c0' }} />} title="Life Overview">
      <Stack spacing={1.5} divider={<Divider />}>
        {/* Health */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            ❤️ Health
          </Typography>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption">Health Insurance</Typography>
              {profile.hasHealthInsurance ? (
                <Chip
                  label={`🛡️ ${profile.healthInsuranceType === 'family' ? 'Family' : 'Single'} plan`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              ) : (
                <Chip label="No insurance" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              )}
            </Stack>
            {profile.chronicConditions.length > 0 ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Chronic conditions:</Typography>
                <Stack direction="row" flexWrap="wrap" spacing={0.5} sx={{ mt: 0.4 }}>
                  {profile.chronicConditions.map((c, i) => (
                    <Chip
                      key={i}
                      label={c.replace(/_/g, ' ')}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="caption" color="success.main">✓ No chronic conditions</Typography>
            )}
          </Stack>
        </Box>

        {/* Employment */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            💼 Employment
          </Typography>
          {activeJobs.length > 0 ? (
            <Stack spacing={0.75}>
              {activeJobs.map((emp) => (
                <Box key={emp.jobId}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={600}>{emp.job?.title ?? 'Unknown Job'}</Typography>
                    {emp.isPartTime && <Chip label="Part-time" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Typography variant="caption" color="success.main" fontWeight={700}>{fmt(emp.currentSalary)}/yr</Typography>
                    {emp.yearsOfService !== undefined && (
                      <Typography variant="caption" color="text.secondary">· {emp.yearsOfService} yr{emp.yearsOfService !== 1 ? 's' : ''} seniority</Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">Not currently employed</Typography>
          )}
        </Box>

        {/* Housing */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            🏠 Housing
          </Typography>
          {currentHome ? (
            <Box>
              <Typography variant="body2" fontWeight={600}>{currentHome.name}</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.4 }}>
                <Chip
                  label={currentHome.isRental ? '🔑 Rental' : '🏦 Owned'}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
                {currentHome.chosenLocation && (
                  <Chip
                    label={currentHome.chosenLocation === 'city' ? '🏙️ City' : '🏡 Suburb'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
                {currentHome.isRental && currentHome.rentPerYear != null && (
                  <Chip
                    label={`${fmt(currentHome.rentPerYear)}/yr`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
              </Stack>
              {/* Home insurance */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                <Typography variant="caption" color="text.secondary">Home insurance</Typography>
                {profile.hasHomeInsurance ? (
                  <Chip
                    label={currentHome.insurancePerYear != null ? `🛡️ ${fmt(currentHome.insurancePerYear)}/yr` : '🛡️ Insured'}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                ) : (
                  <Chip label="Not insured" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                )}
              </Stack>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">No home selected</Typography>
          )}
        </Box>

        {/* Transportation */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            🚗 Transportation
          </Typography>
          {ownedVehicles.length > 0 ? (
            <Stack spacing={0.75}>
              {myVehicle && (
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {vehicleTypeEmoji(myVehicle.vehicle.type)} {myVehicle.vehicle.name}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.4 }}>
                    <Chip label={ageLabel(myVehicle.vehicle.ageVariant)} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                    <Chip label={`${myVehicle.ownership.yearsOwned} yr${myVehicle.ownership.yearsOwned !== 1 ? 's' : ''} owned`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f5f5f5' }} />
                  </Stack>
                  {/* Auto insurance */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">Auto insurance</Typography>
                    {myVehicle.annualCosts.insurance > 0 ? (
                      <Chip
                        label={`🛡️ ${fmt(myVehicle.annualCosts.insurance)}/yr`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    ) : (
                      <Chip label="No insurance" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                  </Stack>
                </Box>
              )}
              {spouseVehicle && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={600} color="secondary.main">
                    {vehicleTypeEmoji(spouseVehicle.vehicle.type)} {spouseVehicle.vehicle.name}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>(spouse)</Typography>
                  </Typography>
                  {spouseVehicle.annualCosts.insurance > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      🛡️ {fmt(spouseVehicle.annualCosts.insurance)}/yr insurance
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">No vehicle</Typography>
          )}
        </Box>

        {/* Education */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            🎓 Education
          </Typography>
          {activeEducations.length > 0 ? (
            <Stack spacing={0.5}>
              {activeEducations.map((edu) => (
                <Box key={edu.programId}>
                  <Typography variant="body2" fontWeight={600}>{edu.program?.name ?? 'Unknown Program'}</Typography>
                  {edu.program?.type && (
                    <Typography variant="caption" color="text.secondary">{degreeType(edu.program.type)} · In progress</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">Not currently enrolled</Typography>
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}

// ─── FamilyCard ───────────────────────────────────────────────────────────────

function FamilyCard({ profile, ownedVehicles }: { profile: PlayerProfile; ownedVehicles: OwnedVehicleEntry[] }) {
  const alivePets = profile.pets.filter((p) => p.isAlive);
  const grandchildren = profile.children.reduce((sum, c) => sum + (c.childrenCount ?? 0), 0);
  const spouseVehicle = ownedVehicles.find((v) => v.ownership.isSpouseVehicle);

  return (
    <SectionCard icon={<PeopleIcon fontSize="small" sx={{ color: '#e65100' }} />} title="Family">
      <Stack spacing={1.5} divider={<Divider />}>
        {/* Relationship */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            💍 Relationship
          </Typography>
          {profile.maritalStatus === 'married' && profile.spouse ? (
            <Stack spacing={0.5}>
              {/* Age */}
              {profile.spouse.age != null && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">Age</Typography>
                  <Chip label={profile.spouse.age} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f5f5f5' }} />
                </Stack>
              )}
              {/* Employment */}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Employment</Typography>
                {profile.spouse.isRetired ? (
                  <Chip label="🌻 Retired" size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                ) : profile.spouse.job ? (
                  <Chip label={`💼 ${profile.spouse.job}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">Unknown</Typography>
                )}
              </Stack>
              {/* Transportation */}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Transportation</Typography>
                {spouseVehicle ? (
                  <Chip
                    label={`${vehicleTypeEmoji(spouseVehicle.vehicle.type)} ${spouseVehicle.vehicle.name}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">None</Typography>
                )}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {profile.maritalStatus === 'divorced' ? 'Divorced' : 'Single'}
            </Typography>
          )}
        </Box>

        {/* Children */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            👶 Children {profile.children.length > 0 && `(${profile.children.length})`}
          </Typography>
          {profile.children.length > 0 ? (
            <Stack spacing={0.5}>
              {profile.children.map((child) => (
                <Stack key={child.id} direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                  <Typography variant="caption">
                    {child.age < 18 ? '👶' : '🧑'} Age {child.age}
                  </Typography>
                  {child.isAdopted && (
                    <Chip label="Adopted" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                  )}
                  {child.hasChildren && (
                    <Chip
                      label={`${child.childrenCount} grandchild${child.childrenCount !== 1 ? 'ren' : ''}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  )}
                </Stack>
              ))}
              {grandchildren > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                  👴 {grandchildren} grandchild{grandchildren !== 1 ? 'ren' : ''} total
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">No children</Typography>
          )}
        </Box>

        {/* Pets */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
            🐾 Pets {alivePets.length > 0 && `(${alivePets.length})`}
          </Typography>
          {alivePets.length > 0 ? (
            <Stack spacing={0.35}>
              {alivePets.map((pet) => (
                <Typography key={pet.id} variant="caption">
                  {pet.type === 'large' ? '🐕' : '🐈'} {pet.type === 'large' ? 'Large' : 'Small'} pet · Age {pet.age}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">No pets</Typography>
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}

// ─── FinancesCard ─────────────────────────────────────────────────────────────

function FinancesCard({ profile }: { profile: PlayerProfile }) {
  const totalLoans = profile.loans.reduce((sum, l) => sum + l.currentBalance, 0);
  const myLoans = profile.loans.filter((l) => !l.isJoint && l.owner !== 'spouse');
  const spouseLoans = profile.loans.filter((l) => l.owner === 'spouse');
  const jointLoans = profile.loans.filter((l) => l.isJoint);
  const isMarried = profile.maritalStatus === 'married' && profile.spouse != null;
  const spouseOriginalSavings = profile.spouse?.originalSavings ?? 0;
  const myRetirementSavings = isMarried
    ? Math.max(0, profile.retirementSavings - spouseOriginalSavings)
    : profile.retirementSavings;

  return (
    <SectionCard icon={<AccountBalanceIcon fontSize="small" sx={{ color: '#2e7d32' }} />} title="Finances">
      <Stack spacing={0.25}>
        {/* Primary money stats */}
        <InfoRow
          label="Current Bank Balance"
          value={<Typography variant="caption" fontWeight={800} color="success.main">{fmt(profile.money)}</Typography>}
        />
        <InfoRow
          label="Projected Income Next Year"
          value={<Typography variant="caption" fontWeight={700}>{fmt(profile.projectedIncome)}</Typography>}
        />
        <Divider sx={{ my: 0.75 }} />
        {/* Savings */}
        <InfoRow
          label={isMarried ? 'Retirement Savings (Combined)' : 'Retirement Savings'}
          value={<Typography variant="caption" fontWeight={600}>{fmt(profile.retirementSavings)}</Typography>}
        />
        {isMarried && (
          <>
            <InfoRow
              label="  Yours"
              value={<Typography variant="caption" color="text.secondary">{fmt(myRetirementSavings)}</Typography>}
            />
            <InfoRow
              label="  Spouse's"
              value={<Typography variant="caption" color="text.secondary">{fmt(spouseOriginalSavings)}</Typography>}
            />
          </>
        )}
        {profile.collegeFund > 0 && (
          <InfoRow
            label="College Fund"
            value={<Typography variant="caption" fontWeight={600}>{fmt(profile.collegeFund)}</Typography>}
          />
        )}
        {/* Debt */}
        {totalLoans > 0 && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <InfoRow
              label="Total Debt"
              value={<Typography variant="caption" fontWeight={700} color="error.main">{fmt(totalLoans)}</Typography>}
            />
            {myLoans.length > 0 && (
              <InfoRow
                label="  Your Loans"
                value={<Typography variant="caption" color="error.light">{fmt(myLoans.reduce((s, l) => s + l.currentBalance, 0))}</Typography>}
              />
            )}
            {spouseLoans.length > 0 && (
              <InfoRow
                label="  Spouse Loans"
                value={<Typography variant="caption" color="error.light">{fmt(spouseLoans.reduce((s, l) => s + l.currentBalance, 0))}</Typography>}
              />
            )}
            {jointLoans.length > 0 && (
              <InfoRow
                label="  Joint Loans"
                value={<Typography variant="caption" color="error.light">{fmt(jointLoans.reduce((s, l) => s + l.currentBalance, 0))}</Typography>}
              />
            )}
          </>
        )}
        {totalLoans === 0 && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Typography variant="caption" color="success.main" fontWeight={600}>✓ No debt</Typography>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}

// ─── CredentialsCard ──────────────────────────────────────────────────────────

const DEGREE_EMOJI: Record<string, string> = {
  associates: '🎓',
  bachelors: '🎓',
  masters: '🏛️',
  phd: '🔬',
  certificate: '📜',
  trade: '🔧',
  bootcamp: '💻',
};

function CredentialsCard({
  certifications,
  educations,
  currentYear,
}: {
  certifications: Array<{ type: string; expiryYear?: number }>;
  educations: PlayerProfile['educations'];
  currentYear: number;
}) {
  const earnedDegrees = educations.filter((e) => e.graduated);
  const hasAnything = earnedDegrees.length > 0 || certifications.length > 0;

  return (
    <SectionCard icon={<EmojiEventsIcon fontSize="small" sx={{ color: '#f57f17' }} />} title="Degrees & Certifications">
      {hasAnything ? (
        <Stack spacing={1.5} divider={<Divider />}>
          {/* Earned degrees */}
          {earnedDegrees.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                🎓 Degrees
              </Typography>
              <Stack spacing={0.75}>
                {earnedDegrees.map((edu) => (
                  <Box key={edu.programId}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" fontWeight={600}>
                        {DEGREE_EMOJI[edu.program?.type ?? ''] ?? '🎓'} {edu.program?.name ?? 'Unknown Program'}
                      </Typography>
                      {edu.graduationAge != null && (
                        <Chip
                          label={`Age ${edu.graduationAge}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem' }}
                        />
                      )}
                    </Stack>
                    {edu.program?.type && (
                      <Typography variant="caption" color="text.secondary">
                        {degreeType(edu.program.type)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                📜 Certifications
              </Typography>
              <Stack spacing={0.75}>
                {certifications.map((cert, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" fontWeight={600}>
                      {cert.type === 'cpr' || cert.type === 'CPR' ? '🫀 CPR Certification' : `📜 ${cert.type}`}
                    </Typography>
                    {cert.expiryYear !== undefined && (
                      <Chip
                        label={`Expires yr ${cert.expiryYear}`}
                        size="small"
                        color={cert.expiryYear <= currentYear + 1 ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">No degrees or certifications yet.</Typography>
      )}
    </SectionCard>
  );
}

// ─── TimelineCard ─────────────────────────────────────────────────────────────

function TimelineCard({ profile }: { profile: PlayerProfile }) {
  const events: { age: number; label: string; color: string }[] = [];

  profile.employments.forEach((emp) => {
    events.push({ age: emp.startAge, label: `💼 Started: ${emp.job?.title ?? 'Job'}`, color: '#1565c0' });
    if (!emp.isActive) {
      events.push({ age: profile.age, label: `💼 Left: ${emp.job?.title ?? 'Job'}`, color: '#757575' });
    }
  });

  profile.educations.forEach((edu) => {
    events.push({ age: edu.startAge, label: `🎓 Enrolled: ${edu.program?.name ?? 'Program'}`, color: '#6a1b9a' });
    if (edu.graduated && edu.graduationAge) {
      events.push({ age: edu.graduationAge, label: `🎓 Graduated: ${edu.program?.name ?? 'Program'}`, color: '#2e7d32' });
    }
  });

  if (profile.maritalStatus === 'married' && profile.spouse) {
    const spouseAge = profile.spouse.age;
    const marriageAge = spouseAge != null ? Math.abs(profile.age - spouseAge) : profile.age;
    events.push({ age: marriageAge, label: '💍 Got married', color: '#c62828' });
  }

  profile.children.forEach((child) => {
    events.push({
      age: profile.age - child.age,
      label: child.isAdopted ? '👶 Adopted a child' : '👶 Had a child',
      color: '#e65100',
    });
  });

  events.sort((a, b) => a.age - b.age);

  return (
    <SectionCard icon={<TimelineIcon fontSize="small" sx={{ color: '#6a1b9a' }} />} title="Life Timeline">
      {events.length > 0 ? (
        <Box sx={{ position: 'relative', pl: 2.5 }}>
          <Box sx={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, bgcolor: 'primary.light', borderRadius: 1 }} />
          <Stack spacing={1.25}>
            {events.map((event, i) => (
              <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: event.color,
                    flexShrink: 0,
                    mt: 0.35,
                    ml: -1.75,
                    zIndex: 1,
                    border: '2px solid white',
                    boxShadow: 1,
                  }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    Age {event.age}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, lineHeight: 1.3 }}>
                    {event.label}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Your life story will appear here as you play.
        </Typography>
      )}
    </SectionCard>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rounded" height={280} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);
  const currentYear = useSelector((s: RootState) => s.game.currentYear);

  const { data: profile, isLoading: profileLoading } = useQuery<PlayerProfile>({
    queryKey: ['player-profile', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/profile`);
      return data.player as PlayerProfile;
    },
    enabled: !!playerId,
    staleTime: 30_000,
  });

  const { data: housingData } = useQuery<{ housing: HousingItem[] }>({
    queryKey: ['housing-profile', gameSessionId],
    queryFn: async () => {
      const { data } = await api.get('/housing', { params: { gameSessionId } });
      return data as { housing: HousingItem[] };
    },
    enabled: !!gameSessionId,
    staleTime: 30_000,
  });

  const { data: vehicleData } = useQuery<{ owned: OwnedVehicleEntry[] }>({
    queryKey: ['vehicles-owned-profile', gameSessionId],
    queryFn: async () => {
      const { data } = await api.get('/vehicles/owned', { params: { gameSessionId } });
      return data as { owned: OwnedVehicleEntry[] };
    },
    enabled: !!gameSessionId,
    staleTime: 30_000,
  });

  const currentHome = housingData?.housing?.find((h) => h.isCurrentHome) ?? null;
  const ownedVehicles = vehicleData?.owned ?? [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.primary.light, p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            <Box component="span" sx={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.45))' }}>🌱</Box> Tending the Garden
          </Typography>
        </Stack>

        {profileLoading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <Grid container spacing={2} alignItems="stretch">
            {/* Vitals hero card — full width, same Grid so edges align */}
            <Grid item xs={12}>
              <VitalsCard profile={profile} />
            </Grid>

            {/* Row 1: Skills, Traits, Finances */}
              <Grid item xs={12} md={4}>
                <SkillsCard skills={profile.skills} />
              </Grid>

              <Grid item xs={12} md={4}>
                <TraitsCard traits={profile.traits} />
              </Grid>

              <Grid item xs={12} md={4}>
                <FinancesCard profile={profile} />
              </Grid>

              {/* Row 2: Life Overview, Family, Degrees & Certifications */}
              <Grid item xs={12} md={4}>
                <LifeCard
                  profile={profile}
                  currentHome={currentHome}
                  ownedVehicles={ownedVehicles}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FamilyCard profile={profile} ownedVehicles={ownedVehicles} />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <CredentialsCard
                  certifications={profile.certifications}
                  educations={profile.educations}
                  currentYear={currentYear}
                />
              </Grid>

              {/* Timeline — full width */}
              <Grid item xs={12}>
                <TimelineCard profile={profile} />
              </Grid>
            </Grid>
        )}
      </Box>
    </Box>
  );
}
