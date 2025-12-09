const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCredits() {
    console.log('Fetching users...');

    // Fetch all users ordered by updated_at desc to find the active one
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, credits, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users.`);
    console.log('Most recent users:');

    users.slice(0, 10).forEach(u => {
        console.log(`ID: ${u.id.substring(0, 8)}... | Email: ${u.email} | Credits: ${u.credits} | Updated: ${u.updated_at}`);
    });
}

checkCredits();
