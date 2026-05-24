import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://phlzhndalzvksqudylrt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHpobmRhbHp2a3NxdWR5bHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDUxNTYsImV4cCI6MjA4NDQ4MTE1Nn0.s1WZEAA2EwbTPSlPCPT2aW-aniKnhVeQu3ZRb_TD7nA'
);

async function run() {
    console.log("Searching for Iqra groups...");
    const { data: groups, error: groupsError } = await supabase.from('groups').select('*');
    if (groupsError) {
        console.error("Error fetching groups:", groupsError);
        return;
    }

    const iqraGroups = (groups || []).filter(g => /إقراء|اقراء|iqra/i.test(g.name));
    console.log(`Found ${iqraGroups.length} Iqra groups:`);
    iqraGroups.forEach(g => console.log(`- ID: ${g.id} | Name: ${g.name}`));

    if (iqraGroups.length === 0) {
        console.log("No Iqra groups to delete.");
        return;
    }

    const iqraGroupIds = iqraGroups.map(g => g.id);

    console.log("\nSearching for students in Iqra groups...");
    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('group_id', iqraGroupIds);

    if (studentsError) {
        console.error("Error fetching students:", studentsError);
        return;
    }

    console.log(`Found ${students?.length || 0} students:`);
    students?.forEach(s => console.log(`- ID: ${s.id} | Name: ${s.full_name} | Group ID: ${s.group_id}`));

    if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);

        console.log("\nDeleting attendance records...");
        const { error: attError } = await supabase.from('attendance').delete().in('student_id', studentIds);
        if (attError) console.error("Error deleting attendance:", attError);
        else console.log("Deleted attendance records successfully.");

        console.log("Deleting exams records...");
        const { error: examError } = await supabase.from('exams').delete().in('student_id', studentIds);
        if (examError) console.error("Error deleting exams:", examError);
        else console.log("Deleted exams records successfully.");

        console.log("Deleting fees records...");
        const { error: feesError } = await supabase.from('fees').delete().in('student_id', studentIds);
        if (feesError) console.error("Error deleting fees:", feesError);
        else console.log("Deleted fees records successfully.");

        console.log("Deleting plans records...");
        const { error: plansError } = await supabase.from('plans').delete().in('student_id', studentIds);
        if (plansError) console.error("Error deleting plans:", plansError);
        else console.log("Deleted plans records successfully.");

        console.log("Deleting student records...");
        const { error: delStudError } = await supabase.from('students').delete().in('id', studentIds);
        if (delStudError) console.error("Error deleting students:", delStudError);
        else console.log("Deleted students successfully.");
    }

    console.log("\nDeleting groups...");
    const { error: delGroupError } = await supabase.from('groups').delete().in('id', iqraGroupIds);
    if (delGroupError) console.error("Error deleting groups:", delGroupError);
    else console.log("Deleted Iqra groups successfully.");

    console.log("\nDone!");
}

run();
