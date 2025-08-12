// src/components/form/control/RHFSelect.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { TextField } from "@mui/material";

type RHFSelectProps = {
  name: string;
  label: string;
  placeholder?: string;
  children: React.ReactNode;
};

export default function RHFSelect({
  name,
  label,
  placeholder,
  children,
}: RHFSelectProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <TextField
      select
      fullWidth
      label={label}
      placeholder={placeholder}
      error={!!error}
      helperText={error}
      {...register(name)}
    >
      {children}
      
    </TextField>
  );
}