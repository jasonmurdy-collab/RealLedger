import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mhuihqxvjfsvebcngtpd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odWlocXh2amZzdmViY25ndHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTQ5MzcsImV4cCI6MjA4MTIzMDkzN30.2CAewxgdcuSIiBXyuwmCBPltqYtmbukSjgfA9JZOyGM'
export const supabase = createClient(supabaseUrl, supabaseKey)