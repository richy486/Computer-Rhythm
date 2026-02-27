
export const isGeminiEnabled = () => {
  // Check if the API key is present in the environment
  const hasApiKey = !!process.env.GEMINI_API_KEY || !!process.env.API_KEY;
  
  // Check if running in AI Studio environment (typical hostname pattern)
  const isAIStudio = typeof window !== 'undefined' && 
    (window.location.hostname.endsWith('.run.app') || 
     window.location.hostname.includes('aistudio.google.com') ||
     window.location.hostname.includes('localhost')); // Allow localhost for dev

  return hasApiKey || isAIStudio;
};
