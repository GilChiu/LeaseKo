const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is required. Add it to apps/web/.env.local',
  );
}

export const API_URL: string = apiUrl;

export const CLERK_PUBLISHABLE_KEY: string =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
