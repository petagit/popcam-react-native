const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEverything(email) {
    console.log(`Checking database for user: ${email}`);

    // 1. Find the user ID
    const { data: userData } = await supabase.from('users').select('id, email, updated_at').eq('email', email).maybeSingle();
    if (!userData) { console.log(`No user record found for email: ${email}`); return; }
    const userId = userData.id;
    console.log(`Found User ID: ${userId} | Last Updated: ${userData.updated_at}`);

    // 2. Check generated_images
    const { count: userImageCount } = await supabase.from('generated_images').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    console.log(`Total 'generated_images' for this user: ${userImageCount}`);

    // 3. Check image_generation_jobs
    const { count: userJobCount } = await supabase.from('image_generation_jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    console.log(`Total 'image_generation_jobs' for this user: ${userJobCount}`);

    // 4. Check TOTAL in DB
    const { count: totalImages } = await supabase.from('generated_images').select('*', { count: 'exact', head: true });
    const { count: totalJobs } = await supabase.from('image_generation_jobs').select('*', { count: 'exact', head: true });
    console.log(`GRAND TOTALS -> Images: ${totalImages} | Jobs: ${totalJobs}`);

    // 5. Check custom prompts
    const { count: promptCount } = await supabase.from('custom_prompts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    console.log(`Total custom prompts for this user: ${promptCount}`);
}

checkEverything('417162973@qq.com');
