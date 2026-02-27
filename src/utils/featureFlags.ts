
export const isGeminiEnabled = () => {
  // Check if the API key is present in the environment
  // process.env is used in AI Studio, import.meta.env is standard for Vite
  const hasApiKey = 
    (typeof process !== 'undefined' && (!!process.env.GEMINI_API_KEY || !!process.env.API_KEY)) ||
    (!!(import.meta as any).env?.VITE_GEMINI_API_KEY);
  
  // Check if running in AI Studio environment (typical hostname pattern)
  const isAIStudio = typeof window !== 'undefined' && 
    (window.location.hostname.endsWith('.run.app') || 
     window.location.hostname.includes('aistudio.google.com'));

  return hasApiKey || isAIStudio;
};
