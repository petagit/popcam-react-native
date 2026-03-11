const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEverything(email) {
    const { data: userData } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
    if (!userData) { console.log('No user'); return; }

    console.log('User id:', userData.id);
    const { data: images } = await supabase.from('generated_images').select('*').eq('user_id', userData.id).order('created_at', { ascending: false }).limit(5);
    console.log('Recent images:', images);
}

checkEverything('petazfeng@gmail.com');
