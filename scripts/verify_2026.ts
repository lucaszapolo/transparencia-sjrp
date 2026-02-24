
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MUN_ID = 'sao-jose-do-rio-preto';

async function verify2026() {
    const months = [1, 2];
    for (const m of months) {
        const url = `https://transparencia.tce.sp.gov.br/api/json/despesas/${MUN_ID}/2026/${m}`;
        try {
            const res = await axios.get(url, { timeout: 30000 });
            console.log(`API 2026/${m}: ${Array.isArray(res.data) ? res.data.length : 'Error'} records`);
        } catch (e: any) {
            console.log(`API 2026/${m} failed: ${e.message}`);
        }

        const { count } = await supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('year', 2026).eq('month', m);
        console.log(`DB 2026/${m}: ${count} records`);
    }
}

verify2026();
