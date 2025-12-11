import * as fs from 'fs';
import * as path from 'path';

// Manually load .env
try {
    const envPath = path.resolve(__dirname, '../.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log('Loaded .env file');
} catch (e) {
    console.log('No .env file found or failed to read it. using process.env');
}

import { supabaseService } from '../src/services/supabaseService';

async function testCustomPrompts() {
    console.log('--- Starting Custom Prompt Test ---');

    const testerId = 'test_user_007_bond';
    const testPrompt = `Secret agent banana ${new Date().toISOString()}`;

    console.log(`1. Testing as user: ${testerId}`);

    // 0. Ensure user exists (optional, but good for cleanliness)
    // supabaseService automatically creates user if not found in some flows, but let's check.
    // We'll rely on saveCustomPrompt working even if user mapping is loose, or it might fail if foreign key constraint exists.
    // The schema usually has foreign key to auth.users OR public.users table.
    // Let's assume public.users table from previous context.

    try {
        // 1. Post a custom prompt
        console.log(`2. Posting prompt: "${testPrompt}"`);
        await supabaseService.saveCustomPrompt(testerId, testPrompt);
        console.log('   ✅ Prompt saved successfully.');

        // 2. Fetch prompts
        console.log('3. Fetching prompt history...');
        const history = await supabaseService.getCustomPrompts(testerId);
        console.log(`   Fetched ${history.length} prompts.`);
        console.log('   Latest prompts:', history.slice(0, 3));

        // 3. Verify
        const isFound = history.includes(testPrompt);
        if (isFound) {
            console.log('   ✅ Verification SUCCESS: The saved prompt was found in the history.');
        } else {
            console.error('   ❌ Verification FAILED: The saved prompt was NOT found in the history.');
        }

    } catch (error) {
        console.error('   ❌ Test Failed with error:', error);
    }

    console.log('--- Test Complete ---');
}

testCustomPrompts();
