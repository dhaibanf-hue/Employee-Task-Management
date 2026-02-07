
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jqlaitpirnyxwvwkowfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbGFpdHBpcm55eHd2d2tvd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MDMsImV4cCI6MjA4NTYwNTYwM30.chqsFBRycbQv-njM9K4w1KWyYsOX6WnnEAkdiHccuco';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('roles').select('*').limit(1);
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Successfully connected! Data:', data);
        }
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testConnection();
