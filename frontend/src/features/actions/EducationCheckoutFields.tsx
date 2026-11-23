import { useState } from 'react';
import { Alert, Checkbox, CircularProgress, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../lib/api';

export interface EducationSelection {
  educationProgramId?: string;
  educationPartTime?: boolean;
  educationProgramLabel?: string;
}

interface Program {
  id: string;
  name: string;
  type: string;
  field: string;
  eligible: boolean;
  alreadyEnrolled: boolean;
  partTimeAllowed: boolean;
}

export default function EducationCheckoutFields({ changeMajor, onChange }: {
  changeMajor: boolean; onChange: (selection: EducationSelection) => void;
}) {
  const { gameSessionId } = useSelector((state: RootState) => state.auth);
  const [type, setType] = useState('');
  const [field, setField] = useState('');
  const [id, setId] = useState('');
  const [partTime, setPartTime] = useState(false);
  const query = useQuery({
    queryKey: ['educationCheckout', gameSessionId],
    queryFn: async () => (await api.get<{ programs: Program[] }>('/education/programs', { params: { gameSessionId } })).data.programs,
    enabled: !!gameSessionId,
  });
  if (query.isLoading) return <CircularProgress size={24} />;
  if (query.isError) return <Alert severity="error">Could not load education programs.</Alert>;
  const all = query.data ?? [];
  const currentType = all.find((p) => p.alreadyEnrolled)?.type;
  const programs = all.filter((p) => p.eligible && !p.alreadyEnrolled && (!changeMajor || currentType === p.type));
  if (!programs.length) return <Alert severity="info">No eligible {changeMajor ? 'alternative majors' : 'programs'} are available.</Alert>;
  const selected = programs.find((p) => p.id === id);
  return <Stack spacing={1.5} sx={{ mb: 2 }}>
    {!changeMajor && <FormControl fullWidth size="small">
      <InputLabel id="checkout-degree-label">Degree type</InputLabel>
      <Select labelId="checkout-degree-label" label="Degree type" value={type} onChange={(e) => {
        setType(e.target.value); setField(''); setId(''); setPartTime(false); onChange({});
      }}>
        {[...new Set(programs.map((p) => p.type))].sort().map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </Select>
    </FormControl>}
    {!changeMajor && <FormControl fullWidth size="small" disabled={!type}>
      <InputLabel id="checkout-field-label">Field</InputLabel>
      <Select labelId="checkout-field-label" label="Field" value={field} onChange={(e) => {
        setField(e.target.value); setId(''); setPartTime(false); onChange({});
      }}>
        {[...new Set(programs.filter((p) => p.type === type).map((p) => p.field))].sort().map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </Select>
    </FormControl>}
    <FormControl fullWidth size="small" disabled={!changeMajor && !field}>
      <InputLabel id="checkout-program-label">{changeMajor ? 'New major' : 'Program / major'}</InputLabel>
      <Select labelId="checkout-program-label" label={changeMajor ? 'New major' : 'Program / major'} value={id} onChange={(e) => {
        const program = programs.find((p) => p.id === e.target.value);
        setId(program?.id ?? ''); setPartTime(false);
        onChange({ educationProgramId: program?.id, educationPartTime: changeMajor ? undefined : false, educationProgramLabel: program?.name });
      }}>
        {programs.filter((p) => changeMajor || (p.type === type && p.field === field)).map((p) => <MenuItem key={p.id} value={p.id}>{p.name} — {p.field}</MenuItem>)}
      </Select>
    </FormControl>
    {!changeMajor && selected?.partTimeAllowed && <FormControlLabel label="Enroll part-time" control={<Checkbox checked={partTime} onChange={(e) => {
      setPartTime(e.target.checked);
      onChange({ educationProgramId: selected.id, educationPartTime: e.target.checked, educationProgramLabel: selected.name });
    }} />} />}
  </Stack>;
}
