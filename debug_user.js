const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser(email) {
    console.log(`Debugging user: ${email}`);

    // Check user table
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error("Error fetching user:", error);
        return;
    }

    if (!user) {
        console.log("User NOT FOUND in 'users' table.");
        // If user not found, maybe list all users to see if there's a mismatch or case sensitivity issue
        const { data: allUsers } = await supabase.from('users').select('email');
        const similar = allUsers.filter(u => u.email.toLowerCase().includes('peter'));
        if (similar.length > 0) {
            console.log("Found similar emails:", similar);
        }
    } else {
        console.log("User found:", user);
    }
}

debugUser('peter.z.feng@gmail.com');
