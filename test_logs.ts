import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://phlzhndalzvksqudylrt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHpobmRhbHp2a3NxdWR5bHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDUxNTYsImV4cCI6MjA4NDQ4MTE1Nn0.s1WZEAA2EwbTPSlPCPT2aW-aniKnhVeQu3ZRb_TD7nA'
);

async function test() {
    console.log("Fetching logs from April 2026...");
    const { data, error } = await supabase.from('automation_logs').select('*').gte('triggered_at', '2026-04-01').order('triggered_at', { ascending: false }).limit(20);
    
    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} logs!`);
    if (data.length > 0) {
        data.forEach(log => {
            console.log(`- ${log.id} | triggered_at: ${log.triggered_at} | rule: ${log.rule_name} | affected: ${log.affected_entity_name} | status: ${log.status} | details: ${log.details}`);
        });
    }
}

test();
