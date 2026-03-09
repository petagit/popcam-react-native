const { createClient } = require('@supabase/supabase-js');

// Using keys found in check_user_photos.js
const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateUsers() {
    console.log("Checking database for duplicate users (same email, different UUIDs)...");

    // Fetch all users
    // Note: default limit is 1000. If we have more, we needs pagination. 
    // For this investigation, we'll request 1000.
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, created_at');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Scanned ${users.length} users.`);

    const emailToIds = {};

    users.forEach(user => {
        if (!user.email) return; // Skip if no email (shouldn't happen with unique constraint but good to be safe)

        if (!emailToIds[user.email]) {
            emailToIds[user.email] = [];
        }
        emailToIds[user.email].push({ id: user.id, created_at: user.created_at });
    });

    const duplicates = Object.entries(emailToIds).filter(([email, entries]) => entries.length > 1);

    if (duplicates.length === 0) {
        console.log("No duplicate users found.");
    } else {
        console.log(`Found ${duplicates.length} email(s) with multiple user IDs:`);
        duplicates.forEach(([email, entries]) => {
            console.log(`\nEmail: ${email}`);
            entries.forEach(entry => {
                console.log(`  - ID: ${entry.id} (Created: ${entry.created_at})`);
            });
        });
    }
}

checkDuplicateUsers();
