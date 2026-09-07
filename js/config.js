/* Supabase project settings.
   The anon key is meant to be public: row level security is what protects the data. */
window.SARAH_CONFIG = {
  SUPABASE_URL: "https://lgukelcpgcgdceqrvrud.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndWtlbGNwZ2NnZGNlcXJ2cnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Njk5NDYsImV4cCI6MjEwNDM0NTk0Nn0.Q4kLvtF9VzpwcvfmF0nj1li71GuCnggGKOM2wVFCXMA",
  CLIP_BUCKET: "clips",           /* private storage bucket holding the demo videos */
  LOCAL_CLIPS: false               /* true when the videos ship next to the app; the deploy script sets this */
};
