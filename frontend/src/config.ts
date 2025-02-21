export const getApiUrl = () => {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env;

  // Default to CloudFront distribution in production
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // Default to localhost in development
  return "http://localhost:3000";
};
