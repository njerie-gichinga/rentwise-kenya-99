import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
}

const getStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
};

const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const colors = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-primary",
  "bg-emerald-500",
];

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength ? colors[strength] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
        {labels[strength]}
        {strength < 3 && " — use uppercase, numbers & symbols"}
      </p>
    </div>
  );
};

export default PasswordStrength;
