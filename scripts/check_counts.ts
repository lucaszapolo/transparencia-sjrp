
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('🔍 Querying 2026 data...');

    const { data, error } = await supabase
        .from('expenses')
        .select('month')
        .eq('year', 2026);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    const counts: Record<number, number> = {};
    data.forEach((r: any) => {
        counts[r.month] = (counts[r.month] || 0) + 1;
    });

    console.log('📊 Records per month in 2026:');
    Object.keys(counts).forEach(m => {
        console.log(`Month ${m}: ${counts[Number(m)]} records`);
    });

    if (!counts[1]) {
        console.log('⚠️ Month 1 (January) is MISSING!');
    }
}

checkCounts();
