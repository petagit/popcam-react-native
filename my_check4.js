const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEverything() {
    const { data: users } = await supabase.from('users').select('id, email').ilike('email', '%petazfeng%');
    console.log('Matching users:', users);

    for (const u of (users || [])) {
        const { data: images } = await supabase.from('generated_images').select('*', { count: 'exact' }).eq('user_id', u.id);
        console.log(`User ${u.id} (${u.email}) has ${images?.length || 0} generated_images`);
    }
}

checkEverything();
