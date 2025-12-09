const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantCredits() {
    console.log('Granting credits to users with 0 balance...');

    // Update users where credits is 0
    const { data, error } = await supabase
        .from('users')
        .update({ credits: 10, updated_at: new Date().toISOString() })
        .eq('credits', 0)
        .select();

    if (error) {
        console.error('Error granting credits:', error);
        return;
    }

    console.log(`Granted 10 credits to ${data.length} users.`);
}

grantCredits();
