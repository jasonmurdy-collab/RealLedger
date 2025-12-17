import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://beyrjvabvummradbgasp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleXJqdmFidnVtbXJhZGJnYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjcwNzUsImV4cCI6MjA4MTQwMzA3NX0.5tBuCEDjufs_mDU9rf2ktPTWuzTkVKgwiVJXBbR2eLI'
export const supabase = createClient(supabaseUrl, supabaseKey)