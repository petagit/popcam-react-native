const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yvqrixwmdknvttzddjfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cXJpeHdtZGtudnR0emRkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NzQxMDMsImV4cCI6MjA2MjI1MDEwM30.rtTMUvMypzxBVDNBRbSM7X3T_8nudHbyAq6PylWDogM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomPrompts() {
    const testUserId = 'test-user-' + Date.now(); // Using a dummy ID, assuming no strict FK constraint or willing to fail if so.
    const testPrompt = `Automated Test Prompt ${new Date().toISOString()}`;

    console.log(`Testing with User ID: ${testUserId}`);
    console.log(`Prompt to save: "${testPrompt}"`);

    // 1. Save Prompt
    console.log('1. Saving custom prompt...');
    const { error: saveError } = await supabase
        .from('custom_prompts')
        .insert({
            user_id: testUserId,
            prompt_text: testPrompt,
        });

    if (saveError) {
        console.error('FAILED to save prompt:', saveError);
        return;
    }
    console.log('Prompt saved successfully.');

    // 2. Fetch Prompts
    console.log('2. Fetching prompts...');
    const { data, error: fetchError } = await supabase
        .from('custom_prompts')
        .select('prompt_text')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('FAILED to fetch prompts:', fetchError);
        return;
    }

    console.log(`Fetched ${data.length} prompts.`);
    const found = data.find(p => p.prompt_text === testPrompt);

    if (found) {
        console.log('SUCCESS: Retrieved the saved prompt!');
    } else {
        console.error('FAILURE: Could not find the saved prompt in the response.');
        console.log('Received:', data);
    }
}

testCustomPrompts();
