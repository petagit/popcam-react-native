const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEverything() {
    console.log('User id:', 'user_2wqzABS6pGnJl2qSmtOSkbTGh2O');
    const { data: images } = await supabase.from('generated_images').select('*', { count: 'exact' }).eq('user_id', 'user_2wqzABS6pGnJl2qSmtOSkbTGh2O');
    console.log('Recent generated_images:', images?.length);
    const { data: jobs } = await supabase.from('image_generation_jobs').select('*', { count: 'exact' }).eq('user_id', 'user_2wqzABS6pGnJl2qSmtOSkbTGh2O');
    console.log('Recent image_generation_jobs:', jobs?.length);
    const { data: prompts } = await supabase.from('custom_prompts').select('*', { count: 'exact' }).eq('user_id', 'user_2wqzABS6pGnJl2qSmtOSkbTGh2O');
    console.log('Recent custom_prompts:', prompts?.length);

    // Let's also fetch the /api/user/images from the actual API endpoint!
}

checkEverything();
