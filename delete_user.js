const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUser(email) {
    console.log(`Attempting to delete user: ${email}`);

    // 1. Confirm user exists
    const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

    if (findError) {
        console.error("Error finding user:", findError);
        return;
    }

    if (!user) {
        console.log("User not found (maybe already deleted?)");
        return;
    }

    console.log(`Found user to delete: ID=${user.id}, Email=${user.email}`);

    // 2. Delete related records (Foreign Key Constraints)
    console.log("Deleting related records...");

    // Delete generated_images
    const { error: imgError, count: imgCount } = await supabase
        .from('generated_images')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
    if (imgError) console.error("Error deleting generated_images:", imgError);
    else console.log(`Deleted ${imgCount} generated_images.`);

    // Delete image_generation_jobs
    const { error: jobError, count: jobCount } = await supabase
        .from('image_generation_jobs')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
    if (jobError) console.error("Error deleting image_generation_jobs:", jobError);
    else console.log(`Deleted ${jobCount} image_generation_jobs.`);

    // Delete custom_prompts
    const { error: promptError, count: promptCount } = await supabase
        .from('custom_prompts')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
    if (promptError) console.error("Error deleting custom_prompts:", promptError);
    else console.log(`Deleted ${promptCount} custom_prompts.`);

    // Delete subscription
    const { error: subError, count: subCount } = await supabase
        .from('subscriptions')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
    if (subError) console.error("Error deleting subscription:", subError);
    else console.log(`Deleted ${subCount} subscriptions.`);


    // 3. Delete the user
    const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

    if (deleteError) {
        console.error("Error deleting user:", deleteError);
    } else {
        console.log("Successfully deleted user row.");
    }
}

deleteUser('peter.z.feng@gmail.com');
