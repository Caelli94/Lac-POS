import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getArgentinaDate() {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const year = argentinaTime.getFullYear();
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const day = String(argentinaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
