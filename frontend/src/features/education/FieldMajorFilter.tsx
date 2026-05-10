/**
 * FieldMajorFilter — multi-select checkbox dropdown for filtering education
 * programs by field and/or individual majors.
 *
 * Fields act as group headers — checking a field selects all majors in it.
 * Individual majors can also be checked independently.
 */
import { useState } from 'react';
import {
  Box, Button, Checkbox, Chip, FormControlLabel, Menu, MenuItem,
  Stack, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface FieldMajorFilterProps {
  selectedMajors: string[];
  onChange: (majors: string[]) => void;
}

export default function FieldMajorFilter({ selectedMajors, onChange }: FieldMajorFilterProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Fetch grouped majors from API
  const { data } = useQuery({
    queryKey: ['education-majors'],
    queryFn: async () => {
      const res = await api.get('/education/majors');
      return res.data as { majors: string[]; grouped: Record<string, string[]> };
    },
    staleTime: 5 * 60 * 1000,
  });

  const grouped = data?.grouped ?? {};
  const selectedSet = new Set(selectedMajors);

  const handleFieldToggle = (field: string) => {
    const fieldMajors = grouped[field] ?? [];
    const allSelected = fieldMajors.every((m) => selectedSet.has(m));
    if (allSelected) {
      // Deselect all in this field
      onChange(selectedMajors.filter((m) => !fieldMajors.includes(m)));
    } else {
      // Select all in this field
      const newSet = new Set(selectedMajors);
      fieldMajors.forEach((m) => newSet.add(m));
      onChange([...newSet]);
    }
  };

  const handleMajorToggle = (major: string) => {
    if (selectedSet.has(major)) {
      onChange(selectedMajors.filter((m) => m !== major));
    } else {
      onChange([...selectedMajors, major]);
    }
  };

  const handleClear = () => {
    onChange([]);
    setAnchorEl(null);
  };

  const label = selectedMajors.length === 0
    ? 'Field / Major'
    : `Field / Major — ${selectedMajors.length} selected`;

  return (
    <Box>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: selectedMajors.length > 0 ? 500 : 400,
          justifyContent: 'space-between',
          width: '100%',
          height: 40,
          fontSize: '1rem',
          color: 'text.secondary',
          borderColor: 'rgba(0,0,0,0.23)',
          '&:hover': { borderColor: 'text.primary' },
        }}
      >
        {label}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { maxHeight: 400, width: 280 } }}
      >
        {/* Clear button */}
        {selectedMajors.length > 0 && (
          <MenuItem onClick={handleClear} sx={{ justifyContent: 'center', color: 'primary.main' }}>
            <Typography variant="body2" fontWeight={600}>Clear all</Typography>
          </MenuItem>
        )}

        {Object.entries(grouped).map(([field, majors]) => {
          const allInFieldSelected = majors.every((m) => selectedSet.has(m));
          const someInFieldSelected = majors.some((m) => selectedSet.has(m));

          return (
            <Box key={field}>
              {/* Field header with checkbox */}
              <MenuItem
                onClick={() => handleFieldToggle(field)}
                sx={{ py: 0.25 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={allInFieldSelected}
                      indeterminate={someInFieldSelected && !allInFieldSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleFieldToggle(field)}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={700}>
                      {field}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </MenuItem>

              {/* Individual majors */}
              {majors.map((major) => (
                <MenuItem
                  key={major}
                  onClick={() => handleMajorToggle(major)}
                  sx={{ pl: 5, py: 0.1 }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedSet.has(major)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleMajorToggle(major)}
                      />
                    }
                    label={<Typography variant="body2">{major}</Typography>}
                    sx={{ m: 0 }}
                  />
                </MenuItem>
              ))}
            </Box>
          );
        })}
      </Menu>
    </Box>
  );
}
