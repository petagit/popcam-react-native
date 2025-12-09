const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkZeroCredits() {
    console.log('Searching for users with 0 or null credits...');

    // Fetch users where credits is 0
    const { data: zeroUsers, error } = await supabase
        .from('users')
        .select('id, email, credits, updated_at')
        .eq('credits', 0);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (zeroUsers.length > 0) {
        console.log(`Found ${zeroUsers.length} users with 0 credits:`);
        zeroUsers.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Updated: ${u.updated_at}`);
        });
    } else {
        console.log('No users found with explicitly 0 credits.');
    }

    // Check for users with NULL credits
    const { data: nullUsers, error: nullError } = await supabase
        .from('users')
        .select('id, email, credits, updated_at')
        .is('credits', null);

    if (nullUsers && nullUsers.length > 0) {
        console.log(`Found ${nullUsers.length} users with NULL credits:`);
        nullUsers.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email}`);
        });
    }
}

checkZeroCredits();
