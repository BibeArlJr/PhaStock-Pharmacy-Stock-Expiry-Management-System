import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';

export default function PasswordInput({ value, onChange, placeholder, required = false }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="pr-10"
      />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((prev) => !prev)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
