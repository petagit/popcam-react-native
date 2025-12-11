
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeletion() {
    const userId = `test-user-${Date.now()}`;
    const promptText = `Deletion Test ${Date.now()}`;

    console.log(`Testing with User ID: ${userId}`);

    // 1. Create a prompt
    console.log('1. Creating prompt...');
    const { data: inserted, error: insertError } = await supabase
        .from('custom_prompts')
        .insert({ user_id: userId, prompt_text: promptText })
        .select('id')
        .single();

    if (insertError) {
        console.error('FAILED to create prompt:', insertError);
        return;
    }
    const promptId = inserted.id;
    console.log('Prompt created with ID:', promptId);

    // 2. Fetch to confirm
    console.log('2. Fetching to confirm existence...');
    const { data: fetched, error: fetchError } = await supabase
        .from('custom_prompts')
        .select('*')
        .eq('id', promptId);

    if (fetchError || fetched.length === 0) {
        console.error('FAILED to fetch prompt:', fetchError);
        return;
    }
    console.log('Prompt exists in DB.');

    // 3. Delete
    console.log('3. Deleting prompt...');
    const { error: deleteError } = await supabase
        .from('custom_prompts')
        .delete()
        .eq('id', promptId)
        .eq('user_id', userId);

    if (deleteError) {
        console.error('FAILED to delete prompt:', deleteError);
        return;
    }
    console.log('Delete command executed.');

    // 4. Verify deletion
    console.log('4. Verifying deletion...');
    const { data: finalFetch, error: finalError } = await supabase
        .from('custom_prompts')
        .select('*')
        .eq('id', promptId);

    if (finalFetch && finalFetch.length === 0) {
        console.log('SUCCESS: Prompt successfully deleted from DB.');
    } else {
        console.error('FAILURE: Prompt still exists in DB.');
    }
}

testDeletion();
