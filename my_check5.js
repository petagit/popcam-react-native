const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: images } = await supabase.from('generated_images').select('*').order('created_at', { ascending: false }).limit(2);
    console.log('Recent URL:', images[0]?.image_url);
}
check();
