import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim()) {
    return envBase;
  }
  
  // In development mode, gebruik localhost:5010
  if (import.meta.env.DEV) {
    return "http://localhost:5010/api";
  }
  
  return "/api";
}
